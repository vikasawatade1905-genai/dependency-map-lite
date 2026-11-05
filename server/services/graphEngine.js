/**
 * Graph Engine for DependencyMap Lite
 * Provides DFS cycle detection, blocker state resolution,
 * state transition guardrail enforcement, and graph hierarchy computation.
 */

/**
 * Detects if adding or updating prerequisites for a task would introduce a cycle.
 *
 * @param {string} taskId - The ID of the task being created or updated
 * @param {string[]} proposedPrerequisiteIds - Array of proposed prerequisite task IDs
 * @param {Array} allTasks - Array of all task objects ({ _id, title, prerequisites, status })
 * @returns {{ hasCycle: boolean, cyclePath: string[]|null, message?: string }}
 */
function detectCycle(taskId, proposedPrerequisiteIds, allTasks) {
  const targetIdStr = taskId ? taskId.toString() : null;
  const cleanProposedIds = (proposedPrerequisiteIds || []).map((id) => id.toString());

  // Quick self-loop check
  if (targetIdStr && cleanProposedIds.includes(targetIdStr)) {
    const selfTask = allTasks.find((t) => t._id.toString() === targetIdStr);
    const title = selfTask ? selfTask.title : 'Task';
    return {
      hasCycle: true,
      cyclePath: [title, title],
      message: `Direct self-dependency detected: "${title}" cannot depend on itself.`,
    };
  }

  // Build task title lookup
  const titleMap = new Map();
  allTasks.forEach((t) => {
    titleMap.set(t._id.toString(), t.title);
  });

  // Build Adjacency List: Task -> Array of Prerequisite IDs
  // Edge: Task depends on Prerequisite
  const adj = new Map();

  allTasks.forEach((t) => {
    const id = t._id.toString();
    const prereqs = (t.prerequisites || []).map((p) => (p._id ? p._id.toString() : p.toString()));
    adj.set(id, prereqs);
  });

  // Override or insert target task with proposed prerequisites
  if (targetIdStr) {
    adj.set(targetIdStr, cleanProposedIds);
  }

  // DFS Cycle Detection starting from targetIdStr (or all proposed prerequisites)
  // If starting from targetIdStr we can reach targetIdStr again, a cycle exists.
  const visited = new Set();
  const recursionStack = new Set();
  const path = [];
  let detectedCyclePath = null;

  function dfs(currId) {
    visited.add(currId);
    recursionStack.add(currId);
    path.push(currId);

    const neighbors = adj.get(currId) || [];
    for (const nextId of neighbors) {
      if (!visited.has(nextId)) {
        if (dfs(nextId)) return true;
      } else if (recursionStack.has(nextId)) {
        // Cycle detected! Slice path from where nextId appears to end
        const cycleStartIndex = path.indexOf(nextId);
        const subPath = path.slice(cycleStartIndex);
        subPath.push(nextId);
        detectedCyclePath = subPath;
        return true;
      }
    }

    path.pop();
    recursionStack.delete(currId);
    return false;
  }

  // Run DFS starting from the target task or its proposed prerequisites
  const startNodes = targetIdStr ? [targetIdStr] : cleanProposedIds;
  for (const startNode of startNodes) {
    visited.clear();
    recursionStack.clear();
    path.length = 0;
    if (dfs(startNode)) {
      const namedPath = detectedCyclePath.map((id) => titleMap.get(id) || `ID:${id}`);
      return {
        hasCycle: true,
        cyclePath: namedPath,
        message: `Circular dependency detected: ${namedPath.join(' -> ')}`,
      };
    }
  }

  return {
    hasCycle: false,
    cyclePath: null,
  };
}

/**
 * Computes blocker states for an array of tasks.
 *
 * @param {Array} tasks - Array of task documents/objects
 * @returns {Array} Enriched task objects with isBlocked, blockingPrerequisites, readyToStart
 */
function computeTaskBlockerStates(tasks) {
  const taskMap = new Map();
  tasks.forEach((t) => {
    const doc = t.toObject ? t.toObject({ virtuals: true }) : { ...t };
    taskMap.set(doc._id.toString(), doc);
  });

  const enrichedTasks = [];

  for (const [id, task] of taskMap.entries()) {
    const prereqIds = (task.prerequisites || []).map((p) => (p._id ? p._id.toString() : p.toString()));
    const blockingPrerequisites = [];

    for (const pId of prereqIds) {
      const prereqTask = taskMap.get(pId);
      if (prereqTask) {
        if (prereqTask.status !== 'Done') {
          blockingPrerequisites.push({
            _id: prereqTask._id,
            title: prereqTask.title,
            status: prereqTask.status,
            priority: prereqTask.priority,
          });
        }
      }
    }

    const isDone = task.status === 'Done';
    const isBlocked = !isDone && blockingPrerequisites.length > 0;
    const readyToStart = task.status === 'Not Started' && !isBlocked;

    enrichedTasks.push({
      ...task,
      isBlocked,
      blockingPrerequisites,
      readyToStart,
      unfinishedPrerequisiteCount: blockingPrerequisites.length,
    });
  }

  return enrichedTasks;
}

/**
 * Validates state transition guardrails.
 * Rejects moving to 'In Progress' or 'Done' if any prerequisite is unfinished.
 *
 * @param {Object} currentTask - Current task data
 * @param {string} proposedStatus - The desired new status
 * @param {Array} allTasks - All tasks to evaluate prerequisite statuses
 * @returns {{ allowed: boolean, message?: string, blockers?: Array }}
 */
