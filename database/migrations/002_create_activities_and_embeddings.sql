-- 002_create_activities_and_embeddings.sql
-- L5/L6 Activities with 1024-dimension pgvector embedding (Amazon Titan Text Embeddings V2)

CREATE TABLE IF NOT EXISTS activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wbs_node_id UUID NOT NULL REFERENCES wbs_nodes(id) ON DELETE CASCADE,
    activity_code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    discipline VARCHAR(50) NOT NULL,
    line VARCHAR(100),
    location VARCHAR(255),
    planned_start TIMESTAMPTZ,
    planned_end TIMESTAMPTZ,
    actual_start TIMESTAMPTZ,
    actual_end TIMESTAMPTZ,
    progress_pct NUMERIC(5, 2) DEFAULT 0.00 CHECK (progress_pct >= 0 AND progress_pct <= 100),
    embedding vector(1024),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activities_wbs_node_id ON activities(wbs_node_id);
CREATE INDEX IF NOT EXISTS idx_activities_code ON activities(activity_code);
CREATE INDEX IF NOT EXISTS idx_activities_discipline ON activities(discipline);
CREATE INDEX IF NOT EXISTS idx_activities_line ON activities(line);
CREATE INDEX IF NOT EXISTS idx_activities_location ON activities(location);

-- HNSW cosine distance index for Titan Text Embeddings V2
CREATE INDEX IF NOT EXISTS idx_activities_embedding 
ON activities USING hnsw (embedding vector_cosine_ops);
