import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { getEmbeddingProvider } from '../embeddingProvider';
import dotenv from 'dotenv';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgrespassword@localhost:5433/bridgeiq_db';

interface ActivityCSVRow {
  activity_code: string;
  description: string;
  discipline: string;
  line?: string;
  location?: string;
  planned_start?: string;
  planned_end?: string;
}

function normalizeWbsDiscipline(d: string): string {
  const lower = d.toLowerCase().trim();
  if (lower === 'hse') return 'HSE';
  if (lower.includes('static') || lower.includes('rotat')) return 'static-rotating';
  if (['civil', 'piping', 'electrical', 'instrumentation', 'management', 'general'].includes(lower)) {
    return lower;
  }
  return 'general';
}

async function syncAndEmbedSchedule() {
  console.log('================================================================');
  console.log('       BridgeIQ — Schedule Activity Sync & Embedding Pipeline');
  console.log('================================================================\n');

  const provider = getEmbeddingProvider();
  console.log(`[Engine]    Active Provider:  ${provider.name}`);
  console.log(`[Dimension] Vector Dimension: ${provider.dimension}`);

  if (provider.dimension !== 1024) {
    console.warn(
      `[Notice]   Operating with temporary ${provider.dimension}-dim local embeddings.` +
        ` Re-embed with Bedrock Titan V2 (1024-dim) once AWS quota is approved.\n`
    );
  }

  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    // 1. Locate CSV file
    const csvPath = path.resolve(process.cwd(), 'seed-data/schedule.csv');
    const rootCsvPath = path.resolve(process.cwd(), '../seed-data/schedule.csv');
    const targetPath = fs.existsSync(csvPath)
      ? csvPath
      : fs.existsSync(rootCsvPath)
      ? rootCsvPath
      : null;

    if (!targetPath) {
      throw new Error('Could not find seed-data/schedule.csv');
    }

    // 2. Parse CSV
    const rows: ActivityCSVRow[] = [];
    await new Promise<void>((resolve, reject) => {
      fs.createReadStream(targetPath)
        .pipe(csv())
        .on('data', (data) => rows.push(data))
        .on('end', () => resolve())
        .on('error', (err) => reject(err));
    });

    console.log(`Read ${rows.length} activities from ${path.basename(targetPath)}.`);

    // 3. Ensure Project exists
    const projectRes = await client.query('SELECT id FROM projects LIMIT 1');
    let projectId: string;
    if (projectRes.rows.length === 0) {
      const newProj = await client.query(
        "INSERT INTO projects (name, org) VALUES ('Oil India Ltd - Duliajan Infrastructure', 'Oil India Limited') RETURNING id"
      );
      projectId = newProj.rows[0].id;
    } else {
      projectId = projectRes.rows[0].id;
    }

    // 4. Upsert activities and embed
    console.log('Generating embeddings and updating pgvector store...\n');
    const startTime = Date.now();
    let embeddedCount = 0;

    for (const row of rows) {
      if (!row.activity_code || !row.description || !row.discipline) continue;

      const code = row.activity_code.trim();
      const desc = row.description.trim();
      const rawDisc = row.discipline.trim();
      const wbsDisc = normalizeWbsDiscipline(rawDisc);
      const line = row.line ? row.line.trim() : null;
      const loc = row.location ? row.location.trim() : null;

      // Ensure WBS Node exists
      const wbsName = `${rawDisc.toUpperCase()} Executable Works`;
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
          [projectId, wbsName, wbsDisc]
        );
        wbsNodeId = wbsInsert.rows[0].id;
      } else {
        wbsNodeId = wbsCheck.rows[0].id;
      }

      // Generate embedding for descriptive semantic representation
      const semanticText = `${rawDisc} - ${desc}. Line: ${line || 'N/A'}. Location: ${
        loc || 'N/A'
      }`;
      const vector = await provider.embed(semanticText);
      const vectorSql = `[${vector.join(',')}]`;

      await client.query(
        `INSERT INTO activities (
          wbs_node_id, activity_code, description, discipline, line, location,
          planned_start, planned_end, embedding
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (activity_code) DO UPDATE SET
          description = EXCLUDED.description,
          discipline = EXCLUDED.discipline,
          line = EXCLUDED.line,
          location = EXCLUDED.location,
          embedding = EXCLUDED.embedding`,
        [
          wbsNodeId,
          code,
          desc,
          wbsDisc,
          line,
          loc,
          row.planned_start ? new Date(row.planned_start) : null,
          row.planned_end ? new Date(row.planned_end) : null,
          vectorSql,
        ]
      );

      console.log(`✓ [${code}] Embedded: "${desc}" (${rawDisc})`);
      embeddedCount++;
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n================================================================`);
    console.log(
      `✓ Successfully synced and embedded ${embeddedCount} schedule activities in ${elapsed}s`
    );
    console.log(`================================================================\n`);
  } catch (err) {
    console.error('✗ Error embedding schedule:', err);
    throw err;
  } finally {
    await client.end();
  }
}

syncAndEmbedSchedule().catch((err) => {
  console.error('Schedule embedding pipeline failed:', err);
  process.exit(1);
});
