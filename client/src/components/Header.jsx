import React from 'react';
import { 
  GitFork, 
  Plus, 
  Search, 
  RotateCcw, 
  Network, 
  Kanban, 
  Table,
} from 'lucide-react';

export default function Header({
  activeTab,
  setActiveTab,
  searchTerm,
  setSearchTerm,
  activeFilter,
  setActiveFilter,
  onOpenNewTaskModal,
  onResetData,
  isResetting,
  stats,
}) {
  return (
    <header className="dashboard-header sticky top-0 z-30 px-4 lg:px-8 py-3 transition-all">
      <div className="dashboard-header-inner flex flex-col md:flex-row md:items-center justify-between gap-3.5">
        {/* Left: Branding & Tagline */}
        <div className="flex items-center gap-3">
          <div className="brand-mark w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
            <GitFork className="w-5 h-5 rotate-90" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
                DependencyMap <span className="brand-lite font-light text-base">Lite</span>
              </h1>
              <span className="engine-status text-[10px] font-mono tracking-wider uppercase px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                <span className="engine-dot" />
                LIVE WORKSPACE
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Project dependency control
            </p>
          </div>
        </div>

        {/* Center: Primary View Tabs (Kanban, Interactive Graph, Matrix Table) */}
        <div className="flex items-center justify-center">
          <div className="dashboard-tabs flex items-center rounded-full p-1">
            <button
              onClick={() => setActiveTab('kanban')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'kanban'
                  ? 'tab-active text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Board</span>
            </button>

            <button
              onClick={() => setActiveTab('graph')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'graph'
                  ? 'tab-active text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>Dependency map</span>
            </button>

            <button
              onClick={() => setActiveTab('table')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'table'
                  ? 'tab-active text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Matrix</span>
            </button>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="dashboard-actions flex items-center gap-2.5 justify-end flex-wrap">
          {/* Search Bar */}
          <div className="relative min-w-[180px] max-w-[220px]">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="dashboard-search w-full rounded-full pl-8 pr-7 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Reset Demo Data */}
          <button
            onClick={onResetData}
            disabled={isResetting}
            className="dashboard-reset flex items-center gap-1.5 px-3 py-2 rounded-full text-slate-300 text-xs font-semibold transition-all disabled:opacity-50"
            title="Reset database to initial demo DAG dataset"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin text-cyan-400' : ''}`} />
            <span className="hidden sm:inline">Reset Demo</span>
          </button>

          {/* New Task Trigger */}
          <button
            onClick={onOpenNewTaskModal}
            className="dashboard-add flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New Task</span>
          </button>
        </div>
      </div>
    </header>
  );
}
