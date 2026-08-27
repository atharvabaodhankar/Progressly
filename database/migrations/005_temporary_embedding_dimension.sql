-- 005_temporary_embedding_dimension.sql
-- ============================================================================
-- TEMPORARY ARCHITECTURE MIGRATION (Pending Bedrock Titan V2 Access)
-- ============================================================================
-- The production architecture specifies Amazon Bedrock Titan Text Embeddings V2
-- with 1024 dimensions.
-- While Bedrock quota access is pending, local high-performance transformer
-- embeddings (Xenova/all-MiniLM-L6-v2) produce 384 dimensions.
--
-- This migration temporarily alters the embedding column to vector(384) with
-- an HNSW index, allowing real semantic matching to run locally.
-- When switching back to Titan V2, re-run embedding script and alter to vector(1024).
-- ============================================================================

DROP INDEX IF EXISTS idx_activities_embedding;

ALTER TABLE activities 
ALTER COLUMN embedding TYPE vector(384);

CREATE INDEX IF NOT EXISTS idx_activities_embedding 
ON activities USING hnsw (embedding vector_cosine_ops);
