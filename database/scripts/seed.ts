import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgrespassword@localhost:5433/bridgeiq_db';

async function seedDatabase() {
  const client = new Client({ connectionString: DATABASE_URL });
  console.log('[BridgeIQ Seed] Connecting to database...');
  await client.connect();
  console.log('[BridgeIQ Seed] Connected successfully.');

  try {
    await client.query('BEGIN');

    // 1. Create / Retrieve Default Project
    console.log('[BridgeIQ Seed] Seeding Project...');
    const projectRes = await client.query(`
      INSERT INTO projects (name, org)
      VALUES ('Oil India Ltd - Duliajan Gas Gathering Station Modernization', 'Oil India Limited')
      ON CONFLICT DO NOTHING
      RETURNING id;
    `);

    let projectId: string;
    if (projectRes.rows.length > 0) {
      projectId = projectRes.rows[0].id;
    } else {
      const existing = await client.query('SELECT id FROM projects LIMIT 1');
      projectId = existing.rows[0].id;
    }

    // 2. Seed WBS Hierarchy (L1 down to L6)
    console.log('[BridgeIQ Seed] Seeding WBS hierarchy...');
    const l1 = await client.query(
      `INSERT INTO wbs_nodes (project_id, level, name, discipline)
       VALUES ($1, 'L1', 'Duliajan GGS Modernization', 'management')
       RETURNING id`,
      [projectId]
    );

    const l2 = await client.query(
      `INSERT INTO wbs_nodes (project_id, parent_id, level, name, discipline)
       VALUES ($1, $2, 'L2', 'Offsite & Utilities Infrastructure', 'general')
       RETURNING id`,
      [projectId, l1.rows[0].id]
    );

    const l3 = await client.query(
      `INSERT INTO wbs_nodes (project_id, parent_id, level, name, discipline)
       VALUES ($1, $2, 'L3', 'Process Piping & Mechanical Units', 'piping')
       RETURNING id`,
      [projectId, l2.rows[0].id]
    );

    const l4 = await client.query(
      `INSERT INTO wbs_nodes (project_id, parent_id, level, name, discipline)
       VALUES ($1, $2, 'L4', 'Tank Farm & Manifold Area', 'piping')
       RETURNING id`,
      [projectId, l3.rows[0].id]
    );

    const l5 = await client.query(
      `INSERT INTO wbs_nodes (project_id, parent_id, level, name, discipline)
       VALUES ($1, $2, 'L5', 'Line 24 Hydrocarbon Transfer Loop', 'piping')
       RETURNING id`,
      [projectId, l4.rows[0].id]
    );

    const l6Piping = await client.query(
      `INSERT INTO wbs_nodes (project_id, parent_id, level, name, discipline)
       VALUES ($1, $2, 'L6', 'Piping Spool Erection & Testing', 'piping')
       RETURNING id`,
      [projectId, l5.rows[0].id]
    );

    const l6Civil = await client.query(
      `INSERT INTO wbs_nodes (project_id, parent_id, level, name, discipline)
       VALUES ($1, $2, 'L6', 'Civil Concrete & Foundation Works', 'civil')
       RETURNING id`,
      [projectId, l2.rows[0].id]
    );

    const l6Electrical = await client.query(
      `INSERT INTO wbs_nodes (project_id, parent_id, level, name, discipline)
       VALUES ($1, $2, 'L6', 'Electrical Substation & Cabling', 'electrical')
       RETURNING id`,
      [projectId, l2.rows[0].id]
    );

    // 3. Seed Schedule Activities
    console.log('[BridgeIQ Seed] Seeding Activities...');
    const activities = [
      {
        wbs_node_id: l6Piping.rows[0].id,
        code: 'L6-PIP-0241',
        desc: 'Erect Line 24-XX Pipe Spools',
        disc: 'piping',
        line: '24',
        loc: 'Tank Farm Area A',
        pStart: '2026-09-01T08:00:00Z',
        pEnd: '2026-09-15T17:00:00Z',
      },
      {
        wbs_node_id: l6Piping.rows[0].id,
        code: 'L6-PIP-0242',
        desc: 'Hydrotest Line 24-XX System',
        disc: 'piping',
        line: '24',
        loc: 'Tank Farm Area A',
        pStart: '2026-09-16T08:00:00Z',
        pEnd: '2026-09-20T17:00:00Z',
      },
      {
        wbs_node_id: l6Civil.rows[0].id,
        code: 'L6-CIV-0112',
        desc: 'Construct Tank Farm Foundation Pad',
        disc: 'civil',
        line: 'TF-01',
        loc: 'Tank Farm Area B',
        pStart: '2026-08-15T08:00:00Z',
        pEnd: '2026-08-30T17:00:00Z',
      },
      {
        wbs_node_id: l6Electrical.rows[0].id,
        code: 'L6-ELE-0301',
        desc: 'Cable Pulling & Termination for Substation 4',
        disc: 'electrical',
        line: 'Sub-04',
        loc: 'Substation 4',
        pStart: '2026-09-05T08:00:00Z',
        pEnd: '2026-09-12T17:00:00Z',
      },
    ];

    const activityIdMap: Record<string, string> = {};

    for (const act of activities) {
      const actRes = await client.query(
        `INSERT INTO activities (
          wbs_node_id, activity_code, description, discipline, line, location, planned_start, planned_end
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (activity_code) DO UPDATE SET
          description = EXCLUDED.description
        RETURNING id, activity_code;`,
        [act.wbs_node_id, act.code, act.desc, act.disc, act.line, act.loc, act.pStart, act.pEnd]
      );
      activityIdMap[act.code] = actRes.rows[0].id;
    }

    // 4. Seed Reports
    console.log('[BridgeIQ Seed] Seeding Reports...');
    const report1 = await client.query(
      `INSERT INTO reports (project_id, uploaded_by, file_path, file_type, status)
       VALUES ($1, 'Rajesh Sharma (Piping Supervisor)', './uploads/daily-report-pipe-01.txt', 'free-text', 'processed')
       RETURNING id;`,
      [projectId]
    );

    const report2 = await client.query(
      `INSERT INTO reports (project_id, uploaded_by, file_path, file_type, status)
       VALUES ($1, 'Amit Borah (QC Inspector)', './uploads/daily-report-pipe-02.txt', 'free-text', 'processed')
       RETURNING id;`,
      [projectId]
    );

    const report3 = await client.query(
      `INSERT INTO reports (project_id, uploaded_by, file_path, file_type, status)
       VALUES ($1, 'Sunil Saikia (Electrical Lead)', './uploads/daily-report-ele-01.txt', 'free-text', 'processed')
       RETURNING id;`,
      [projectId]
    );

    // 5. Seed Actual Events
    console.log('[BridgeIQ Seed] Seeding Actual Events...');
    const event1 = await client.query(
      `INSERT INTO actual_events (
        report_id, extracted_json, discipline, activity_description, line, location, event_type, quantity
      )
      VALUES ($1, $2, 'piping', 'Three spools for Line 24 were erected near Tank Farm Area A today.', '24', 'Tank Farm Area A', 'progress', 3)
      RETURNING id;`,
      [
        report1.rows[0].id,
        JSON.stringify({
          discipline: 'Piping',
          activity_description: 'spool erection',
          line: '24',
          location: 'Tank Farm Area A',
          quantity: 3,
          event: 'progress',
        }),
      ]
    );

    const event2 = await client.query(
      `INSERT INTO actual_events (
        report_id, extracted_json, discipline, activity_description, line, location, event_type, quantity
      )
      VALUES ($1, $2, 'piping', 'Line 24 welding complete; water filling in progress for hydrostatic pressure test.', '24', 'Tank Farm Area A', 'progress', 1)
      RETURNING id;`,
      [
        report2.rows[0].id,
        JSON.stringify({
          discipline: 'Piping',
          activity_description: 'hydrotest filling',
          line: '24',
          location: 'Tank Farm Area A',
          event: 'progress',
        }),
      ]
    );

    const event3 = await client.query(
      `INSERT INTO actual_events (
        report_id, extracted_json, discipline, activity_description, line, location, event_type, quantity
      )
      VALUES ($1, $2, 'electrical', 'Pulling 33kV feed cables across trench toward Substation 4.', 'Sub-04', 'Substation 4', 'progress', 1)
      RETURNING id;`,
      [
        report3.rows[0].id,
        JSON.stringify({
          discipline: 'Electrical',
          activity_description: 'cable pulling',
          line: 'Sub-04',
          location: 'Substation 4',
          event: 'progress',
        }),
      ]
    );

    // 6. Seed Matches (with varying confidence tiers)
    console.log('[BridgeIQ Seed] Seeding Matches...');

    // Match 1: High Confidence (98.7%) -> Auto-approved
    const match1 = await client.query(
      `INSERT INTO matches (
        event_id, activity_id, confidence_score, status, model_version, resolved_at, resolved_by
      )
      VALUES ($1, $2, 0.9870, 'auto_approved', 'bedrock-nova-micro-v1', NOW(), 'ai')
      RETURNING id;`,
      [event1.rows[0].id, activityIdMap['L6-PIP-0241']]
    );

    // Write audit log for Match 1
    await client.query(
      `INSERT INTO audit_log (
        match_id, action, source_report_id, confidence_score, model_version, approver, previous_value, new_value, timestamp
      )
      VALUES ($1, 'auto_approved_match', $2, 0.9870, 'bedrock-nova-micro-v1', 'ai', $3, $4, NOW());`,
      [
        match1.rows[0].id,
        report1.rows[0].id,
        JSON.stringify({ status: 'pending' }),
        JSON.stringify({ status: 'auto_approved', confidence: 0.9870, approver: 'ai' }),
      ]
    );

    // Match 2: Medium Confidence (86.5%) -> Pending Planner Review
    const match2 = await client.query(
      `INSERT INTO matches (
        event_id, activity_id, confidence_score, status, model_version
      )
      VALUES ($1, $2, 0.8650, 'pending', 'bedrock-nova-micro-v1')
      RETURNING id;`,
      [event2.rows[0].id, activityIdMap['L6-PIP-0242']]
    );

    // Match 3: Low Confidence (58.2%) -> Manual Resolution Flagged
    const match3 = await client.query(
      `INSERT INTO matches (
        event_id, activity_id, confidence_score, status, model_version
      )
      VALUES ($1, $2, 0.5820, 'manual_resolution', 'bedrock-nova-micro-v1')
      RETURNING id;`,
      [event3.rows[0].id, activityIdMap['L6-ELE-0301']]
    );

    await client.query('COMMIT');

    console.log('\n=========================================');
    console.log('✓ BridgeIQ Database Seeded Successfully!');
    console.log(`- Project ID: ${projectId}`);
    console.log(`- Match 1 (Auto-Approved, 98.7%): ${match1.rows[0].id}`);
    console.log(`- Match 2 (Pending Review, 86.5%): ${match2.rows[0].id} <-- Ready for PATCH /matches/:id`);
    console.log(`- Match 3 (Manual Res, 58.2%):    ${match3.rows[0].id}`);
    console.log('=========================================\n');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[BridgeIQ Seed] Error during seed:', err);
    throw err;
  } finally {
    await client.end();
  }
}

seedDatabase().catch((err) => {
  console.error('[BridgeIQ Seed] Seeding script failed:', err);
  process.exit(1);
});
