import React, { useState } from 'react';
import { 
  AlertOctagon, 
  CheckCircle2, 
  Clock, 
  Edit3, 
  Trash2, 
  Link2, 
  ArrowRight, 
  Network, 
  Calendar,
  Check,
  Play
} from 'lucide-react';

export default function DependencyTableView({
  tasks,
  onEditTask,
  onDeleteTask,
  onStatusChange,
  onOpenGraphWithNode,
  onTriggerGuardrailViolation,
}) {
  const [sortField, setSortField] = useState('title');
  const [sortAsc, setSortAsc] = useState(true);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const sortedTasks = [...tasks].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];

    if (sortField === 'blockers') {
      aVal = a.blockingPrerequisites?.length || 0;
      bVal = b.blockingPrerequisites?.length || 0;
    }

    if (typeof aVal === 'string') {
      return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return sortAsc ? (aVal > bVal ? 1 : -1) : aVal < bVal ? 1 : -1;
  });

  const handleAttemptStatusChange = (task, nextStatus) => {
    if ((nextStatus === 'In Progress' || nextStatus === 'Done') && task.isBlocked) {
      if (onTriggerGuardrailViolation) {
        onTriggerGuardrailViolation({
          task,
          nextStatus,
          blockers: task.blockingPrerequisites || [],
        });
      }
      return;
    }
    onStatusChange(task._id, nextStatus);
  };

  return (
    <div className="w-full bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold">
              <th
                onClick={() => handleSort('title')}
                className="py-3.5 px-4 cursor-pointer hover:text-white"
              >
                Task Title {sortField === 'title' && (sortAsc ? '▲' : '▼')}
              </th>
              <th
                onClick={() => handleSort('status')}
                className="py-3.5 px-3 cursor-pointer hover:text-white"
              >
                Status {sortField === 'status' && (sortAsc ? '▲' : '▼')}
              </th>
              <th
                onClick={() => handleSort('priority')}
                className="py-3.5 px-3 cursor-pointer hover:text-white"
              >
                Priority {sortField === 'priority' && (sortAsc ? '▲' : '▼')}
              </th>
              <th
                onClick={() => handleSort('blockers')}
                className="py-3.5 px-3 cursor-pointer hover:text-white"
              >
                Blocker State {sortField === 'blockers' && (sortAsc ? '▲' : '▼')}
              </th>
              <th className="py-3.5 px-4">Prerequisites</th>
              <th className="py-3.5 px-3">Due Date</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {sortedTasks.map((task) => {
              const isBlocked = task.isBlocked;
              const isReady = task.readyToStart;

              return (
                <tr
                  key={task._id}
                  className={`hover:bg-slate-850/60 transition-colors ${
                    isBlocked ? 'bg-rose-950/10' : ''
                  }`}
                >
                  {/* Title & Tags */}
                  <td className="py-3 px-4 max-w-xs">
                    <p className="font-bold text-slate-100 hover:text-cyan-300 transition-colors truncate">
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                        {task.description}
                      </p>
                    )}
                    {task.tags && task.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {task.tags.map((tag, i) => (
                          <span
                            key={i}
                            className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700/60"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>

                  {/* Status Dropdown */}
                  <td className="py-3 px-3 shrink-0">
                    <select
                      value={task.status}
                      onChange={(e) => handleAttemptStatusChange(task, e.target.value)}
                      className={`text-xs px-2.5 py-1 rounded-lg border font-semibold focus:outline-none transition-all ${
                        task.status === 'Done'
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                          : task.status === 'In Progress'
                          ? 'bg-sky-950 text-sky-300 border-sky-800'
                          : 'bg-slate-900 text-slate-300 border-slate-700'
                      }`}
                    >
                      <option value="Not Started">Not Started</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Done">Done</option>
                    </select>
                  </td>

                  {/* Priority Pill */}
                  <td className="py-3 px-3 shrink-0">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                        task.priority === 'Critical'
                          ? 'bg-rose-950/80 text-rose-300 border-rose-800'
                          : task.priority === 'High'
                          ? 'bg-orange-950/80 text-orange-300 border-orange-800'
                          : task.priority === 'Medium'
                          ? 'bg-amber-950/80 text-amber-300 border-amber-800'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      {task.priority}
                    </span>
                  </td>

                  {/* Blocker State */}
                  <td className="py-3 px-3 shrink-0">
                    {isBlocked ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800 flex items-center gap-1 w-max animate-pulse">
                        <AlertOctagon className="w-3 h-3 text-rose-400" />
                        {task.blockingPrerequisites?.length} Blocker(s)
                      </span>
                    ) : isReady ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1 w-max">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        Ready to Start
                      </span>
                    ) : task.status === 'Done' ? (
                      <span className="text-[10px] font-semibold text-slate-500">
                        Completed
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-sky-400">
                        In Flight
                      </span>
                    )}
                  </td>

                  {/* Prerequisites Chips */}
                  <td className="py-3 px-4 max-w-sm">
                    {task.prerequisites && task.prerequisites.length > 0 ? (
                      <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto pr-1">
                        {task.prerequisites.map((p) => {
                          const isDone = p.status === 'Done';
                          return (
                            <span
                              key={p._id || p}
                              className={`text-[10px] px-2 py-0.5 rounded border flex items-center gap-1 ${
                                isDone
                                  ? 'bg-emerald-950/40 border-emerald-800/40 text-emerald-300'
                                  : 'bg-rose-950/50 border-rose-800/60 text-rose-300 font-semibold'
                              }`}
                              title={`${p.title} (${p.status})`}
                            >
                              {isDone ? (
                                <Check className="w-2.5 h-2.5 text-emerald-400" />
                              ) : (
                                <AlertOctagon className="w-2.5 h-2.5 text-rose-400" />
                              )}
                              <span className="truncate max-w-[120px]">{p.title}</span>
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-600 italic">None (Root)</span>
                    )}
                  </td>

                  {/* Due Date */}
                  <td className="py-3 px-3 text-slate-400 shrink-0">
                    {task.dueDate ? (
                      <div className="flex items-center gap-1 text-[11px]">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                      </div>
                    ) : (
                      <span className="text-slate-600 text-[10px]">—</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-right shrink-0">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onOpenGraphWithNode && onOpenGraphWithNode(task._id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition-colors"
                        title="Inspect in DAG Graph"
                      >
                        <Network className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onEditTask(task)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        title="Edit Task"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteTask(task._id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/50 transition-colors"
                        title="Delete Task"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
