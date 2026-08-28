import { Router, Request, Response } from 'express';
import multer from 'multer';
import csv from 'csv-parser';
import { Readable } from 'stream';
import { InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { getBedrockRuntimeClient } from '../bedrockClient';
import { pool } from '../db';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

export interface CSVActivityRow {
  activity_code: string;
  description: string;
  discipline: string;
  line?: string;
  location?: string;
  planned_start?: string;
  planned_end?: string;
}

function normalizeWbsDiscipline(d: string): string {
  const lower = (d || '').toLowerCase().trim();
  if (lower === 'hse') return 'HSE';
  if (lower.includes('static') || lower.includes('rotat')) return 'static-rotating';
  if (['civil', 'piping', 'electrical', 'instrumentation', 'management', 'general'].includes(lower)) {
    return lower;
  }
  return 'general';
}

// 1. POST /projects - Create a new project
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, organization, org, location } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      res.status(400).json({ error: 'Project name is required and must be a non-empty string.' });
      return;
    }

    const orgName = (organization || org || 'Oil India Limited').trim();
    const locName = (location || '').trim() || null;

    const query = `
      INSERT INTO projects (name, org, location)
      VALUES ($1, $2, $3)
      RETURNING id, name, org, location, created_at;
    `;

    const result = await pool.query(query, [name.trim(), orgName, locName]);
    const project = result.rows[0];

    console.log(`[BridgeIQ Projects] ✓ Created project "${project.name}" (ID: ${project.id})`);

    res.status(201).json({
      success: true,
      project_id: project.id,
      project: {
        id: project.id,
        name: project.name,
        organization: project.org,
        location: project.location,
        created_at: project.created_at,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create project';
    console.error('[BridgeIQ Projects] Error creating project:', error);
    res.status(500).json({ error: message });
  }
});

// 2. GET /projects - List all projects with activity and report counts
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const query = `
      SELECT 
        p.id,
        p.name,
        COALESCE(p.org, 'Oil India Limited') AS organization,
        p.location,
        p.created_at,
        COUNT(DISTINCT a.id)::int AS activity_count,
        COUNT(DISTINCT r.id)::int AS report_count
      FROM projects p
      LEFT JOIN wbs_nodes w ON w.project_id = p.id
      LEFT JOIN activities a ON a.wbs_node_id = w.id
      LEFT JOIN reports r ON r.project_id = p.id
      GROUP BY p.id, p.name, p.org, p.location, p.created_at
      ORDER BY p.created_at ASC;
    `;

    const result = await pool.query(query);

    res.status(200).json({
      count: result.rows.length,
      projects: result.rows,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch projects';
    console.error('[BridgeIQ Projects] Error fetching projects:', error);
    res.status(500).json({ error: message });
  }
});

// 3. GET /projects/:projectId - Get single project details
router.get('/:projectId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;

    const projectRes = await pool.query(
      `SELECT 
         p.id,
         p.name,
         COALESCE(p.org, 'Oil India Limited') AS organization,
         p.location,
         p.created_at,
         COUNT(DISTINCT a.id)::int AS activity_count
       FROM projects p
       LEFT JOIN wbs_nodes w ON w.project_id = p.id
       LEFT JOIN activities a ON a.wbs_node_id = w.id
       WHERE p.id = $1
       GROUP BY p.id, p.name, p.org, p.location, p.created_at;`,
      [projectId]
    );

    if (projectRes.rows.length === 0) {
      res.status(404).json({ error: `Project with ID ${projectId} not found.` });
      return;
    }

    res.status(200).json({
      project: projectRes.rows[0],
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch project';
    console.error('[BridgeIQ Projects] Error fetching project:', error);
    res.status(500).json({ error: message });
  }
});

// Helper to generate a 1024d embedding using Bedrock Titan V2
async function generateTitanEmbedding(text: string): Promise<number[]> {
  const client = getBedrockRuntimeClient();
  const modelId = process.env.BEDROCK_EMBEDDING_MODEL_ID || 'amazon.titan-embed-text-v2:0';

  const payload = {
    inputText: text.trim(),
    dimensions: 1024,
    normalize: true,
  };

  const command = new InvokeModelCommand({
    modelId,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify(payload),
  });

  const res = await client.send(command);
  const json = JSON.parse(new TextDecoder().decode(res.body));
  return json.embedding;
}

