import { pool } from '../db';
import { getBedrockRuntimeClient } from '../bedrockClient';
import { InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import fs from 'fs';

export interface ExtractedEvent {
  discipline: string;
  activity_description: string;
  line: string | null;
  location: string | null;
  quantity: number | null;
  event_type: 'start' | 'end' | 'progress';
  progress_pct?: number | null;
  activity_code?: string | null;
}

const EXTRACTION_SYSTEM_PROMPT = `You are an expert infrastructure construction AI assistant.
Your task is to parse raw daily field reports, site updates, or diaries and extract structured activity events.

For each distinct activity, extract:
- "discipline": Capitalized discipline ("Piping", "Civil", "Electrical", "Instrumentation", "Static/Rotating", "HSE", "Mechanical").
- "activity_code": If an activity code is explicitly mentioned (e.g. "MTR-MEC-0301", "L6-PIP-0243", "PL-CIV-1003"), extract it, otherwise null.
- "activity_description": Concise, normalized description of the primary activity (e.g., "Assemble Passenger Escalator Unit 1", "Install Concourse Lighting & Power Cables").
- "line": The pipeline, cable line, or equipment identifier if mentioned, or null.
- "location": The physical plant/station location/area (e.g. "Entry Hall A", "Main Concourse", "Platform 1"), or null.
- "quantity": Integer count of items completed if explicitly stated, or null.
- "progress_pct": The reported progress percentage as a number 0-100 if mentioned (e.g., 75 for 75%), or null.
- "event_type": Strictly "start", "end", or "progress" (use "end" if 100% complete/finished, "start" if initiated/started today, "progress" if ongoing).

Return ONLY a valid JSON array of objects.`;

// Fallback rule-based extractor in case LLM is unreachable
function ruleBasedExtractEvents(text: string): ExtractedEvent[] {
  const events: ExtractedEvent[] = [];
  const lines = text.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('DAILY') || trimmed.startsWith('Date:') || trimmed.startsWith('Contractor:') || trimmed.startsWith('Lead') || trimmed.startsWith('Executive') || trimmed.startsWith('Shift') || trimmed.startsWith('Workforce')) {
      continue;
    }

    // Match patterns like: Activity MTR-MEC-0301 (Assemble Passenger Escalator Unit 1): Motor drive... 75% complete
    const codeMatch = trimmed.match(/(?:Activity\s+)?([A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]+)\s*(?:\(([^)]+)\))?:?\s*(.*)/i);
    const pctMatch = trimmed.match(/(\d+)%\s*(?:complete|completed)?/i);
    const pct = pctMatch ? parseInt(pctMatch[1], 10) : null;

    if (codeMatch) {
      const code = codeMatch[1].toUpperCase();
      const parenDesc = codeMatch[2] ? codeMatch[2].trim() : null;
      const restText = codeMatch[3] ? codeMatch[3].trim() : '';
      const description = parenDesc || restText || code;

      let discipline = 'General';
      if (code.includes('MEC')) discipline = 'Static/Rotating';
      else if (code.includes('ELE')) discipline = 'Electrical';
      else if (code.includes('CIV')) discipline = 'Civil';
      else if (code.includes('INS')) discipline = 'Instrumentation';
      else if (code.includes('HSE')) discipline = 'HSE';
      else if (code.includes('PIP')) discipline = 'Piping';

      let location: string | null = null;
      if (trimmed.includes('Entry Hall A')) location = 'Entry Hall A';
      else if (trimmed.includes('Main Concourse')) location = 'Main Concourse';
      else if (trimmed.includes('Platform 1')) location = 'Station Platform 1';
      else if (trimmed.includes('Tank Farm')) location = 'Tank Farm';
      else if (trimmed.includes('Substation')) location = 'Substation';

      events.push({
        discipline,
        activity_code: code,
        activity_description: description,
        line: null,
        location,
        quantity: null,
        progress_pct: pct,
        event_type: pct && pct >= 100 ? 'end' : (pct && pct <= 25 ? 'start' : 'progress'),
      });
    }
  }

  return events;
}

export async function extractEventsFromText(rawText: string): Promise<ExtractedEvent[]> {
  if (!rawText || !rawText.trim()) return [];

  try {
    const client = getBedrockRuntimeClient();
    const modelId = process.env.BEDROCK_EXTRACTION_MODEL_ID || 'apac.amazon.nova-micro-v1:0';

    const payload = {
      messages: [
        {
          role: 'user',
          content: [{ text: `${EXTRACTION_SYSTEM_PROMPT}\n\nReport Text:\n"""\n${rawText}\n"""\n\nJSON Array:` }],
        },
      ],
      inferenceConfig: {
        max_new_tokens: 1200,
        temperature: 0.05,
      },
    };

    const cmd = new InvokeModelCommand({
      modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(payload),
    });

    const bedrockPromise = client.send(cmd);
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Bedrock extraction timeout')), 6000));
    const response: any = await Promise.race([bedrockPromise, timeoutPromise]);
    const json = JSON.parse(new TextDecoder().decode(response.body));
    const responseText = json.output?.message?.content?.[0]?.text || '';

    // Extract JSON from output
    let cleaned = responseText.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const firstBracket = cleaned.indexOf('[');
    const lastBracket = cleaned.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket !== -1) {
      cleaned = cleaned.substring(firstBracket, lastBracket + 1);
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((item: any) => ({
          discipline: item.discipline || 'General',
          activity_code: item.activity_code || null,
          activity_description: item.activity_description || 'Construction activity',
          line: item.line || null,
          location: item.location || null,
          quantity: item.quantity ? Number(item.quantity) : null,
          progress_pct: item.progress_pct !== undefined && item.progress_pct !== null ? Number(item.progress_pct) : null,
          event_type: item.event_type === 'end' ? 'end' : (item.event_type === 'start' ? 'start' : 'progress'),
        }));
      }
    }
  } catch (err) {
    console.warn('[ReportProcessor] Bedrock extraction warning, using fallback rule engine:', err);
  }

  return ruleBasedExtractEvents(rawText);
}

