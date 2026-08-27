import { extractEvents } from '../extractor';
import { matchEventToSchedule } from '../matcher';
import { SAMPLE_REPORTS } from '../sample-reports';
import { getEmbeddingProvider } from '../embeddingProvider';

async function runMatchingTests() {
  console.log('================================================================');
  console.log('       BridgeIQ AI Worker — End-to-End Extraction & Matching Pipeline');
  console.log('================================================================\n');

  const embedProvider = getEmbeddingProvider();
  console.log(`[Embedder] Active Model: ${embedProvider.name} (${embedProvider.dimension} dim)`);
  console.log('----------------------------------------------------------------\n');

  for (const report of SAMPLE_REPORTS) {
    console.log('================================================================');
    console.log(`[REPORT ${report.id}/6] ${report.title}`);
    console.log(`[Target Expectation] ${report.expected_match}`);
    console.log('================================================================');
    console.log('INPUT FIELD TEXT:');
    console.log(report.input.trim());

    console.log('\n1. EXTRACTION STEP...');
    const extractRes = await extractEvents(report.input);
    console.log(`Extracted ${extractRes.events.length} event(s):`);

    for (let i = 0; i < extractRes.events.length; i++) {
      const event = extractRes.events[i];
      console.log(`\n--- Event ${i + 1}/${extractRes.events.length} ---`);
      console.log(JSON.stringify(event, null, 2));

      console.log('\n2. VECTOR SEARCH & MATCHING PIPELINE...');
      const matchRes = await matchEventToSchedule(event);

      console.log('\nTop 3 Candidate Matches (from pgvector + Business Rules):');
      matchRes.all_candidates.slice(0, 3).forEach((c, idx) => {
        console.log(
          `  [Rank ${idx + 1}] ${c.activity_code} - "${c.description}" (${c.discipline}) | Vector Sim: ${(
            c.vector_similarity * 100
          ).toFixed(1)}% | Rule Score: ${(c.rule_score * 100).toFixed(1)}%`
        );
      });

      console.log('\nMATCH VERDICT:');
      if (matchRes.matched_candidate) {
        console.log(
          `✓ Matched Activity:  [${matchRes.matched_candidate.activity_code}] ${matchRes.matched_candidate.description}`
        );
        console.log(
          `✓ Final Confidence:  ${(matchRes.confidence_score * 100).toFixed(1)}%`
        );
        console.log(`✓ Approval Status:   ${matchRes.status.toUpperCase()}`);
        console.log(`✓ Action:            ${matchRes.policy_action}`);
        if (matchRes.matched_candidate.reasoning) {
          console.log(`✓ Reasoning:         ${matchRes.matched_candidate.reasoning}`);
        }
      } else {
        console.log(`✗ No Match Found`);
        console.log(`✓ Approval Status:   ${matchRes.status.toUpperCase()}`);
        console.log(`✓ Action:            ${matchRes.policy_action}`);
      }
    }
    console.log('\n');
  }

  console.log('================================================================');
  console.log('✓ End-to-End Matching Pipeline Test Complete');
  console.log('================================================================\n');
}

runMatchingTests().catch((err) => {
  console.error('Matching pipeline test failed:', err);
  process.exit(1);
});
