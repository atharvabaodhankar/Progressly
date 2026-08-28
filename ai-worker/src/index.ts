import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { extractEvents } from './extractionProvider';
import { matchEventToSchedule } from './matcher';
import { ensureBaselineSeeds } from './seeder';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const SQS_QUEUE_URL = process.env.SQS_QUEUE_URL || '';
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME || '';
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgrespassword@127.0.0.1:5433/bridgeiq_db';
const AWS_REGION = process.env.AWS_REGION || 'ap-south-1';

const isProdDb = DATABASE_URL.includes('rds.amazonaws.com') || DATABASE_URL.includes('amazonaws.com') || process.env.NODE_ENV === 'production';

let isRunning = true;

async function getDbClient(): Promise<Client> {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: isProdDb ? { rejectUnauthorized: false } : undefined,
  });
  await client.connect();
  return client;
}

async function streamToString(stream: any): Promise<string> {
  const chunks: any[] = [];
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk: any) => chunks.push(Buffer.from(chunk)));
    stream.on('error', (err: any) => reject(err));
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  });
}

async function processMessage(bodyText: string) {
  let payload: any;
  try {
    payload = JSON.parse(bodyText);
  } catch (err) {
    console.error('[BridgeIQ AI-Worker] Received non-JSON message:', bodyText);
    return;
  }

  let reportId: string | null = payload.reportId || payload.report_id || null;
  let rawText: string = payload.text || payload.content || payload.text_content || '';
  const s3Key: string = payload.s3Key || payload.s3_key || (payload.Records && payload.Records[0]?.s3?.object?.key) || '';

  // 1. If S3 key is present and raw text is empty, download from S3
  if (s3Key && !rawText && S3_BUCKET_NAME) {
    try {
      console.log(`[BridgeIQ AI-Worker] Downloading report from S3: ${S3_BUCKET_NAME}/${s3Key}`);
      const s3Client = new S3Client({ region: AWS_REGION });
      const s3Res = await s3Client.send(
        new GetObjectCommand({
          Bucket: S3_BUCKET_NAME,
          Key: decodeURIComponent(s3Key.replace(/\+/g, ' ')),
        })
      );
      if (s3Res.Body) {
        rawText = await streamToString(s3Res.Body);
      }
    } catch (s3Err) {
      console.error(`[BridgeIQ AI-Worker] Failed to download object from S3:`, s3Err);
    }
  }

  if (!rawText && !reportId) {
    console.warn('[BridgeIQ AI-Worker] Skipping empty payload:', payload);
    return;
  }

  const db = await getDbClient();

  try {
    // 2. Mark report status as 'processing'
    if (reportId) {
      await db.query(`UPDATE reports SET status = 'processing' WHERE id = $1`, [reportId]);
    } else {
      // Find report by s3_key if reportId wasn't passed directly
      if (s3Key) {
        const repRes = await db.query(`SELECT id FROM reports WHERE s3_key = $1 LIMIT 1`, [s3Key]);
        if (repRes.rows.length > 0) {
          reportId = repRes.rows[0].id;
          await db.query(`UPDATE reports SET status = 'processing' WHERE id = $1`, [reportId]);
        }
      }
    }

    console.log(`[BridgeIQ AI-Worker] Extracting events for Report ID: ${reportId || 'ad-hoc'}`);
    
    // 3. Extract events via LLM
    const extractionResult = await extractEvents(rawText);

    console.log(`[BridgeIQ AI-Worker] Extracted ${extractionResult.events.length} event(s)`);

    // 4. Match events against Schedule activities & persist
    for (const event of extractionResult.events) {
      let eventId: string | null = null;

      if (reportId) {
        const evInsert = await db.query(
          `INSERT INTO actual_events (
            report_id, extracted_json, discipline, activity_description, line, location, event_type, quantity
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING id;`,
          [
            reportId,
            JSON.stringify(event),
            event.discipline || null,
            event.activity_description,
            event.line || null,
            event.location || null,
            event.event_type,
            event.quantity || null,
          ]
        );
        eventId = evInsert.rows[0]?.id;
      }

      // Run Matching Engine
      const matchResult = await matchEventToSchedule(event);
      console.log(`[BridgeIQ AI-Worker] Event matched: Top activity ${matchResult.matched_candidate?.activity_code || 'none'} (Score: ${matchResult.confidence_score || 0})`);

      if (eventId && matchResult.matched_candidate) {
        const matchStatus = matchResult.status;
        
        const mInsert = await db.query(
          `INSERT INTO matches (
            event_id, activity_id, confidence_score, status, model_version
          ) VALUES ($1, $2, $3, $4, $5)
          RETURNING id;`,
          [
            eventId,
            matchResult.matched_candidate.activity_id,
            matchResult.confidence_score,
            matchStatus,
            'amazon.titan-embed-text-v2:0 + rule-engine-v1',
          ]
        );

        const matchId = mInsert.rows[0]?.id;

        // Write to audit log
        await db.query(
          `INSERT INTO audit_log (
            match_id, action, source_report_id, confidence_score, model_version, approver, new_value
          ) VALUES ($1, $2, $3, $4, $5, $6, $7);`,
          [
            matchId,
            matchStatus === 'auto_approved' ? 'auto_match_approved' : 'match_suggested',
            reportId,
            matchResult.confidence_score,
            'amazon.titan-embed-text-v2:0',
            'ai',
            JSON.stringify(matchResult.matched_candidate),
          ]
        );
      }
    }

    // 5. Mark report status as 'processed'
    if (reportId) {
      await db.query(`UPDATE reports SET status = 'processed' WHERE id = $1`, [reportId]);
    }

    console.log(`[BridgeIQ AI-Worker] ✓ Successfully processed report ${reportId || 'ad-hoc'}`);
  } catch (err) {
    console.error(`[BridgeIQ AI-Worker] Error processing message:`, err);
    if (reportId) {
      await db.query(`UPDATE reports SET status = 'failed' WHERE id = $1`, [reportId]).catch(() => {});
    }
  } finally {
    await db.end();
  }
}

