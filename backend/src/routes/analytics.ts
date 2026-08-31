import { Router, Request, Response } from 'express';
import { pool } from '../db';
import { BEDROCK_PRICING } from '../utils/telemetry';

const router = Router();

async function ensureAnalyticsTable(): Promise<void> {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS analytics_traces (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        trace_id VARCHAR(64) UNIQUE NOT NULL,
        request_type VARCHAR(32) NOT NULL,
        project_id UUID,
        model_id VARCHAR(64) NOT NULL,
        input_tokens INT DEFAULT 0,
        output_tokens INT DEFAULT 0,
        total_tokens INT GENERATED ALWAYS AS (input_tokens + output_tokens) STORED,
        cost_usd NUMERIC(12, 6) NOT NULL DEFAULT 0.000000,
        latency_ms INT NOT NULL DEFAULT 0,
        stages JSONB NOT NULL DEFAULT '[]'::jsonb,
        status VARCHAR(20) DEFAULT 'completed',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
  } catch (err) {
    console.warn('[Analytics] ensureAnalyticsTable error:', err);
  }
}

// GET /analytics/summary - Aggregated real-time metrics, costs, and model breakdowns
router.get('/summary', async (req: Request, res: Response): Promise<void> => {
  try {
    await ensureAnalyticsTable();
    const { projectId } = req.query;
    const whereClause = projectId && typeof projectId === 'string'
      ? `WHERE project_id = '${projectId.replace(/'/g, "''")}'`
      : '';

    // 1. Overall Totals
    const totalsQuery = `
      SELECT 
        COUNT(*)::int AS total_requests,
        COALESCE(SUM(input_tokens), 0)::int AS total_input_tokens,
        COALESCE(SUM(output_tokens), 0)::int AS total_output_tokens,
        COALESCE(SUM(total_tokens), 0)::int AS total_tokens,
        COALESCE(SUM(cost_usd), 0)::numeric(12, 6) AS total_cost_usd,
        COALESCE(ROUND(AVG(latency_ms)), 0)::int AS avg_latency_ms
      FROM analytics_traces
      ${whereClause};
    `;
    const totalsRes = await pool.query(totalsQuery);
    const totals = totalsRes.rows[0] || {
      total_requests: 0,
      total_input_tokens: 0,
      total_output_tokens: 0,
      total_tokens: 0,
      total_cost_usd: 0,
      avg_latency_ms: 0,
    };

    // 2. Model Breakdown
    const modelQuery = `
      SELECT 
        model_id,
        COUNT(*)::int AS requests_count,
        COALESCE(SUM(input_tokens), 0)::int AS input_tokens,
        COALESCE(SUM(output_tokens), 0)::int AS output_tokens,
        COALESCE(SUM(total_tokens), 0)::int AS total_tokens,
        COALESCE(SUM(cost_usd), 0)::numeric(12, 6) AS cost_usd,
        COALESCE(ROUND(AVG(latency_ms)), 0)::int AS avg_latency_ms
      FROM analytics_traces
      ${whereClause}
      GROUP BY model_id
      ORDER BY cost_usd DESC, total_tokens DESC;
    `;
    const modelRes = await pool.query(modelQuery);
    const modelBreakdown = modelRes.rows.map((row) => {
      const pricing = BEDROCK_PRICING[row.model_id] || { name: row.model_id, tier: 'Foundation Model' };
      return {
        ...row,
        name: pricing.name,
        tier: pricing.tier,
      };
    });

    // 3. Request Type Breakdown
    const typeQuery = `
      SELECT 
        request_type,
        COUNT(*)::int AS requests_count,
        COALESCE(SUM(total_tokens), 0)::int AS total_tokens,
        COALESCE(SUM(cost_usd), 0)::numeric(12, 6) AS cost_usd,
        COALESCE(ROUND(AVG(latency_ms)), 0)::int AS avg_latency_ms
      FROM analytics_traces
      ${whereClause}
      GROUP BY request_type
      ORDER BY requests_count DESC;
    `;
    const typeRes = await pool.query(typeQuery);

    // 4. Time-series chart points (Daily aggregated)
    const timeSeriesQuery = `
      SELECT 
        TO_CHAR(created_at, 'YYYY-MM-DD') AS date,
        COUNT(*)::int AS requests,
        COALESCE(SUM(total_tokens), 0)::int AS tokens,
        COALESCE(SUM(cost_usd), 0)::numeric(12, 6) AS cost
      FROM analytics_traces
      ${whereClause}
      GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
      ORDER BY date ASC
      LIMIT 14;
    `;
    const timeSeriesRes = await pool.query(timeSeriesQuery);

    res.status(200).json({
      summary: {
        total_requests: totals.total_requests,
        total_input_tokens: totals.total_input_tokens,
        total_output_tokens: totals.total_output_tokens,
        total_tokens: totals.total_tokens,
        total_cost_usd: Number(totals.total_cost_usd),
        avg_latency_ms: totals.avg_latency_ms,
      },
      model_breakdown: modelBreakdown,
      request_type_breakdown: typeRes.rows,
      time_series: timeSeriesRes.rows,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch analytics summary';
    console.error('[Analytics] Error fetching summary:', error);
    res.status(500).json({ error: message });
  }
});

// GET /analytics/traces - List request lifecycle traces with pagination
router.get('/traces', async (req: Request, res: Response): Promise<void> => {
  try {
    const { limit = 25, offset = 0, request_type, model_id, project_id } = req.query;
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (request_type && typeof request_type === 'string') {
      params.push(request_type);
      conditions.push(`request_type = $${params.length}`);
    }

    if (model_id && typeof model_id === 'string') {
      params.push(model_id);
      conditions.push(`model_id = $${params.length}`);
    }

    if (project_id && typeof project_id === 'string') {
      params.push(project_id);
      conditions.push(`project_id = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    params.push(Number(limit));
    const limitParam = `$${params.length}`;
    
    params.push(Number(offset));
    const offsetParam = `$${params.length}`;

    const query = `
      SELECT 
        id,
        trace_id,
        request_type,
        project_id,
        model_id,
        input_tokens,
        output_tokens,
        total_tokens,
        cost_usd,
        latency_ms,
        stages,
        status,
        created_at
      FROM analytics_traces
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ${limitParam} OFFSET ${offsetParam};
    `;

    const countQuery = `
      SELECT COUNT(*)::int AS total
      FROM analytics_traces
      ${whereClause};
    `;

    const [tracesRes, countRes] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, params.slice(0, conditions.length)),
    ]);

    const enrichedTraces = tracesRes.rows.map((trace) => {
      const pricing = BEDROCK_PRICING[trace.model_id] || { name: trace.model_id, tier: 'Foundation Model' };
      return {
        ...trace,
        model_name: pricing.name,
        model_tier: pricing.tier,
      };
    });

    res.status(200).json({
      total: countRes.rows[0]?.total || 0,
      limit: Number(limit),
      offset: Number(offset),
      traces: enrichedTraces,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch traces';
    console.error('[Analytics] Error fetching traces:', error);
    res.status(500).json({ error: message });
  }
});

// GET /analytics/traces/:id - Detailed trace with stages waterfall
router.get('/traces/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const query = `
      SELECT 
        t.id,
        t.trace_id,
        t.request_type,
        t.project_id,
        p.name AS project_name,
        t.model_id,
        t.input_tokens,
        t.output_tokens,
        t.total_tokens,
        t.cost_usd,
        t.latency_ms,
        t.stages,
        t.status,
        t.created_at
      FROM analytics_traces t
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.id::text = $1 OR t.trace_id = $1
      LIMIT 1;
    `;

    const result = await pool.query(query, [id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Trace not found' });
      return;
    }

    const trace = result.rows[0];
    const pricing = BEDROCK_PRICING[trace.model_id] || { name: trace.model_id, tier: 'Foundation Model' };

    res.status(200).json({
      ...trace,
      model_name: pricing.name,
      model_tier: pricing.tier,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch trace details';
    console.error('[Analytics] Error fetching trace detail:', error);
    res.status(500).json({ error: message });
  }
});

export default router;
