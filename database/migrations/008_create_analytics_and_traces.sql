-- Migration: 008_create_analytics_and_traces.sql
-- Description: Creates analytics_traces table to log real-time Bedrock token usage, costs, and request lifecycle stages.

CREATE TABLE IF NOT EXISTS analytics_traces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trace_id VARCHAR(64) UNIQUE NOT NULL,
    request_type VARCHAR(32) NOT NULL, -- 'report_ingestion', 'memory_rag_query', 'schedule_vectorization', 'memory_import'
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    model_id VARCHAR(64) NOT NULL, -- 'apac.amazon.nova-micro-v1:0', 'amazon.titan-embed-text-v2:0', 'apac.amazon.nova-pro-v1:0', etc.
    input_tokens INT DEFAULT 0,
    output_tokens INT DEFAULT 0,
    total_tokens INT GENERATED ALWAYS AS (input_tokens + output_tokens) STORED,
    cost_usd NUMERIC(12, 6) NOT NULL DEFAULT 0.000000,
    latency_ms INT NOT NULL DEFAULT 0,
    stages JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of { name, duration_ms, status, metadata }
    status VARCHAR(20) DEFAULT 'completed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance indexes for analytics dashboards & time-series aggregation
CREATE INDEX IF NOT EXISTS idx_analytics_traces_created_at ON analytics_traces(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_traces_request_type ON analytics_traces(request_type);
CREATE INDEX IF NOT EXISTS idx_analytics_traces_model_id ON analytics_traces(model_id);
CREATE INDEX IF NOT EXISTS idx_analytics_traces_project_id ON analytics_traces(project_id);
