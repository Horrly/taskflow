import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import api from '../api/axios';
import Modal from '../components/Modal';
import Avatar from '../components/Avatar';
import TaskPanel from '../components/TaskPanel';

function extractError(err, fallback = 'Something went wrong.') {
  return err?.response?.data?.detail || fallback;
}

const STATUS_LABELS = { ACTIVE: 'Active', ARCHIVED: 'Archived' };
const STATUS_BADGE = {
  ACTIVE: 'bg-green-100 text-green-700',
  ARCHIVED: 'bg-gray-100 text-gray-500',
};

const PRIORITY_META = {
  NONE:   { label: 'None',   color: '#9CA3AF' },
  LOW:    { label: 'Low',    color: '#3B82F6' },
  MEDIUM: { label: 'Medium', color: '#F59E0B' },
  HIGH:   { label: 'High',   color: '#F97316' },
  URGENT: { label: 'Urgent', color: '#EF4444' },
};

const PRESET_COLORS = [
  '#9CA3AF', '#3B82F6', '#10B981', '#F59E0B',
  '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4',
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function isOverdue(dueDateStr) {
  if (!dueDateStr) return false;
  return new Date(dueDateStr + 'T23:59:59') < new Date();
}

function fmtDate(dueDateStr) {
  return new Date(dueDateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
  });
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function Toast({ message, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div className="fixed bottom-5 right-5 z-50 bg-red-600 text-white px-4 py-3 rounded-lg shadow-xl flex items-center gap-3 text-sm max-w-sm">
      <span className="flex-1">{message}</span>
      <button onClick={onDismiss} className="text-white/70 hover:text-white text-base leading-none">✕</button>
    </div>
  );
}

// ── ColorPicker ───────────────────────────────────────────────────────────────

function ColorPicker({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {PRESET_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
          style={{ backgroundColor: c, borderColor: value === c ? '#1E3A5F' : 'transparent' }}
        />
      ))}
    </div>
  );
}

// ── ColumnMenu ────────────────────────────────────────────────────────────────

function ColumnMenu({ onRename, onColor, onDelete }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-6 h-6 flex items-center justify-center rounded hover:bg-black/10 transition-colors text-gray-500 hover:text-gray-700"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <circle cx="10" cy="4" r="1.5" />
          <circle cx="10" cy="10" r="1.5" />
          <circle cx="10" cy="16" r="1.5" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-7 z-20 w-36 bg-white border border-gray-200 rounded-lg shadow-lg py-1">
          <button onClick={() => { setOpen(false); onRename(); }}
            className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">Rename</button>
          <button onClick={() => { setOpen(false); onColor(); }}
            className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">Change color</button>
          <button onClick={() => { setOpen(false); onDelete(); }}
            className="w-full text-left px-3 py-1.5 text-sm text-red-500 hover:bg-red-50">Delete</button>
        </div>
      )}
    </div>
  );
}

// ── TaskCard ──────────────────────────────────────────────────────────────────

