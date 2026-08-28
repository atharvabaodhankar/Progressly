import { Router, Request, Response } from 'express';
import { pool } from '../db';

const router = Router();

// GET /audit-log - List audit log entries, most recent first
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { match_id, source_report_id, approver, project_id, projectId } = req.query;
    const targetProjectId = (project_id || projectId) as string | undefined;
    const conditions: string[] = [];
    const params: string[] = [];

    if (targetProjectId && typeof targetProjectId === 'string') {
      params.push(targetProjectId);
      conditions.push(`(r.project_id = $${params.length} OR w.project_id = $${params.length})`);
    }

    if (match_id && typeof match_id === 'string') {
      params.push(match_id);
      conditions.push(`a.match_id = $${params.length}`);
    }

    if (source_report_id && typeof source_report_id === 'string') {
      params.push(source_report_id);
      conditions.push(`a.source_report_id = $${params.length}`);
    }

    if (approver && typeof approver === 'string') {
      params.push(approver);
      conditions.push(`a.approver = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT 
        a.id,
        a.match_id,
        a.action,
        a.source_report_id,
        a.confidence_score,
        a.model_version,
        a.approver,
        a.previous_value,
        a.new_value,
        a.timestamp,
        r.uploaded_by AS report_uploaded_by,
        r.file_type AS report_file_type,
        act.activity_code,
        act.description AS activity_description,
        act.discipline AS activity_discipline,
        evt.activity_description AS event_description,
        evt.discipline AS event_discipline,
        evt.line AS event_line,
        evt.location AS event_location,
        evt.event_type
      FROM audit_log a
      LEFT JOIN reports r ON a.source_report_id = r.id
      LEFT JOIN matches m ON a.match_id = m.id
      LEFT JOIN activities act ON m.activity_id = act.id
      LEFT JOIN wbs_nodes w ON act.wbs_node_id = w.id
      LEFT JOIN actual_events evt ON m.event_id = evt.id
      ${whereClause}
      ORDER BY a.timestamp DESC;
    `;

    const result = await pool.query(query, params);
    res.status(200).json({
      count: result.rows.length,
      audit_logs: result.rows,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch audit log';
    console.error('[BridgeIQ Backend] Error fetching audit log:', error);
    res.status(500).json({ error: message });
  }
});

export default router;
