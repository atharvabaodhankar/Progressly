-- 001_create_projects_and_wbs.sql
-- Core hierarchy: Project -> WBS Nodes (L1-L6)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    org VARCHAR(255) NOT NULL DEFAULT 'Oil India Limited',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wbs_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES wbs_nodes(id) ON DELETE CASCADE,
    level VARCHAR(10) NOT NULL CHECK (level IN ('L1', 'L2', 'L3', 'L4', 'L5', 'L6')),
    name VARCHAR(255) NOT NULL,
    discipline VARCHAR(50) CHECK (discipline IN ('civil', 'piping', 'electrical', 'instrumentation', 'HSE', 'static-rotating', 'management', 'general')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wbs_nodes_parent_id ON wbs_nodes(parent_id);
CREATE INDEX IF NOT EXISTS idx_wbs_nodes_project_id ON wbs_nodes(project_id);
CREATE INDEX IF NOT EXISTS idx_wbs_nodes_level ON wbs_nodes(level);
