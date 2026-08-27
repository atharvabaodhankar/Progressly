import { Client } from 'pg';
import { BedrockTitanEmbeddingProvider } from '../embeddingProvider';
import {
  BedrockClaudeSynthesisProvider,
  HistoricalRecord,
} from '../synthesisProvider';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'ai-worker/.env') });

const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgrespassword@127.0.0.1:5433/bridgeiq_db';

export async function queryInstitutionalMemory(query: string, topK: number = 6) {
  console.log('================================================================');
  console.log('       BridgeIQ — Institutional Memory RAG Pipeline             ');
  console.log('================================================================\n');
  console.log(`[Query] "${query}"\n`);

  // 1. Embed query with Titan V2 (1024d)
  const embedder = new BedrockTitanEmbeddingProvider();
  process.stdout.write('[1/3 Embedding] Generating Titan V2 vector (1024-dim)... ');
  const startEmbed = Date.now();
  const queryVector = await embedder.embed(query);
  const embedElapsed = ((Date.now() - startEmbed) / 1000).toFixed(2);
  console.log(`Done (${embedElapsed}s)`);

  // 2. Retrieve Top-K from pgvector
  process.stdout.write(`[2/3 Retrieval] Querying top ${topK} records via pgvector cosine distance... `);
  const startRetrieve = Date.now();
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  let retrievedRecords: HistoricalRecord[] = [];
  try {
    const sql = `
      SELECT 
        id,
        project_name,
        discipline,
        activity_description,
        planned_duration_days,
        actual_duration_days,
        delay_days,
        delay_cause,
        notes,
        1 - (embedding <=> $1::vector) AS similarity_score
      FROM historical_records
      ORDER BY embedding <=> $1::vector ASC
      LIMIT $2;
    `;
    const formattedVector = `[${queryVector.join(',')}]`;
    const res = await client.query(sql, [formattedVector, topK]);
    retrievedRecords = res.rows.map((row) => ({
      ...row,
      similarity_score: parseFloat(row.similarity_score),
    }));
  } finally {
    await client.end();
  }
  const retrieveElapsed = ((Date.now() - startRetrieve) / 1000).toFixed(2);
  console.log(`Done (${retrieveElapsed}s, retrieved ${retrievedRecords.length} records)\n`);

  // Print Retrieved Context Summary
  console.log('--- Top Retrieved Grounding Context ---');
  retrievedRecords.forEach((r, idx) => {
    const sim = ((r.similarity_score || 0) * 100).toFixed(1);
    const delay = r.delay_days > 0 ? `+${r.delay_days}d delay (${r.delay_cause})` : 'On Schedule';
    console.log(`  [#${idx + 1}] [${sim}%] [${r.discipline.toUpperCase()}] ${r.project_name} — ${r.activity_description} | ${delay}`);
  });
  console.log('---------------------------------------\n');

  // 3. Synthesize with Bedrock Model
  const synthesizer = new BedrockClaudeSynthesisProvider();
  process.stdout.write(`[3/3 Synthesis] Calling Bedrock (${synthesizer.getPrimaryModelId()})... `);
  const startSynth = Date.now();
  const result = await synthesizer.synthesizeAnswer(query, retrievedRecords);
  const synthElapsed = ((Date.now() - startSynth) / 1000).toFixed(2);
  console.log(`Done (${synthElapsed}s, Model: ${result.model})\n`);

  // Output Results
  console.log('================================================================');
  console.log('                SYNTHESIZED INSTITUTIONAL ANSWER                ');
  console.log('================================================================\n');
  console.log(result.answer);
  console.log('\n================================================================');
  console.log('                      VERIFIED SOURCES CITED                    ');
  console.log('================================================================');
  result.sources.forEach((s, idx) => {
    console.log(`  [${idx + 1}] ${s}`);
  });
  console.log('================================================================\n');

  return result;
}

async function run() {
  const queryArg = process.argv.slice(2).join(' ');
  const query = queryArg || 'What caused piping delays in past projects?';
  await queryInstitutionalMemory(query);
}

if (require.main === module) {
  run().catch((err) => {
    console.error('Institutional memory test failed:', err);
    process.exit(1);
  });
}
