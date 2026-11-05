const {
  detectCycle,
  computeTaskBlockerStates,
  validateStateTransition,
  buildDependencyGraphPayload,
} = require('../services/graphEngine');

let failedTests = 0;

function assert(condition, testName) {
  if (!condition) {
    console.error(`❌ FAIL: ${testName}`);
    failedTests++;
  } else {
    console.log(`✅ PASS: ${testName}`);
  }
}

console.log('=== RUNNING GRAPH ENGINE VERIFICATION SUITE ===\n');

// 1. Direct Self-Loop Cycle Detection
{
  const tasks = [{ _id: 'A', title: 'Task A', prerequisites: [] }];
  const result = detectCycle('A', ['A'], tasks);
  assert(result.hasCycle === true, 'Direct self-loop detection (A -> A)');
}

// 2. 2-Node Circular Dependency (A -> B -> A)
{
  const tasks = [
    { _id: 'A', title: 'Task A', prerequisites: ['B'] },
    { _id: 'B', title: 'Task B', prerequisites: [] },
  ];
  // Attempting to make B depend on A
  const result = detectCycle('B', ['A'], tasks);
  assert(result.hasCycle === true, '2-Node cycle detection (B -> A when A -> B)');
  assert(result.cyclePath && result.cyclePath.length >= 2, 'Cycle path includes node names');
}

// 3. Multi-Node Transitive Cycle Detection (A -> B -> C -> A)
{
  const tasks = [
    { _id: 'A', title: 'Task A', prerequisites: ['B'] },
    { _id: 'B', title: 'Task B', prerequisites: ['C'] },
    { _id: 'C', title: 'Task C', prerequisites: [] },
  ];
  // Attempting to make C depend on A
  const result = detectCycle('C', ['A'], tasks);
  assert(result.hasCycle === true, '3-Node transitive cycle detection (C -> A when A -> B -> C)');
}

// 4. Valid DAG (No Cycle)
{
  const tasks = [
    { _id: 'A', title: 'Task A', prerequisites: [] },
    { _id: 'B', title: 'Task B', prerequisites: ['A'] },
    { _id: 'C', title: 'Task C', prerequisites: ['A'] },
    { _id: 'D', title: 'Task D', prerequisites: [] },
  ];
  // D depending on B and C is valid
  const result = detectCycle('D', ['B', 'C'], tasks);
  assert(result.hasCycle === false, 'Valid DAG addition produces no cycle');
}

// 5. Blocker State Resolution
{
  const tasks = [
    { _id: '1', title: 'Foundation', status: 'In Progress', prerequisites: [] },
    { _id: '2', title: 'Feature', status: 'Not Started', prerequisites: ['1'] },
    { _id: '3', title: 'Standalone', status: 'Not Started', prerequisites: [] },
    { _id: '4', title: 'Finished', status: 'Done', prerequisites: ['1'] },
  ];
  const enriched = computeTaskBlockerStates(tasks);
  const feature = enriched.find((t) => t._id === '2');
  const standalone = enriched.find((t) => t._id === '3');
  const finished = enriched.find((t) => t._id === '4');

  assert(feature.isBlocked === true, 'Task 2 is BLOCKED by in-progress prerequisite 1');
  assert(feature.readyToStart === false, 'Task 2 is NOT ready to start');
  assert(standalone.isBlocked === false, 'Standalone Task 3 is not blocked');
  assert(standalone.readyToStart === true, 'Standalone Task 3 is READY TO START');
  assert(finished.isBlocked === false, 'Finished Task 4 is not blocked because status is Done');
}

// 6. State Transition Guardrail Rejection
{
  const allTasks = [
    { _id: '1', title: 'Prereq Task', status: 'In Progress', prerequisites: [] },
    { _id: '2', title: 'Blocked Task', status: 'Not Started', prerequisites: ['1'] },
  ];
  const currentTask = allTasks[1];

  // Try to transition to 'In Progress'
  const inProgressAttempt = validateStateTransition(currentTask, 'In Progress', allTasks);
  assert(inProgressAttempt.allowed === false, 'Guardrail rejects moving blocked task to In Progress');

  // Try to transition to 'Done'
  const doneAttempt = validateStateTransition(currentTask, 'Done', allTasks);
  assert(doneAttempt.allowed === false, 'Guardrail rejects moving blocked task to Done');

  // Moving to 'Not Started' is allowed
  const resetAttempt = validateStateTransition(currentTask, 'Not Started', allTasks);
  assert(resetAttempt.allowed === true, 'Resetting to Not Started is always permitted');
}

// 7. Successful State Transition When All Prerequisites Are Done
{
  const allTasks = [
    { _id: '1', title: 'Prereq Task', status: 'Done', prerequisites: [] },
    { _id: '2', title: 'Ready Task', status: 'Not Started', prerequisites: ['1'] },
  ];
  const currentTask = allTasks[1];

  const inProgressAttempt = validateStateTransition(currentTask, 'In Progress', allTasks);
  assert(inProgressAttempt.allowed === true, 'Guardrail allows In Progress when all prereqs are Done');
}

// 8. Dependency Graph Payload & Ranking
{
  const tasks = [
    { _id: '1', title: 'Step 1', status: 'Done', prerequisites: [] },
    { _id: '2', title: 'Step 2', status: 'In Progress', prerequisites: ['1'] },
    { _id: '3', title: 'Step 3', status: 'Not Started', prerequisites: ['2'] },
  ];
  const graph = buildDependencyGraphPayload(tasks);
  assert(graph.nodes.length === 3, 'Graph contains all 3 nodes');
  assert(graph.edges.length === 2, 'Graph contains 2 directed edges');
  const node3 = graph.nodes.find((n) => n.id === '3');
  assert(node3.rank === 2, 'Topological rank for Step 3 is 2');
}

console.log(`\n=== TEST SUITE COMPLETED: ${failedTests === 0 ? 'ALL PASSED' : failedTests + ' FAILURES'} ===`);
if (failedTests > 0) process.exit(1);
