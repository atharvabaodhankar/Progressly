import dotenv from 'dotenv';
dotenv.config();

async function testQuery() {
  console.log('Testing /memory/query on localhost:4000...');
  const res = await fetch('http://localhost:4000/memory/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: 'Why did past civil foundation and excavation activities suffer major schedule overruns?',
      topK: 6,
    }),
  });

  console.log('Response Status:', res.status);
  const json = (await res.json()) as any;
  console.log('Full JSON Response:', json);
}

testQuery().catch(console.error);
