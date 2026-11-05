import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import StatsBar from './components/StatsBar';
import TaskBoard from './components/TaskBoard';
import DependencyTableView from './components/DependencyTableView';
import DependencyGraphCanvas from './components/DependencyGraphCanvas';
import TaskModal from './components/TaskModal';
import DependencyGraphModal from './components/DependencyGraphModal';
import taskApi from './api/taskApi';
import { 
  AlertOctagon, 
  CheckCircle2, 
  X, 
  Network, 
  ArrowRight, 
  RefreshCw,
  Check
} from 'lucide-react';

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isResetting, setIsResetting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'blocked' | 'ready'
  const [activeTab, setActiveTab] = useState('kanban'); // 'kanban' | 'graph' | 'table'

  // Modals state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);
  const [taskModalError, setTaskModalError] = useState(null);

  const [isGraphModalOpen, setIsGraphModalOpen] = useState(false);
  const [graphData, setGraphData] = useState(null);
  const [focusedGraphNodeId, setFocusedGraphNodeId] = useState(null);

  // Global Alerts & Guardrail Violation Toast
  const [guardrailAlert, setGuardrailAlert] = useState(null);
  const [notification, setNotification] = useState(null);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification((curr) => (curr?.message === message ? null : curr));
    }, 4500);
  };

  /**
   * Fetch all tasks from backend
   */
  const loadTasks = useCallback(async () => {
    try {
      const params = {};
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (activeFilter === 'blocked') params.blocked = 'true';
      if (activeFilter === 'ready') params.ready = 'true';

      const res = await taskApi.getTasks(params);
      if (res.success) {
        setTasks(res.data);
        setSummary(res.summary);
      }
    } catch (err) {
      console.error('Failed to load tasks:', err);
      showNotification(err.message || 'Error fetching tasks', 'error');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, activeFilter]);

  /**
   * Load graph data for visual inspector
   */
  const loadGraphData = useCallback(async () => {
    try {
      const res = await taskApi.getGraph();
      if (res.success) {
        setGraphData(res.data);
      }
    } catch (err) {
      console.error('Failed to load graph data:', err);
    }
  }, []);

  useEffect(() => {
    loadTasks();
    loadGraphData();
  }, [loadTasks, loadGraphData]);

  /**
   * Status change with guardrail interceptor
   */
  const handleStatusChange = async (taskId, newStatus) => {
    try {
      const res = await taskApi.updateTask(taskId, { status: newStatus });
      if (res.success) {
        showNotification(`Status updated to "${newStatus}"`);
        setGuardrailAlert(null);
        await Promise.all([loadTasks(), loadGraphData()]);
      }
    } catch (err) {
      setGuardrailAlert({
        task: tasks.find((t) => t._id === taskId),
        nextStatus: newStatus,
        message: err.message,
        blockers: err.blockers || [],
      });
    }
  };

  /**
   * Create or update task with DFS cycle detection
   */
  const handleSaveTask = async (taskData) => {
    setIsSubmittingTask(true);
    setTaskModalError(null);

    try {
      if (editingTask) {
        const res = await taskApi.updateTask(editingTask._id, taskData);
        if (res.success) {
          showNotification('Task updated successfully');
          setIsTaskModalOpen(false);
          setEditingTask(null);
          await Promise.all([loadTasks(), loadGraphData()]);
        }
      } else {
        const res = await taskApi.createTask(taskData);
        if (res.success) {
          showNotification('Task created successfully');
          setIsTaskModalOpen(false);
          await Promise.all([loadTasks(), loadGraphData()]);
        }
      }
    } catch (err) {
      setTaskModalError(err);
    } finally {
      setIsSubmittingTask(false);
    }
  };

  /**
   * Delete task
   */
  const handleDeleteTask = async (taskId) => {
    const taskToDelete = tasks.find((t) => t._id === taskId);
    if (!window.confirm(`Are you sure you want to delete "${taskToDelete?.title || 'this task'}"?`)) {
      return;
    }

    try {
      const res = await taskApi.deleteTask(taskId);
      if (res.success) {
        showNotification('Task deleted and unlinked from dependents');
        await Promise.all([loadTasks(), loadGraphData()]);
      }
    } catch (err) {
      showNotification(err.message || 'Failed to delete task', 'error');
    }
  };

  /**
   * Reset database to initial DAG demo seed
   */
  const handleResetData = async () => {
    if (!window.confirm('Reset all tasks to the initial software release DAG demo dataset?')) {
      return;
    }

    setIsResetting(true);
    try {
      const res = await taskApi.resetDemoData();
      if (res.success) {
        showNotification('Database reseeded with 10 demo DAG tasks');
        await Promise.all([loadTasks(), loadGraphData()]);
      }
    } catch (err) {
      showNotification(err.message || 'Failed to reset demo data', 'error');
    } finally {
      setIsResetting(false);
    }
  };

  /**
   * Focus a node in the graph view
   */
  const handleOpenGraphWithNode = (nodeId) => {
    setFocusedGraphNodeId(nodeId);
    setActiveTab('graph');
  };

  return (
    <div className="dashboard-scene min-h-screen text-slate-100 flex flex-col font-sans selection:bg-amber-100/40 selection:text-white">
      <div className="scene-brand" aria-label="DependencyMap project workspace">
        <span className="scene-brand-name">DependencyMap</span>
        <span className="scene-brand-caption">PROJECT OPERATIONS</span>
      </div>
      <div className="dashboard-shell">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        activeFilter={activeFilter}
        setActiveFilter={setActiveFilter}
        onOpenNewTaskModal={() => {
          setEditingTask(null);
          setTaskModalError(null);
          setIsTaskModalOpen(true);
        }}
        onResetData={handleResetData}
        isResetting={isResetting}
        stats={summary}
      />

      {/* Main Container */}
      <main className="dashboard-main flex-1 w-full px-4 lg:px-8 py-6 flex flex-col">
        {/* Guardrail Violation Alert Banner */}
        {guardrailAlert && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-950/95 border border-rose-800 text-rose-200 shadow-2xl glow-crimson flex items-start justify-between gap-4 animate-in slide-in-from-top-3">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-rose-900/70 border border-rose-700/80 flex items-center justify-center shrink-0 mt-0.5">
                <AlertOctagon className="w-5 h-5 text-rose-400 animate-pulse" />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <h4 className="font-extrabold text-white text-sm">
                    State Transition Guardrail Violation
                  </h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-900/90 text-rose-300 border border-rose-700 font-bold">
                    BLOCKED
                  </span>
                </div>
                <p className="text-xs text-rose-200 leading-relaxed">
                  Cannot move <strong>"{guardrailAlert.task?.title}"</strong> to{' '}
                  <span className="font-extrabold text-white uppercase underline">
                    "{guardrailAlert.nextStatus}"
                  </span>
                  . The following prerequisite tasks are unfinished:
                </p>

                {/* List of blocking prerequisite tasks with 1-click resolve button */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {guardrailAlert.blockers && guardrailAlert.blockers.length > 0 ? (
                    guardrailAlert.blockers.map((b) => (
                      <div
                        key={b._id}
                        className="text-xs px-3 py-1.5 rounded-lg bg-rose-900/70 border border-rose-700 text-white font-medium flex items-center gap-2 shadow-sm"
                      >
                        <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
                        <span className="font-bold">{b.title}</span>
                        <span className="text-[10px] text-rose-300 font-mono">({b.status})</span>
                        <button
                          onClick={() => handleStatusChange(b._id, 'Done')}
                          className="ml-1 px-1.5 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-[10px] font-bold text-white transition-all flex items-center gap-1 shadow-sm"
                          title={`Mark "${b.title}" as Done to unblock this task`}
                        >
                          <Check className="w-2.5 h-2.5" />
                          <span>Complete</span>
                        </button>
                      </div>
                    ))
                  ) : (
                    <span className="text-xs text-rose-300 italic">
                      {guardrailAlert.message}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleOpenGraphWithNode(guardrailAlert.task?._id)}
                className="px-3.5 py-2 rounded-xl bg-rose-900/60 hover:bg-rose-800 text-xs font-bold text-rose-200 border border-rose-700 transition-all flex items-center gap-1.5 shadow-md"
              >
                <Network className="w-3.5 h-3.5 text-rose-300" />
                <span>Inspect in DAG</span>
              </button>
              <button
                onClick={() => setGuardrailAlert(null)}
                className="p-1.5 rounded-lg text-rose-400 hover:text-white hover:bg-rose-900 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Global Toast Notification */}
        {notification && (
          <div
            className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl border shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-3 text-xs font-bold ${
              notification.type === 'error'
                ? 'bg-rose-950/95 border-rose-800 text-rose-200'
                : 'bg-emerald-950/95 border-emerald-800 text-emerald-200'
            }`}
          >
            {notification.type === 'error' ? (
              <AlertOctagon className="w-4 h-4 text-rose-400" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            )}
            <span>{notification.message}</span>
            <button
              onClick={() => setNotification(null)}
              className="text-slate-400 hover:text-white ml-2"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* KPI Stats & Bottleneck Bar */}
        <StatsBar
          stats={summary}
          tasks={tasks}
          activeFilter={activeFilter}
          setActiveFilter={setActiveFilter}
          onStatusChange={handleStatusChange}
          onOpenGraphWithNode={handleOpenGraphWithNode}
        />

        {/* Main Tab Content */}
        {loading ? (
          <div className="text-center py-24 flex flex-col items-center justify-center flex-1">
            <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mb-3" />
            <p className="text-sm font-bold text-slate-300">
              Evaluating Dependency Graph &amp; Blocker Chains...
            </p>
          </div>
        ) : activeTab === 'kanban' ? (
          <TaskBoard
            tasks={tasks}
            onEditTask={(task) => {
              setEditingTask(task);
              setTaskModalError(null);
              setIsTaskModalOpen(true);
            }}
            onDeleteTask={handleDeleteTask}
            onStatusChange={handleStatusChange}
            onOpenNewTaskModal={() => {
              setEditingTask(null);
              setTaskModalError(null);
              setIsTaskModalOpen(true);
            }}
            onTriggerGuardrailViolation={(violation) => {
              setGuardrailAlert({
                task: violation.task,
                nextStatus: violation.nextStatus,
                blockers: violation.blockers,
              });
            }}
            onSelectTaskForGraph={(taskId) => {
              handleOpenGraphWithNode(taskId);
            }}
            activeFilter={activeFilter}
            setActiveFilter={setActiveFilter}
          />
        ) : activeTab === 'graph' ? (
          <div className="h-[680px] w-full">
            <DependencyGraphCanvas
              graphData={graphData}
              tasks={tasks}
              onStatusChange={handleStatusChange}
              onEditTask={(task) => {
                setEditingTask(task);
                setTaskModalError(null);
                setIsTaskModalOpen(true);
              }}
              selectedNodeId={focusedGraphNodeId}
              onSelectNode={setFocusedGraphNodeId}
            />
          </div>
        ) : (
          <DependencyTableView
            tasks={tasks}
            onEditTask={(task) => {
              setEditingTask(task);
              setTaskModalError(null);
              setIsTaskModalOpen(true);
            }}
            onDeleteTask={handleDeleteTask}
            onStatusChange={handleStatusChange}
            onOpenGraphWithNode={handleOpenGraphWithNode}
            onTriggerGuardrailViolation={(violation) => {
              setGuardrailAlert({
                task: violation.task,
                nextStatus: violation.nextStatus,
                blockers: violation.blockers,
              });
            }}
          />
        )}
      </main>

      {/* Task Create / Edit Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setEditingTask(null);
          setTaskModalError(null);
        }}
        onSubmit={handleSaveTask}
        editingTask={editingTask}
        allTasks={tasks}
        isLoading={isSubmittingTask}
        apiError={taskModalError}
      />

      {/* Pop-up Full Screen Graph Modal (if triggered externally) */}
      <DependencyGraphModal
        isOpen={isGraphModalOpen}
        onClose={() => setIsGraphModalOpen(false)}
        graphData={graphData}
        tasks={tasks}
        onStatusChange={handleStatusChange}
        onEditTask={(task) => {
          setEditingTask(task);
          setTaskModalError(null);
          setIsTaskModalOpen(true);
        }}
        selectedNodeId={focusedGraphNodeId}
        onSelectNode={setFocusedGraphNodeId}
      />
      </div>
    </div>
  );
}
