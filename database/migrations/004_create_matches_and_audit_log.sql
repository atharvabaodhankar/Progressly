-- 004_create_matches_and_audit_log.sql
-- Matching engine outputs and complete immutable audit trail

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
    approver VARCHAR(255) NOT NULL, -- 'ai' or user identifier (e.g. planner email / username)
    previous_value JSONB,
    new_value JSONB,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_match_id ON audit_log(match_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_source_report_id ON audit_log(source_report_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_log_approver ON audit_log(approver);
