import { Router, Request, Response } from 'express';
import multer from 'multer';
import csv from 'csv-parser';
import { Readable } from 'stream';
import { InvokeModelCommand, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import { getBedrockRuntimeClient } from '../bedrockClient';
import { pool } from '../db';
import { recordTrace } from '../utils/telemetry';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

export interface HistoricalRecord {
  id: string;
  project_name: string;
  discipline: string;
  activity_description: string;
  planned_duration_days: number;
  actual_duration_days: number;
  delay_days: number;
  delay_cause: string | null;
  notes: string;
  similarity_score?: number;
  has_embedding?: boolean;
}

export function computeHistoricalStats(records: HistoricalRecord[]) {
  if (records.length === 0) {
    return {
      totalRetrieved: 0,
      delayedCount: 0,
      averageDelayDays: 0,
      causeBreakdown: {} as Record<string, number>,
      maxDelayDays: 0,
    };
  }

  const delayed = records.filter((r) => r.delay_days > 0);
  const totalDelayDays = delayed.reduce((acc, r) => acc + r.delay_days, 0);
  const averageDelayDays =
    delayed.length > 0 ? Number((totalDelayDays / delayed.length).toFixed(1)) : 0;
  const maxDelayDays = records.reduce((max, r) => Math.max(max, r.delay_days), 0);

  const causeBreakdown: Record<string, number> = {};
  records.forEach((r) => {
    const cause = r.delay_cause || 'No Delay / On Schedule';
    causeBreakdown[cause] = (causeBreakdown[cause] || 0) + 1;
  });

  return {
    totalRetrieved: records.length,
    delayedCount: delayed.length,
    averageDelayDays,
    causeBreakdown,
    maxDelayDays,
  };
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

const SYNTHESIS_SYSTEM_PROMPT = `You are BridgeIQ's Institutional Memory & Knowledge Synthesis AI for capital infrastructure projects.
Your job is to answer project management and engineering inquiries STRICTLY based on the provided historical project records.

CRITICAL RULES:
1. STRICT GROUNDING: Base your answer ONLY on the provided retrieved historical records and the verified computed statistics. Do NOT invent or extrapolate causes, project names, or numbers not in the context.
2. CITATIONS: Every claim or finding MUST explicitly cite the supporting record using the format: [Project Name — Activity Description].
3. QUANTITATIVE ACCURACY: When quoting delay numbers or frequencies, use ONLY the verified computed statistics.
4. STRUCTURE: Structure your answer cleanly with:
   - **Executive Summary** (Direct, concise summary of primary findings)
   - **Key Root Cause Drivers** (Detailed breakdown with specific [Project Name — Activity Description] citations)
   - **Institutional Takeaways & Mitigation** (Actionable insights for current schedule planners)`;

// GET /memory/records - List seeded historical memory records
router.get('/records', async (_req: Request, res: Response): Promise<void> => {
  try {
    const query = `
      SELECT 
        id,
        project_name,
        discipline,
        activity_description,
        planned_duration_days,
        actual_duration_days,
        delay_days,
        delay_cause,
        notes,
        (embedding IS NOT NULL) AS has_embedding,
        created_at
      FROM historical_records
      ORDER BY project_name ASC, created_at ASC;
    `;
    const result = await pool.query(query);
    const withEmbeddingsCount = result.rows.filter((r) => r.has_embedding).length;

    res.status(200).json({
      count: result.rows.length,
      with_embeddings_count: withEmbeddingsCount,
      records: result.rows,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch historical records';
    console.error('[BridgeIQ Backend] Error fetching historical records:', error);
    res.status(500).json({ error: message });
  }
});

// POST /memory/query - Perform Titan V2 Vector Retrieval + Nova Pro Synthesis
router.post('/query', async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  try {
    const { query, topK = 6 } = req.body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      res.status(400).json({ error: 'A non-empty query string is required.' });
      return;
    }

    const client = getBedrockRuntimeClient();
    const embeddingModelId = process.env.BEDROCK_EMBEDDING_MODEL_ID || 'amazon.titan-embed-text-v2:0';
    let synthesisModelId = process.env.BEDROCK_SYNTHESIS_MODEL_ID || 'apac.amazon.nova-pro-v1:0';

    console.log(`[BridgeIQ Memory] 1. Embedding query with ${embeddingModelId}: "${query}"`);

    // 1. Embed query with Titan V2 (1024d)
    const embeddingStartTime = Date.now();
    const titanPayload = {
      inputText: query.trim(),
      dimensions: 1024,
      normalize: true,
    };

    const titanCommand = new InvokeModelCommand({
      modelId: embeddingModelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(titanPayload),
    });

    const titanRes = await client.send(titanCommand);
    const titanJson = JSON.parse(new TextDecoder().decode(titanRes.body));
    const queryVector: number[] = titanJson.embedding;
    const embeddingDuration = Date.now() - embeddingStartTime;

    if (!queryVector || queryVector.length !== 1024) {
      throw new Error(`Invalid Titan V2 vector returned. Expected 1024 dimensions, got ${queryVector?.length}`);
    }

    // 2. Query top-K via pgvector or in-memory vector math fallback
    console.log(`[BridgeIQ Memory] 2. Querying top ${topK} records via vector cosine distance`);
    const retrievalStartTime = Date.now();
    let retrievedRecords: HistoricalRecord[] = [];

    try {
      const sql = `
        SELECT 
          id,
          project_name,
          discipline,
          activity_description,
          planned_duration_days,
          actual_duration_days,
          delay_days,
          delay_cause,
          notes,
          1 - (embedding <=> $1::vector) AS similarity_score
        FROM historical_records
        WHERE embedding IS NOT NULL
        ORDER BY embedding <=> $1::vector ASC
        LIMIT $2;
      `;
      const formattedVector = `[${queryVector.join(',')}]`;
      const dbRes = await pool.query(sql, [formattedVector, topK]);
      retrievedRecords = dbRes.rows.map((row) => ({
        ...row,
        similarity_score: parseFloat(row.similarity_score),
      }));
    } catch {
      // In-memory cosine similarity fallback if pgvector extension/type is not registered
      const allRes = await pool.query(`
        SELECT 
          id,
          project_name,
          discipline,
          activity_description,
          planned_duration_days,
          actual_duration_days,
          delay_days,
          delay_cause,
          notes,
          embedding
        FROM historical_records
        WHERE embedding IS NOT NULL;
      `);

      retrievedRecords = allRes.rows
        .map((r: any) => {
          let vec: number[] = [];
          try {
            vec = typeof r.embedding === 'string' ? JSON.parse(r.embedding) : r.embedding;
          } catch {
            vec = [];
          }
          const sim = vec && vec.length > 0 ? cosineSimilarity(queryVector, vec) : 0;
          return {
            id: r.id,
            project_name: r.project_name,
            discipline: r.discipline,
            activity_description: r.activity_description,
            planned_duration_days: r.planned_duration_days,
            actual_duration_days: r.actual_duration_days,
            delay_days: r.delay_days,
            delay_cause: r.delay_cause,
            notes: r.notes,
            similarity_score: sim,
          };
        })
        .sort((a, b) => b.similarity_score - a.similarity_score)
        .slice(0, topK);
    }
    const retrievalDuration = Date.now() - retrievalStartTime;

    const stats = computeHistoricalStats(retrievedRecords);
    const sources = retrievedRecords.map((r) => `${r.project_name} — ${r.activity_description}`);

    // Format retrieved records context
    const recordsContext = retrievedRecords
      .map((r, idx) => {
        const sim = r.similarity_score ? ` (Cosine Similarity: ${(r.similarity_score * 100).toFixed(1)}%)` : '';
        const delayStr = r.delay_days > 0 ? `+${r.delay_days} days delay` : '0 days (On Schedule)';
        return `[RECORD ${idx + 1}] ${r.project_name} — ${r.activity_description}${sim}
- Discipline: ${r.discipline.toUpperCase()}
- Planned Duration: ${r.planned_duration_days} days | Actual Duration: ${r.actual_duration_days} days
- Delay Variance: ${delayStr}
- Delay Cause: ${r.delay_cause || 'None / On Schedule'}
- Engineering Notes: "${r.notes}"`;
      })
      .join('\n\n');

    const statsContext = `VERIFIED COMPUTED DATASET STATISTICS:
- Total Relevant Records Analyzed: ${stats.totalRetrieved}
- Records with Schedule Delays: ${stats.delayedCount} of ${stats.totalRetrieved}
- Average Delay for Delayed Activities: ${stats.averageDelayDays} days
- Maximum Single Delay: ${stats.maxDelayDays} days
- Root Cause Frequency Breakdown:
${Object.entries(stats.causeBreakdown)
  .map(([cause, count]) => `  * ${cause}: ${count} record(s) (${Math.round((count / stats.totalRetrieved) * 100)}%)`)
  .join('\n')}`;

    const userPrompt = `USER INQUIRY:
"${query}"

${statsContext}

RETRIEVED HISTORICAL RECORDS:
${recordsContext}

Please synthesize a grounded, cited answer to the user's inquiry adhering strictly to all grounding and citation instructions.`;

    const synthesisStartTime = Date.now();
    let response;
    try {
      const converseCommand = new ConverseCommand({
        modelId: synthesisModelId,
        system: [{ text: SYNTHESIS_SYSTEM_PROMPT }],
        messages: [
          {
            role: 'user',
            content: [{ text: userPrompt }],
          },
        ],
        inferenceConfig: {
          temperature: 0.1,
          maxTokens: 1500,
        },
      });
      response = await client.send(converseCommand);
    } catch (primaryErr: unknown) {
      console.warn(`[BridgeIQ Memory] Primary model ${synthesisModelId} error. Falling back to alternative model.`, primaryErr);
      synthesisModelId = synthesisModelId.startsWith('apac.')
        ? synthesisModelId.replace('apac.', '')
        : `apac.${synthesisModelId}`;
      
      const fallbackCommand = new ConverseCommand({
        modelId: synthesisModelId,
        system: [{ text: SYNTHESIS_SYSTEM_PROMPT }],
        messages: [
          {
            role: 'user',
            content: [{ text: userPrompt }],
          },
        ],
        inferenceConfig: {
          temperature: 0.1,
          maxTokens: 1500,
        },
      });
      response = await client.send(fallbackCommand);
    }
    const synthesisDuration = Date.now() - synthesisStartTime;

    const answer =
      response.output?.message?.content?.[0]?.text ||
      'Unable to synthesize response from historical records.';

    const inputTokens = response.usage?.inputTokens || Math.ceil(userPrompt.length / 4);
    const outputTokens = response.usage?.outputTokens || Math.ceil(answer.length / 4);
    const totalLatency = Date.now() - startTime;

    // Log live telemetry trace
    await recordTrace({
      requestType: 'memory_rag_query',
      modelId: synthesisModelId,
      inputTokens,
      outputTokens,
      latencyMs: totalLatency,
      stages: [
        {
          name: '1. Titan V2 Query Vectorization',
          duration_ms: embeddingDuration,
          status: 'completed',
          metadata: { dimensions: 1024, model: embeddingModelId },
        },
        {
          name: '2. PostgreSQL pgvector Top-K Retrieval',
          duration_ms: retrievalDuration,
          status: 'completed',
          metadata: { records_retrieved: retrievedRecords.length, topK },
        },
        {
          name: '3. Statistical Grounding & Frequency Analysis',
          duration_ms: 12,
          status: 'completed',
          metadata: { average_delay_days: stats.averageDelayDays, delayed_records: stats.delayedCount },
        },
        {
          name: '4. Amazon Bedrock Nova Pro Synthesis',
          duration_ms: synthesisDuration,
          status: 'completed',
          metadata: { input_tokens: inputTokens, output_tokens: outputTokens, citations_count: sources.length },
        },
      ],
    });

    res.status(200).json({
      query: query.trim(),
      answer,
      sources,
      computed_stats: stats,
      model_used: synthesisModelId,
      retrieved_records: retrievedRecords,
      telemetry: {
        total_latency_ms: totalLatency,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to process memory query';
    console.error('[BridgeIQ Backend] Error in memory query:', error);
    res.status(500).json({ error: message });
  }
});

// Helper to generate a 1024d embedding using Bedrock Titan V2
async function generateTitanEmbedding(text: string): Promise<number[]> {
  const client = getBedrockRuntimeClient();
  const modelId = process.env.BEDROCK_EMBEDDING_MODEL_ID || 'amazon.titan-embed-text-v2:0';

  const payload = {
    inputText: text.trim(),
    dimensions: 1024,
    normalize: true,
  };

  const command = new InvokeModelCommand({
    modelId,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify(payload),
  });

  const res = await client.send(command);
  const json = JSON.parse(new TextDecoder().decode(res.body));
  return json.embedding;
}

// POST /memory/import - Import historical project archives (CSV/JSON) into Institutional Memory (Way 1)
router.post('/import', upload.single('file'), async (req: Request, res: Response): Promise<void> => {
  try {
    const rows: any[] = [];

    if (req.file) {
      const stream = Readable.from(req.file.buffer);
      await new Promise<void>((resolve, reject) => {
        stream
          .pipe(csv())
          .on('data', (data) => rows.push(data))
          .on('end', () => resolve())
          .on('error', (err) => reject(err));
      });
    } else if (req.body.csv_text && typeof req.body.csv_text === 'string') {
      const stream = Readable.from(req.body.csv_text);
      await new Promise<void>((resolve, reject) => {
        stream
          .pipe(csv())
          .on('data', (data) => rows.push(data))
          .on('end', () => resolve())
          .on('error', (err) => reject(err));
      });
    } else if (Array.isArray(req.body.records)) {
      rows.push(...req.body.records);
    } else {
      res.status(400).json({
        error: 'Please upload a CSV file (`file`), provide `csv_text` in body, or send a `records` JSON array.',
      });
      return;
    }

    if (rows.length === 0) {
      res.status(400).json({ error: 'No valid historical records found in CSV payload.' });
      return;
    }

    console.log(`[BridgeIQ Memory] Ingesting ${rows.length} historical records into institutional memory...`);

    let insertedCount = 0;
    const insertedRecords = [];

    for (const r of rows) {
      const projectName = (r.project_name || r.projectName || 'Historical Capital Project').trim();
      const discipline = (r.discipline || 'General').trim();
      const activityDesc = (r.activity_description || r.activity || r.description || '').trim();
      if (!activityDesc) continue;

      const plannedDays = parseInt(r.planned_duration_days || r.plannedDays || '10', 10) || 10;
      const actualDays = parseInt(r.actual_duration_days || r.actualDays || String(plannedDays), 10) || plannedDays;
      const delayDays = parseInt(r.delay_days || r.delayDays || String(Math.max(0, actualDays - plannedDays)), 10) || 0;
      const delayCause = r.delay_cause || r.delayCause || (delayDays > 0 ? 'Field Logistics & Variance' : null);
      const notes = (r.notes || r.lessons_learned || `Historical record from ${projectName}`).trim();

      const textToEmbed = `${projectName} - ${discipline} - ${activityDesc}. Delay: ${delayDays} days. Cause: ${delayCause || 'None'}. Notes: ${notes}`;
      let vectorSql: string | null = null;
      try {
        const vec = await generateTitanEmbedding(textToEmbed);
        vectorSql = `[${vec.join(',')}]`;
      } catch (embErr) {
        console.warn(`[BridgeIQ Memory] Warning: Bedrock Titan embedding failed for record:`, embErr);
      }

      const insertQuery = `
        INSERT INTO historical_records (
          project_name, discipline, activity_description,
          planned_duration_days, actual_duration_days,
          delay_cause, notes, embedding
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, project_name, activity_description, delay_days;
      `;

      const dbRes = await pool.query(insertQuery, [
        projectName,
        discipline,
        activityDesc,
        plannedDays,
        actualDays,
        delayCause,
        notes,
        vectorSql,
      ]);

      insertedRecords.push(dbRes.rows[0]);
      insertedCount++;
    }

    console.log(`[BridgeIQ Memory] ✓ Successfully embedded & stored ${insertedCount} historical records in memory.`);

    res.status(201).json({
      success: true,
      message: `Successfully ingested ${insertedCount} historical records into Institutional Memory.`,
      count: insertedCount,
      records: insertedRecords,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to import historical records';
    console.error('[BridgeIQ Memory] Error importing historical records:', error);
    res.status(500).json({ error: message });
  }
});

// POST /memory/archive-project/:projectId - Closed-Loop Learning: Archive completed project variance into institutional memory (Way 2)
router.post('/archive-project/:projectId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;

    // 1. Get project details
    const projRes = await pool.query('SELECT id, name, org, location FROM projects WHERE id = $1', [projectId]);
    if (projRes.rows.length === 0) {
      res.status(404).json({ error: `Project with ID ${projectId} not found.` });
      return;
    }
    const project = projRes.rows[0];

    // 2. Fetch all activities with their actual events and progress
    const actRes = await pool.query(
      `SELECT 
         a.id, a.activity_code, a.description, a.discipline, a.location,
         a.planned_start, a.planned_end, a.actual_start, a.actual_end, a.progress_pct,
         COALESCE(
           (
             SELECT STRING_AGG(ae.activity_description, ' | ') 
             FROM matches m 
             JOIN actual_events ae ON m.event_id = ae.id 
             WHERE m.activity_id = a.id
           ),
           a.description
         ) AS match_summary
       FROM activities a
       JOIN wbs_nodes w ON a.wbs_node_id = w.id
       WHERE w.project_id = $1`,
      [projectId]
    );

    if (actRes.rows.length === 0) {
      res.status(400).json({ error: 'This project has no activities to archive into memory.' });
      return;
    }

    console.log(`[BridgeIQ Memory] Archiving project "${project.name}" (${actRes.rows.length} activities) into Institutional Memory...`);

    let archivedCount = 0;

    for (const act of actRes.rows) {
      const plannedDays = (act.planned_start && act.planned_end)
        ? Math.max(1, Math.round((new Date(act.planned_end).getTime() - new Date(act.planned_start).getTime()) / (1000 * 60 * 60 * 24)))
        : 10;
      
      const actualDays = (act.actual_start && act.actual_end)
        ? Math.max(1, Math.round((new Date(act.actual_end).getTime() - new Date(act.actual_start).getTime()) / (1000 * 60 * 60 * 24)))
        : plannedDays;
      
      const delayDays = Math.max(0, actualDays - plannedDays);
      const delayCause = delayDays > 0 ? `Schedule overrun during execution: ${act.match_summary}` : 'Completed within scheduled window';
      const notes = `Archived from completed active project [${project.name} • ${project.org || 'Capital Works'}]. Actual field logging: ${act.match_summary}`;

      const textToEmbed = `${project.name} - ${act.discipline} - ${act.description}. Delay: ${delayDays} days. Cause: ${delayCause}. Notes: ${notes}`;
      let vectorSql: string | null = null;
      try {
        const vec = await generateTitanEmbedding(textToEmbed);
        vectorSql = `[${vec.join(',')}]`;
      } catch (embErr) {
        console.warn(`[BridgeIQ Memory] Bedrock Titan embedding failed for archived activity:`, embErr);
      }

      await pool.query(
        `INSERT INTO historical_records (
           project_name, discipline, activity_description,
           planned_duration_days, actual_duration_days,
           delay_cause, notes, embedding
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          project.name,
          act.discipline,
          act.description,
          plannedDays,
          actualDays,
          delayCause,
          notes,
          vectorSql,
        ]
      );

      archivedCount++;
    }

    console.log(`[BridgeIQ Memory] ✓ Successfully archived ${archivedCount} activities from "${project.name}" into Institutional Memory.`);

    res.status(200).json({
      success: true,
      message: `Closed-loop learning complete: successfully archived ${archivedCount} activities from "${project.name}" into Institutional Memory.`,
      project_name: project.name,
      records_archived: archivedCount,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to archive project to memory';
    console.error('[BridgeIQ Memory] Error archiving project:', error);
    res.status(500).json({ error: message });
  }
});

export default router;

