-- 007_create_historical_records.sql
-- Institutional memory and past project execution records for RAG pipeline

CREATE TABLE IF NOT EXISTS historical_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_name VARCHAR(255) NOT NULL,
    discipline VARCHAR(50) NOT NULL,
    activity_description TEXT NOT NULL,
    planned_duration_days INT NOT NULL,
    actual_duration_days INT NOT NULL,
    delay_days INT GENERATED ALWAYS AS (actual_duration_days - planned_duration_days) STORED,
    delay_cause TEXT,
    notes TEXT,
    embedding vector(1024),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_historical_records_discipline ON historical_records(discipline);
CREATE INDEX IF NOT EXISTS idx_historical_records_embedding ON historical_records USING hnsw (embedding vector_cosine_ops);
