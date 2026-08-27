import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import csv from 'csv-parser';
import { pool } from '../db';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// GET /activities - List activities with optional ?discipline= filter
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { discipline, wbs_node_id } = req.query;
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (discipline && typeof discipline === 'string') {
      params.push(discipline);
      conditions.push(`a.discipline = $${params.length}`);
    }

    if (wbs_node_id && typeof wbs_node_id === 'string') {
      params.push(wbs_node_id);
      conditions.push(`a.wbs_node_id = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const query = `
      SELECT 
        a.id,
        a.wbs_node_id,
        a.activity_code,
        a.description,
        a.discipline,
        a.line,
        a.location,
        a.planned_start,
        a.planned_end,
        a.actual_start,
        a.actual_end,
        a.progress_pct,
        (a.embedding IS NOT NULL) AS has_embedding,
        a.created_at,
        w.level AS wbs_level,
        w.name AS wbs_name
      FROM activities a
      JOIN wbs_nodes w ON a.wbs_node_id = w.id
      ${whereClause}
      ORDER BY a.activity_code ASC;
    `;

    const result = await pool.query(query, params);
    res.status(200).json({
      count: result.rows.length,
      activities: result.rows,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch activities';
    console.error('[BridgeIQ Backend] Error fetching activities:', error);
    res.status(500).json({ error: message });
  }
});

interface CSVActivityRow {
  activity_code: string;
  discipline: string;
  description: string;
  line?: string;
  location?: string;
  planned_start?: string;
  planned_end?: string;
  wbs_level?: string;
  wbs_name?: string;
}

// POST /activities/seed - Bulk-inserts activities from CSV upload or local seed-data/schedule.csv
router.post('/seed', upload.single('file'), async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    let csvStream: NodeJS.ReadableStream;

    if (req.file) {
      const { Readable } = await import('stream');
      csvStream = Readable.from(req.file.buffer);
    } else {
      const defaultCsvPath = path.resolve(process.cwd(), 'seed-data/schedule.csv');
      const rootCsvPath = path.resolve(process.cwd(), '../seed-data/schedule.csv');
      const targetPath = fs.existsSync(defaultCsvPath)
        ? defaultCsvPath
        : fs.existsSync(rootCsvPath)
        ? rootCsvPath
        : null;

      if (!targetPath) {
        res.status(400).json({
          error: 'No CSV file uploaded and default seed-data/schedule.csv not found on disk.',
        });
        return;
      }
      csvStream = fs.createReadStream(targetPath);
    }

    const rows: CSVActivityRow[] = [];
    await new Promise<void>((resolve, reject) => {
      csvStream
        .pipe(csv())
        .on('data', (data: CSVActivityRow) => rows.push(data))
        .on('end', () => resolve())
        .on('error', (err) => reject(err));
    });

    if (rows.length === 0) {
      res.status(400).json({ error: 'CSV file is empty or formatted incorrectly.' });
      return;
    }

    await client.query('BEGIN');

    // Ensure at least one project exists
    let projectId: string;
    const projectRes = await client.query('SELECT id FROM projects ORDER BY created_at ASC LIMIT 1');
    if (projectRes.rows.length === 0) {
      const newProj = await client.query(
        "INSERT INTO projects (name, org) VALUES ('Oil India Ltd - Duliajan Infrastructure', 'Oil India Limited') RETURNING id"
      );
      projectId = newProj.rows[0].id;
    } else {
      projectId = projectRes.rows[0].id;
    }

    let insertedCount = 0;

    for (const row of rows) {
      if (!row.activity_code || !row.description || !row.discipline) {
        continue;
      }

      // Ensure an L6 WBS node exists for this activity
      const wbsName = row.wbs_name || `${row.discipline.toUpperCase()} Executable Activity`;
      const wbsCheck = await client.query(
        'SELECT id FROM wbs_nodes WHERE project_id = $1 AND name = $2 LIMIT 1',
        [projectId, wbsName]
      );

      let wbsNodeId: string;
      if (wbsCheck.rows.length === 0) {
        const wbsInsert = await client.query(
          `INSERT INTO wbs_nodes (project_id, level, name, discipline)
           VALUES ($1, 'L6', $2, $3)
           RETURNING id`,
          [projectId, wbsName, row.discipline.toLowerCase()]
        );
        wbsNodeId = wbsInsert.rows[0].id;
      } else {
        wbsNodeId = wbsCheck.rows[0].id;
      }

      // Upsert activity (leaving embedding NULL for now as required)
      await client.query(
        `INSERT INTO activities (
          wbs_node_id, activity_code, description, discipline,
          line, location, planned_start, planned_end, embedding
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NULL)
        ON CONFLICT (activity_code) DO UPDATE SET
          description = EXCLUDED.description,
          discipline = EXCLUDED.discipline,
          line = EXCLUDED.line,
          location = EXCLUDED.location,
          planned_start = EXCLUDED.planned_start,
          planned_end = EXCLUDED.planned_end`,
        [
          wbsNodeId,
          row.activity_code.trim(),
          row.description.trim(),
          row.discipline.trim().toLowerCase(),
          row.line ? row.line.trim() : null,
          row.location ? row.location.trim() : null,
          row.planned_start ? new Date(row.planned_start) : null,
          row.planned_end ? new Date(row.planned_end) : null,
        ]
      );
      insertedCount++;
    }

    await client.query('COMMIT');

    res.status(201).json({
      message: `Successfully seeded ${insertedCount} schedule activities.`,
      count: insertedCount,
    });
  } catch (error: unknown) {
    await client.query('ROLLBACK');
    const message = error instanceof Error ? error.message : 'Failed to seed activities';
    console.error('[BridgeIQ Backend] Error seeding activities:', error);
    res.status(500).json({ error: message });
  } finally {
    client.release();
  }
});

export default router;
