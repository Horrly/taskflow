import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api/axios';
import Avatar from './Avatar';

const PRIORITY_META = {
  NONE:   { label: 'None',   color: '#9CA3AF' },
  LOW:    { label: 'Low',    color: '#3B82F6' },
  MEDIUM: { label: 'Medium', color: '#F59E0B' },
  HIGH:   { label: 'High',   color: '#F97316' },
  URGENT: { label: 'Urgent', color: '#EF4444' },
};

const LABEL_COLORS = [
  '#EF4444', '#F97316', '#EAB308', '#22C55E',
  '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899',
  '#9CA3AF', '#1F2937',
];

function isOverdue(dateStr) {
  return !!dateStr && new Date(dateStr + 'T23:59:59') < new Date();
}

function fmtRelative(isoStr) {
  const diff = (Date.now() - new Date(isoStr)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(isoStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── LabelPicker ───────────────────────────────────────────────────────────────

function LabelPicker({ taskId, workspaceId, taskLabels, workspaceLabels, onTaskLabelsChange, onLabelCreated, onLabelDeleted }) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#6366F1');
  const [busy, setBusy] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const isApplied = (labelId) => taskLabels.some((l) => l.id === labelId);

  const toggle = async (label) => {
    const applied = isApplied(label.id);
    const optimistic = applied
      ? taskLabels.filter((l) => l.id !== label.id)
      : [...taskLabels, label];
    onTaskLabelsChange(optimistic);
    try {
      if (applied) {
        await api.delete(`/tasks/${taskId}/labels/${label.id}/`);
      } else {
        await api.post(`/tasks/${taskId}/labels/`, { label_id: label.id });
      }
    } catch {
      onTaskLabelsChange(taskLabels); // revert
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setBusy(true);
    try {
      const { data: label } = await api.post(`/workspaces/${workspaceId}/labels/`, {
        name: newName.trim(),
        color: newColor,
      });
      onLabelCreated(label);
      await api.post(`/tasks/${taskId}/labels/`, { label_id: label.id });
      onTaskLabelsChange([...taskLabels, label]);
      setNewName('');
      setCreating(false);
    } catch (err) {
      alert(err?.response?.data?.detail || 'Failed to create label.');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteLabel = async (labelId) => {
    try {
      await api.delete(`/labels/${labelId}/`);
      onLabelDeleted(labelId);
      onTaskLabelsChange(taskLabels.filter((l) => l.id !== labelId));
      setConfirmDeleteId(null);
    } catch {
      alert('Failed to delete label.');
    }
  };

  return (
    <div className="absolute top-7 left-0 z-50 w-64 bg-white border border-gray-200 rounded-xl shadow-xl">
      <div className="px-3 py-2.5 border-b border-gray-100">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Labels</p>
      </div>
      <div className="max-h-52 overflow-y-auto">
        {workspaceLabels.length === 0 && !creating && (
          <p className="text-xs text-gray-400 px-3 py-3">No labels yet.</p>
        )}
        {workspaceLabels.map((label) => (
          <div key={label.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 group">
            <button
              onClick={() => toggle(label)}
              className="flex-1 flex items-center gap-2 text-left min-w-0"
            >
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                isApplied(label.id) ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'
              }`}>
                {isApplied(label.id) && (
                  <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: label.color }} />
              <span className="text-sm text-gray-700 truncate">{label.name}</span>
            </button>
            {confirmDeleteId === label.id ? (
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => handleDeleteLabel(label.id)} className="text-[11px] text-red-500 hover:text-red-700 font-medium">Del</button>
                <button onClick={() => setConfirmDeleteId(null)} className="text-[11px] text-gray-400 hover:text-gray-600">✕</button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDeleteId(label.id)}
                className="text-gray-300 hover:text-gray-500 text-base leading-none opacity-0 group-hover:opacity-100 flex-shrink-0 transition-opacity"
              >×</button>
            )}
          </div>
        ))}
      </div>
      <div className="border-t border-gray-100 px-3 py-2.5">
        {creating ? (
          <form onSubmit={handleCreate} className="space-y-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Label name…"
              autoFocus
              className="w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-xs text-gray-900 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
            <div className="flex flex-wrap gap-1">
              {LABEL_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewColor(c)}
                  className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
                  style={{ backgroundColor: c, borderColor: newColor === c ? '#1E3A5F' : 'transparent' }}
                />
              ))}
            </div>
            <div className="flex gap-1.5">
              <button
                type="submit"
                disabled={busy || !newName.trim()}
                className="flex-1 py-1 text-xs font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {busy ? 'Creating…' : 'Create & apply'}
              </button>
              <button
                type="button"
                onClick={() => { setCreating(false); setNewName(''); }}
                className="py-1 px-2 text-xs text-gray-500 border border-gray-200 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="w-full text-left text-xs text-indigo-600 hover:text-indigo-700 font-medium"
          >
            + Create a new label
          </button>
        )}
      </div>
    </div>
  );
}

// ── CommentItem ───────────────────────────────────────────────────────────────

function CommentItem({ comment, onEdit, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(comment.body);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const trimmed = body.trim();
    if (!trimmed) { setEditing(false); setBody(comment.body); return; }
    if (trimmed === comment.body) { setEditing(false); return; }
    setSaving(true);
    try {
      await onEdit(comment.id, trimmed);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const authorName = (comment.author.first_name + ' ' + comment.author.last_name).trim() || comment.author.email;

  return (
    <div className="flex gap-2.5">
      <div className="flex-shrink-0 mt-0.5">
        <Avatar user={comment.author} size="sm" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-xs font-semibold text-gray-800">{authorName}</span>
          <span className="text-[11px] text-gray-400">{fmtRelative(comment.created_at)}</span>
          {comment.is_edited && <span className="text-[11px] text-gray-400 italic">(edited)</span>}
        </div>
        {editing ? (
          <div className="space-y-1.5">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Escape') { setEditing(false); setBody(comment.body); } }}
              className="w-full rounded-lg border border-gray-200 px-2.5 py-2 text-sm text-gray-900 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving || !body.trim()}
                className="px-3 py-1 text-xs font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={() => { setEditing(false); setBody(comment.body); }}
                className="px-3 py-1 text-xs text-gray-500 border border-gray-200 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="group">
            <p className="text-sm text-gray-700 whitespace-pre-wrap break-words leading-relaxed">{comment.body}</p>
            {comment.is_mine && (
              <div className="flex gap-3 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => setEditing(true)}
                  className="text-[11px] text-gray-400 hover:text-indigo-600 transition-colors font-medium"
                >
                  Edit
                </button>
                <button
                  onClick={() => onDelete(comment.id)}
                  className="text-[11px] text-gray-400 hover:text-red-500 transition-colors font-medium"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── TaskPanel ─────────────────────────────────────────────────────────────────

export default function TaskPanel({
  taskId,
  workspaceId,
  members,
  workspaceLabels,
  onClose,
  onTaskUpdate,
  onTaskDelete,
  onCommentCountChange,
  onLabelCreated,
  onLabelDeleted,
}) {
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState([]);

  // Editable task fields
  const [title, setTitle] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('NONE');
  const [dueDate, setDueDate] = useState('');
  const [assignees, setAssignees] = useState([]);
  const [taskLabels, setTaskLabels] = useState([]);

  // UI state
  const [showLabelPicker, setShowLabelPicker] = useState(false);
  const [showMemberPicker, setShowMemberPicker] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [visible, setVisible] = useState(false);

  const titleInputRef = useRef(null);
  const labelPickerRef = useRef(null);
  const memberPickerRef = useRef(null);
  const commentsEndRef = useRef(null);

  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);

  // Fetch task detail + comments in parallel
  useEffect(() => {
    setLoading(true);
    setVisible(false);
    Promise.all([
      api.get(`/tasks/${taskId}/`),
      api.get(`/tasks/${taskId}/comments/`),
    ]).then(([taskRes, commentsRes]) => {
      const t = taskRes.data;
      setTask(t);
      setTitle(t.title);
      setDescription(t.description || '');
      setPriority(t.priority);
      setDueDate(t.due_date || '');
      setAssignees(t.assignees || []);
      setTaskLabels(t.labels || []);
      setComments(commentsRes.data);
    }).finally(() => {
      setLoading(false);
      requestAnimationFrame(() => setVisible(true));
    });
  }, [taskId]);

  // Close pickers on outside click
  useEffect(() => {
    if (!showLabelPicker && !showMemberPicker) return;
    const handler = (e) => {
      if (showLabelPicker && !labelPickerRef.current?.contains(e.target)) setShowLabelPicker(false);
      if (showMemberPicker && !memberPickerRef.current?.contains(e.target)) setShowMemberPicker(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showLabelPicker, showMemberPicker]);

  const patch = useCallback(async (updates) => {
    try {
      const { data } = await api.patch(`/tasks/${taskId}/`, updates);
      setTask(data);
      onTaskUpdate(data);
    } catch { /* silently ignore — field stays as-is */ }
  }, [taskId, onTaskUpdate]);

  const handleTitleSave = async () => {
    setEditingTitle(false);
    const t = title.trim();
    if (!t) { setTitle(task?.title || ''); return; }
    if (t !== task?.title) await patch({ title: t });
  };

  const handleDescriptionBlur = async () => {
    if (description !== (task?.description || '')) await patch({ description });
  };

  const handlePriorityChange = async (e) => {
    const v = e.target.value;
    setPriority(v);
    await patch({ priority: v });
  };

  const handleDueDateChange = async (e) => {
    const v = e.target.value;
    setDueDate(v);
    await patch({ due_date: v || null });
  };

  const toggleAssignee = async (member) => {
    const already = assignees.some((a) => a.id === member.id);
    const next = already ? assignees.filter((a) => a.id !== member.id) : [...assignees, member];
    setAssignees(next);
    await patch({ assignees: next.map((a) => a.id) });
  };

  const handleTaskLabelsChange = (newLabels) => {
    setTaskLabels(newLabels);
    onTaskUpdate({ id: taskId, labels: newLabels });
  };

  // Comments
  const handlePostComment = async () => {
    const body = newComment.trim();
    if (!body || postingComment) return;
    setPostingComment(true);
    try {
      const { data } = await api.post(`/tasks/${taskId}/comments/`, { body });
      const next = [...comments, data];
      setComments(next);
      setNewComment('');
      onCommentCountChange(taskId, next.length);
      setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch { /* ignore */ } finally {
      setPostingComment(false);
    }
  };

  const handleEditComment = async (commentId, body) => {
    const { data } = await api.patch(`/comments/${commentId}/`, { body });
    setComments((prev) => prev.map((c) => (c.id === commentId ? data : c)));
  };

  const handleDeleteComment = async (commentId) => {
    await api.delete(`/comments/${commentId}/`);
    const next = comments.filter((c) => c.id !== commentId);
    setComments(next);
    onCommentCountChange(taskId, next.length);
  };

  const handleDeleteTask = async () => {
    setDeleting(true);
    try {
      await api.delete(`/tasks/${taskId}/`);
      onTaskDelete(taskId, task?.task_list_id);
      onClose();
    } catch { setDeleting(false); }
  };

  const overdue = isOverdue(task?.due_date);

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/20 z-30" onClick={onClose} />

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 bottom-0 w-[440px] bg-white shadow-2xl z-40 flex flex-col
          transform transition-transform duration-200 ease-out
          ${visible ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Task detail</span>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-gray-400">Loading…</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

            {/* Title */}
            <div>
              {editingTitle ? (
                <input
                  ref={titleInputRef}
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={handleTitleSave}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') titleInputRef.current?.blur();
                    if (e.key === 'Escape') { setTitle(task?.title || ''); setEditingTitle(false); }
                  }}
                  className="w-full text-lg font-bold text-gray-900 border-b-2 border-indigo-400 outline-none bg-transparent py-0.5"
                  autoFocus
                />
              ) : (
                <h2
                  onClick={() => setEditingTitle(true)}
                  className="text-lg font-bold text-gray-900 cursor-text hover:bg-gray-50 rounded px-1 -mx-1 py-0.5 transition-colors"
                  title="Click to edit"
                >
                  {title}
                </h2>
              )}
            </div>

            {/* Labels */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Labels
              </label>
              <div className="flex flex-wrap gap-1.5 items-center">
                {taskLabels.map((l) => (
                  <span
                    key={l.id}
                    className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full text-white"
                    style={{ backgroundColor: l.color }}
                  >
                    {l.name}
                    <button
                      onClick={async () => {
                        const optimistic = taskLabels.filter((x) => x.id !== l.id);
                        handleTaskLabelsChange(optimistic);
                        try {
                          await api.delete(`/tasks/${taskId}/labels/${l.id}/`);
                        } catch {
                          handleTaskLabelsChange(taskLabels); // revert
                        }
                      }}
                      className="opacity-70 hover:opacity-100 text-sm leading-none ml-0.5"
                    >
                      ×
                    </button>
                  </span>
                ))}
                <div ref={labelPickerRef} className="relative">
                  <button
                    onClick={() => setShowLabelPicker((v) => !v)}
                    className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium border border-dashed border-indigo-300 hover:border-indigo-400 rounded-full px-2.5 py-1 transition-colors"
                  >
                    + Add label
                  </button>
                  {showLabelPicker && (
                    <LabelPicker
                      taskId={taskId}
                      workspaceId={workspaceId}
                      taskLabels={taskLabels}
                      workspaceLabels={workspaceLabels}
                      onTaskLabelsChange={handleTaskLabelsChange}
                      onLabelCreated={onLabelCreated}
                      onLabelDeleted={onLabelDeleted}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Priority
              </label>
              <select
                value={priority}
                onChange={handlePriorityChange}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                style={{ color: PRIORITY_META[priority]?.color }}
              >
                {Object.entries(PRIORITY_META).map(([k, v]) => (
                  <option key={k} value={k} style={{ color: v.color }}>{v.label}</option>
                ))}
              </select>
            </div>

            {/* Due date */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Due date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={handleDueDateChange}
                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                  overdue && dueDate
                    ? 'border-red-300 text-red-600 focus:border-red-400 focus:ring-red-400'
                    : 'border-gray-200 text-gray-900 focus:border-indigo-400 focus:ring-indigo-400'
                }`}
              />
              {overdue && dueDate && (
                <p className="text-xs text-red-500 mt-1">This task is overdue</p>
              )}
            </div>

            {/* Assignees */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Assignees
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {assignees.map((u) => (
                  <div key={u.id} className="flex items-center gap-1.5 bg-gray-100 rounded-full pl-1 pr-2.5 py-0.5">
                    <Avatar user={u} size="sm" />
                    <span className="text-xs text-gray-700">{u.first_name || u.email}</span>
                    <button
                      onClick={() => toggleAssignee(u)}
                      className="text-gray-400 hover:text-gray-700 text-xs leading-none ml-0.5"
                    >×</button>
                  </div>
                ))}
              </div>
              <div ref={memberPickerRef} className="relative">
                <button
                  onClick={() => setShowMemberPicker((v) => !v)}
                  className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  <span className="w-5 h-5 rounded-full border-2 border-dashed border-indigo-400 flex items-center justify-center text-xs leading-none">+</span>
                  Add assignee
                </button>
                {showMemberPicker && (
                  <div className="absolute top-8 left-0 z-50 w-56 bg-white border border-gray-200 rounded-xl shadow-xl py-1 max-h-48 overflow-y-auto">
                    {members.map((m) => {
                      const assigned = assignees.some((a) => a.id === m.id);
                      return (
                        <button
                          key={m.id}
                          onClick={() => toggleAssignee(m)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 transition-colors ${assigned ? 'bg-indigo-50' : ''}`}
                        >
                          <Avatar user={m} size="sm" />
                          <div className="flex-1 text-left min-w-0">
                            <p className="text-sm text-gray-900 truncate">
                              {(m.first_name + ' ' + m.last_name).trim() || m.email}
                            </p>
                          </div>
                          {assigned && (
                            <svg className="w-4 h-4 text-indigo-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={handleDescriptionBlur}
                rows={4}
                placeholder="Add a description…"
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-none"
              />
            </div>

            {/* Comments */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Comments{comments.length > 0 && ` (${comments.length})`}
              </label>

              <div className="space-y-4 mb-4">
                {comments.length === 0 && (
                  <p className="text-xs text-gray-400">No comments yet.</p>
                )}
                {comments.map((c) => (
                  <CommentItem
                    key={c.id}
                    comment={c}
                    onEdit={handleEditComment}
                    onDelete={handleDeleteComment}
                  />
                ))}
                <div ref={commentsEndRef} />
              </div>

              {/* New comment input */}
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handlePostComment();
                  }}
                  placeholder="Write a comment… (Ctrl+Enter to post)"
                  rows={3}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-none"
                />
                <button
                  onClick={handlePostComment}
                  disabled={!newComment.trim() || postingComment}
                  className="px-4 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {postingComment ? 'Posting…' : 'Post comment'}
                </button>
              </div>
            </div>

          </div>
        )}

        {/* Footer */}
        {!loading && (
          <div className="px-5 py-4 border-t border-gray-100 flex-shrink-0">
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <p className="text-sm text-gray-600 flex-1">Delete this task?</p>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteTask}
                  disabled={deleting}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-60"
                >
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-2 text-sm text-red-500 hover:text-red-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete task
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
