import { Router, Request, Response } from 'express';
import { InvokeModelCommand, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import { getBedrockRuntimeClient } from '../bedrockClient';
import { pool } from '../db';

const router = Router();

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

    if (!queryVector || queryVector.length !== 1024) {
      throw new Error(`Invalid Titan V2 vector returned. Expected 1024 dimensions, got ${queryVector?.length}`);
    }

    // 2. Query top-K from pgvector
    console.log(`[BridgeIQ Memory] 2. Querying top ${topK} records via pgvector cosine distance`);
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
      ORDER BY embedding <=> $1::vector ASC
      LIMIT $2;
    `;
    const formattedVector = `[${queryVector.join(',')}]`;
    const dbRes = await pool.query(sql, [formattedVector, topK]);

    const retrievedRecords: HistoricalRecord[] = dbRes.rows.map((row) => ({
      ...row,
      similarity_score: parseFloat(row.similarity_score),
    }));

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

    console.log(`[BridgeIQ Memory] 3. Calling Bedrock Synthesis Model: ${synthesisModelId}`);

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

    const answer =
      response.output?.message?.content?.[0]?.text ||
      'Unable to synthesize response from historical records.';

    res.status(200).json({
      query: query.trim(),
      answer,
      sources,
      computed_stats: stats,
      model_used: synthesisModelId,
      retrieved_records: retrievedRecords,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to process memory query';
    console.error('[BridgeIQ Backend] Error in memory query:', error);
    res.status(500).json({ error: message });
  }
});

export default router;
