-- 003_create_reports_and_actual_events.sql
-- Ingested reports and extracted structured actual events

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
