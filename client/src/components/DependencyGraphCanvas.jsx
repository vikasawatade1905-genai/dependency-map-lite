import React, { useState, useMemo, useRef } from 'react';
import { 
  Network, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  RotateCcw, 
  AlertOctagon, 
  CheckCircle2, 
  Clock, 
  ShieldAlert, 
  ArrowRight, 
  Check, 
  Layers,
  Filter,
  Eye,
  Info
} from 'lucide-react';

const NODE_WIDTH = 220;
const NODE_HEIGHT = 88;
const HORIZONTAL_GAP = 140;
const VERTICAL_GAP = 30;
const PADDING = 60;

export default function DependencyGraphCanvas({
  graphData,
  tasks,
  onStatusChange,
  onEditTask,
  selectedNodeId: externalSelectedNodeId,
  onSelectNode: externalOnSelectNode,
}) {
  const [internalSelectedId, setInternalSelectedId] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [edgeFilter, setEdgeFilter] = useState('all'); // 'all' | 'blocking' | 'selected'
  const containerRef = useRef(null);

  const selectedNodeId = externalSelectedNodeId !== undefined ? externalSelectedNodeId : internalSelectedId;
  const setSelectedNodeId = (id) => {
    if (externalOnSelectNode) externalOnSelectNode(id);
    setInternalSelectedId(id);
  };

  const { nodes = [], edges = [], summary = {} } = graphData || {};

  // Compute node coordinates based on topological rank and index
  const layout = useMemo(() => {
    if (!nodes.length) return { nodePositions: new Map(), width: 800, height: 600 };

    const maxRank = Math.max(...nodes.map((n) => n.rank || 0), 0);
    const columns = [];
    for (let r = 0; r <= maxRank; r++) {
      columns.push([]);
    }

    nodes.forEach((node) => {
      const r = Math.min(Math.max(node.rank || 0, 0), maxRank);
      columns[r].push(node);
    });

    const nodePositions = new Map();
    let maxColHeight = 0;

    columns.forEach((colNodes, rankIndex) => {
      const colHeight = colNodes.length * (NODE_HEIGHT + VERTICAL_GAP) - VERTICAL_GAP;
      if (colHeight > maxColHeight) maxColHeight = colHeight;

      colNodes.forEach((node, nodeIndex) => {
        const x = PADDING + rankIndex * (NODE_WIDTH + HORIZONTAL_GAP);
        const y = PADDING + nodeIndex * (NODE_HEIGHT + VERTICAL_GAP);
        nodePositions.set(node.id, {
          x,
          y,
          centerX: x + NODE_WIDTH / 2,
          centerY: y + NODE_HEIGHT / 2,
          rightX: x + NODE_WIDTH,
          leftX: x,
          node,
        });
      });
    });

    const totalWidth = PADDING * 2 + (maxRank + 1) * NODE_WIDTH + maxRank * HORIZONTAL_GAP;
    const totalHeight = Math.max(PADDING * 2 + maxColHeight, 600);

    return { nodePositions, width: totalWidth, height: totalHeight, maxRank };
  }, [nodes]);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  // Identify direct incoming prerequisites and outgoing dependents for selected node
  const activeIncomingEdges = edges.filter((e) => e.target === selectedNodeId);
  const activeOutgoingEdges = edges.filter((e) => e.source === selectedNodeId);
  const activePrereqIds = activeIncomingEdges.map((e) => e.source);
  const activeDependentIds = activeOutgoingEdges.map((e) => e.target);

  // Filter edges based on user toggle
  const visibleEdges = edges.filter((e) => {
    if (edgeFilter === 'blocking') return e.isBlocking;
    if (edgeFilter === 'selected' && selectedNodeId) {
      return e.source === selectedNodeId || e.target === selectedNodeId;
    }
    return true;
  });

  return (
    <div className="w-full h-full flex flex-col bg-slate-950/80 rounded-2xl border border-slate-800/80 overflow-hidden shadow-2xl relative">
      {/* Top Toolbar */}
      <div className="px-5 py-3.5 border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-md flex items-center justify-between gap-3 shrink-0 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-800/60 text-cyan-400 flex items-center justify-center">
            <Network className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-white">Visual DAG Dependency Graph</h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-cyan-300 border border-slate-700">
                {nodes.length} Nodes • {edges.length} Dependencies
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Interactive topological flow: Prerequisite (source) → Dependent Task (target)
            </p>
          </div>
        </div>

        {/* Edge Filter & Zoom Controls */}
        <div className="flex items-center gap-2.5">
          {/* Edge Filter Toggle */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-xs">
            <button
              onClick={() => setEdgeFilter('all')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                edgeFilter === 'all'
                  ? 'bg-slate-800 text-slate-100'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Edges
            </button>
            <button
              onClick={() => setEdgeFilter('blocking')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1 ${
                edgeFilter === 'blocking'
                  ? 'bg-rose-950 text-rose-300 border border-rose-800/80'
                  : 'text-slate-400 hover:text-rose-400'
              }`}
            >
              <AlertOctagon className="w-3 h-3 text-rose-400" />
              <span>Blocking Only</span>
            </button>
            <button
              onClick={() => setEdgeFilter('selected')}
              disabled={!selectedNodeId}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                edgeFilter === 'selected'
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/80'
                  : 'text-slate-400 hover:text-cyan-400 disabled:opacity-40'
              }`}
            >
              Active Node
            </button>
          </div>

          {/* Zoom Buttons */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-xs text-slate-300">
            <button
              onClick={() => setZoom((z) => Math.max(0.6, z - 0.15))}
              className="p-1.5 hover:bg-slate-800 rounded transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 font-mono text-[11px] text-slate-400">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(1.4, z + 0.15))}
              className="p-1.5 hover:bg-slate-800 rounded transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoom(1)}
              className="p-1.5 hover:bg-slate-800 rounded transition-colors text-slate-400 hover:text-slate-200"
              title="Reset Zoom (100%)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Graph Area: SVG Canvas + Floating Inspector Drawer */}
      <div className="flex-1 flex overflow-hidden relative" ref={containerRef}>
        {/* SVG Canvas Container */}
        <div className="flex-1 overflow-auto bg-slate-950 bg-grid-pattern p-6 relative">
          <div
            style={{
              width: layout.width,
              height: layout.height,
              transform: `scale(${zoom})`,
              transformOrigin: '0 0',
              transition: 'transform 0.15s ease-out',
            }}
            className="relative"
          >
            {/* SVG Connecting Edges */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none z-10"
              style={{ width: layout.width, height: layout.height }}
            >
              <defs>
                {/* Crimson Marker for Blocked Edges */}
                <marker
                  id="arrow-crimson"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#ef4444" />
                </marker>
                {/* Cyan Marker for Active/Unblocked Edges */}
                <marker
                  id="arrow-cyan"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#06b6d4" />
                </marker>
                {/* Emerald Marker for Done Prerequisite Edges */}
                <marker
                  id="arrow-emerald"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#10b981" />
                </marker>
                {/* Muted Default Marker */}
                <marker
                  id="arrow-muted"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#475569" />
                </marker>
              </defs>

              {/* Render Visible Directed Bezier Curves */}
              {visibleEdges.map((edge) => {
                const sourcePos = layout.nodePositions.get(edge.source);
                const targetPos = layout.nodePositions.get(edge.target);
                if (!sourcePos || !targetPos) return null;

                const isConnectedToSelected =
                  selectedNodeId &&
                  (edge.source === selectedNodeId || edge.target === selectedNodeId);

                const isBlocking = edge.isBlocking;
                const isSourceDone = edge.sourceStatus === 'Done';

                // Curve start and end coordinates
                const startX = sourcePos.rightX;
                const startY = sourcePos.centerY;
                const endX = targetPos.leftX;
                const endY = targetPos.centerY;

                // Bezier control points
                const dx = Math.max(30, (endX - startX) * 0.45);
                const pathD = `M ${startX} ${startY} C ${startX + dx} ${startY}, ${endX - dx} ${endY}, ${endX} ${endY}`;

                let strokeColor = '#334155';
                let markerId = 'arrow-muted';
                let strokeWidth = 1.8;
                let strokeClass = '';

                if (isBlocking) {
                  strokeColor = '#ef4444';
                  markerId = 'arrow-crimson';
                  strokeWidth = isConnectedToSelected ? 3 : 2;
                  strokeClass = 'animate-edge-flow';
                } else if (isSourceDone) {
                  strokeColor = '#10b981';
                  markerId = 'arrow-emerald';
                  strokeWidth = isConnectedToSelected ? 2.5 : 1.8;
                } else if (isConnectedToSelected) {
                  strokeColor = '#06b6d4';
                  markerId = 'arrow-cyan';
                  strokeWidth = 2.5;
                }

                const opacity =
                  selectedNodeId && !isConnectedToSelected && edgeFilter !== 'selected'
                    ? 0.25
                    : 0.9;

                return (
                  <path
                    key={edge.id}
                    d={pathD}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeOpacity={opacity}
                    markerEnd={`url(#${markerId})`}
                    className={strokeClass}
                  />
                );
              })}
            </svg>

            {/* Rank / Stage Column Background Bands */}
            {Array.from({ length: layout.maxRank + 1 }).map((_, rankIdx) => {
              const colX = PADDING + rankIdx * (NODE_WIDTH + HORIZONTAL_GAP) - 16;
              return (
                <div
                  key={rankIdx}
                  style={{
                    position: 'absolute',
                    left: colX,
                    top: 10,
                    width: NODE_WIDTH + 32,
                    height: layout.height - 20,
                  }}
                  className="rounded-2xl border border-dashed border-slate-800/40 bg-slate-900/10 pointer-events-none p-3"
                >
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-600 block text-center">
                    {rankIdx === 0 ? 'Tier 0: Root Tasks' : `Tier ${rankIdx}: Stage ${rankIdx}`}
                  </span>
                </div>
              );
            })}

            {/* Render Task Nodes */}
            {Array.from(layout.nodePositions.entries()).map(([nodeId, pos]) => {
              const node = pos.node;
              const isSelected = nodeId === selectedNodeId;
              const isPrereqOfSelected = activePrereqIds.includes(nodeId);
              const isDependentOfSelected = activeDependentIds.includes(nodeId);

              let statusBorder = 'border-slate-800';
              let statusBg = 'bg-slate-900/90';
              let glowStyle = '';

              if (node.isBlocked) {
                statusBorder = 'border-rose-900/80';
                statusBg = 'bg-rose-950/40';
                glowStyle = 'glow-crimson';
              } else if (node.status === 'Done') {
                statusBorder = 'border-emerald-900/60';
                statusBg = 'bg-emerald-950/30';
              } else if (node.status === 'In Progress') {
                statusBorder = 'border-sky-900/60';
                statusBg = 'bg-sky-950/30';
              } else if (node.readyToStart) {
                statusBorder = 'border-emerald-600/70';
              }

              return (
                <div
                  key={nodeId}
                  onClick={() => setSelectedNodeId(nodeId)}
                  style={{
                    position: 'absolute',
                    left: pos.x,
                    top: pos.y,
                    width: NODE_WIDTH,
                    height: NODE_HEIGHT,
                  }}
                  className={`rounded-xl border p-3 cursor-pointer transition-all duration-200 z-20 flex flex-col justify-between shadow-lg select-none ${statusBg} ${statusBorder} ${glowStyle} ${
                    isSelected
                      ? 'ring-2 ring-cyan-400 border-cyan-400 shadow-cyan-500/30 scale-105 z-30'
                      : isPrereqOfSelected
                      ? 'ring-1.5 ring-rose-500 border-rose-500 shadow-rose-500/20 scale-[1.02]'
                      : isDependentOfSelected
                      ? 'ring-1.5 ring-cyan-400 border-cyan-400 shadow-cyan-500/20 scale-[1.02]'
                      : 'hover:border-slate-600 hover:scale-[1.01]'
                  }`}
                >
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase border ${
                        node.status === 'Done'
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                          : node.status === 'In Progress'
                          ? 'bg-sky-950 text-sky-300 border-sky-800'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      {node.status}
                    </span>

                    {node.isBlocked ? (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800 flex items-center gap-1 animate-pulse">
                        <AlertOctagon className="w-2.5 h-2.5" />
                        BLOCKED
                      </span>
                    ) : node.readyToStart ? (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                        READY
                      </span>
                    ) : null}
                  </div>

                  {/* Title */}
                  <h4 className="text-xs font-bold text-slate-100 truncate tracking-tight leading-snug">
                    {node.title}
                  </h4>

                  {/* Footer Stats */}
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/80">
                    <span className="font-mono text-slate-400">{node.priority}</span>
                    {node.blockingCount > 0 ? (
                      <span className="text-rose-400 font-semibold flex items-center gap-1">
                        <AlertOctagon className="w-2.5 h-2.5" />
                        {node.blockingCount} Blocker(s)
                      </span>
                    ) : (
                      <span className="text-slate-500">Tier {node.rank}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Floating Side Inspector Panel */}
        {selectedNode && (
          <div className="w-80 md:w-96 border-l border-slate-800 bg-slate-900/95 backdrop-blur-lg p-5 flex flex-col justify-between overflow-y-auto shrink-0 shadow-2xl z-30 animate-in slide-in-from-right-4">
            <div className="space-y-4">
              {/* Header */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                      selectedNode.status === 'Done'
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                        : selectedNode.status === 'In Progress'
                        ? 'bg-sky-950 text-sky-300 border-sky-800'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    {selectedNode.status}
                  </span>
                  <button
                    onClick={() => onEditTask && onEditTask(tasks.find((t) => t._id === selectedNode.id))}
                    className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold"
                  >
                    Edit Task
                  </button>
                </div>
                <h3 className="text-base font-bold text-white leading-snug">
                  {selectedNode.title}
                </h3>
                {selectedNode.description && (
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    {selectedNode.description}
                  </p>
                )}
              </div>

              {/* Blocker Alert Box */}
              {selectedNode.isBlocked ? (
                <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-800/90 text-rose-200 text-xs shadow-md glow-crimson">
                  <div className="flex items-center gap-1.5 font-bold text-rose-300 mb-1">
                    <ShieldAlert className="w-4 h-4 text-rose-400 animate-pulse" />
                    <span>State Transition Guardrail Active</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed mb-2">
                    Cannot move this task to <strong>In Progress</strong> or <strong>Done</strong> until all unfinished prerequisites below are resolved.
                  </p>
                </div>
              ) : selectedNode.readyToStart ? (
                <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-800/80 text-emerald-200 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>All prerequisites satisfied!</span>
                  </div>
                  <button
                    onClick={() => onStatusChange && onStatusChange(selectedNode.id, 'In Progress')}
                    className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shadow-sm transition-all"
                  >
                    Start Task
                  </button>
                </div>
              ) : null}

              {/* Upstream Prerequisites (Direct Blockers) */}
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  <span>Upstream Blockers ({activePrereqIds.length})</span>
                  <span className="text-[10px] text-slate-500 lowercase font-normal">must finish first</span>
                </div>

                {activePrereqIds.length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                    No prerequisites (Root task in DAG)
                  </p>
                ) : (
                  <div className="space-y-2">
                    {activePrereqIds.map((pId) => {
                      const pNode = nodes.find((n) => n.id === pId);
                      const isDone = pNode?.status === 'Done';

                      return (
                        <div
                          key={pId}
                          className={`p-2.5 rounded-lg border text-xs flex items-center justify-between transition-colors ${
                            isDone
                              ? 'bg-slate-950/70 border-emerald-900/60 text-slate-300'
                              : 'bg-rose-950/40 border-rose-900/80 text-rose-200'
                          }`}
                        >
                          <div
                            onClick={() => setSelectedNodeId(pId)}
                            className="truncate pr-2 cursor-pointer hover:text-cyan-300 flex-1"
                          >
                            <p className="font-semibold truncate">{pNode?.title || pId}</p>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Status: {pNode?.status}
                            </span>
                          </div>

                          {!isDone && onStatusChange && (
                            <button
                              onClick={() => onStatusChange(pId, 'Done')}
                              className="px-2 py-1 rounded bg-rose-900/60 hover:bg-emerald-700 text-rose-200 hover:text-white border border-rose-700 text-[10px] font-bold transition-all shrink-0 flex items-center gap-1"
                              title="Resolve this blocker by marking it Done"
                            >
                              <Check className="w-2.5 h-2.5" />
                              <span>Complete</span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Downstream Dependents (Tasks Waiting On This) */}
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  <span>Downstream Dependents ({activeDependentIds.length})</span>
                  <span className="text-[10px] text-slate-500 lowercase font-normal">waiting on this</span>
                </div>

                {activeDependentIds.length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                    No downstream tasks depend on this
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {activeDependentIds.map((dId) => {
                      const dNode = nodes.find((n) => n.id === dId);
                      return (
                        <div
                          key={dId}
                          onClick={() => setSelectedNodeId(dId)}
                          className="p-2 rounded-lg bg-slate-950/60 border border-slate-800 text-xs flex items-center justify-between text-slate-300 hover:border-cyan-600 cursor-pointer transition-colors"
                        >
                          <span className="truncate pr-2 font-medium">{dNode?.title || dId}</span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded font-bold uppercase bg-slate-800 text-slate-400">
                            {dNode?.status}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Legend */}
            <div className="pt-3 border-t border-slate-800 mt-4 text-[11px] text-slate-400 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Legend:</span>
                <span className="flex items-center gap-1.5 text-rose-400">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" /> Blocked
                </span>
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> Done
                </span>
                <span className="flex items-center gap-1.5 text-sky-400">
                  <span className="w-2 h-2 rounded-full bg-sky-500" /> In Progress
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
