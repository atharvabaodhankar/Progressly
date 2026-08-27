import { Client } from 'pg';
import { extractEvents } from '../extractor';
import { getEmbeddingProvider } from '../embeddingProvider';
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
  console.log('               CALIBRATION DIAGNOSTIC RUN                       ');
  console.log('================================================================\n');

  // -------------------------------------------------------------
  // PART 1: REPORT 1 vs REPORT 5 (Identical Real-World Event)
  // -------------------------------------------------------------
  console.log('================================================================');
  console.log('PART 1: REPORT 1 vs REPORT 5 COMPARISON');
  console.log('================================================================\n');

  const report1 = SAMPLE_REPORTS.find((r) => r.id === 1)!;
  const report5 = SAMPLE_REPORTS.find((r) => r.id === 5)!;

  const extract1 = await extractEvents(report1.input);
  const extract5 = await extractEvents(report5.input);

  const event1 = extract1.events[0];
  const event5 = extract5.events[0];

  console.log('[Report 1 Input Text]:');
  console.log(report1.input.trim());
  console.log('\n[Report 1 Extracted JSON]:');
  console.log(JSON.stringify(event1, null, 2));

  console.log('\n[Report 5 Input Text]:');
  console.log(report5.input.trim());
  console.log('\n[Report 5 Extracted JSON]:');
  console.log(JSON.stringify(event5, null, 2));

  // Build semantic query texts
  const query1 = `${event1.discipline} - ${event1.activity_description}. Line: ${
    event1.line || 'N/A'
  }. Location: ${event1.location || 'N/A'}`;
  const query5 = `${event5.discipline} - ${event5.activity_description}. Line: ${
    event5.line || 'N/A'
  }. Location: ${event5.location || 'N/A'}`;

  console.log('\n[Generated Titan V2 Query Strings]:');
  console.log('Query 1:', query1);
  console.log('Query 5:', query5);

  const vec1 = await embedder.embed(query1);
  const vec5 = await embedder.embed(query5);

  // Fetch L6-PIP-0241
  const actRes = await client.query(
    "SELECT id, activity_code, description, discipline, line, location, embedding FROM activities WHERE activity_code = 'L6-PIP-0241'"
  );
  const act = actRes.rows[0];

  const q1Res = await client.query(
    'SELECT 1 - (embedding <=> $1::vector) AS sim FROM activities WHERE activity_code = $2',
    [`[${vec1.join(',')}]`, 'L6-PIP-0241']
  );
  const q5Res = await client.query(
    'SELECT 1 - (embedding <=> $1::vector) AS sim FROM activities WHERE activity_code = $2',
    [`[${vec5.join(',')}]`, 'L6-PIP-0241']
  );

  // Cross similarity between query 1 and query 5
  const dotProduct = vec1.reduce((sum, val, i) => sum + val * vec5[i], 0);

  console.log('\n[Raw Titan V2 Cosine Similarities against L6-PIP-0241]:');
  console.log(`- Report 1 -> L6-PIP-0241: ${(Number(q1Res.rows[0].sim) * 100).toFixed(2)}%`);
  console.log(`- Report 5 -> L6-PIP-0241: ${(Number(q5Res.rows[0].sim) * 100).toFixed(2)}%`);
  console.log(`- Query 1 <-> Query 5 Vector Cosine Similarity: ${(dotProduct * 100).toFixed(2)}%`);

  // -------------------------------------------------------------
  // PART 2: REPORT 6 (Corrosion Damage on Line 18)
  // -------------------------------------------------------------
  console.log('\n================================================================');
  console.log('PART 2: REPORT 6 BREAKDOWN');
  console.log('================================================================\n');

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

  console.log('\n[Top Candidates Detailed Scoring Breakdown]:');
  topCandidatesRes.rows.forEach((cand, idx) => {
    const rawSim = Number(cand.raw_sim);
    let discBonus = 0;
    let lineBonus = 0;
    let locBonus = 0;

    // Discipline Rule
    const eDisc = (event6.discipline || '').toLowerCase();
    const cDisc = (cand.discipline || '').toLowerCase();
    if (eDisc === cDisc || (eDisc.includes('static') && cDisc.includes('static'))) {
      discBonus = +0.08;
    } else {
      discBonus = -0.35;
    }

    // Line Rule
    if (event6.line && cand.line) {
      if (event6.line.trim() === cand.line.trim()) {
        lineBonus = +0.15;
      } else {
        lineBonus = -0.25;
      }
    }

    // Loc Rule
    if (event6.location && cand.location) {
      if (event6.location.toLowerCase() === cand.location.toLowerCase()) {
        locBonus = +0.05;
      }
    }

    const totalRuleScore = Math.max(0, Math.min(1, rawSim + discBonus + lineBonus + locBonus));

    console.log(`\nRank ${idx + 1}: [${cand.activity_code}] "${cand.description}" (${cand.discipline})`);
    console.log(`  - Line in schedule: "${cand.line || 'null'}", Location in schedule: "${cand.location || 'null'}"`);
    console.log(`  - Raw Titan V2 Cosine Sim:     ${(rawSim * 100).toFixed(2)}% (${rawSim.toFixed(4)})`);
    console.log(`  - Discipline Adjustment:       ${discBonus >= 0 ? '+' : ''}${(discBonus * 100).toFixed(1)}% (${event6.discipline} vs ${cand.discipline})`);
    console.log(`  - Line Number Adjustment:      ${lineBonus >= 0 ? '+' : ''}${(lineBonus * 100).toFixed(1)}% (Event Line: "${event6.line}", Schedule Line: "${cand.line}")`);
    console.log(`  - Location Adjustment:         ${locBonus >= 0 ? '+' : ''}${(locBonus * 100).toFixed(1)}% (Event Loc: "${event6.location}", Schedule Loc: "${cand.location}")`);
    console.log(`  - Combined Rule Score:         ${(totalRuleScore * 100).toFixed(2)}% (${totalRuleScore.toFixed(4)})`);
  });

  // -------------------------------------------------------------
  // PART 3: RERANKER INSPECTION
  // -------------------------------------------------------------
  console.log('\n================================================================');
  console.log('PART 3: RERANKER LLM (NOVA MICRO) INSPECTION');
  console.log('================================================================\n');

  const { matchEventToSchedule } = await import('../matcher');
  console.log('Running matchEventToSchedule for Report 1...');
  const m1 = await matchEventToSchedule(event1);
  console.log('Report 1 Matched Candidate:', m1.matched_candidate?.activity_code, 'Confidence:', m1.confidence_score, 'Reasoning:', m1.matched_candidate?.reasoning);

  console.log('\nRunning matchEventToSchedule for Report 5...');
  const m5 = await matchEventToSchedule(event5);
  console.log('Report 5 Matched Candidate:', m5.matched_candidate?.activity_code, 'Confidence:', m5.confidence_score, 'Reasoning:', m5.matched_candidate?.reasoning);

  console.log('\nRunning matchEventToSchedule for Report 6...');
  const m6 = await matchEventToSchedule(event6);
  console.log('Report 6 Matched Candidate:', m6.matched_candidate?.activity_code, 'Confidence:', m6.confidence_score, 'Reasoning:', m6.matched_candidate?.reasoning);

  await client.end();
}

diagnose().catch((err) => {
  console.error('Diagnosis failed:', err);
  process.exit(1);
});
