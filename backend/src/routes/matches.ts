import { Router, Request, Response } from 'express';
import { pool } from '../db';

const router = Router();

// GET /matches - List matches with joins for activity_code and event details
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, event_id, activity_id, project_id, projectId } = req.query;
    const targetProjectId = (project_id || projectId) as string | undefined;
    const conditions: string[] = [];
    const params: string[] = [];

    if (targetProjectId && typeof targetProjectId === 'string') {
      params.push(targetProjectId);
      conditions.push(`(w.project_id = $${params.length} OR r.project_id = $${params.length})`);
    }

    if (status && typeof status === 'string') {
      params.push(status);
      conditions.push(`m.status = $${params.length}`);
    }

    if (event_id && typeof event_id === 'string') {
      params.push(event_id);
      conditions.push(`m.event_id = $${params.length}`);
    }

    if (activity_id && typeof activity_id === 'string') {
      params.push(activity_id);
      conditions.push(`m.activity_id = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT 
        m.id,
        m.event_id,
        m.activity_id,
        m.confidence_score,
        m.status,
        m.model_version,
        m.created_at,
        m.resolved_at,
        m.resolved_by,
        w.project_id,
        a.activity_code,
        a.description AS activity_description,
        a.discipline AS activity_discipline,
        a.line AS activity_line,
        a.location AS activity_location,
        e.activity_description AS event_description,
        e.discipline AS event_discipline,
        e.line AS event_line,
        e.location AS event_location,
        e.event_type,
        e.quantity,
        e.report_id,
        e.extracted_json,
        r.file_path AS report_file_path,
        r.file_type AS report_file_type,
        r.uploaded_by AS report_uploaded_by
      FROM matches m
      JOIN activities a ON m.activity_id = a.id
      JOIN wbs_nodes w ON a.wbs_node_id = w.id
      JOIN actual_events e ON m.event_id = e.id
      LEFT JOIN reports r ON e.report_id = r.id
      ${whereClause}
      ORDER BY m.created_at DESC;
    `;

    const result = await pool.query(query, params);
    res.status(200).json({
      count: result.rows.length,
      matches: result.rows,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch matches';
    console.error('[BridgeIQ Backend] Error fetching matches:', error);
    res.status(500).json({ error: message });
  }
});

// PATCH /matches/:id - Update match status and record audit log entry
router.patch('/:id', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { status, resolved_by = 'Planner' } = req.body;

  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!id || !UUID_REGEX.test(id)) {
    res.status(400).json({ error: 'Invalid match ID format. Must be a valid UUID.' });
    return;
  }

  const validStatuses = [
    'pending',
    'auto_approved',
    'planner_approved',
    'rejected',
    'manual_resolution',
  ];

  if (!status || typeof status !== 'string' || !validStatuses.includes(status)) {
    res.status(400).json({
      error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
    });
    return;
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Fetch current match details + associated report_id
    const fetchQuery = `
      SELECT m.*, e.report_id
      FROM matches m
      JOIN actual_events e ON m.event_id = e.id
      WHERE m.id = $1
      FOR UPDATE;
    `;
    const matchRes = await client.query(fetchQuery, [id]);

    if (matchRes.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'Match not found' });
      return;
    }

    const currentMatch = matchRes.rows[0];
    const previousValue = {
      status: currentMatch.status,
      resolved_at: currentMatch.resolved_at,
      resolved_by: currentMatch.resolved_by,
    };

    // 2. Update match status
    const updateMatchQuery = `
      UPDATE matches
      SET status = $1,
          resolved_at = NOW(),
          resolved_by = $2
      WHERE id = $3
      RETURNING *;
    `;
    const updatedMatchRes = await client.query(updateMatchQuery, [status, resolved_by, id]);
    const updatedMatch = updatedMatchRes.rows[0];

    // 2b. If approved, link and update activity actual dates & progress
    if (status === 'planner_approved' || status === 'auto_approved') {
      const evtRes = await client.query('SELECT * FROM actual_events WHERE id = $1', [currentMatch.event_id]);
      const evt = evtRes.rows[0];
      if (evt) {
        if (evt.event_type === 'end') {
          await client.query(
            `UPDATE activities 
             SET actual_start = COALESCE(actual_start, planned_start, NOW() - interval '2 days'),
                 actual_end = NOW(),
                 progress_pct = 100
             WHERE id = $1`,
            [currentMatch.activity_id]
          );
        } else if (evt.event_type === 'start') {
          await client.query(
            `UPDATE activities 
             SET actual_start = NOW(),
                 progress_pct = COALESCE(progress_pct, 20)
             WHERE id = $1`,
            [currentMatch.activity_id]
          );
        } else {
          await client.query(
            `UPDATE activities 
             SET actual_start = COALESCE(actual_start, planned_start, NOW() - interval '1 day'),
                 progress_pct = GREATEST(COALESCE(progress_pct, 0), 60)
             WHERE id = $1`,
            [currentMatch.activity_id]
          );
        }
      }
    }

    const newValue = {
      status: updatedMatch.status,
      resolved_at: updatedMatch.resolved_at,
      resolved_by: updatedMatch.resolved_by,
    };

    // 3. Write immutable record to audit_log
    const auditQuery = `
      INSERT INTO audit_log (
        match_id,
        action,
        source_report_id,
        confidence_score,
        model_version,
        approver,
        previous_value,
        new_value,
        timestamp
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING *;
    `;

    const auditRes = await client.query(auditQuery, [
      id,
      `match_${status}`,
      currentMatch.report_id,
      currentMatch.confidence_score,
      currentMatch.model_version,
      resolved_by,
      JSON.stringify(previousValue),
      JSON.stringify(newValue),
    ]);

    await client.query('COMMIT');

    res.status(200).json({
      message: `Match status updated to '${status}' successfully.`,
      match: updatedMatch,
      audit_entry: auditRes.rows[0],
    });
  } catch (error: unknown) {
    await client.query('ROLLBACK');
    const message = error instanceof Error ? error.message : 'Failed to update match';
    console.error('[BridgeIQ Backend] Error updating match:', error);
    res.status(500).json({ error: message });
  } finally {
    client.release();
  }
});

export default router;
