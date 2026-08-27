import { Client } from 'pg';
import { extractEvents } from '../extractor';
import { matchEventToSchedule } from '../matcher';
import { SAMPLE_REPORTS } from '../sample-reports';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

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

    // Clear previous test matches, audit_log, and actual_events
    await client.query('DELETE FROM audit_log');
    await client.query('DELETE FROM matches');
    await client.query('DELETE FROM actual_events');
    await client.query('DELETE FROM reports');

    // Reset activities actual dates
    await client.query(`
      UPDATE activities 
      SET actual_start = NULL, actual_end = NULL, progress_pct = 0;
    `);

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
            quantity, event_type, extracted_json
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
          const status = matchRes.status;

          const matchInsert = await client.query(
            `INSERT INTO matches (
              event_id, activity_id, confidence_score, status, model_version, resolved_at, resolved_by
            )
            VALUES ($1, $2, $3, $4, 'bedrock-titan-v2-nova-micro', $5, $6)
            RETURNING id`,
            [
              eventId,
              matchRes.matched_candidate.activity_id,
              matchRes.confidence_score,
              status,
              status === 'auto_approved' ? new Date() : null,
              status === 'auto_approved' ? 'AI Auto-Approval Policy (Score ≥ 95%)' : null,
            ]
          );
          const matchId = matchInsert.rows[0].id;

          // If auto_approved, create initial audit_log entry and update activity actual dates
          if (status === 'auto_approved') {
            await client.query(
              `INSERT INTO audit_log (
                match_id, action, source_report_id, confidence_score, model_version,
                approver, previous_value, new_value, timestamp
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
              [
                matchId,
                'match_auto_approved',
                reportId,
                matchRes.confidence_score,
                'bedrock-titan-v2-nova-micro',
                'AI Auto-Approval Engine',
                JSON.stringify({ status: 'pending', schedule_linked: false }),
                JSON.stringify({
                  status: 'auto_approved',
                  confidence: `${(matchRes.confidence_score * 100).toFixed(1)}%`,
                  reasoning: matchRes.matched_candidate.reasoning,
                  schedule_linked: true,
                }),
              ]
            );

            // Update activity actual dates and progress
            if (event.activity_description.toLowerCase().includes('spool')) {
              // Delayed start example (+2 days delay)
              await client.query(
                `UPDATE activities 
                 SET actual_start = '2026-09-03', actual_end = '2026-09-05', progress_pct = 100
                 WHERE id = $1`,
                [matchRes.matched_candidate.activity_id]
              );
            } else if (event.activity_description.toLowerCase().includes('backfill')) {
              // In progress on schedule
              await client.query(
                `UPDATE activities 
                 SET actual_start = '2026-08-15', actual_end = NULL, progress_pct = 60
                 WHERE id = $1`,
                [matchRes.matched_candidate.activity_id]
              );
            } else if (event.activity_description.toLowerCase().includes('pump')) {
              // Completed on schedule
              await client.query(
                `UPDATE activities 
                 SET actual_start = '2026-09-10', actual_end = '2026-09-12', progress_pct = 100
                 WHERE id = $1`,
                [matchRes.matched_candidate.activity_id]
              );
            }
          }

          console.log(
            `  ✓ Created Match: [${matchRes.matched_candidate.activity_code}] ${matchRes.matched_candidate.description} | Status: ${status} (${(
              matchRes.confidence_score * 100
            ).toFixed(1)}%)`
          );
        } else {
          // Insert as manual_resolution match with fallback activity
          const fallbackAct = await client.query(
            'SELECT id FROM activities LIMIT 1'
          );
          const actId = fallbackAct.rows[0].id;

          await client.query(
            `INSERT INTO matches (
              event_id, activity_id, confidence_score, status, model_version
            )
            VALUES ($1, $2, 0.00, 'manual_resolution', 'bedrock-titan-v2-nova-micro')`,
            [eventId, actId]
          );

          console.log(`  ✓ Created Manual Resolution Item: "${event.activity_description}"`);
        }
      }
    }

    console.log('\n================================================================');
    console.log('✓ Successfully seeded reports, actual events, matches, and audit trail!');
    console.log('================================================================\n');
  } finally {
    await client.end();
  }
}

seedTestMatches().catch((err) => {
  console.error('Failed to seed matches:', err);
  process.exit(1);
});