// 4. POST /projects/:projectId/activities/import - CSV Import & Scoped Embeddings Generation
router.post('/:projectId/activities/import', upload.single('file'), async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const { projectId } = req.params;

    // Verify project exists
    const projCheck = await client.query('SELECT id, name FROM projects WHERE id = $1', [projectId]);
    if (projCheck.rows.length === 0) {
      res.status(404).json({ error: `Project with ID ${projectId} does not exist.` });
      return;
    }

    const projectName = projCheck.rows[0].name;

    // Parse CSV from uploaded buffer, csv_text, or raw JSON activities
    const rows: CSVActivityRow[] = [];

    if (req.file) {
      const stream = Readable.from(req.file.buffer);
      await new Promise<void>((resolve, reject) => {
        stream
          .pipe(csv())
          .on('data', (data) => rows.push(data))
          .on('end', () => resolve())
          .on('error', (err) => reject(err));
      });
    } else if (req.body.csv_text && typeof req.body.csv_text === 'string') {
      const stream = Readable.from(req.body.csv_text);
      await new Promise<void>((resolve, reject) => {
        stream
          .pipe(csv())
          .on('data', (data) => rows.push(data))
          .on('end', () => resolve())
          .on('error', (err) => reject(err));
      });
    } else if (Array.isArray(req.body.activities)) {
      rows.push(...req.body.activities);
    } else {
      res.status(400).json({
        error: 'Please upload a CSV file (`file`), provide `csv_text` in request body, or send an `activities` JSON array.',
      });
      return;
    }

    if (rows.length === 0) {
      res.status(400).json({ error: 'No valid activity rows found in uploaded CSV.' });
      return;
    }

    console.log(`[BridgeIQ Projects] Importing ${rows.length} activities for project "${projectName}" (${projectId})...`);

    await client.query('BEGIN');

    const createdActivities: {
      id: string;
      activity_code: string;
      description: string;
      discipline: string;
      line: string | null;
      location: string | null;
      has_embedding: boolean;
    }[] = [];

    // Step A: Insert activities with embedding = NULL initially
    for (const row of rows) {
      const code = (row.activity_code || '').trim();
      const desc = (row.description || '').trim();
      const disc = (row.discipline || '').trim();

      if (!code || !desc || !disc) continue;

      const normDisc = normalizeWbsDiscipline(disc);
      const wbsName = `${disc.toUpperCase()} Executable Works`;

      // Find or create WBS node for this project & discipline
      let wbsNodeId: string;
      const wbsRes = await client.query(
        'SELECT id FROM wbs_nodes WHERE project_id = $1 AND name = $2 LIMIT 1',
        [projectId, wbsName]
      );

      if (wbsRes.rows.length === 0) {
        const newWbs = await client.query(
          `INSERT INTO wbs_nodes (project_id, level, name, discipline)
           VALUES ($1, 'L6', $2, $3)
           RETURNING id`,
          [projectId, wbsName, normDisc]
        );
        wbsNodeId = newWbs.rows[0].id;
      } else {
        wbsNodeId = wbsRes.rows[0].id;
      }

      const line = (row.line || '').trim() || null;
      const loc = (row.location || '').trim() || null;
      const plannedStart = row.planned_start ? new Date(row.planned_start) : null;
      const plannedEnd = row.planned_end ? new Date(row.planned_end) : null;

      // Check if activity already exists in this WBS node
      const actCheck = await client.query(
        'SELECT id, activity_code, description, discipline, line, location FROM activities WHERE wbs_node_id = $1 AND activity_code = $2 LIMIT 1',
        [wbsNodeId, code]
      );

      let insertedId: string;
      if (actCheck.rows.length === 0) {
        const actInsert = await client.query(
          `INSERT INTO activities (
             wbs_node_id, activity_code, description, discipline, line, location,
             planned_start, planned_end, embedding
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NULL)
           RETURNING id, activity_code, description, discipline, line, location;`,
          [wbsNodeId, code, desc, normDisc, line, loc, plannedStart, plannedEnd]
        );
        insertedId = actInsert.rows[0].id;
      } else {
        insertedId = actCheck.rows[0].id;
        await client.query(
          `UPDATE activities SET
             description = $1,
             discipline = $2,
             line = $3,
             location = $4,
             planned_start = COALESCE($5, planned_start),
             planned_end = COALESCE($6, planned_end)
           WHERE id = $7`,
          [desc, normDisc, line, loc, plannedStart, plannedEnd, insertedId]
        );
      }

      createdActivities.push({
        id: insertedId,
        activity_code: code,
        description: desc,
        discipline: normDisc,
        line: line,
        location: loc,
        has_embedding: false,
      });
    }

    await client.query('COMMIT');

    console.log(`[BridgeIQ Projects] ✓ Created/Updated ${createdActivities.length} activities. Starting Titan V2 embeddings generation...`);

    // Step B: Generate embeddings via Titan V2 scoped to this project
    let embeddedCount = 0;

    for (const act of createdActivities) {
      try {
        const textToEmbed = `${act.discipline} - ${act.description}. Line: ${act.line || 'N/A'}. Location: ${act.location || 'N/A'}`;
        const vector = await generateTitanEmbedding(textToEmbed);
        const vectorSql = `[${vector.join(',')}]`;

        await pool.query('UPDATE activities SET embedding = $1 WHERE id = $2', [vectorSql, act.id]);
        act.has_embedding = true;
        embeddedCount++;
      } catch (embErr) {
        console.error(`[BridgeIQ Projects] ✗ Warning: Failed to generate Titan V2 embedding for [${act.activity_code}]:`, embErr);
      }
    }

    console.log(`[BridgeIQ Projects] ✓ Successfully generated embeddings for ${embeddedCount}/${createdActivities.length} activities.`);

    res.status(201).json({
      success: true,
      project_id: projectId,
      project_name: projectName,
      activities_created: createdActivities.length,
      embeddings_generated: embeddedCount,
      activities: createdActivities,
    });
  } catch (error: unknown) {
    await client.query('ROLLBACK').catch(() => {});
    const message = error instanceof Error ? error.message : 'Failed to import activities';
    console.error('[BridgeIQ Projects] Error importing activities:', error);
    res.status(500).json({ error: message });
  } finally {
    client.release();
  }
});

export default router;