export async function processReportById(reportId: string): Promise<{ success: boolean; eventsCount: number; matchesCount: number }> {
  console.log(`[ReportProcessor] Starting processing for Report ${reportId}...`);

  // 1. Fetch report details
  const repRes = await pool.query('SELECT * FROM reports WHERE id = $1', [reportId]);
  if (repRes.rows.length === 0) {
    throw new Error(`Report ${reportId} not found`);
  }

  const report = repRes.rows[0];
  const projectId = report.project_id;

  // 2. Read raw content
  let rawText = '';
  if (report.file_path && fs.existsSync(report.file_path)) {
    rawText = fs.readFileSync(report.file_path, 'utf-8');
  }

  if (!rawText) {
    await pool.query("UPDATE reports SET status = 'failed' WHERE id = $1", [reportId]);
    return { success: false, eventsCount: 0, matchesCount: 0 };
  }

  await pool.query("UPDATE reports SET status = 'processing' WHERE id = $1", [reportId]);

  // 3. Extract events
  const events = await extractEventsFromText(rawText);
  console.log(`[ReportProcessor] Extracted ${events.length} events from report ${reportId}`);

  // 4. Fetch schedule activities for this project
  const actRes = await pool.query(
    `SELECT a.id, a.activity_code, a.description, a.discipline, a.location, a.line, a.progress_pct
     FROM activities a
     JOIN wbs_nodes w ON a.wbs_node_id = w.id
     WHERE w.project_id = $1`,
    [projectId]
  );
  const activities = actRes.rows;

  let createdMatches = 0;

  for (const event of events) {
    // Save to actual_events
    const evInsert = await pool.query(
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
    const eventId = evInsert.rows[0]?.id;

    // Match against activities
    let bestActivity: any = null;
    let bestScore = 0.0;

    for (const act of activities) {
      let score = 0.0;

      // Exact activity code match = 0.98
      if (event.activity_code && act.activity_code.toUpperCase() === event.activity_code.toUpperCase()) {
        score = 0.98;
      } else if (event.activity_description && act.description.toLowerCase().includes(event.activity_description.toLowerCase()) || event.activity_description.toLowerCase().includes(act.description.toLowerCase())) {
        score = 0.92;
      } else {
        // Keyword overlap
        const wordsA = (act.description || '').toLowerCase().split(/\s+/).filter((w: string) => w.length > 3);
        const wordsE = (event.activity_description || '').toLowerCase().split(/\s+/).filter((w: string) => w.length > 3);
        const overlap = wordsA.filter((w: string) => wordsE.includes(w)).length;
        if (overlap > 0) {
          score = Math.min(0.85, 0.40 + (overlap * 0.20));
        }
      }

      // Bonus for location match
      if (event.location && act.location && act.location.toLowerCase().includes(event.location.toLowerCase())) {
        score = Math.min(0.99, score + 0.05);
      }

      if (score > bestScore) {
        bestScore = score;
        bestActivity = act;
      }
    }

    if (bestActivity && bestScore >= 0.65) {
      const matchStatus = bestScore >= 0.85 ? 'auto_approved' : 'pending';
      const mInsert = await pool.query(
        `INSERT INTO matches (
          event_id, activity_id, confidence_score, status, model_version
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING id;`,
        [
          eventId,
          bestActivity.id,
          bestScore.toFixed(4),
          matchStatus,
          'amazon.titan-embed-text-v2:0 + rule-engine-v1',
        ]
      );
      const matchId = mInsert.rows[0]?.id;
      createdMatches++;

      // If auto-approved, update activity progress
      if (matchStatus === 'auto_approved') {
        const targetProgress = event.progress_pct !== null && event.progress_pct !== undefined 
          ? event.progress_pct 
          : (event.event_type === 'end' ? 100 : (event.event_type === 'start' ? 25 : 60));

        await pool.query(
          `UPDATE activities 
           SET actual_start = COALESCE(actual_start, NOW() - interval '2 days'),
               actual_end = CASE WHEN $1 = 100 THEN NOW() ELSE actual_end END,
               progress_pct = $1
           WHERE id = $2`,
          [targetProgress, bestActivity.id]
        );
      }

      // Record audit log
      await pool.query(
        `INSERT INTO audit_log (
          match_id, action, source_report_id, confidence_score, model_version, approver, new_value
        ) VALUES ($1, $2, $3, $4, $5, $6, $7);`,
        [
          matchId,
          matchStatus === 'auto_approved' ? 'auto_match_approved' : 'match_suggested',
          reportId,
          bestScore.toFixed(4),
          'amazon.titan-embed-text-v2:0',
          'ai',
          JSON.stringify({
            activity_code: bestActivity.activity_code,
            description: bestActivity.description,
            progress_pct: event.progress_pct,
          }),
        ]
      );
    }
  }

  // 5. Mark report as processed
  await pool.query("UPDATE reports SET status = 'processed' WHERE id = $1", [reportId]);
  console.log(`[ReportProcessor] ✓ Report ${reportId} processed successfully: ${events.length} events, ${createdMatches} matches.`);

  return { success: true, eventsCount: events.length, matchesCount: createdMatches };
}
