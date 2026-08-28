import { pool } from './db';

const MIGRATIONS = [
  {
    name: '001_create_projects_and_wbs',
    sql: `
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
    `,
  },
  {
    name: '002_create_activities_and_embeddings',
    sql: `
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
      CREATE INDEX IF NOT EXISTS idx_activities_embedding ON activities USING hnsw (embedding vector_cosine_ops);
    `,
  },
  {
    name: '003_create_reports_and_actual_events',
    sql: `
      CREATE TABLE IF NOT EXISTS reports (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          uploaded_by VARCHAR(255) NOT NULL,
          file_path VARCHAR(1024),
          file_type VARCHAR(50) NOT NULL CHECK (file_type IN ('free-text', 'csv', 'pdf', 'excel', 'image')),
          s3_key VARCHAR(1024),
          status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'processed', 'failed')),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_reports_project_id ON reports(project_id);
      CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
      CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at);

      CREATE TABLE IF NOT EXISTS actual_events (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
          extracted_json JSONB NOT NULL,
          discipline VARCHAR(50),
          activity_description TEXT,
          line VARCHAR(100),
          location VARCHAR(255),
          event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('start', 'end', 'progress')),
          quantity NUMERIC,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_actual_events_report_id ON actual_events(report_id);
      CREATE INDEX IF NOT EXISTS idx_actual_events_discipline ON actual_events(discipline);
      CREATE INDEX IF NOT EXISTS idx_actual_events_event_type ON actual_events(event_type);
    `,
  },
  {
    name: '004_create_matches_and_audit_log',
    sql: `
      CREATE TABLE IF NOT EXISTS matches (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          event_id UUID NOT NULL REFERENCES actual_events(id) ON DELETE CASCADE,
          activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
          confidence_score NUMERIC(5, 4) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
          status VARCHAR(50) NOT NULL DEFAULT 'pending' 
              CHECK (status IN ('pending', 'auto_approved', 'planner_approved', 'rejected', 'manual_resolution')),
          model_version VARCHAR(100) NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          resolved_at TIMESTAMPTZ,
          resolved_by VARCHAR(255)
      );

      CREATE INDEX IF NOT EXISTS idx_matches_event_id ON matches(event_id);
      CREATE INDEX IF NOT EXISTS idx_matches_activity_id ON matches(activity_id);
      CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
      CREATE INDEX IF NOT EXISTS idx_matches_confidence ON matches(confidence_score);

      CREATE TABLE IF NOT EXISTS audit_log (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          match_id UUID REFERENCES matches(id) ON DELETE SET NULL,
          action VARCHAR(100) NOT NULL,
          source_report_id UUID REFERENCES reports(id) ON DELETE SET NULL,
          confidence_score NUMERIC(5, 4),
          model_version VARCHAR(100),
          approver VARCHAR(255) NOT NULL,
          previous_value JSONB,
          new_value JSONB,
          timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_audit_log_match_id ON audit_log(match_id);
      CREATE INDEX IF NOT EXISTS idx_audit_log_source_report_id ON audit_log(source_report_id);
      CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp);
      CREATE INDEX IF NOT EXISTS idx_audit_log_approver ON audit_log(approver);
    `,
  },
  {
    name: '007_create_historical_records',
    sql: `
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
    `,
  },
];

export async function ensureDatabaseSchema(): Promise<void> {
  console.log('[BridgeIQ DB] Checking database schema & migrations...');

  try {
    // 1. Create migrations tracking table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    const res = await pool.query('SELECT name FROM schema_migrations');
    const applied = new Set(res.rows.map((r: { name: string }) => r.name));

    for (const migration of MIGRATIONS) {
      if (!applied.has(migration.name)) {
        console.log(`[BridgeIQ DB] Applying migration: ${migration.name}...`);
        await pool.query('BEGIN');
        try {
          await pool.query(migration.sql);
          await pool.query('INSERT INTO schema_migrations (name) VALUES ($1)', [migration.name]);
          await pool.query('COMMIT');
          console.log(`[BridgeIQ DB] ✓ Applied migration: ${migration.name}`);
        } catch (err) {
          await pool.query('ROLLBACK');
          console.error(`[BridgeIQ DB] ✗ Migration failed on ${migration.name}:`, err);
          throw err;
        }
      }
    }

    // 2. Ensure default demo project exists
    await pool.query(`
      INSERT INTO projects (id, name, org)
      VALUES ('00000000-0000-0000-0000-000000000001', 'Baghjan Gas Gathering Station Project', 'Oil India Limited')
      ON CONFLICT (id) DO NOTHING;
    `);

    console.log('[BridgeIQ DB] Schema verification complete. Database is ready.');
  } catch (err) {
    console.error('[BridgeIQ DB] Failed to verify/apply database migrations:', err);
  }
}
