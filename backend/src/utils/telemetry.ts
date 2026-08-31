import { pool } from '../db';

/**
 * AWS Bedrock Official Pricing Rates in ap-south-1 (Mumbai) / APAC
 * Expressed as cost per 1,000 tokens (or 1 token)
 */
export const BEDROCK_PRICING: Record<string, { inputPer1k: number; outputPer1k: number; name: string; tier: string }> = {
  // Amazon Nova Micro
  'apac.amazon.nova-micro-v1:0': {
    inputPer1k: 0.000035, // $0.035 / 1M tokens
    outputPer1k: 0.000140, // $0.140 / 1M tokens
    name: 'Amazon Nova Micro',
    tier: 'Entity Extraction',
  },
  'amazon.nova-micro-v1:0': {
    inputPer1k: 0.000035,
    outputPer1k: 0.000140,
    name: 'Amazon Nova Micro',
    tier: 'Entity Extraction',
  },

  // Amazon Titan Embeddings V2
  'amazon.titan-embed-text-v2:0': {
    inputPer1k: 0.000020, // $0.020 / 1M tokens
    outputPer1k: 0.000000,
    name: 'Amazon Titan Embeddings V2',
    tier: '1024d Vector Embedding',
  },

  // Amazon Nova Pro
  'apac.amazon.nova-pro-v1:0': {
    inputPer1k: 0.000800, // $0.800 / 1M tokens
    outputPer1k: 0.003200, // $3.200 / 1M tokens
    name: 'Amazon Nova Pro',
    tier: 'Institutional RAG Synthesis',
  },
  'amazon.nova-pro-v1:0': {
    inputPer1k: 0.000800,
    outputPer1k: 0.003200,
    name: 'Amazon Nova Pro',
    tier: 'Institutional RAG Synthesis',
  },
};

export interface TraceStage {
  name: string;
  duration_ms: number;
  status: 'completed' | 'failed' | 'skipped';
  metadata?: Record<string, unknown>;
}

export interface RecordTraceOptions {
  traceId?: string;
  requestType: 'report_ingestion' | 'memory_rag_query' | 'schedule_vectorization' | 'memory_import';
  projectId?: string | null;
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  stages: TraceStage[];
  status?: 'completed' | 'failed';
}

/**
 * Calculates exact AWS Bedrock dollar cost based on model and token counts.
 */
export function calculateBedrockCost(modelId: string, inputTokens: number, outputTokens: number): number {
  const pricing = BEDROCK_PRICING[modelId] || BEDROCK_PRICING['apac.amazon.nova-micro-v1:0'];
  const inputCost = (inputTokens / 1000) * pricing.inputPer1k;
  const outputCost = (outputTokens / 1000) * pricing.outputPer1k;
  return Number((inputCost + outputCost).toFixed(6));
}

/**
 * Logs a request trace with exact tokens, cost, and lifecycle stages into the database.
 */
export async function recordTrace(options: RecordTraceOptions): Promise<void> {
  try {
    const traceId = options.traceId || `trc_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
    const costUsd = calculateBedrockCost(options.modelId, options.inputTokens, options.outputTokens);

    const query = `
      INSERT INTO analytics_traces (
        trace_id, request_type, project_id, model_id,
        input_tokens, output_tokens, cost_usd, latency_ms,
        stages, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10)
      ON CONFLICT (trace_id) DO NOTHING;
    `;

    await pool.query(query, [
      traceId,
      options.requestType,
      options.projectId || null,
      options.modelId,
      options.inputTokens,
      options.outputTokens,
      costUsd,
      options.latencyMs,
      JSON.stringify(options.stages),
      options.status || 'completed',
    ]);
  } catch (error) {
    console.error('[Telemetry] Failed to record trace:', error);
  }
}
