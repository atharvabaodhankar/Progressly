import { extractEventsFromText, getExtractionProvider } from '../extractor';
import { SAMPLE_REPORTS } from '../sample-reports';

async function runExtractionTests() {
  console.log('================================================================');
  console.log('       BridgeIQ AI Worker — Standalone Extraction Test');
  console.log('================================================================\n');

  const provider = getExtractionProvider();
  console.log(`[Provider] Active Engine:  ${provider.name}`);
  if (provider.name.includes('Groq')) {
    console.log(`[Note]     Using Groq as a TEMPORARY placeholder pending Bedrock access.`);
    console.log(`[Model]    ${process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'}`);
  } else {
    console.log(`[Model]    ${process.env.BEDROCK_EXTRACTION_MODEL_ID || 'amazon.nova-micro-v1:0'}`);
  }
  console.log('----------------------------------------------------------------\n');

  let successCount = 0;
  let failCount = 0;

  for (const report of SAMPLE_REPORTS) {
    console.log('----------------------------------------------------------------');
    console.log(`[TEST ${report.id}/6] ${report.title}`);
    console.log(`[Expected Goal] ${report.expected_match}`);
    console.log('----------------------------------------------------------------');
    console.log('INPUT TEXT:');
    console.log(report.input.trim());
    console.log(`\nRUNNING EXTRACTION (${provider.name})...`);

    const startTime = Date.now();
    try {
      const result = await extractEventsFromText(report.input);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

      console.log(`\n✓ SUCCESS (${elapsed}s) — Extracted ${result.events.length} event(s):`);
      console.log(JSON.stringify(result.events, null, 2));
      successCount++;
    } catch (err: unknown) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      console.error(`\n✗ FAILED (${elapsed}s):`);
      const errorObj = err as { name?: string; message?: string };
      console.error(errorObj.message || err);
      failCount++;
    }
    console.log('\n');
  }

  console.log('================================================================');
  console.log(`Extraction Test Summary: ${successCount} succeeded, ${failCount} failed out of ${SAMPLE_REPORTS.length}`);
  console.log('================================================================\n');
}

runExtractionTests();
