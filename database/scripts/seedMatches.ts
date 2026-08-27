import { Client } from 'pg';
import { extractEvents } from '../../ai-worker/src/extractor';
import { matchEventToSchedule } from '../../ai-worker/src/matcher';
import { SAMPLE_REPORTS } from '../../ai-worker/src/sample-reports';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'ai-worker/.env') });

const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgrespassword@localhost:5433/bridgeiq_db';

async function seedTestMatches() {
  console.log('================================================================');
  console.log('       BridgeIQ — Seeding Live Matches for Review Queue UI      ');
  console.log('================================================================\n');

  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    // 1. Get Project ID
    const projRes = await client.query('SELECT id FROM projects LIMIT 1');
    if (projRes.rows.length === 0) {
      throw new Error('No projects found. Please run npm run embed:schedule first.');
    }
    const projectId = projRes.rows[0].id;

    console.log(`Using Project: ${projectId}`);

    // Clear previous test matches and actual_events
    await client.query('DELETE FROM audit_log');
    await client.query('DELETE FROM matches');
    await client.query('DELETE FROM actual_events');
    await client.query('DELETE FROM reports');

    for (const sample of SAMPLE_REPORTS) {
      console.log(`Processing Sample Report ${sample.id}: "${sample.title}"...`);

      // 1. Insert Report
      const reportRes = await client.query(
        `INSERT INTO reports (project_id, uploaded_by, file_path, file_type, status)
         VALUES ($1, $2, $3, $4, 'processed')
         RETURNING id`,
        [
          projectId,
          sample.id % 2 === 0 ? 'Duliajan Field Supervisor' : 'Site Engineer - Area B',
          `uploads/report_sample_${sample.id}.txt`,
          sample.id === 4 ? 'csv' : 'free-text',
        ]
      );
      const reportId = reportRes.rows[0].id;

      // 2. Run Extraction
      const extractRes = await extractEvents(sample.input);

      for (const event of extractRes.events) {
        // Insert Actual Event
        const eventRes = await client.query(
          `INSERT INTO actual_events (
            report_id, discipline, activity_description, line, location,
            quantity, event_type, raw_extraction
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING id`,
          [
            reportId,
            event.discipline,
            event.activity_description,
            event.line,
            event.location,
            event.quantity,
            event.event_type,
            JSON.stringify(event),
          ]
        );
        const eventId = eventRes.rows[0].id;

        // 3. Run Matching
        const matchRes = await matchEventToSchedule(event);

        if (matchRes.matched_candidate) {
          // If the match was in Report 3 or Report 5 or Report 2, set some as 'pending' for review queue testing
          let status = matchRes.status;
          if (sample.id === 3 || sample.id === 5 || sample.id === 2) {
            status = 'pending';
          }

          await client.query(
            `INSERT INTO matches (
              event_id, activity_id, confidence_score, status, model_version
            )
            VALUES ($1, $2, $3, $4, 'bedrock-titan-v2-nova-micro')`,
            [
              eventId,
              matchRes.matched_candidate.activity_id,
              matchRes.confidence_score,
              status,
            ]
          );

          console.log(
            `  ✓ Created Match: [${matchRes.matched_candidate.activity_code}] ${matchRes.matched_candidate.description} | Status: ${status} (${(
              matchRes.confidence_score * 100
            ).toFixed(1)}%)`
          );
        } else {
          // Insert as manual_resolution match with fallback activity
          const fallbackAct = await client.query(
            'SELECT id FROM activities WHERE discipline = $1 LIMIT 1',
            [event.discipline.toLowerCase()]
          );
          const actId = fallbackAct.rows[0]?.id || (await client.query('SELECT id FROM activities LIMIT 1')).rows[0].id;

          await client.query(
            `INSERT INTO matches (
              event_id, activity_id, confidence_score, status, model_version
            )
            VALUES ($1, $2, 0.12, 'manual_resolution', 'bedrock-titan-v2-nova-micro')`,
            [eventId, actId]
          );

          console.log(`  ✓ Created Manual Resolution Item: "${event.activity_description}"`);
        }
      }
    }

    console.log('\n================================================================');
    console.log('✓ Successfully seeded reports, actual events, and matches!');
    console.log('================================================================\n');
  } finally {
    await client.end();
  }
}

seedTestMatches().catch((err) => {
  console.error('Failed to seed matches:', err);
  process.exit(1);
});
