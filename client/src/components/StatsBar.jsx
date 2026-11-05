import React from 'react';
import { 
  Flame, 
  ArrowRight,
  Check
} from 'lucide-react';

export default function StatsBar({ 
  stats, 
  tasks = [], 
  activeFilter, 
  setActiveFilter, 
  onStatusChange,
  onOpenGraphWithNode 
}) {
  const total = stats?.total || 0;
  const blocked = stats?.blockedCount || 0;
  const ready = stats?.readyCount || 0;
  const inProgress = stats?.inProgressCount || 0;
  const done = stats?.doneCount || 0;

  const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;

  // Identify the top bottleneck task (the unfinished task that appears as a prerequisite in the most other tasks)
  const bottleneckAnalysis = React.useMemo(() => {
    if (!tasks || tasks.length === 0) return null;

    const blockerCountMap = new Map();
    tasks.forEach((t) => {
      if (t.isBlocked && t.blockingPrerequisites) {
        t.blockingPrerequisites.forEach((b) => {
          const bId = b._id ? b._id.toString() : b.toString();
          blockerCountMap.set(bId, (blockerCountMap.get(bId) || 0) + 1);
        });
      }
    });

    if (blockerCountMap.size === 0) return null;

    let maxBlocks = 0;
    let topBlockerId = null;
    for (const [id, count] of blockerCountMap.entries()) {
      if (count > maxBlocks) {
        maxBlocks = count;
        topBlockerId = id;
      }
    }

    const topTask = tasks.find((t) => t._id.toString() === topBlockerId);
    if (!topTask || maxBlocks === 0) return null;

    return {
      task: topTask,
      blockedCount: maxBlocks,
    };
  }, [tasks]);

  return (
    <section className="overview-panel mb-6">
      {/* Critical Bottleneck Alert Banner */}
      {bottleneckAnalysis && (
        <div className="bottleneck-banner p-3.5 rounded-xl flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="bottleneck-icon w-9 h-9 rounded-lg flex items-center justify-center shrink-0">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full font-bold border">
                  Critical Bottleneck
                </span>
                <span className="text-xs font-bold">
                  "{bottleneckAnalysis.task.title}"
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Blocking <strong>{bottleneckAnalysis.blockedCount} downstream task(s)</strong>. Completing it will open work across the project.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenGraphWithNode && (
              <button
                onClick={() => onOpenGraphWithNode(bottleneckAnalysis.task._id)}
                className="quiet-action px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5"
              >
                <span>Inspect in DAG</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
            {onStatusChange && (
              <button
                onClick={() => onStatusChange(bottleneckAnalysis.task._id, 'Done')}
                className="complete-action px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                title="Resolve bottleneck by completing this task"
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>Mark Done</span>
              </button>
            )}
          </div>
        </div>
      )}

      <div className="overview-grid">
        <div className="overview-title">
          <p className="eyebrow">RELEASE CONTROL / 2026</p>
          <h2>Dependency<br />overview</h2>
          <p className="overview-subtitle">A clear view of what is moving, waiting, and holding up delivery.</p>
        </div>
        <button className={`overview-stat overview-total ${activeFilter === 'all' ? 'is-selected' : ''}`} onClick={() => setActiveFilter?.('all')}>
          <span className="stat-label">Active tasks</span>
          <span className="stat-value">{total}</span>
          <span className="stat-note">Across this release</span>
        </button>
        <button className={`overview-stat overview-progress ${activeFilter === 'ready' ? 'is-selected' : ''}`} onClick={() => setActiveFilter?.('ready')}>
          <span className="stat-label">Ready to start</span>
          <span className="stat-value">{ready}</span>
          <span className="stat-note">Unblocked work</span>
        </button>
        <button className={`overview-stat overview-blocked ${activeFilter === 'blocked' ? 'is-selected' : ''}`} onClick={() => setActiveFilter?.('blocked')}>
          <span className="stat-label">Blocked</span>
          <span className="stat-value">{blocked}</span>
          <span className="stat-note">Needs prerequisites</span>
        </button>
        <div className="completion-gauge" style={{ '--completion': `${completionRate}%` }} aria-label={`${completionRate}% of tasks complete`}>
          <div className="gauge-center">
            <span>{completionRate}<small>%</small></span>
            <em>complete</em>
          </div>
        </div>
        <div className="overview-done">
          <span className="stat-label">Completed</span>
          <strong>{done}<small> / {total}</small></strong>
          <span className="stat-note">{inProgress} currently in progress</span>
        </div>
      </div>
    </section>
  );
}
