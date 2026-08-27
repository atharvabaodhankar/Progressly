import { Client } from 'pg';
import { extractEvents } from '../extractor';
import { getEmbeddingProvider } from '../embeddingProvider';
import { applyBusinessRules } from '../matcher';
import { SAMPLE_REPORTS } from '../sample-reports';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'ai-worker/.env') });

const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgrespassword@localhost:5433/bridgeiq_db';

async function diagnose() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  const embedder = getEmbeddingProvider();

  console.log('================================================================');
  console.log('       CALIBRATION DIAGNOSTIC RUN — UPDATED FORMULA             ');
  console.log('================================================================\n');

  // -------------------------------------------------------------
  // REPORT 6 BREAKDOWN
  // -------------------------------------------------------------
  const report6 = SAMPLE_REPORTS.find((r) => r.id === 6)!;
  const extract6 = await extractEvents(report6.input);
  const event6 = extract6.events[0];

  console.log('[Report 6 Input Text]:');
  console.log(report6.input.trim());
  console.log('\n[Report 6 Extracted JSON]:');
  console.log(JSON.stringify(event6, null, 2));

  const query6 = `${event6.discipline} - ${event6.activity_description}. Line: ${
    event6.line || 'N/A'
  }. Location: ${event6.location || 'N/A'}`;
  console.log('\n[Generated Titan V2 Query String 6]:', query6);

  const vec6 = await embedder.embed(query6);

  const topCandidatesRes = await client.query(
    `SELECT 
      activity_code, 
      description, 
      discipline, 
      line, 
      location, 
      1 - (embedding <=> $1::vector) AS raw_sim
    FROM activities
    ORDER BY embedding <=> $1::vector ASC
    LIMIT 5;`,
    [`[${vec6.join(',')}]`]
  );

  console.log('\n[Top Candidates Detailed Scoring Breakdown (New Formula)]:');
  topCandidatesRes.rows.forEach((cand, idx) => {
    const rawSim = Number(cand.raw_sim);
    const calculatedRuleScore = applyBusinessRules(event6, {
      discipline: cand.discipline,
      line: cand.line,
      location: cand.location,
      vector_similarity: rawSim,
    });

    console.log(`\nRank ${idx + 1}: [${cand.activity_code}] "${cand.description}" (${cand.discipline})`);
    console.log(`  - Line in schedule: "${cand.line || 'null'}", Location in schedule: "${cand.location || 'null'}"`);
    console.log(`  - Raw Titan V2 Cosine Sim:     ${(rawSim * 100).toFixed(2)}% (${rawSim.toFixed(4)})`);
    console.log(`  - Multiplier & Penalty Rules:  ${rawSim < 0.70 ? 'Gated (Base Sim < 0.70 -> 0 positive bonus)' : 'Active (Base Sim >= 0.70)'}`);
    if (event6.line && !cand.line) {
      console.log(`  - Line Asymmetry Penalty:      -8.0% (Event Line "${event6.line}" vs Schedule Line null)`);
    }
    console.log(`  - New Calibrated Rule Score:   ${(calculatedRuleScore * 100).toFixed(2)}% (${calculatedRuleScore.toFixed(4)})`);
    console.log(`  - Status Tier:                 ${calculatedRuleScore < 0.70 ? 'MANUAL_RESOLUTION (< 70%)' : 'PLANNER_REVIEW (>= 70%)'}`);
  });

  // End-to-end match execution on Report 6
  console.log('\n================================================================');
  console.log('END-TO-END MATCH EXECUTION ON REPORT 6:');
  console.log('================================================================');
  const { matchEventToSchedule } = await import('../matcher');
  const m6 = await matchEventToSchedule(event6);
  console.log('Matched Candidate: ', m6.matched_candidate ? m6.matched_candidate.activity_code : 'None (No Match)');
  console.log('Final Confidence:  ', `${(m6.confidence_score * 100).toFixed(1)}%`);
  console.log('Approval Status:   ', m6.status.toUpperCase());
  console.log('Policy Action:     ', m6.policy_action);

  await client.end();
}

diagnose().catch((err) => {
  console.error('Diagnosis failed:', err);
  process.exit(1);
});