function TaskCard({ task, onClick }) {
  const overdue = isOverdue(task.due_date);
  const pm = PRIORITY_META[task.priority] || PRIORITY_META.NONE;
  const labels = task.labels || [];
  const shownLabels = labels.slice(0, 3);
  const extraLabels = labels.length - shownLabels.length;

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all select-none"
    >
      {/* Label chips */}
      {labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1.5">
          {shownLabels.map((l) => (
            <span
              key={l.id}
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full text-white leading-tight"
              style={{ backgroundColor: l.color }}
            >
              {l.name}
            </span>
          ))}
          {extraLabels > 0 && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-200 text-gray-600 leading-tight">
              +{extraLabels}
            </span>
          )}
        </div>
      )}

      {task.priority !== 'NONE' && (
        <div className="flex items-center gap-1.5 mb-1.5">
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: pm.color }} />
          <span className="text-[11px] font-medium" style={{ color: pm.color }}>{pm.label}</span>
        </div>
      )}

      <p className="text-sm text-gray-900 font-medium leading-snug break-words">{task.title}</p>

      {(task.due_date || task.assignees?.length > 0 || task.comment_count > 0) && (
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {task.due_date && (
              <span className={`text-xs font-medium ${overdue ? 'text-red-500' : 'text-gray-400'}`}>
                {overdue && '⚠ '}{fmtDate(task.due_date)}
              </span>
            )}
            {task.comment_count > 0 && (
              <span className="flex items-center gap-0.5 text-xs text-gray-400">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                {task.comment_count}
              </span>
            )}
          </div>

          {task.assignees?.length > 0 && (
            <div className="flex -space-x-1.5 flex-shrink-0">
              {task.assignees.slice(0, 3).map((u) => (
                <div key={u.id} title={`${u.first_name} ${u.last_name}`.trim() || u.email}
                  className="ring-2 ring-white rounded-full">
                  <Avatar user={u} size="sm" />
                </div>
              ))}
              {task.assignees.length > 3 && (
                <div className="w-7 h-7 rounded-full bg-gray-200 ring-2 ring-white flex items-center justify-center text-[10px] font-semibold text-gray-600">
                  +{task.assignees.length - 3}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── QuickAddTask ──────────────────────────────────────────────────────────────

function QuickAddTask({ listId, onAdd }) {
  const [title, setTitle] = useState('');
  const [adding, setAdding] = useState(false);
  const inputRef = useRef(null);

  const submit = async () => {
    const t = title.trim();
    if (!t || adding) return;
    setAdding(true);
    try {
      const { data } = await api.post(`/lists/${listId}/tasks/`, { title: t });
      onAdd(listId, data);
      setTitle('');
      inputRef.current?.focus();
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="px-3 pb-3 pt-1">
      <div className="flex items-center gap-1.5">
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
            if (e.key === 'Escape') setTitle('');
          }}
          placeholder="Add a task…"
          className="flex-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-900 placeholder-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white"
        />
        <button
          onClick={submit}
          disabled={!title.trim() || adding}
          className="w-7 h-7 flex items-center justify-center rounded-lg bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
        >
          +
        </button>
      </div>
    </div>
  );
}

// ── KanbanColumn ──────────────────────────────────────────────────────────────

function KanbanColumn({ col, provided, snapshot, onRename, onColor, onDelete, onTaskClick, onTaskAdd }) {
  return (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      className={`flex-shrink-0 w-64 bg-gray-50 rounded-xl flex flex-col border border-gray-200 select-none ${
        snapshot.isDragging ? 'shadow-xl ring-2 ring-indigo-400 rotate-1' : ''
      }`}
    >
      {/* Colored accent stripe — column drag handle */}
      <div
        {...provided.dragHandleProps}
        className="h-1.5 rounded-t-xl cursor-grab active:cursor-grabbing"
        style={{ backgroundColor: col.color || '#9CA3AF' }}
      />

      {/* Column header */}
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-semibold text-gray-800 truncate">{col.name}</span>
          <span className="text-xs text-gray-400 flex-shrink-0">{(col.tasks || []).length}</span>
        </div>
        <ColumnMenu
          onRename={() => onRename(col)}
          onColor={() => onColor(col)}
          onDelete={() => onDelete(col)}
        />
      </div>

      {/* Task droppable */}
      <Droppable droppableId={`list-${col.id}`} type="TASK">
        {(taskProvided, taskSnapshot) => (
          <div
            ref={taskProvided.innerRef}
            {...taskProvided.droppableProps}
            className={`flex-1 px-3 space-y-2 min-h-16 transition-colors ${
              taskSnapshot.isDraggingOver ? 'bg-indigo-50/60' : ''
            }`}
          >
            {(col.tasks || []).length === 0 && !taskSnapshot.isDraggingOver && (
              <p className="text-xs text-gray-400 text-center py-3">No tasks yet</p>
            )}
            {(col.tasks || []).map((task, idx) => (
              <Draggable key={task.id} draggableId={`task-${task.id}`} index={idx}>
                {(tp, ts) => (
                  <div
                    ref={tp.innerRef}
                    {...tp.draggableProps}
                    {...tp.dragHandleProps}
                    className={ts.isDragging ? 'opacity-90' : ''}
                  >
                    <TaskCard task={task} onClick={() => onTaskClick(task.id)} />
                  </div>
                )}
              </Draggable>
            ))}
            {taskProvided.placeholder}
          </div>
        )}
      </Droppable>

      <QuickAddTask listId={col.id} onAdd={onTaskAdd} />
    </div>
  );
}

// ── ProjectBoard (page) ───────────────────────────────────────────────────────

export default function ProjectBoard() {
  const { workspaceId, projectId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [project, setProject] = useState(null);
  const [columns, setColumns] = useState([]);
  const [members, setMembers] = useState([]);
  const [workspaceLabels, setWorkspaceLabels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toastError, setToastError] = useState('');

  // Selected task (slide-out panel)
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  // Edit project modal
  const [showEditProject, setShowEditProject] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editStatus, setEditStatus] = useState('ACTIVE');
  const [editDue, setEditDue] = useState('');
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState('');

  // Rename column modal
  const [renameTarget, setRenameTarget] = useState(null);
  const [renameName, setRenameName] = useState('');
  const [renameBusy, setRenameBusy] = useState(false);

  // Change color modal
  const [colorTarget, setColorTarget] = useState(null);
  const [colorValue, setColorValue] = useState('');
  const [colorBusy, setColorBusy] = useState(false);

  // Delete column modal
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  // Add list
  const [showAddList, setShowAddList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [addBusy, setAddBusy] = useState(false);

  const fetchProject = useCallback(async () => {
    setLoading(true);
    try {
      const [projectRes, membersRes, labelsRes] = await Promise.all([
        api.get(`/projects/${projectId}/`),
        api.get(`/workspaces/${workspaceId}/members/`),
        api.get(`/workspaces/${workspaceId}/labels/`),
      ]);
      setProject(projectRes.data);
      setColumns(projectRes.data.task_lists || []);
      setMembers(membersRes.data);
      setWorkspaceLabels(labelsRes.data);
    } catch {
      setError('Failed to load project.');
    } finally {
      setLoading(false);
    }
  }, [projectId, workspaceId]);

  useEffect(() => { fetchProject(); }, [fetchProject]);

  // Deep link: ?task=<id> auto-opens that task's slide-out panel on load.
  useEffect(() => {
    const taskParam = searchParams.get('task');
    if (taskParam) setSelectedTaskId(parseInt(taskParam, 10));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Drag & drop ─────────────────────────────────────────────────────────────

  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    const { source, destination, type, draggableId } = result;

    if (type === 'COLUMN') {
      if (source.index === destination.index) return;

      const prev = columns;
      const next = Array.from(columns);
      const [moved] = next.splice(source.index, 1);
      next.splice(destination.index, 0, moved);
      setColumns(next);

      try {
        await api.patch(`/lists/${moved.id}/reorder/`, { position: destination.index });
        const { data } = await api.get(`/projects/${projectId}/lists/`);
        setColumns(data);
      } catch {
        setColumns(prev);
        setToastError('Failed to reorder columns. Please try again.');
      }
      return;
    }

    // TASK drag
    const sourceListId = parseInt(source.droppableId.replace('list-', ''));
    const destListId = parseInt(destination.droppableId.replace('list-', ''));
    const taskId = parseInt(draggableId.replace('task-', ''));

    if (sourceListId === destListId && source.index === destination.index) return;

    const prev = columns;
    const next = columns.map((col) => ({ ...col, tasks: [...(col.tasks || [])] }));

    const sourceCol = next.find((c) => c.id === sourceListId);
    const destCol = next.find((c) => c.id === destListId);
    const [movedTask] = sourceCol.tasks.splice(source.index, 1);
    destCol.tasks.splice(destination.index, 0, movedTask);
    setColumns(next);

    try {
      await api.patch(`/tasks/${taskId}/move/`, {
        task_list_id: destListId,
        position: destination.index,
      });
    } catch {
      setColumns(prev);
      setToastError('Failed to move task. Please try again.');
    }
  };

  // ── Task callbacks ───────────────────────────────────────────────────────────

  const handleTaskAdd = (listId, newTask) => {
    setColumns((prev) => prev.map((col) =>
      col.id === listId ? { ...col, tasks: [...(col.tasks || []), newTask] } : col
    ));
  };

  const handleTaskUpdate = useCallback((updatedTask) => {
    setColumns((prev) => prev.map((col) => ({
      ...col,
      tasks: (col.tasks || []).map((t) =>
        t.id === updatedTask.id ? { ...t, ...updatedTask } : t
      ),
    })));
  }, []);

  const handleTaskDelete = useCallback((taskId, taskListId) => {
    setColumns((prev) => prev.map((col) => {
      if (taskListId && col.id !== taskListId) return col;
      return { ...col, tasks: (col.tasks || []).filter((t) => t.id !== taskId) };
    }));
  }, []);

  const handleCommentCountChange = useCallback((taskId, count) => {
    setColumns((prev) => prev.map((col) => ({
      ...col,
      tasks: (col.tasks || []).map((t) =>
        t.id === taskId ? { ...t, comment_count: count } : t
      ),
    })));
  }, []);

  const handleLabelCreated = useCallback((label) => {
    setWorkspaceLabels((prev) =>
      [...prev, label].sort((a, b) => a.name.localeCompare(b.name))
    );
  }, []);

  const handleLabelDeleted = useCallback((labelId) => {
    setWorkspaceLabels((prev) => prev.filter((l) => l.id !== labelId));
    setColumns((prev) => prev.map((col) => ({
      ...col,
      tasks: (col.tasks || []).map((t) => ({
        ...t,
        labels: (t.labels || []).filter((l) => l.id !== labelId),
      })),
    })));
  }, []);

  // ── Edit project ─────────────────────────────────────────────────────────────

  const openEditProject = () => {
    setEditName(project.name);
    setEditDesc(project.description || '');
    setEditStatus(project.status);
    setEditDue(project.due_date || '');
    setEditError('');
    setShowEditProject(true);
  };

  const handleEditProject = async (e) => {
    e.preventDefault();
    setEditBusy(true);
    setEditError('');
    try {
      const { data } = await api.patch(`/projects/${projectId}/`, {
        name: editName.trim(),
        description: editDesc.trim(),
        status: editStatus,
        due_date: editDue || null,
      });
      setProject((prev) => ({ ...prev, ...data }));
      setShowEditProject(false);
    } catch (err) {
      setEditError(extractError(err, 'Failed to update project.'));
    } finally {
      setEditBusy(false);
    }
  };

  // ── Rename column ─────────────────────────────────────────────────────────────

  const openRename = (col) => { setRenameTarget(col); setRenameName(col.name); };

  const handleRename = async (e) => {
    e.preventDefault();
    setRenameBusy(true);
    try {
      const { data } = await api.patch(`/lists/${renameTarget.id}/`, { name: renameName.trim() });
      setColumns((prev) => prev.map((c) => c.id === data.id ? { ...c, ...data } : c));
      setRenameTarget(null);
    } catch (err) {
      setToastError(extractError(err));
    } finally {
      setRenameBusy(false);
    }
  };

  // ── Change color ──────────────────────────────────────────────────────────────

  const openColor = (col) => { setColorTarget(col); setColorValue(col.color); };

  const handleColor = async (e) => {
    e.preventDefault();
    setColorBusy(true);
    try {
      const { data } = await api.patch(`/lists/${colorTarget.id}/`, { color: colorValue });
      setColumns((prev) => prev.map((c) => c.id === data.id ? { ...c, ...data } : c));
      setColorTarget(null);
    } catch (err) {
      setToastError(extractError(err));
    } finally {
      setColorBusy(false);
    }
  };

  // ── Delete column ─────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    setDeleteBusy(true);
    try {
      await api.delete(`/lists/${deleteTarget.id}/`);
      setColumns((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setToastError(extractError(err));
    } finally {
      setDeleteBusy(false);
    }
  };

  // ── Add list ──────────────────────────────────────────────────────────────────

  const handleAddList = async (e) => {
    e.preventDefault();
    setAddBusy(true);
    try {
      const { data } = await api.post(`/projects/${projectId}/lists/`, { name: newListName.trim() });
      setColumns((prev) => [...prev, data]);
      setNewListName('');
      setShowAddList(false);
    } catch (err) {
      setToastError(extractError(err));
    } finally {
      setAddBusy(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-400 text-sm">Loading project…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <p className="text-red-500 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Top nav */}
      <header className="bg-white border-b border-gray-200 px-6 py-3.5 flex items-center gap-4 flex-shrink-0">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Dashboard
        </button>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-bold text-indigo-600 tracking-tight">TaskFlow</span>
      </header>

      {/* Project header */}
      <div className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-gray-900">{project?.name}</h1>
          <button
            onClick={openEditProject}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE[project?.status] || STATUS_BADGE.ACTIVE}`}>
            {STATUS_LABELS[project?.status] || 'Active'}
          </span>
        </div>
        {project?.due_date && (
          <p className="text-sm text-gray-500">
            Due {new Date(project.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        )}
      </div>

      {/* Kanban board */}
      <div className="flex-1 overflow-x-auto p-6">
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="columns" direction="horizontal" type="COLUMN">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="flex gap-4 min-w-max items-start"
              >
                {columns.map((col, index) => (
                  <Draggable key={col.id} draggableId={String(col.id)} index={index}>
                    {(dragProvided, dragSnapshot) => (
                      <KanbanColumn
                        col={col}
                        provided={dragProvided}
                        snapshot={dragSnapshot}
                        onRename={openRename}
                        onColor={openColor}
                        onDelete={setDeleteTarget}
                        onTaskClick={setSelectedTaskId}
                        onTaskAdd={handleTaskAdd}
                      />
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}

                {/* Add list column */}
                <div className="flex-shrink-0 w-64">
                  {showAddList ? (
                    <form
                      onSubmit={handleAddList}
                      className="bg-gray-100 rounded-xl border border-gray-200 p-3 space-y-2"
                    >
                      <input
                        type="text"
                        value={newListName}
                        onChange={(e) => setNewListName(e.target.value)}
                        required
                        autoFocus
                        placeholder="List name…"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={addBusy}
                          className="flex-1 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors"
                        >
                          {addBusy ? 'Adding…' : 'Add list'}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setShowAddList(false); setNewListName(''); }}
                          className="py-1.5 px-3 text-sm text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <button
                      onClick={() => setShowAddList(true)}
                      className="w-full h-12 flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 text-sm text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
                    >
                      <span className="text-lg leading-none">+</span>
                      Add list
                    </button>
                  )}
                </div>
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>

      {/* Task slide-out panel */}
      {selectedTaskId !== null && (
        <TaskPanel
          taskId={selectedTaskId}
          workspaceId={workspaceId}
          members={members}
          workspaceLabels={workspaceLabels}
          onClose={() => setSelectedTaskId(null)}
          onTaskUpdate={handleTaskUpdate}
          onTaskDelete={handleTaskDelete}
          onCommentCountChange={handleCommentCountChange}
          onLabelCreated={handleLabelCreated}
          onLabelDeleted={handleLabelDeleted}
        />
      )}

      {/* Toast error */}
      {toastError && <Toast message={toastError} onDismiss={() => setToastError('')} />}

      {/* ── Edit project modal ───────────────────────────────────────────────── */}

      {showEditProject && (
        <Modal title="Edit Project" onClose={() => setShowEditProject(false)}>
          <form onSubmit={handleEditProject} className="space-y-4">
            {editError && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{editError}</div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} required autoFocus
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none" />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500">
                  <option value="ACTIVE">Active</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Due date</label>
                <input type="date" value={editDue} onChange={(e) => setEditDue(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowEditProject(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
              <button type="submit" disabled={editBusy}
                className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors">
                {editBusy ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Rename column modal ──────────────────────────────────────────────── */}

      {renameTarget && (
        <Modal title="Rename list" onClose={() => setRenameTarget(null)}>
          <form onSubmit={handleRename} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">List name</label>
              <input type="text" value={renameName} onChange={(e) => setRenameName(e.target.value)} required autoFocus
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setRenameTarget(null)}
                className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
              <button type="submit" disabled={renameBusy}
                className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors">
                {renameBusy ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Change color modal ───────────────────────────────────────────────── */}

      {colorTarget && (
        <Modal title="Change column color" onClose={() => setColorTarget(null)}>
          <form onSubmit={handleColor} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pick a color</label>
              <ColorPicker value={colorValue} onChange={setColorValue} />
            </div>
            <div className="flex items-center gap-2 mt-2">
              <div className="w-5 h-5 rounded-full border border-gray-200" style={{ backgroundColor: colorValue }} />
              <input type="text" value={colorValue} onChange={(e) => setColorValue(e.target.value)} placeholder="#3B82F6"
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setColorTarget(null)}
                className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
              <button type="submit" disabled={colorBusy}
                className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors">
                {colorBusy ? 'Saving…' : 'Apply'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Delete column modal ──────────────────────────────────────────────── */}

      {deleteTarget && (
        <Modal title="Delete list" onClose={() => setDeleteTarget(null)}>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Are you sure you want to delete <strong className="text-gray-900">{deleteTarget.name}</strong>?
              This cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={handleDelete} disabled={deleteBusy}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-60 transition-colors">
                {deleteBusy ? 'Deleting…' : 'Delete list'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
