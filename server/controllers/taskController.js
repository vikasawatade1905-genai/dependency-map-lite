const Task = require('../models/Task');
const {
  detectCycle,
  computeTaskBlockerStates,
  validateStateTransition,
  getUpstreamBlockerChain,
  buildDependencyGraphPayload,
} = require('../services/graphEngine');
const { seedDemoTasks } = require('../seed/seedData');

/**
 * @route   GET /api/tasks
 * @desc    Get all tasks enriched with dynamic blocker metadata & filtering
 */
const getTasks = async (req, res, next) => {
  try {
    const { status, priority, blocked, ready, search } = req.query;

    const rawTasks = await Task.find()
      .populate('prerequisites', 'title status priority')
      .sort({ createdAt: -1 });

    // Enrich all tasks with blocker resolution
    const enrichedTasks = computeTaskBlockerStates(rawTasks);

    // Compute global summary metrics across ALL tasks before filtering
    const summary = {
      total: enrichedTasks.length,
      blockedCount: enrichedTasks.filter((t) => t.isBlocked).length,
      readyCount: enrichedTasks.filter((t) => t.readyToStart).length,
      inProgressCount: enrichedTasks.filter((t) => t.status === 'In Progress').length,
      doneCount: enrichedTasks.filter((t) => t.status === 'Done').length,
    };

    // Apply query filters
    let filtered = enrichedTasks;

    if (status) {
      filtered = filtered.filter((t) => t.status.toLowerCase() === status.toLowerCase());
    }

    if (priority) {
      filtered = filtered.filter((t) => t.priority.toLowerCase() === priority.toLowerCase());
    }

    if (blocked !== undefined) {
      const isBlockedFilter = blocked === 'true';
      filtered = filtered.filter((t) => t.isBlocked === isBlockedFilter);
    }

    if (ready !== undefined) {
      const isReadyFilter = ready === 'true';
      filtered = filtered.filter((t) => t.readyToStart === isReadyFilter);
    }

    if (search && search.trim() !== '') {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.description && t.description.toLowerCase().includes(q)) ||
          (t.tags && t.tags.some((tag) => tag.toLowerCase().includes(q)))
      );
    }

    res.json({
      success: true,
      count: filtered.length,
      summary,
      data: filtered,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/tasks/graph
 * @desc    Get full dependency graph (nodes, edges, topological layout)
 */
const getDependencyGraph = async (req, res, next) => {
  try {
    const rawTasks = await Task.find().populate('prerequisites', 'title status priority');
    const graphPayload = buildDependencyGraphPayload(rawTasks);
    res.json({
      success: true,
      data: graphPayload,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/tasks/:id
 * @desc    Get single task with populated prerequisites, dependents, and blocker chain
 */
const getTaskById = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id).populate('prerequisites', 'title status priority');
    if (!task) {
      return res.status(404).json({ success: false, message: `Task not found with ID ${req.params.id}` });
    }

    // Lookup dependent tasks that reference this task as a prerequisite
    const dependents = await Task.find({ prerequisites: task._id }).select('title status priority');

    const allTasks = await Task.find();
    const enrichedTasks = computeTaskBlockerStates([...allTasks]);
    const enrichedCurrent = enrichedTasks.find((t) => t._id.toString() === task._id.toString());
    const upstreamBlockers = getUpstreamBlockerChain(task._id, allTasks);

    res.json({
      success: true,
      data: {
        ...(enrichedCurrent || task.toObject()),
        dependents,
        upstreamBlockerChain: upstreamBlockers,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   POST /api/tasks
 * @desc    Create a new task with DFS cycle detection & initial guardrail validation
 */
const createTask = async (req, res, next) => {
  try {
    const { title, description, status, priority, prerequisites, dueDate, tags } = req.body;

    const allTasks = await Task.find();

    // Check for circular dependencies
    if (prerequisites && prerequisites.length > 0) {
      const cycleCheck = detectCycle(null, prerequisites, allTasks);
      if (cycleCheck.hasCycle) {
        return res.status(400).json({
          success: false,
          message: cycleCheck.message,
          cyclePath: cycleCheck.cyclePath,
        });
      }

      // Check state transition guardrail if created directly in In Progress or Done
      if (status === 'In Progress' || status === 'Done') {
        const dummyTask = { prerequisites };
        const guardrail = validateStateTransition(dummyTask, status, allTasks);
        if (!guardrail.allowed) {
          return res.status(400).json({
            success: false,
            message: guardrail.message,
            blockers: guardrail.blockers,
          });
        }
      }
    }

    const newTask = await Task.create({
      title,
      description,
      status,
      priority,
      prerequisites,
      dueDate,
      tags,
    });

    const populated = await Task.findById(newTask._id).populate('prerequisites', 'title status priority');
    const enriched = computeTaskBlockerStates([populated])[0];

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: enriched,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   PUT /api/tasks/:id
 * @desc    Update task with strict DAG cycle detection and state transition guardrails
 */
const updateTask = async (req, res, next) => {
  try {
    const taskId = req.params.id;
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ success: false, message: `Task not found with ID ${taskId}` });
    }

    const allTasks = await Task.find();

    // 1. Cycle Detection if prerequisites are being updated
    const nextPrerequisites = req.body.prerequisites !== undefined ? req.body.prerequisites : task.prerequisites;
    if (req.body.prerequisites !== undefined) {
      const cycleCheck = detectCycle(taskId, nextPrerequisites, allTasks);
      if (cycleCheck.hasCycle) {
        return res.status(400).json({
          success: false,
          message: cycleCheck.message,
          cyclePath: cycleCheck.cyclePath,
        });
      }
    }

    // 2. State Transition Guardrail Check if status is being updated or prerequisites are changed
    const targetStatus = req.body.status || task.status;
    const effectiveTask = {
      ...task.toObject(),
      prerequisites: nextPrerequisites,
    };

    if (req.body.status !== undefined || req.body.prerequisites !== undefined) {
      const guardrail = validateStateTransition(effectiveTask, targetStatus, allTasks);
      if (!guardrail.allowed) {
        return res.status(400).json({
          success: false,
          message: guardrail.message,
          blockers: guardrail.blockers,
        });
      }
    }

    // Apply updates
    Object.assign(task, req.body);
    await task.save();

    const populated = await Task.findById(taskId).populate('prerequisites', 'title status priority');
    const enriched = computeTaskBlockerStates([populated])[0];

    res.json({
      success: true,
      message: 'Task updated successfully',
      data: enriched,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   DELETE /api/tasks/:id
 * @desc    Delete task and cascade remove references from dependent prerequisites
 */
const deleteTask = async (req, res, next) => {
  try {
    const taskId = req.params.id;
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ success: false, message: `Task not found with ID ${taskId}` });
    }

    await Task.findByIdAndDelete(taskId);

    // Clean up references from any tasks that had this as a prerequisite
    await Task.updateMany(
      { prerequisites: taskId },
      { $pull: { prerequisites: taskId } }
    );

    res.json({
      success: true,
      message: 'Task deleted successfully and unlinked from all dependent tasks.',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   POST /api/tasks/reset
 * @desc    Reset database and re-seed demo DAG dataset
 */
const resetDemoData = async (req, res, next) => {
  try {
    const seedResult = await seedDemoTasks();
    const rawTasks = await Task.find()
      .populate('prerequisites', 'title status priority')
      .sort({ createdAt: -1 });
    const enrichedTasks = computeTaskBlockerStates(rawTasks);

    res.json({
      success: true,
      message: `Reset complete. Seeded ${seedResult.seededCount} DAG demo tasks.`,
      data: enrichedTasks,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getTasks,
  getDependencyGraph,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  resetDemoData,
};
