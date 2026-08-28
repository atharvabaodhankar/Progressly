const { pool } = require('../dist/db');
const { getBedrockRuntimeClient } = require('../dist/bedrockClient');
const { InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');

async function generateTitanEmbedding(text) {
  const client = getBedrockRuntimeClient();
  const modelId = process.env.BEDROCK_EMBEDDING_MODEL_ID || 'amazon.titan-embed-text-v2:0';

  const payload = {
    inputText: text.trim(),
    dimensions: 1024,
    normalize: true,
  };

  const command = new InvokeModelCommand({
    modelId,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify(payload),
  });

  const response = await client.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  return responseBody.embedding;
}

async function embedAllNullActivities() {
  console.log('Fetching activities without embeddings...');
  const res = await pool.query('SELECT id, activity_code, description, discipline, line, location FROM activities WHERE embedding IS NULL');
  console.log(`Found ${res.rows.length} activities needing Titan V2 embeddings.`);

  for (const act of res.rows) {
    const textToEmbed = `${act.discipline} - ${act.description}. Line: ${act.line || 'N/A'}. Location: ${act.location || 'N/A'}`;
    const vec = await generateTitanEmbedding(textToEmbed);
    const vectorSql = `[${vec.join(',')}]`;
    await pool.query('UPDATE activities SET embedding = $1 WHERE id = $2', [vectorSql, act.id]);
    console.log(`✓ Embedded [${act.activity_code}] ${act.description}`);
  }

  console.log('All activities now have Titan V2 1024d embeddings!');
  process.exit(0);
}

embedAllNullActivities().catch((err) => {
  console.error(err);
  process.exit(1);
});
