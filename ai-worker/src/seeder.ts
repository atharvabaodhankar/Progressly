import { Client } from 'pg';
import { getEmbeddingProvider } from './embeddingProvider';
import { BASELINE_SCHEDULE, HISTORICAL_DATASET } from './seedData';

function normalizeWbsDiscipline(d: string): string {
  const lower = d.toLowerCase().trim();
  if (lower === 'hse') return 'HSE';
  if (lower.includes('static') || lower.includes('rotat')) return 'static-rotating';
  if (['civil', 'piping', 'electrical', 'instrumentation', 'management', 'general'].includes(lower)) {
    return lower;
  }
  return 'general';
}

export async function ensureBaselineSeeds(client: Client): Promise<void> {
  const provider = getEmbeddingProvider();
  console.log(`[BridgeIQ Seeder] Active Embedding Provider: ${provider.name} (${provider.dimension}-dim)`);

  // 1. Check & Seed Activities
  const actRes = await client.query('SELECT count(*)::int AS count FROM activities');
  const actCount = actRes.rows[0]?.count || 0;

  if (actCount === 0) {
    console.log(`[BridgeIQ Seeder] Activities table is empty. Seeding ${BASELINE_SCHEDULE.length} schedule activities with Titan V2 embeddings...`);
    
    // Ensure Project exists
    let projectId: string;
    const projectRes = await client.query('SELECT id FROM projects LIMIT 1');
    if (projectRes.rows.length === 0) {
      const newProj = await client.query(
        "INSERT INTO projects (id, name, org) VALUES ('00000000-0000-0000-0000-000000000001', 'Baghjan Gas Gathering Station Project', 'Oil India Limited') ON CONFLICT (id) DO NOTHING RETURNING id"
      );
      projectId = newProj.rows[0]?.id || '00000000-0000-0000-0000-000000000001';
    } else {
      projectId = projectRes.rows[0].id;
    }

    let embeddedActivities = 0;

    for (const act of BASELINE_SCHEDULE) {
      const wbsDisc = normalizeWbsDiscipline(act.discipline);
      const wbsName = `${act.discipline.toUpperCase()} Executable Works`;

      // Check/Create WBS Node
      let wbsNodeId: string;
      const wbsCheck = await client.query(
        'SELECT id FROM wbs_nodes WHERE project_id = $1 AND name = $2 LIMIT 1',
        [projectId, wbsName]
      );

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

      // Generate Titan V2 1024-dim embedding
      const semanticText = `${act.discipline} - ${act.description}. Line: ${act.line || 'N/A'}. Location: ${act.location || 'N/A'}`;
      const vector = await provider.embed(semanticText);
      const vectorSql = `[${vector.join(',')}]`;

      await client.query(
        `INSERT INTO activities (
          wbs_node_id, activity_code, description, discipline, line, location,
          planned_start, planned_end, embedding
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::vector)
        ON CONFLICT (activity_code) DO UPDATE SET
          description = EXCLUDED.description,
          discipline = EXCLUDED.discipline,
          line = EXCLUDED.line,
          location = EXCLUDED.location,
          embedding = EXCLUDED.embedding`,
        [
          wbsNodeId,
          act.activity_code,
          act.description,
          wbsDisc,
          act.line,
          act.location,
          new Date(act.planned_start),
          new Date(act.planned_end),
          vectorSql,
        ]
      );

      embeddedActivities++;
      console.log(`[BridgeIQ Seeder] ✓ [${act.activity_code}] Embedded: "${act.description}" (${act.discipline})`);
    }

    console.log(`[BridgeIQ Seeder] ✓ Successfully seeded and embedded ${embeddedActivities} schedule activities.`);
  } else {
    console.log(`[BridgeIQ Seeder] Activities table already contains ${actCount} records.`);
  }

  // 2. Check & Seed Historical Records
  const histRes = await client.query('SELECT count(*)::int AS count FROM historical_records');
  const histCount = histRes.rows[0]?.count || 0;

  if (histCount === 0) {
    console.log(`[BridgeIQ Seeder] Historical records table is empty. Seeding ${HISTORICAL_DATASET.length} past project records with Titan V2 embeddings...`);
    let embeddedHistory = 0;

    for (const record of HISTORICAL_DATASET) {
      const textToEmbed = `${record.activity_description}. Discipline: ${record.discipline}. Delay cause: ${
        record.delay_cause || 'none'
      }. Notes: ${record.notes}`;

      const vector = await provider.embed(textToEmbed);
      const vectorSql = `[${vector.join(',')}]`;

      await client.query(
        `INSERT INTO historical_records (
          project_name, discipline, activity_description,
          planned_duration_days, actual_duration_days, delay_cause, notes, embedding
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8::vector)`,
        [
          record.project_name,
          record.discipline,
          record.activity_description,
          record.planned_duration_days,
          record.actual_duration_days,
          record.delay_cause,
          record.notes,
          vectorSql,
        ]
      );

      embeddedHistory++;
      if (embeddedHistory % 10 === 0 || embeddedHistory === HISTORICAL_DATASET.length) {
        console.log(`[BridgeIQ Seeder] ✓ Embedded ${embeddedHistory}/${HISTORICAL_DATASET.length} historical records.`);
      }
    }

    console.log(`[BridgeIQ Seeder] ✓ Successfully seeded ${embeddedHistory} historical project records!`);
  } else {
    console.log(`[BridgeIQ Seeder] Historical records table already contains ${histCount} records.`);
  }
}
