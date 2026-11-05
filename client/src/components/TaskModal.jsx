import React, { useState, useEffect } from 'react';
import { 
  X, 
  AlertOctagon, 
  CheckCircle2, 
  GitFork, 
  Link2, 
  ShieldAlert, 
  Plus, 
  Search,
  Check,
  Calendar,
  Tag
} from 'lucide-react';

const PRIORITIES = [
  { value: 'Low', label: 'Low', activeStyle: 'bg-slate-800 text-slate-200 border-slate-600' },
  { value: 'Medium', label: 'Medium', activeStyle: 'bg-amber-950 text-amber-300 border-amber-600' },
  { value: 'High', label: 'High', activeStyle: 'bg-orange-950 text-orange-300 border-orange-600' },
  { value: 'Critical', label: 'Critical', activeStyle: 'bg-rose-950 text-rose-300 border-rose-600 ring-1 ring-rose-500' },
];

export default function TaskModal({
  isOpen,
  onClose,
  onSubmit,
  editingTask,
  allTasks = [],
  isLoading,
  apiError,
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('Not Started');
  const [priority, setPriority] = useState('Medium');
  const [prerequisites, setPrerequisites] = useState([]);
  const [dueDate, setDueDate] = useState('');
  const [tags, setTags] = useState([]);
  const [currentTagInput, setCurrentTagInput] = useState('');
  const [prereqSearch, setPrereqSearch] = useState('');
  const [localError, setLocalError] = useState(null);

  // Initialize modal state
  useEffect(() => {
    if (editingTask) {
      setTitle(editingTask.title || '');
      setDescription(editingTask.description || '');
      setStatus(editingTask.status || 'Not Started');
      setPriority(editingTask.priority || 'Medium');
      const existingPrereqs = (editingTask.prerequisites || []).map((p) =>
        p._id ? p._id.toString() : p.toString()
      );
      setPrerequisites(existingPrereqs);
      setDueDate(
        editingTask.dueDate
          ? new Date(editingTask.dueDate).toISOString().split('T')[0]
          : ''
      );
      setTags(editingTask.tags || []);
    } else {
      setTitle('');
      setDescription('');
      setStatus('Not Started');
      setPriority('Medium');
      setPrerequisites([]);
      setDueDate('');
      setTags([]);
    }
    setCurrentTagInput('');
    setPrereqSearch('');
    setLocalError(null);
  }, [editingTask, isOpen]);

  if (!isOpen) return null;

  // Candidate prerequisites (cannot select self)
  const candidateTasks = allTasks.filter((t) => {
    if (editingTask && t._id.toString() === editingTask._id.toString()) {
      return false;
    }
    if (prereqSearch.trim()) {
      return (
        t.title.toLowerCase().includes(prereqSearch.toLowerCase()) ||
        t.priority.toLowerCase().includes(prereqSearch.toLowerCase())
      );
    }
    return true;
  });

  const togglePrerequisite = (id) => {
    const idStr = id.toString();
    setPrerequisites((prev) =>
      prev.includes(idStr) ? prev.filter((p) => p !== idStr) : [...prev, idStr]
    );
    setLocalError(null);
  };

  // Add tag pill on Enter or comma
  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = currentTagInput.trim().replace(/^#/, '');
      if (val && !tags.includes(val)) {
        setTags([...tags, val]);
        setCurrentTagInput('');
      }
    }
  };

  const removeTag = (tagToRemove) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  // Quick date preset helper
  const setDatePreset = (daysFromNow) => {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    setDueDate(d.toISOString().split('T')[0]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setLocalError(null);

    if (!title.trim() || title.trim().length < 3) {
      setLocalError('Title must be at least 3 characters long.');
      return;
    }

    // Client-side guardrail check: cannot set In Progress or Done if selected prerequisites are not Done
    if (status !== 'Not Started') {
      const unfinished = allTasks.filter(
        (t) => prerequisites.includes(t._id.toString()) && t.status !== 'Done'
      );
      if (unfinished.length > 0) {
        setLocalError(
          `Guardrail violation: Cannot set status to "${status}". ${unfinished.length} selected prerequisite(s) are not yet "Done": ${unfinished
            .map((u) => u.title)
            .join(', ')}`
        );
        return;
      }
    }

    const payload = {
      title: title.trim(),
      description: description.trim(),
      status,
      priority,
      prerequisites,
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      tags,
    };

    onSubmit(payload);
  };

  const activeError = localError || apiError;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-950/80 border border-cyan-800/60 text-cyan-400 flex items-center justify-center">
              <GitFork className="w-5 h-5 rotate-90" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {editingTask ? 'Edit Task & Dependencies' : 'Create New Project Task'}
              </h2>
              <p className="text-[11px] text-slate-400">
                Configure task parameters and link upstream prerequisite dependencies
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Active Error Alert Banner */}
          {activeError && (
            <div className="p-4 rounded-xl bg-rose-950/90 border border-rose-800 text-rose-200 text-xs shadow-lg animate-in slide-in-from-top-2 glow-crimson">
              <div className="flex items-start gap-3">
                <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0 mt-0.5 animate-pulse" />
                <div className="space-y-1.5 flex-1">
                  <p className="font-extrabold text-white text-sm">
                    {activeError.cyclePath ? 'Circular Dependency Detected' : 'Operation Blocked'}
                  </p>
                  <p className="leading-relaxed">
                    {typeof activeError === 'string' ? activeError : activeError.message}
                  </p>

                  {/* Visual Cycle Path Trace */}
                  {activeError.cyclePath && (
                    <div className="mt-2.5 p-2.5 rounded-lg bg-slate-950/80 border border-rose-900 font-mono text-[11px] text-rose-300 flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-400">Cycle Loop:</span>
                      {activeError.cyclePath.map((step, idx) => (
                        <React.Fragment key={idx}>
                          <span className="px-2 py-0.5 rounded bg-rose-900/60 text-white border border-rose-700 font-bold">
                            {step}
                          </span>
                          {idx < activeError.cyclePath.length - 1 && (
                            <span className="text-rose-400 font-bold text-sm">→</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Title Input */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Task Title <span className="text-cyan-400">*</span>
            </label>
            <input
              type="text"
              required
              minLength={3}
              maxLength={120}
              placeholder="e.g. Distributed Saga Order Coordinator"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-medium"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Description
            </label>
            <textarea
              rows={2}
              maxLength={500}
              placeholder="Technical specifications, acceptance criteria, or architectural boundaries..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-all resize-none"
            />
          </div>

          {/* Priority Pills */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Priority
            </label>
            <div className="grid grid-cols-4 gap-2">
              {PRIORITIES.map((p) => {
                const isSelected = priority === p.value;
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPriority(p.value)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all text-center ${
                      isSelected
                        ? p.activeStyle
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Status & Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-semibold"
              >
                <option value="Not Started">Not Started</option>
                <option value="In Progress">In Progress (Prereqs Must Be Done)</option>
                <option value="Done">Done (Completed)</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Due Date
                </label>
                {/* Presets */}
                <div className="flex items-center gap-1 text-[10px] text-cyan-400">
                  <button
                    type="button"
                    onClick={() => setDatePreset(3)}
                    className="hover:underline"
                  >
                    +3d
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => setDatePreset(7)}
                    className="hover:underline"
                  >
                    +1w
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => setDatePreset(14)}
                    className="hover:underline"
                  >
                    +2w
                  </button>
                </div>
              </div>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Tags Chips Creator */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Tags
            </label>
            <div className="flex flex-wrap gap-1.5 p-2 bg-slate-950 border border-slate-800 rounded-xl min-h-[42px] items-center">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded-lg bg-slate-800 text-cyan-300 text-xs flex items-center gap-1 font-mono border border-slate-700"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="text-slate-400 hover:text-white"
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                type="text"
                placeholder={tags.length === 0 ? "Type tag & press Enter (e.g. Backend, Auth)..." : "Add more..."}
                value={currentTagInput}
                onChange={(e) => setCurrentTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                className="bg-transparent border-none text-xs text-slate-200 placeholder-slate-500 focus:outline-none flex-1 min-w-[120px] px-1"
              />
            </div>
          </div>

          {/* Prerequisite Multi-Select Selector */}
          <div className="pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Select Prerequisites ({prerequisites.length} Selected)</span>
              </label>
              <span className="text-[11px] text-slate-400">
                Tasks that must be completed first
              </span>
            </div>

            {/* Prereq Search */}
            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search candidate prerequisite tasks..."
                value={prereqSearch}
                onChange={(e) => setPrereqSearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8.5 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Candidate List */}
            <div className="max-h-48 overflow-y-auto space-y-1.5 border border-slate-800 rounded-xl p-2 bg-slate-950/70">
              {candidateTasks.length === 0 ? (
                <p className="text-center py-5 text-xs text-slate-500">
                  No eligible prerequisite tasks found.
                </p>
              ) : (
                candidateTasks.map((t) => {
                  const isSelected = prerequisites.includes(t._id.toString());
                  const isDone = t.status === 'Done';

                  return (
                    <div
                      key={t._id}
                      onClick={() => togglePrerequisite(t._id)}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer transition-all border text-xs ${
                        isSelected
                          ? 'bg-cyan-950/60 border-cyan-600/70 text-white shadow-sm'
                          : 'bg-slate-900/60 border-slate-800/80 text-slate-300 hover:bg-slate-800/70'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                            isSelected
                              ? 'bg-cyan-500 border-cyan-400 text-slate-950'
                              : 'border-slate-600 bg-slate-800'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <span className="font-semibold truncate">{t.title}</span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-[9px] px-2 py-0.5 rounded-full border font-bold uppercase ${
                            isDone
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          {t.status}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-800 border border-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-500 hover:to-sky-500 text-white shadow-lg transition-all flex items-center gap-1.5 disabled:opacity-50 active:scale-95"
            >
              {isLoading ? (
                <span>Validating Graph...</span>
              ) : (
                <span>{editingTask ? 'Save Changes' : 'Create Task'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
