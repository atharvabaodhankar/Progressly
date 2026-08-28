const { pool } = require('../dist/db');
const { matchEventToSchedule } = require('../dist/matcher');

async function runAdversarialIsolationTest() {
  console.log('========================================================================');
  console.log('   PROGRESSLY — ADVERSARIAL CROSS-PROJECT ISOLATION TEST');
  console.log('========================================================================\n');

  // 1. Fetch registered projects
  const projRes = await pool.query('SELECT id, name FROM projects ORDER BY created_at ASC');
  console.log(`Found ${projRes.rows.length} projects in database:`);
  projRes.rows.forEach((p, idx) => console.log(`  [${idx + 1}] ID: ${p.id} | Name: ${p.name}`));

  const baghjanProj = projRes.rows.find((p) => p.name.includes('Baghjan')) || projRes.rows[0];
  const numaligarhProj = projRes.rows.find((p) => p.name.includes('Numaligarh')) || projRes.rows[1];

  if (!numaligarhProj) {
    console.error('Numaligarh project not found in database! Please run Stage 1 test first.');
    return;
  }

  console.log(`\nDemo Baseline Project: "${baghjanProj.name}" (${baghjanProj.id})`);
  console.log(`Target Scoped Project: "${numaligarhProj.name}" (${numaligarhProj.id})\n`);

  // 2. Define the adversarial report event (Tailor-made for Baghjan's L6-PIP-0241 Line 24)
  const adversarialEvent = {
    discipline: 'Piping',
    activity_description: 'Completed pipe spool erection and alignment for Line 24 at Tank Farm',
    line: '24',
    location: 'Tank Farm',
    event_type: 'progress',
    quantity: '100%',
  };

  console.log('📝 ADVERSARIAL EVENT PAYLOAD:');
  console.log(JSON.stringify(adversarialEvent, null, 2));
  console.log('Note: This event description directly matches Baghjan activity [L6-PIP-0241: Erect Line 24-XX]');
  console.log('      but Numaligarh project ONLY has line [12-CS-01].\n');

  // -------------------------------------------------------------------------
  // TEST A: RUN MATCHING ENGINE SCOPED TO NUMALIGARH (ADVERSARIAL PROOF)
  // -------------------------------------------------------------------------
  console.log('========================================================================');
  console.log('🧪 TEST A: Matching Scoped to Numaligarh Project (Zero-Contamination Check)');
  console.log('========================================================================');

  const numaligarhMatch = await matchEventToSchedule(adversarialEvent, numaligarhProj.id);

  console.log(`\nStatus: ${numaligarhMatch.status}`);
  console.log(`Confidence Score: ${numaligarhMatch.confidence_score}`);
  console.log(`Policy Action: ${numaligarhMatch.policy_action}`);
  console.log(`Matched Candidate: ${numaligarhMatch.matched_candidate ? numaligarhMatch.matched_candidate.activity_code + ' - ' + numaligarhMatch.matched_candidate.description : 'NONE'}`);

  console.log('\nRetrieved Candidate Pool for Numaligarh:');
  numaligarhMatch.all_candidates.forEach((c, idx) => {
    console.log(`  (${idx + 1}) [${c.activity_code}] ${c.description} | Disc: ${c.discipline} | Line: ${c.line || 'N/A'} | VectorSim: ${c.vector_similarity.toFixed(3)} | RuleScore: ${c.rule_score.toFixed(3)}`);
  });

  const contaminatedWithBaghjan = numaligarhMatch.all_candidates.some((c) => c.activity_code.startsWith('L6-') || c.activity_code === 'L6-PIP-0241');
  const allCandidatesAreNumaligarh = numaligarhMatch.all_candidates.every((c) => c.activity_code.startsWith('NRL-'));

  console.log('\n🛡️ NUMALIGARH ISOLATION AUDIT:');
  console.log(`  ✓ Baghjan L6-PIP-0241 Infiltrated Candidate Pool? : ${contaminatedWithBaghjan ? '❌ FAIL (Contaminated)' : '✅ NO (100% Isolated)'}`);
  console.log(`  ✓ All Retrieved Candidates Belong to NRL Project? : ${allCandidatesAreNumaligarh ? '✅ YES' : '❌ FAIL'}`);
  console.log(`  ✓ Match Decision Demands Manual Resolution?      : ${numaligarhMatch.status !== 'auto_approved' ? '✅ YES (' + numaligarhMatch.status + ')' : '❌ FAIL'}`);

  // -------------------------------------------------------------------------
  // TEST B: RUN MATCHING ENGINE SCOPED TO BAGHJAN (CONTROL TEST)
  // -------------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log('🔬 TEST B (CONTROL): Matching Same Event Scoped to Baghjan Project');
  console.log('========================================================================');

  const baghjanMatch = await matchEventToSchedule(adversarialEvent, baghjanProj.id);

  console.log(`\nStatus: ${baghjanMatch.status}`);
  console.log(`Confidence Score: ${baghjanMatch.confidence_score}`);
  console.log(`Policy Action: ${baghjanMatch.policy_action}`);
  console.log(`Matched Candidate: ${baghjanMatch.matched_candidate ? baghjanMatch.matched_candidate.activity_code + ' - ' + baghjanMatch.matched_candidate.description : 'NONE'}`);

  console.log('\nRetrieved Candidate Pool for Baghjan:');
  baghjanMatch.all_candidates.forEach((c, idx) => {
    console.log(`  (${idx + 1}) [${c.activity_code}] ${c.description} | Disc: ${c.discipline} | Line: ${c.line || 'N/A'} | VectorSim: ${c.vector_similarity.toFixed(3)} | RuleScore: ${c.rule_score.toFixed(3)}`);
  });

  const correctlyMatchedBaghjan = baghjanMatch.matched_candidate?.activity_code === 'L6-PIP-0241';
  console.log('\n🎯 BAGHJAN CONTROL AUDIT:');
  console.log(`  ✓ Correctly identified Baghjan activity L6-PIP-0241? : ${correctlyMatchedBaghjan ? '✅ YES' : '❌ FAIL'}`);

  console.log('\n========================================================================');
  if (!contaminatedWithBaghjan && allCandidatesAreNumaligarh && correctlyMatchedBaghjan) {
    console.log('🏆 VERDICT: PERFECT CROSS-PROJECT ISOLATION UNDER ADVERSARIAL CONDITIONS');
  } else {
    console.log('❌ VERDICT: ISOLATION LEAKAGE DETECTED');
  }
  console.log('========================================================================');

  process.exit(0);
}

runAdversarialIsolationTest().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
