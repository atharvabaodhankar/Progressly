import { extractEvents } from '../extractor';
import { matchEventToSchedule } from '../matcher';
import { SAMPLE_REPORTS } from '../sample-reports';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'ai-worker/.env') });

async function runStabilityTests() {
  console.log('================================================================');
  console.log('       BridgeIQ — Reranker Determinism & Reproducibility Test   ');
  console.log('================================================================\n');

  const report1 = SAMPLE_REPORTS.find((r) => r.id === 1)!;
  const report5 = SAMPLE_REPORTS.find((r) => r.id === 5)!;

  const testCases = [
    { name: 'Report 1 (Free-text spool erection)', report: report1 },
    { name: 'Report 5 (Terminology mismatch spool erection)', report: report5 },
  ];

  for (const tc of testCases) {
    console.log('================================================================');
    console.log(`TESTING 3X REPETITION: ${tc.name}`);
    console.log('================================================================');
    console.log('Input Text:', tc.report.input.trim(), '\n');

    // Extract once to isolate the matching & reranking determinism
    const extractRes = await extractEvents(tc.report.input);
    const event = extractRes.events[0];
    console.log('Extracted Event:', JSON.stringify(event), '\n');

    const results: { run: number; candidate: string; confidence: number; status: string; reasoning: string }[] = [];

    for (let run = 1; run <= 3; run++) {
      process.stdout.write(`Executing Run ${run}/3... `);
      const start = Date.now();
      const match = await matchEventToSchedule(event);
      const elapsed = ((Date.now() - start) / 1000).toFixed(2);
      console.log(`Done (${elapsed}s)`);

      results.push({
        run,
        candidate: match.matched_candidate ? match.matched_candidate.activity_code : 'None',
        confidence: match.confidence_score,
        status: match.status,
        reasoning: match.matched_candidate?.reasoning || 'N/A',
      });
    }

    console.log('\n--- 3X REPETITION SUMMARY ---');
    console.table(
      results.map((r) => ({
        Run: r.run,
        'Matched Code': r.candidate,
        Confidence: `${(r.confidence * 100).toFixed(1)}%`,
        Status: r.status,
      }))
    );

    console.log('Reasoning Run 1:', results[0].reasoning);
    console.log('Reasoning Run 2:', results[1].reasoning);
    console.log('Reasoning Run 3:', results[2].reasoning);
    console.log('\n');
  }
}

runStabilityTests().catch((err) => {
  console.error('Stability test failed:', err);
  process.exit(1);
});
