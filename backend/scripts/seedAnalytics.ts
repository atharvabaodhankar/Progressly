import { pool } from '../src/db';
import { calculateBedrockCost } from '../src/utils/telemetry';

async function seedAnalytics() {
  console.log('[Progressly Analytics] 1. Applying migration 008_create_analytics_and_traces.sql...');
  
  await pool.query(`
    CREATE TABLE IF NOT EXISTS analytics_traces (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        trace_id VARCHAR(64) UNIQUE NOT NULL,
        request_type VARCHAR(32) NOT NULL,
        project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
        model_id VARCHAR(64) NOT NULL,
        input_tokens INT DEFAULT 0,
        output_tokens INT DEFAULT 0,
        total_tokens INT GENERATED ALWAYS AS (input_tokens + output_tokens) STORED,
        cost_usd NUMERIC(12, 6) NOT NULL DEFAULT 0.000000,
        latency_ms INT NOT NULL DEFAULT 0,
        stages JSONB NOT NULL DEFAULT '[]'::jsonb,
        status VARCHAR(20) DEFAULT 'completed',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_analytics_traces_created_at ON analytics_traces(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_analytics_traces_request_type ON analytics_traces(request_type);
    CREATE INDEX IF NOT EXISTS idx_analytics_traces_model_id ON analytics_traces(model_id);
    CREATE INDEX IF NOT EXISTS idx_analytics_traces_project_id ON analytics_traces(project_id);
  `);

  console.log('[Progressly Analytics] 2. Checking existing traces count...');
  const countRes = await pool.query('SELECT COUNT(*)::int AS count FROM analytics_traces');
  
  if (countRes.rows[0].count > 0) {
    console.log(`[Progressly Analytics] Already found ${countRes.rows[0].count} traces. Adding recent demo traces...`);
  }

  // Get project IDs
  const projRes = await pool.query('SELECT id, name FROM projects LIMIT 2');
  const baghjanId = projRes.rows[0]?.id || null;
  const paradipId = projRes.rows[1]?.id || null;

  const sampleTraces = [
    // 1. Report Ingestion Trace (Nova Micro) - Area 3 Tank Farm
    {
      trace_id: 'trc_rep_tankfarm_24xx',
      request_type: 'report_ingestion',
      project_id: baghjanId,
      model_id: 'apac.amazon.nova-micro-v1:0',
      input_tokens: 184,
      output_tokens: 62,
      latency_ms: 485,
      created_at: new Date(Date.now() - 1000 * 60 * 15), // 15 mins ago
      stages: [
        {
          name: '1. S3 Encrypted Document Landing',
          duration_ms: 22,
          status: 'completed',
          metadata: { bucket: 'progressly-reports-prod', key: 'uploads/daily-report-2026-08-28.txt', encryption: 'AES-256' },
        },
        {
          name: '2. SQS Ingestion Queue Dispatch',
          duration_ms: 18,
          status: 'completed',
          metadata: { queue: 'progressly-report-queue-prod', message_id: 'msg_9843a0e' },
        },
        {
          name: '3. Amazon Bedrock Nova Micro Extraction',
          duration_ms: 295,
          status: 'completed',
          metadata: { input_tokens: 184, output_tokens: 62, extracted_entities: 2, discipline: 'piping' },
        },
        {
          name: '4. Amazon Titan V2 Vectorization (1024d)',
          duration_ms: 82,
          status: 'completed',
          metadata: { dimensions: 1024, vector_norm: 'normalized' },
        },
        {
          name: '5. PostgreSQL pgvector Cosine Search',
          duration_ms: 14,
          status: 'completed',
          metadata: { candidate_activity: 'L6-PIP-0243', similarity_score: 0.924 },
        },
        {
          name: '6. 3-Tier Policy Governance Routing',
          duration_ms: 8,
          status: 'completed',
          metadata: { policy_tier: 'Tier 2 (70-94%)', destination: 'Review Queue', status: 'Planner Review' },
        },
      ],
    },

    // 2. Memory RAG Query Trace (Nova Pro) - Civil Foundation Inquiry
    {
      trace_id: 'trc_rag_civil_monsoon',
      request_type: 'memory_rag_query',
      project_id: baghjanId,
      model_id: 'apac.amazon.nova-pro-v1:0',
      input_tokens: 1420,
      output_tokens: 380,
      latency_ms: 1240,
      created_at: new Date(Date.now() - 1000 * 60 * 45), // 45 mins ago
      stages: [
        {
          name: '1. Titan V2 Query Vectorization',
          duration_ms: 94,
          status: 'completed',
          metadata: { dimensions: 1024, query: 'Why did past civil foundation and excavation activities suffer major schedule overruns?' },
        },
        {
          name: '2. PostgreSQL pgvector Top-K Retrieval',
          duration_ms: 18,
          status: 'completed',
          metadata: { records_retrieved: 6, topK: 6, similarity_threshold: 0.70 },
        },
        {
          name: '3. Statistical Grounding & Frequency Analysis',
          duration_ms: 12,
          status: 'completed',
          metadata: { average_delay_days: 5.4, max_delay: 9, delay_frequency: '83.3%' },
        },
        {
          name: '4. Amazon Bedrock Nova Pro Synthesis',
          duration_ms: 1116,
          status: 'completed',
          metadata: { input_tokens: 1420, output_tokens: 380, citations_count: 5, model: 'apac.amazon.nova-pro-v1:0' },
        },
      ],
    },

    // 3. Schedule Vectorization Trace (Titan V2) - Initial Baseline Ingestion
    {
      trace_id: 'trc_emb_schedule_baghjan',
      request_type: 'schedule_vectorization',
      project_id: baghjanId,
      model_id: 'amazon.titan-embed-text-v2:0',
      input_tokens: 820,
      output_tokens: 0,
      latency_ms: 640,
      created_at: new Date(Date.now() - 1000 * 60 * 120), // 2 hours ago
      stages: [
        {
          name: '1. CSV Parsing & Activity Tokenization',
          duration_ms: 15,
          status: 'completed',
          metadata: { activities_count: 15, total_characters: 3280 },
        },
        {
          name: '2. Batch Bedrock Titan V2 Vector Generation',
          duration_ms: 580,
          status: 'completed',
          metadata: { dimensions: 1024, vectors_generated: 15 },
        },
        {
          name: '3. PostgreSQL pgvector Bulk Update',
          duration_ms: 45,
          status: 'completed',
          metadata: { table: 'activities', updated_rows: 15 },
        },
      ],
    },

    // 4. Memory Archive Import Trace (Titan V2 + Closed Loop)
    {
      trace_id: 'trc_imp_past_archives',
      request_type: 'memory_import',
      project_id: paradipId,
      model_id: 'amazon.titan-embed-text-v2:0',
      input_tokens: 2150,
      output_tokens: 0,
      latency_ms: 980,
      created_at: new Date(Date.now() - 1000 * 60 * 360), // 6 hours ago
      stages: [
        {
          name: '1. Historical CSV Ingestion & Validation',
          duration_ms: 25,
          status: 'completed',
          metadata: { source: 'Mumbai High & Jamnagar Company Archives', rows_parsed: 9 },
        },
        {
          name: '2. Bedrock Titan V2 Embedding Generation',
          duration_ms: 890,
          status: 'completed',
          metadata: { vectors_created: 9, dimensions: 1024 },
        },
        {
          name: '3. Database Ingestion & pgvector Index Update',
          duration_ms: 65,
          status: 'completed',
          metadata: { destination: 'historical_records', total_records: 49 },
        },
      ],
    },

    // 5. Report Ingestion Trace (Nova Micro) - Civil Compressor Pedestal
    {
      trace_id: 'trc_rep_civil_compressor',
      request_type: 'report_ingestion',
      project_id: baghjanId,
      model_id: 'apac.amazon.nova-micro-v1:0',
      input_tokens: 210,
      output_tokens: 58,
      latency_ms: 430,
      created_at: new Date(Date.now() - 1000 * 60 * 720), // 12 hours ago
      stages: [
        {
          name: '1. S3 Encrypted Document Landing',
          duration_ms: 19,
          status: 'completed',
          metadata: { bucket: 'progressly-reports-prod', key: 'uploads/daily-civil-01.txt' },
        },
        {
          name: '2. SQS Ingestion Queue Dispatch',
          duration_ms: 14,
          status: 'completed',
          metadata: { queue: 'progressly-report-queue-prod' },
        },
        {
          name: '3. Amazon Bedrock Nova Micro Extraction',
          duration_ms: 280,
          status: 'completed',
          metadata: { input_tokens: 210, output_tokens: 58, discipline: 'civil' },
        },
        {
          name: '4. Amazon Titan V2 Vectorization (1024d)',
          duration_ms: 78,
          status: 'completed',
          metadata: { dimensions: 1024 },
        },
        {
          name: '5. PostgreSQL pgvector Cosine Search',
          duration_ms: 12,
          status: 'completed',
          metadata: { candidate_activity: 'L6-CIV-0120', similarity_score: 0.70 },
        },
        {
          name: '6. 3-Tier Policy Governance Routing',
          duration_ms: 6,
          status: 'completed',
          metadata: { policy_tier: 'Tier 2 (70-94%)', destination: 'Review Queue' },
        },
      ],
    },

    // 6. Memory RAG Query Trace (Nova Pro) - Piping Delay Root Causes
    {
      trace_id: 'trc_rag_piping_materials',
      request_type: 'memory_rag_query',
      project_id: baghjanId,
      model_id: 'apac.amazon.nova-pro-v1:0',
      input_tokens: 1680,
      output_tokens: 420,
      latency_ms: 1380,
      created_at: new Date(Date.now() - 1000 * 60 * 1440), // 1 day ago
      stages: [
        {
          name: '1. Titan V2 Query Vectorization',
          duration_ms: 88,
          status: 'completed',
          metadata: { query: 'What caused piping delays in past projects?' },
        },
        {
          name: '2. PostgreSQL pgvector Top-K Retrieval',
          duration_ms: 22,
          status: 'completed',
          metadata: { records_retrieved: 6 },
        },
        {
          name: '3. Statistical Grounding & Frequency Analysis',
          duration_ms: 15,
          status: 'completed',
          metadata: { primary_cause: 'material shortage (50%)', average_delay_days: 10.3 },
        },
        {
          name: '4. Amazon Bedrock Nova Pro Synthesis',
          duration_ms: 1255,
          status: 'completed',
          metadata: { input_tokens: 1680, output_tokens: 420, citations: 4 },
        },
      ],
    },
  ];

  for (const trace of sampleTraces) {
    const costUsd = calculateBedrockCost(trace.model_id, trace.input_tokens, trace.output_tokens);
    await pool.query(
      `INSERT INTO analytics_traces (
        trace_id, request_type, project_id, model_id,
        input_tokens, output_tokens, cost_usd, latency_ms,
        stages, status, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, 'completed', $10)
      ON CONFLICT (trace_id) DO UPDATE SET
        input_tokens = EXCLUDED.input_tokens,
        output_tokens = EXCLUDED.output_tokens,
        cost_usd = EXCLUDED.cost_usd,
        latency_ms = EXCLUDED.latency_ms,
        stages = EXCLUDED.stages;`,
      [
        trace.trace_id,
        trace.request_type,
        trace.project_id,
        trace.model_id,
        trace.input_tokens,
        trace.output_tokens,
        costUsd,
        trace.latency_ms,
        JSON.stringify(trace.stages),
        trace.created_at,
      ]
    );
  }

  console.log('✓ Successfully seeded realistic analytics and lifecycle traces!');
  process.exit(0);
}

seedAnalytics().catch(console.error);
