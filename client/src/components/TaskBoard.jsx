import React, { useState } from 'react';
import TaskCard from './TaskCard';
import { 
  Kanban, 
  LayoutGrid, 
  AlertOctagon, 
  PlayCircle, 
  Clock, 
  CheckCircle2, 
  Plus, 
  Filter, 
  ArrowUpDown 
} from 'lucide-react';

export default function TaskBoard({
  tasks,
  onEditTask,
  onDeleteTask,
  onStatusChange,
  onOpenNewTaskModal,
  onTriggerGuardrailViolation,
  onSelectTaskForGraph,
  activeFilter,
  setActiveFilter,
}) {
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('default');

  // Filter by priority
  let filtered = tasks;
  if (priorityFilter !== 'ALL') {
    filtered = filtered.filter((t) => t.priority === priorityFilter);
  }

  // Sort tasks
  const sortedTasks = [...filtered].sort((a, b) => {
    if (sortBy === 'priority') {
      const weight = { Critical: 4, High: 3, Medium: 2, Low: 1 };
      return (weight[b.priority] || 0) - (weight[a.priority] || 0);
    }
    if (sortBy === 'blockers') {
      return (b.blockingPrerequisites?.length || 0) - (a.blockingPrerequisites?.length || 0);
    }
    if (sortBy === 'dueDate') {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    }
    if (sortBy === 'title') {
      return a.title.localeCompare(b.title);
    }
    return 0;
  });

  // Categorize tasks for Kanban
  const notStartedTasks = sortedTasks.filter((t) => t.status === 'Not Started');
  const inProgressTasks = sortedTasks.filter((t) => t.status === 'In Progress');
  const doneTasks = sortedTasks.filter((t) => t.status === 'Done');

  const readyNotStarted = notStartedTasks.filter((t) => !t.isBlocked);
  const blockedNotStarted = notStartedTasks.filter((t) => t.isBlocked);
  const completedFocus = doneTasks.length > 0 && notStartedTasks.length === 0 && inProgressTasks.length === 0;

  return (
    <div className="task-board w-full">
      {/* Sub-Filter & Sorting Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-3 border-b border-slate-800/80">
        {/* Left: Quick Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-cyan-400" />
            Filter:
          </span>
          <button
            onClick={() => setActiveFilter && setActiveFilter('all')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              activeFilter === 'all'
                ? 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All ({tasks.length})
          </button>
          <button
            onClick={() => setActiveFilter && setActiveFilter('blocked')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeFilter === 'blocked'
                ? 'bg-rose-950 text-rose-200 border border-rose-800 ring-1 ring-rose-600/50'
                : 'text-slate-400 hover:text-rose-400'
            }`}
          >
            <AlertOctagon className="w-3 h-3 text-rose-400" />
            <span>Blocked ({tasks.filter((t) => t.isBlocked).length})</span>
          </button>
          <button
            onClick={() => setActiveFilter && setActiveFilter('ready')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeFilter === 'ready'
                ? 'bg-emerald-950 text-emerald-200 border border-emerald-800 ring-1 ring-emerald-600/50'
                : 'text-slate-400 hover:text-emerald-400'
            }`}
          >
            <PlayCircle className="w-3 h-3 text-emerald-400" />
            <span>Ready ({tasks.filter((t) => t.readyToStart).length})</span>
          </button>
        </div>

        {/* Right: Priority Filter & Sort Dropdowns */}
        <div className="flex items-center gap-2.5">
          {/* Priority Filter */}
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">All Priorities</option>
              <option value="Critical">Critical Only</option>
              <option value="High">High Only</option>
              <option value="Medium">Medium Only</option>
              <option value="Low">Low Only</option>
            </select>
          </div>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="default">Default Order</option>
              <option value="priority">Priority: Critical First</option>
              <option value="blockers">Most Blocked First</option>
              <option value="dueDate">Due Date</option>
              <option value="title">Title (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {sortedTasks.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-8">
          <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <LayoutGrid className="w-6 h-6 text-slate-500" />
          </div>
          <h3 className="text-base font-bold text-slate-200 mb-1">No tasks match this view</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4 leading-relaxed">
            Adjust your search query or filters, or create a new task with custom prerequisites.
          </p>
          <button
            onClick={onOpenNewTaskModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-all shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Create Task</span>
          </button>
        </div>
      ) : (
        /* KANBAN BOARD 3-COLUMN LAYOUT */
        <div className={`kanban-columns grid grid-cols-1 md:grid-cols-3 gap-5 items-start ${completedFocus ? 'kanban-completed-focus' : ''}`}>
          {/* Column 1: Not Started (with Blocked vs Ready Demarcation) */}
          <div className={`task-column kanban-empty-lane bg-slate-900/50 backdrop-blur-md border border-slate-800/80 rounded-2xl p-4 flex flex-col gap-3.5 shadow-xl ${notStartedTasks.length === 0 ? 'is-empty' : ''}`}>
            {/* Column Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                <h2 className="font-bold text-sm text-slate-100">Not Started</h2>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-semibold">
                  {notStartedTasks.length}
                </span>
              </div>
              {blockedNotStarted.length > 0 && (
                <span className="text-[11px] font-bold text-rose-400 flex items-center gap-1">
                  <AlertOctagon className="w-3.5 h-3.5 text-rose-500" />
                  {blockedNotStarted.length} blocked
                </span>
              )}
            </div>

            {/* Blocked Sub-Section */}
            {blockedNotStarted.length > 0 && (
              <div className="space-y-3">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-rose-400/90 flex items-center gap-1.5 px-1 pt-1">
                  <AlertOctagon className="w-3 h-3 text-rose-500 animate-pulse" />
                  <span>Blocked by Prerequisites ({blockedNotStarted.length})</span>
                </div>
                {blockedNotStarted.map((task) => (
                  <TaskCard
                    key={task._id}
                    task={task}
                    onEdit={onEditTask}
                    onDelete={onDeleteTask}
                    onStatusChange={onStatusChange}
                    onSelectTaskForGraph={onSelectTaskForGraph}
                    onTriggerGuardrailViolation={onTriggerGuardrailViolation}
                  />
                ))}
              </div>
            )}

            {/* Ready to Start Sub-Section */}
            <div className="space-y-3">
              {blockedNotStarted.length > 0 && readyNotStarted.length > 0 && (
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400/90 flex items-center gap-1.5 px-1 pt-3 border-t border-slate-800/80">
                  <PlayCircle className="w-3 h-3 text-emerald-400" />
                  <span>Ready to Start ({readyNotStarted.length})</span>
                </div>
              )}
              {readyNotStarted.map((task) => (
                <TaskCard
                  key={task._id}
                  task={task}
                  onEdit={onEditTask}
                  onDelete={onDeleteTask}
                  onStatusChange={onStatusChange}
                  onSelectTaskForGraph={onSelectTaskForGraph}
                  onTriggerGuardrailViolation={onTriggerGuardrailViolation}
                />
              ))}
            </div>

            {notStartedTasks.length === 0 && (
              <div className="text-center py-10 text-xs text-slate-500 italic border border-dashed border-slate-800 rounded-xl">
                No tasks waiting to start
              </div>
            )}
          </div>

          {/* Column 2: In Progress */}
          <div className={`task-column kanban-empty-lane bg-slate-900/50 backdrop-blur-md border border-sky-900/50 rounded-2xl p-4 flex flex-col gap-3.5 shadow-xl ${inProgressTasks.length === 0 ? 'is-empty' : ''}`}>
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-ping" />
                <h2 className="font-bold text-sm text-sky-200">In Progress</h2>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-sky-950 text-sky-300 border border-sky-800 font-semibold">
                  {inProgressTasks.length}
                </span>
              </div>
              <Clock className="w-4 h-4 text-sky-400" />
            </div>

            <div className="space-y-3">
              {inProgressTasks.map((task) => (
                <TaskCard
                  key={task._id}
                  task={task}
                  onEdit={onEditTask}
                  onDelete={onDeleteTask}
                  onStatusChange={onStatusChange}
                  onSelectTaskForGraph={onSelectTaskForGraph}
                  onTriggerGuardrailViolation={onTriggerGuardrailViolation}
                />
              ))}
            </div>

            {inProgressTasks.length === 0 && (
              <div className="text-center py-10 text-xs text-slate-500 italic border border-dashed border-slate-800 rounded-xl">
                No active in-progress tasks
              </div>
            )}
          </div>

          {/* Column 3: Completed (Done) */}
          <div className="task-column kanban-completed-lane bg-slate-900/50 backdrop-blur-md border border-emerald-900/50 rounded-2xl p-4 flex flex-col gap-3.5 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <h2 className="font-bold text-sm text-emerald-200">Completed</h2>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-semibold">
                  {doneTasks.length}
                </span>
              </div>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>

            <div className={`kanban-completed-grid ${completedFocus ? 'is-focused' : 'space-y-3'}`}>
              {doneTasks.map((task) => (
                <TaskCard
                  key={task._id}
                  task={task}
                  onEdit={onEditTask}
                  onDelete={onDeleteTask}
                  onStatusChange={onStatusChange}
                  onSelectTaskForGraph={onSelectTaskForGraph}
                  onTriggerGuardrailViolation={onTriggerGuardrailViolation}
                />
              ))}
            </div>

            {doneTasks.length === 0 && (
              <div className="text-center py-10 text-xs text-slate-500 italic border border-dashed border-slate-800 rounded-xl">
                No completed tasks yet
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
