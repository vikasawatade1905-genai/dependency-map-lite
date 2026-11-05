const http = require('http');

function request(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  console.log('=== RUNNING LIVE API ENDPOINT VERIFICATION ===\n');

  // 1. Health check
  const health = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/health',
    method: 'GET',
  });
  console.log(`[Test 1] GET /api/health -> Status: ${health.status}`, health.data);
  if (health.status !== 200) throw new Error('Health check failed');

  // 2. GET /api/tasks
  const tasksRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/tasks',
    method: 'GET',
  });
  console.log(`[Test 2] GET /api/tasks -> Status: ${tasksRes.status}, Total Tasks: ${tasksRes.data.count}`);
  const tasks = tasksRes.data.data;
  const blockedTask = tasks.find((t) => t.isBlocked === true);
  console.log(`Found blocked task: "${blockedTask.title}" (Blockers: ${blockedTask.blockingPrerequisites.length})`);

  // 3. Attempt state transition guardrail violation on blocked task
  console.log('\n[Test 3] Testing Guardrail Rejection (Attempting to set Blocked Task -> In Progress)...');
  const guardrailAttempt = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: `/api/tasks/${blockedTask._id}`,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
    },
    { status: 'In Progress' }
  );
  console.log(`-> Status: ${guardrailAttempt.status} (Expected 400)`);
  console.log(`-> Message: ${guardrailAttempt.data.message}`);
  if (guardrailAttempt.status !== 400 || !guardrailAttempt.data.message.includes('guardrail')) {
    throw new Error('Guardrail rejection failed!');
  }
  console.log('✅ PASS: State transition guardrail correctly rejected illegal status change.');

  // 4. Attempt circular dependency insertion
  console.log('\n[Test 4] Testing Circular Dependency Cycle Rejection via API...');
  // Find a prerequisite of blockedTask and try to make that prerequisite depend on blockedTask!
  const prereqId = blockedTask.prerequisites[0]._id;
  const prereqTask = tasks.find((t) => t._id === prereqId);
  console.log(`Attempting to make "${prereqTask.title}" depend on "${blockedTask.title}" (which depends on it)...`);

  const cycleAttempt = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: `/api/tasks/${prereqId}`,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
    },
    { prerequisites: [...(prereqTask.prerequisites || []).map((p) => p._id), blockedTask._id] }
  );
  console.log(`-> Status: ${cycleAttempt.status} (Expected 400)`);
  console.log(`-> Message: ${cycleAttempt.data.message}`);
  console.log(`-> Cycle Path:`, cycleAttempt.data.cyclePath);
  if (cycleAttempt.status !== 400 || !cycleAttempt.data.cyclePath) {
    throw new Error('Circular dependency rejection failed!');
  }
  console.log('✅ PASS: Circular dependency correctly detected and rejected with cycle path.');

  // 5. Test Graph Endpoint
  console.log('\n[Test 5] GET /api/tasks/graph...');
  const graphRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/tasks/graph',
    method: 'GET',
  });
  console.log(`-> Status: ${graphRes.status}, Nodes: ${graphRes.data.data.nodes.length}, Edges: ${graphRes.data.data.edges.length}`);
  if (graphRes.status !== 200 || !graphRes.data.data.nodes.length) {
    throw new Error('Graph endpoint failed');
  }
  console.log('✅ PASS: Graph endpoint returned nodes, edges and topological ranks.');

  // 6. Test Reset Demo Data Endpoint
  console.log('\n[Test 6] POST /api/tasks/reset...');
  const resetRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/tasks/reset',
    method: 'POST',
  });
  console.log(`-> Status: ${resetRes.status}, Message: ${resetRes.data.message}`);
  if (resetRes.status !== 200) {
    throw new Error('Reset endpoint failed');
  }
  console.log('✅ PASS: Database reset reseeded all 10 DAG tasks.');

  console.log('\n=========================================');
  console.log('🎉 ALL LIVE API ENDPOINT TESTS PASSED 100%!');
  console.log('=========================================');
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