async function startWorker() {
  console.log('[BridgeIQ AI-Worker] Starting AI Worker service...');
  console.log(`[BridgeIQ AI-Worker] Region: ${AWS_REGION}`);
  console.log(`[BridgeIQ AI-Worker] SQS Queue: ${SQS_QUEUE_URL || 'None configured (heartbeat mode)'}`);
  console.log(`[BridgeIQ AI-Worker] S3 Bucket: ${S3_BUCKET_NAME || 'None configured'}`);

  // Auto-seed baseline schedule and historical records if database is fresh
  try {
    const seedClient = await getDbClient();
    try {
      await ensureBaselineSeeds(seedClient);
    } finally {
      await seedClient.end();
    }
  } catch (seedErr) {
    console.error('[BridgeIQ AI-Worker] Seeder error during startup:', seedErr);
  }

  const sqsClient = SQS_QUEUE_URL ? new SQSClient({ region: AWS_REGION }) : null;

  while (isRunning) {
    if (!sqsClient || !SQS_QUEUE_URL) {
      // Heartbeat mode if no SQS queue URL is present
      console.log('[BridgeIQ AI-Worker] Heartbeat: Worker idle and ready.');
      await new Promise((r) => setTimeout(r, 30000));
      continue;
    }

    try {
      const receiveCmd = new ReceiveMessageCommand({
        QueueUrl: SQS_QUEUE_URL,
        MaxNumberOfMessages: 5,
        WaitTimeSeconds: 20, // Long polling
        VisibilityTimeout: 300,
      });

      const res = await sqsClient.send(receiveCmd);

      if (res.Messages && res.Messages.length > 0) {
        console.log(`[BridgeIQ AI-Worker] Received ${res.Messages.length} message(s) from SQS.`);

        for (const msg of res.Messages) {
          if (msg.Body) {
            await processMessage(msg.Body);
          }

          // Delete message once processed
          if (msg.ReceiptHandle) {
            await sqsClient.send(
              new DeleteMessageCommand({
                QueueUrl: SQS_QUEUE_URL,
                ReceiptHandle: msg.ReceiptHandle,
              })
            );
          }
        }
      }
    } catch (err: any) {
      console.error('[BridgeIQ AI-Worker] Error in SQS polling loop:', err.message || err);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }

  console.log('[BridgeIQ AI-Worker] Worker loop stopped.');
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[BridgeIQ AI-Worker] SIGTERM received, shutting down gracefully...');
  isRunning = false;
});

process.on('SIGINT', () => {
  console.log('[BridgeIQ AI-Worker] SIGINT received, shutting down gracefully...');
  isRunning = false;
});

startWorker().catch((err) => {
  console.error('[BridgeIQ AI-Worker] Fatal error during startup:', err);
  process.exit(1);
});
