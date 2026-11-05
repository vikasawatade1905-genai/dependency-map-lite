import React, { useState } from 'react';
import { 
  AlertOctagon, 
  CheckCircle2, 
  Clock, 
  ArrowRight, 
  Edit3, 
  Trash2, 
  Calendar, 
  Link2, 
  AlertTriangle,
  Play,
  RotateCcw,
  Check,
  Network
} from 'lucide-react';

const PRIORITY_THEMES = {
  Low: {
    bg: 'bg-slate-800/80',
    text: 'text-slate-300',
    border: 'border-slate-700/60',
    dot: 'bg-slate-400',
  },
  Medium: {
    bg: 'bg-amber-950/40',
    text: 'text-amber-300',
    border: 'border-amber-800/50',
    dot: 'bg-amber-400',
  },
  High: {
    bg: 'bg-orange-950/40',
    text: 'text-orange-300',
    border: 'border-orange-800/50',
    dot: 'bg-orange-400',
  },
  Critical: {
    bg: 'bg-rose-950/70',
    text: 'text-rose-300',
    border: 'border-rose-800/80',
    dot: 'bg-rose-500 animate-pulse',
  },
};

export default function TaskCard({
  task,
  onEdit,
  onDelete,
  onStatusChange,
  onSelectTaskForGraph,
  onTriggerGuardrailViolation,
}) {
  const [isShaking, setIsShaking] = useState(false);

  const priorityStyle = PRIORITY_THEMES[task.priority] || PRIORITY_THEMES.Medium;

  // Intercept illegal state transitions on blocked tasks
  const handleAttemptStatusChange = (nextStatus) => {
    if ((nextStatus === 'In Progress' || nextStatus === 'Done') && task.isBlocked) {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);

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

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Compute prerequisite completion count
  const prereqTotal = task.prerequisites?.length || 0;
  const prereqDone = task.prerequisites?.filter((p) => p.status === 'Done').length || 0;

  return (
    <div
      className={`task-card bg-slate-900/85 backdrop-blur-md border rounded-xl p-4 transition-all duration-300 relative flex flex-col justify-between group shadow-lg ${
        task.isBlocked
          ? 'border-rose-900/60 hover:border-rose-600/80 glow-crimson'
          : task.readyToStart
          ? 'border-emerald-900/60 hover:border-emerald-600/70 glow-emerald'
          : 'border-slate-800 hover:border-slate-700'
      } ${isShaking ? 'animate-shake' : ''}`}
    >
      <div>
        {/* Top Badges & Actions */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Priority Pill */}
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${priorityStyle.bg} ${priorityStyle.text} ${priorityStyle.border} uppercase tracking-wider flex items-center gap-1`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${priorityStyle.dot}`} />
              {task.priority}
            </span>

            {/* Blocked Badge */}
            {task.isBlocked && (
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800 flex items-center gap-1 animate-pulse">
                <AlertOctagon className="w-3 h-3 text-rose-400" />
                BLOCKED
              </span>
            )}

            {/* Ready to Start Badge */}
            {task.readyToStart && (
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                READY
              </span>
            )}
          </div>

          {/* Action icons */}
          <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
            {onSelectTaskForGraph && (
              <button
                onClick={() => onSelectTaskForGraph(task._id)}
                className="p-1 rounded-md text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition-colors"
                title="Inspect in DAG Graph"
              >
                <Network className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => onEdit(task)}
              className="p-1 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
              title="Edit Task"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete(task._id)}
              className="p-1 rounded-md text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
              title="Delete Task"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Task Title */}
        <h3 className="font-bold text-slate-100 text-sm leading-snug tracking-tight mb-1 group-hover:text-cyan-300 transition-colors">
          {task.title}
        </h3>

        {/* Description */}
        {task.description && (
          <p className="text-xs text-slate-400 line-clamp-2 mb-3 leading-relaxed">
            {task.description}
          </p>
        )}

        {/* Prerequisites Breakdown & Segmented Mini Progress Bar */}
        {prereqTotal > 0 && (
          <div className="mb-3 pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
              <span className="flex items-center gap-1 font-semibold text-slate-300">
                <Link2 className="w-3 h-3 text-cyan-400" />
                Prerequisites ({prereqDone}/{prereqTotal} Done)
              </span>
              {task.isBlocked && (
                <span className="text-[10px] font-bold text-rose-400 animate-pulse">
                  {task.blockingPrerequisites?.length} blocking
                </span>
              )}
            </div>

            {/* Segmented Prerequisite Progress Line */}
            <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden flex gap-0.5 mb-2">
              {task.prerequisites.map((p, i) => (
                <div
                  key={i}
                  className={`h-full flex-1 ${
                    p.status === 'Done' ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                />
              ))}
            </div>

            {/* Prerequisite Tag Chips */}
            <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto pr-1">
              {task.prerequisites.map((p) => {
                const isFinished = p.status === 'Done';
                return (
                  <div
                    key={p._id || p}
                    className={`text-[10px] px-2 py-0.5 rounded-md border flex items-center justify-between gap-1.5 font-medium transition-all ${
                      isFinished
                        ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-300'
                        : 'bg-rose-950/60 border-rose-800/80 text-rose-200 font-semibold shadow-xs'
                    }`}
                  >
                    <div className="flex items-center gap-1 truncate max-w-[130px]">
                      {isFinished ? (
                        <Check className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-2.5 h-2.5 text-rose-400 shrink-0 animate-pulse" />
                      )}
                      <span className="truncate">{p.title}</span>
                    </div>

                    {/* Quick Complete Action for unfinished prerequisites */}
                    {!isFinished && onStatusChange && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onStatusChange(p._id, 'Done');
                        }}
                        className="px-1 py-0.2 rounded bg-rose-900/80 hover:bg-emerald-600 text-[9px] text-white hover:font-bold transition-all"
                        title={`Click to mark "${p.title}" as Done and unblock this task`}
                      >
                        ✓
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tags */}
        {task.tags && task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2.5">
            {task.tags.map((tag, i) => (
              <span
                key={i}
                className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-800/70 text-slate-400 border border-slate-700/40"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Footer: Due date + State Transition Controls */}
      <div className="pt-2.5 border-t border-slate-800/70 flex items-center justify-between gap-2 mt-auto">
        {/* Due Date */}
        <div className="text-[11px] text-slate-400 flex items-center gap-1">
          {task.dueDate ? (
            <>
              <Calendar className="w-3 h-3 text-slate-500" />
              <span>{formatDate(task.dueDate)}</span>
            </>
          ) : (
            <span className="text-slate-600 text-[10px]">No date</span>
          )}
        </div>

        {/* State Transition Controls */}
        <div className="flex items-center gap-1.5">
          {task.status === 'Not Started' && (
            <button
              onClick={() => handleAttemptStatusChange('In Progress')}
              className={`text-xs px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-all ${
                task.isBlocked
                  ? 'bg-rose-950/70 text-rose-300 hover:bg-rose-900 border border-rose-800/70'
                  : 'bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-500 hover:to-cyan-500 text-white shadow-sm'
              }`}
              title={
                task.isBlocked
                  ? 'Blocked by unfinished prerequisites (click to inspect guardrail alert)'
                  : 'Start Task'
              }
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Start</span>
            </button>
          )}

          {task.status === 'In Progress' && (
            <>
              <button
                onClick={() => handleAttemptStatusChange('Done')}
                className="text-xs px-2.5 py-1 rounded-lg font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1 transition-all shadow-sm"
                title="Mark Task as Done"
              >
                <Check className="w-3 h-3 stroke-[2.5]" />
                <span>Complete</span>
              </button>
              <button
                onClick={() => handleAttemptStatusChange('Not Started')}
                className="text-xs p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all"
                title="Move back to Not Started"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </>
          )}

          {task.status === 'Done' && (
            <button
              onClick={() => handleAttemptStatusChange('In Progress')}
              className="text-xs px-2.5 py-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-700/60 flex items-center gap-1 transition-all"
              title="Reopen task"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reopen</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
