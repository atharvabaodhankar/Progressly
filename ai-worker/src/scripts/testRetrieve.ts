import { Client } from 'pg';
import { BedrockTitanEmbeddingProvider } from '../embeddingProvider';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'ai-worker/.env') });

const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgrespassword@127.0.0.1:5433/bridgeiq_db';

async function testRetrieval() {
  const queryArg = process.argv.slice(2).join(' ');
  const query = queryArg || 'What caused piping delays in past projects?';

  console.log('================================================================');
  console.log('       BridgeIQ — Historical Institutional Memory Retrieval     ');
  console.log('================================================================\n');
  console.log(`[Query] "${query}"\n`);

  const embedder = new BedrockTitanEmbeddingProvider();
  console.log('[Bedrock] Generating Titan Text Embeddings V2 (1024-dim)...');
  const startEmbed = Date.now();
  const queryVector = await embedder.embed(query);
  const embedTime = ((Date.now() - startEmbed) / 1000).toFixed(2);
  console.log(`[Bedrock] Query vector generated in ${embedTime}s.\n`);

  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

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
      LIMIT 5;
    `;

    const formattedVector = `[${queryVector.join(',')}]`;
    const res = await client.query(sql, [formattedVector]);

    console.log('================================================================');
    console.log(`TOP 5 RETRIEVED HISTORICAL RECORDS (pgvector Cosine Similarity)`);
    console.log('================================================================\n');

    res.rows.forEach((row, idx) => {
      const sim = (parseFloat(row.similarity_score) * 100).toFixed(1);
      const delayBadge = row.delay_days > 0 ? `+${row.delay_days} days delay` : 'On schedule';

      console.log(`[MATCH #${idx + 1}] Similarity: ${sim}% | Discipline: ${row.discipline.toUpperCase()}`);
      console.log(`Project:        ${row.project_name}`);
      console.log(`Activity:       ${row.activity_description}`);
      console.log(`Delay Cause:    ${row.delay_cause || 'None'} (${delayBadge})`);
      console.log(`Planned/Actual: ${row.planned_duration_days}d planned → ${row.actual_duration_days}d actual`);
      console.log(`Notes:          "${row.notes}"`);
      console.log('----------------------------------------------------------------');
    });

    console.log('\n✓ Retrieval verification complete.');
  } finally {
    await client.end();
  }
}

testRetrieval().catch((err) => {
  console.error('Retrieval test failed:', err);
  process.exit(1);
});
