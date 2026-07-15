import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import api from '../api/axios';
import Modal from '../components/Modal';

function extractError(err, fallback = 'Something went wrong.') {
  return err?.response?.data?.detail || fallback;
}

const STATUS_LABELS = { ACTIVE: 'Active', ARCHIVED: 'Archived' };

const STATUS_BADGE = {
  ACTIVE: 'bg-green-100 text-green-700',
  ARCHIVED: 'bg-gray-100 text-gray-500',
};

// ── ColorPicker ───────────────────────────────────────────────────────────────

const PRESET_COLORS = [
  '#9CA3AF', '#3B82F6', '#10B981', '#F59E0B',
  '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4',
];

function ColorPicker({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {PRESET_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
          style={{
            backgroundColor: c,
            borderColor: value === c ? '#1E3A5F' : 'transparent',
          }}
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
          <button
            onClick={() => { setOpen(false); onRename(); }}
            className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            Rename
          </button>
          <button
            onClick={() => { setOpen(false); onColor(); }}
            className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            Change color
          </button>
          <button
            onClick={() => { setOpen(false); onDelete(); }}
            className="w-full text-left px-3 py-1.5 text-sm text-red-500 hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

// ── KanbanColumn ──────────────────────────────────────────────────────────────

function KanbanColumn({ col, provided, snapshot, onRename, onColor, onDelete }) {
  return (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      className={`flex-shrink-0 w-64 bg-gray-50 rounded-xl flex flex-col border border-gray-200 select-none ${
        snapshot.isDragging ? 'shadow-xl ring-2 ring-indigo-400 rotate-1' : ''
      }`}
    >
      {/* Colored accent stripe — drag handle */}
      <div
        {...provided.dragHandleProps}
        className="h-1.5 rounded-t-xl cursor-grab active:cursor-grabbing"
        style={{ backgroundColor: col.color || '#9CA3AF' }}
      />

      {/* Column header */}
      <div className="flex items-center justify-between px-3 py-2.5">
        <span className="text-sm font-semibold text-gray-800 truncate">{col.name}</span>
        <ColumnMenu
          onRename={() => onRename(col)}
          onColor={() => onColor(col)}
          onDelete={() => onDelete(col)}
        />
      </div>

      {/* Empty task area */}
      <div className="flex-1 px-3 pb-3 min-h-24 flex items-center justify-center">
        <p className="text-xs text-gray-400">No tasks yet</p>
      </div>
    </div>
  );
}

// ── ProjectBoard (page) ───────────────────────────────────────────────────────

export default function ProjectBoard() {
  const { workspaceId, projectId } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
      const { data } = await api.get(`/projects/${projectId}/`);
      setProject(data);
      setColumns(data.task_lists || []);
    } catch {
      setError('Failed to load project.');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { fetchProject(); }, [fetchProject]);

  // ── Drag & drop ─────────────────────────────────────────────────────────────

  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    const { source, destination } = result;
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
      alert('Failed to reorder columns. Please try again.');
    }
  };

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

  const openRename = (col) => {
    setRenameTarget(col);
    setRenameName(col.name);
  };

  const handleRename = async (e) => {
    e.preventDefault();
    setRenameBusy(true);
    try {
      const { data } = await api.patch(`/lists/${renameTarget.id}/`, { name: renameName.trim() });
      setColumns((prev) => prev.map((c) => c.id === data.id ? data : c));
      setRenameTarget(null);
    } catch (err) {
      alert(extractError(err));
    } finally {
      setRenameBusy(false);
    }
  };

  // ── Change color ──────────────────────────────────────────────────────────────

  const openColor = (col) => {
    setColorTarget(col);
    setColorValue(col.color);
  };

  const handleColor = async (e) => {
    e.preventDefault();
    setColorBusy(true);
    try {
      const { data } = await api.patch(`/lists/${colorTarget.id}/`, { color: colorValue });
      setColumns((prev) => prev.map((c) => c.id === data.id ? data : c));
      setColorTarget(null);
    } catch (err) {
      alert(extractError(err));
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
      alert(extractError(err));
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
      alert(extractError(err));
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
          <Droppable droppableId="columns" direction="horizontal">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="flex gap-4 min-w-max"
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

      {/* ── Edit project modal ───────────────────────────────────────────────── */}

      {showEditProject && (
        <Modal title="Edit Project" onClose={() => setShowEditProject(false)}>
          <form onSubmit={handleEditProject} className="space-y-4">
            {editError && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{editError}</div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
                autoFocus
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
              />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Due date</label>
                <input
                  type="date"
                  value={editDue}
                  onChange={(e) => setEditDue(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowEditProject(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                Cancel
              </button>
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
              <input
                type="text"
                value={renameName}
                onChange={(e) => setRenameName(e.target.value)}
                required
                autoFocus
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setRenameTarget(null)}
                className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                Cancel
              </button>
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
              <input
                type="text"
                value={colorValue}
                onChange={(e) => setColorValue(e.target.value)}
                placeholder="#3B82F6"
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setColorTarget(null)}
                className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                Cancel
              </button>
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
                className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                Cancel
              </button>
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