function validateStateTransition(currentTask, proposedStatus, allTasks) {
  // Moving back to Not Started is always allowed
  if (proposedStatus === 'Not Started') {
    return { allowed: true };
  }

  // If transitioning to 'In Progress' or 'Done', verify all prerequisites are 'Done'
  const taskMap = new Map();
  allTasks.forEach((t) => {
    taskMap.set(t._id.toString(), t);
  });

  const prereqIds = (currentTask.prerequisites || []).map((p) => (p._id ? p._id.toString() : p.toString()));
  const unfinishedBlockers = [];

  for (const pId of prereqIds) {
    const prereq = taskMap.get(pId);
    if (prereq && prereq.status !== 'Done') {
      unfinishedBlockers.push({
        _id: prereq._id,
        title: prereq.title,
        status: prereq.status,
      });
    }
  }

  if (unfinishedBlockers.length > 0) {
    const titles = unfinishedBlockers.map((b) => `"${b.title}" (${b.status})`).join(', ');
    return {
      allowed: false,
      message: `State transition guardrail violation: Cannot transition to "${proposedStatus}" because ${unfinishedBlockers.length} prerequisite(s) are unfinished: ${titles}.`,
      blockers: unfinishedBlockers,
    };
  }

  return { allowed: true };
}

/**
 * Finds all recursive upstream blockers (transitive prerequisites that are not Done)
 *
 * @param {string} taskId - Target task ID
 * @param {Array} allTasks - All tasks
 * @returns {Array} Array of blocking task objects with depth level
 */
function getUpstreamBlockerChain(taskId, allTasks) {
  const taskMap = new Map();
  allTasks.forEach((t) => taskMap.set(t._id.toString(), t));

  const chain = [];
  const visited = new Set();

  function traverse(currId, depth) {
    if (visited.has(currId)) return;
    visited.add(currId);

    const task = taskMap.get(currId);
    if (!task) return;

    const prereqIds = (task.prerequisites || []).map((p) => (p._id ? p._id.toString() : p.toString()));
    for (const pId of prereqIds) {
      const prereq = taskMap.get(pId);
      if (prereq && prereq.status !== 'Done') {
        chain.push({
          _id: prereq._id,
          title: prereq.title,
          status: prereq.status,
          priority: prereq.priority,
          depth,
        });
        traverse(pId, depth + 1);
      }
    }
  }

  traverse(taskId.toString(), 1);
  return chain;
}

/**
 * Builds full dependency graph payload for visualization
 * Nodes, directed edges (Prerequisite -> Dependent), topological levels
 *
 * @param {Array} rawTasks - Array of task documents
 * @returns {Object} { nodes, edges, summary }
 */
function buildDependencyGraphPayload(rawTasks) {
  const enrichedTasks = computeTaskBlockerStates(rawTasks);
  const taskMap = new Map();
  enrichedTasks.forEach((t) => taskMap.set(t._id.toString(), t));

  // Compute topological level (rank) for clean visual layout
  // Rank = 0 for tasks without prerequisites; max(prereq ranks) + 1 for others
  const ranks = new Map();

  function getRank(id, visitedInPath = new Set()) {
    if (ranks.has(id)) return ranks.get(id);
    if (visitedInPath.has(id)) return 0; // fallback if cycle exists
    visitedInPath.add(id);

    const task = taskMap.get(id);
    if (!task) return 0;

    const prereqIds = (task.prerequisites || []).map((p) => (p._id ? p._id.toString() : p.toString()));
    if (prereqIds.length === 0) {
      ranks.set(id, 0);
      return 0;
    }

    let maxPrereqRank = 0;
    for (const pId of prereqIds) {
      const pRank = getRank(pId, new Set(visitedInPath));
      if (pRank > maxPrereqRank) maxPrereqRank = pRank;
    }

    const calculatedRank = maxPrereqRank + 1;
    ranks.set(id, calculatedRank);
    return calculatedRank;
  }

  enrichedTasks.forEach((t) => getRank(t._id.toString()));

  // Construct nodes
  const nodes = enrichedTasks.map((t) => {
    const id = t._id.toString();
    return {
      id,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      isBlocked: t.isBlocked,
      readyToStart: t.readyToStart,
      rank: ranks.get(id) || 0,
      blockingCount: t.blockingPrerequisites.length,
      dueDate: t.dueDate,
    };
  });

  // Construct directed edges: Prerequisite -> Dependent Task
  const edges = [];
  enrichedTasks.forEach((t) => {
    const targetId = t._id.toString();
    const prereqIds = (t.prerequisites || []).map((p) => (p._id ? p._id.toString() : p.toString()));

    prereqIds.forEach((sourceId) => {
      const sourceTask = taskMap.get(sourceId);
      const isBlocking = sourceTask ? sourceTask.status !== 'Done' : false;
      edges.push({
        id: `${sourceId}->${targetId}`,
        source: sourceId,
        target: targetId,
        isBlocking,
        sourceStatus: sourceTask ? sourceTask.status : 'Unknown',
        targetStatus: t.status,
      });
    });
  });

  return {
    nodes,
    edges,
    summary: {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      blockedNodes: nodes.filter((n) => n.isBlocked).length,
      readyNodes: nodes.filter((n) => n.readyToStart).length,
    },
  };
}

module.exports = {
  detectCycle,
  computeTaskBlockerStates,
  validateStateTransition,
  getUpstreamBlockerChain,
  buildDependencyGraphPayload,
};
