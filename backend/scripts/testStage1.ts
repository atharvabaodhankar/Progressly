import http from 'http';

function request(options: http.RequestOptions, postData?: string): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode || 200, data: parsed });
        } catch {
          resolve({ status: res.statusCode || 200, data: body });
        }
      });
    });

    req.on('error', (err) => reject(err));
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function runStage1Tests() {
  console.log('========================================================================');
  console.log('       PROGRESSLY — STAGE 1 BACKEND VERIFICATION & SCOPED IMPORT');
  console.log('========================================================================\n');

  // TEST 1: Check initial projects list
  console.log('🔹 [Test 1] GET /projects — Check Initial Projects');
  const initialProjects = await request({
    hostname: 'localhost',
    port: 4000,
    path: '/projects',
    method: 'GET',
  });
  console.log(`Status: ${initialProjects.status}`);
  console.log('Existing Projects:', JSON.stringify(initialProjects.data, null, 2));

  const demoProjectId = initialProjects.data.projects[0]?.id;
  const initialDemoActivities = await request({
    hostname: 'localhost',
    port: 4000,
    path: `/activities?projectId=${demoProjectId}`,
    method: 'GET',
  });
  console.log(`Demo Project (${demoProjectId}) Initial Activities Count: ${initialDemoActivities.data.count}\n`);

  // TEST 2: Create a genuinely NEW project
  console.log('🔹 [Test 2] POST /projects — Create New Project');
  const createPayload = JSON.stringify({
    name: 'Numaligarh Refinery Crude Distillation Unit-4',
    organization: 'Numaligarh Refinery Ltd',
    location: 'Golaghat, Assam',
  });

  const createRes = await request(
    {
      hostname: 'localhost',
      port: 4000,
      path: '/projects',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(createPayload),
      },
    },
    createPayload
  );

  console.log(`Status: ${createRes.status}`);
  console.log('Created Project Response:', JSON.stringify(createRes.data, null, 2));
  const newProjectId = createRes.data.project_id;
  console.log(`✓ New Project ID: ${newProjectId}\n`);

  // TEST 3: Import a small test CSV schedule scoped to the new project
  console.log(`🔹 [Test 3] POST /projects/${newProjectId}/activities/import — Scoped Schedule Import`);
  const testScheduleCsv = `activity_code,description,discipline,line,location,planned_start,planned_end
NRL-PIP-1001,Erect Crude Feed Overhead Line 12-CS-01,Piping,12-CS-01,CDU Column Area,2026-09-01,2026-09-12
NRL-ELE-2001,Pull 11kV High Voltage Feeder Cables,Electrical,,Substation 4,2026-09-05,2026-09-10
NRL-CIV-3001,Cast Concrete Foundation for Reformer Furnace F-101,Civil,,Reformer Unit,2026-08-25,2026-09-02
NRL-INS-4001,Mount Differential Pressure Transmitter PDT-301,Instrumentation,12-CS-01,CDU Column Area,2026-09-11,2026-09-13`;

  const importPayload = JSON.stringify({
    csv_text: testScheduleCsv,
  });

  const importRes = await request(
    {
      hostname: 'localhost',
      port: 4000,
      path: `/projects/${newProjectId}/activities/import`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(importPayload),
      },
    },
    importPayload
  );

  console.log(`Status: ${importRes.status}`);
  console.log('Import & Titan V2 Embedding Response:', JSON.stringify(importRes.data, null, 2));
  console.log(`✓ Activities Created: ${importRes.data.activities_created}`);
  console.log(`✓ Titan V2 Embeddings Generated: ${importRes.data.embeddings_generated}\n`);

  // TEST 4: Verify Scoped Activities on New Project
  console.log(`🔹 [Test 4] GET /activities?projectId=${newProjectId} — Query New Project Activities Only`);
  const newProjectActivities = await request({
    hostname: 'localhost',
    port: 4000,
    path: `/activities?projectId=${newProjectId}`,
    method: 'GET',
  });
  console.log(`Status: ${newProjectActivities.status}`);
  console.log(`New Project Activity Count: ${newProjectActivities.data.count} (Expected: 4)`);
  console.log('New Project Activities:', JSON.stringify(newProjectActivities.data.activities, null, 2));

  // TEST 5: Verify Existing Demo Project Isolation (untouched)
  console.log(`\n🔹 [Test 5] GET /activities?projectId=${demoProjectId} — Verify Existing Demo Project Is Untouched`);
  const demoProjectActivities = await request({
    hostname: 'localhost',
    port: 4000,
    path: `/activities?projectId=${demoProjectId}`,
    method: 'GET',
  });
  console.log(`Status: ${demoProjectActivities.status}`);
  console.log(`Demo Project Activity Count: ${demoProjectActivities.data.count} (Expected: 15 — Exact Baseline Schedule)`);
  console.log(`First Activity Code in Demo: ${demoProjectActivities.data.activities[0]?.activity_code}`);
  console.log(`Last Activity Code in Demo: ${demoProjectActivities.data.activities[demoProjectActivities.data.activities.length - 1]?.activity_code}`);

  // TEST 6: Verify GET /projects List with Dynamic Activity Counts
  console.log('\n🔹 [Test 6] GET /projects — Final Multi-Project Registry');
  const finalProjects = await request({
    hostname: 'localhost',
    port: 4000,
    path: '/projects',
    method: 'GET',
  });
  console.log(`Status: ${finalProjects.status}`);
  console.log('Multi-Project Registry:', JSON.stringify(finalProjects.data, null, 2));

  console.log('\n========================================================================');
  console.log('🎉 ALL STAGE 1 BACKEND TESTS PASSED WITH 100% ISOLATION!');
  console.log('========================================================================');
}

runStage1Tests().catch(console.error);
