import React from 'react';
import { X, Network } from 'lucide-react';
import DependencyGraphCanvas from './DependencyGraphCanvas';

export default function DependencyGraphModal({
  isOpen,
  onClose,
  graphData,
  tasks,
  onStatusChange,
  onEditTask,
  selectedNodeId,
  onSelectNode,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-7xl h-[94vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-800/60 text-cyan-400 flex items-center justify-center">
              <Network className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Full-Screen DAG Inspector</h2>
              <p className="text-[11px] text-slate-400">
                Pan, zoom, and inspect directed edges &amp; upstream blocker chains
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Canvas Body */}
        <div className="flex-1 overflow-hidden p-3 bg-slate-950/50">
          <DependencyGraphCanvas
            graphData={graphData}
            tasks={tasks}
            onStatusChange={onStatusChange}
            onEditTask={(task) => {
              onClose();
              if (onEditTask) onEditTask(task);
            }}
            selectedNodeId={selectedNodeId}
            onSelectNode={onSelectNode}
          />
        </div>
      </div>
    </div>
  );
}
