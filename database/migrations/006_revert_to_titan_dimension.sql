-- 006_revert_to_titan_dimension.sql
-- ============================================================================
-- PRODUCTION BEDROCK TITAN V2 EMBEDDINGS (1024 Dimensions)
-- ============================================================================
-- Amazon Bedrock model access (Titan Text Embeddings V2) is confirmed working.
-- This migration transitions the activities.embedding column from the temporary
-- 384-dimension vector back to the production 1024-dimension vector.
-- Existing temporary embeddings are cleared and will be regenerated via Titan V2.
-- ============================================================================

DROP INDEX IF EXISTS idx_activities_embedding;

-- Reset embeddings to NULL before type alteration
UPDATE activities SET embedding = NULL;

ALTER TABLE activities 
ALTER COLUMN embedding TYPE vector(1024);

CREATE INDEX IF NOT EXISTS idx_activities_embedding 
ON activities USING hnsw (embedding vector_cosine_ops);
