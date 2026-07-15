import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Modal from '../components/Modal';
import Avatar from '../components/Avatar';

// ── helpers ───────────────────────────────────────────────────────────────────

function extractError(err, fallback = 'Something went wrong.') {
  return err?.response?.data?.detail || fallback;
}

// ── WorkspaceSidebar ──────────────────────────────────────────────────────────

function WorkspaceSidebar({ workspaces, selectedId, onSelect, onNew, loading }) {
  return (
    <aside className="w-64 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col h-full">
      <div className="px-4 py-4 border-b border-gray-100">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Workspaces</p>
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        {loading ? (
          <div className="px-4 py-3 text-sm text-gray-400">Loading…</div>
        ) : workspaces.length === 0 ? (
          <div className="px-4 py-3 text-sm text-gray-400">No workspaces yet</div>
        ) : (
          workspaces.map((ws) => (
            <button
              key={ws.id}
              onClick={() => onSelect(ws)}
              className={`w-full text-left px-4 py-2.5 flex items-center gap-2 transition-colors ${
                selectedId === ws.id
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="flex-1 text-sm font-medium truncate">{ws.name}</span>
              <span className="text-xs text-gray-400 flex-shrink-0">{ws.member_count}</span>
            </button>
          ))
        )}
      </nav>

      <div className="p-3 border-t border-gray-100">
        <button
          onClick={onNew}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-gray-300 text-sm text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
        >
          <span className="text-lg leading-none">+</span>
          New Workspace
        </button>
      </div>
    </aside>
  );
}

// ── EmptyState ────────────────────────────────────────────────────────────────

function EmptyState({ onNew }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
      <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-gray-900">No workspace selected</h2>
      <p className="mt-2 text-gray-500 text-sm max-w-xs">
        Create your first workspace to get started organizing your projects.
      </p>
      <button
        onClick={onNew}
        className="mt-6 px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
      >
        Create your first workspace
      </button>
    </div>
  );
}

// ── MemberRow ─────────────────────────────────────────────────────────────────

function MemberRow({ member, isOwner, canRemove, onRemove }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <Avatar user={member} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {member.first_name && member.last_name
            ? `${member.first_name} ${member.last_name}`
            : member.email}
        </p>
        <p className="text-xs text-gray-400 truncate">{member.email}</p>
      </div>
      {isOwner && (
        <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
          Owner
        </span>
      )}
      {canRemove && (
        <button
          onClick={() => onRemove(member)}
          className="text-xs text-red-500 hover:text-red-700 transition-colors"
        >
          Remove
        </button>
      )}
    </div>
  );
}

// ── WorkspaceArea ─────────────────────────────────────────────────────────────

function WorkspaceArea({ workspace, currentUser, onRename, onDelete, onMemberRemoved }) {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteStatus, setInviteStatus] = useState(null);
  const [inviting, setInviting] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [members, setMembers] = useState(workspace.members || []);

  useEffect(() => {
    setMembers(workspace.members || []);
    setInviteStatus(null);
    setShowInvite(false);
    setInviteEmail('');
  }, [workspace.id]);

  const isOwner = workspace.owner?.id === currentUser?.id;

  const handleInvite = async (e) => {
    e.preventDefault();
    setInviting(true);
    setInviteStatus(null);
    try {
      const { data } = await api.post(`/workspaces/${workspace.id}/invite/`, { email: inviteEmail });
      setMembers((prev) => [...prev, data.member]);
      setInviteStatus({ type: 'success', msg: 'Invited!' });
      setInviteEmail('');
      onMemberRemoved(); // refresh sidebar count
    } catch (err) {
      setInviteStatus({ type: 'error', msg: extractError(err) });
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (member) => {
    try {
      await api.post(`/workspaces/${workspace.id}/remove-member/`, { user_id: member.id });
      setMembers((prev) => prev.filter((m) => m.id !== member.id));
      onMemberRemoved();
    } catch (err) {
      alert(extractError(err));
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{workspace.name}</h1>
          <p className="mt-1 text-sm text-gray-400">
            {members.length} member{members.length !== 1 ? 's' : ''}
          </p>
        </div>
        {isOwner && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onRename(workspace)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Rename
            </button>
            <button
              onClick={() => onDelete(workspace)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-500 hover:text-red-700 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Members section */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Members</h2>
          <button
            onClick={() => { setShowInvite((v) => !v); setInviteStatus(null); }}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            {showInvite ? 'Cancel' : '+ Invite member'}
          </button>
        </div>

        {showInvite && (
          <form onSubmit={handleInvite} className="mb-4 flex gap-2">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
              autoFocus
              placeholder="colleague@example.com"
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={inviting}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors"
            >
              {inviting ? '…' : 'Invite'}
            </button>
          </form>
        )}

        {inviteStatus && (
          <div className={`mb-3 rounded-lg px-3 py-2 text-sm ${
            inviteStatus.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            {inviteStatus.msg}
          </div>
        )}

        <div className="divide-y divide-gray-100">
          {members.map((member) => (
            <MemberRow
              key={member.id}
              member={member}
              isOwner={member.id === workspace.owner?.id}
              canRemove={isOwner && member.id !== workspace.owner?.id}
              onRemove={handleRemoveMember}
            />
          ))}
        </div>
      </section>

      {/* Boards placeholder */}
      <section className="bg-white rounded-xl border border-dashed border-gray-200 p-8 text-center">
        <p className="text-gray-400 text-sm">Boards are coming in Phase 3.</p>
      </section>
    </div>
  );
}

// ── Dashboard (page) ──────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [workspaces, setWorkspaces] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loadingList, setLoadingList] = useState(true);

  const [showNewModal, setShowNewModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [newName, setNewName] = useState('');
  const [renameName, setRenameName] = useState('');
  const [formBusy, setFormBusy] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchDetail = useCallback(async (id) => {
    try {
      const { data } = await api.get(`/workspaces/${id}/`);
      setSelected(data);
    } catch {
      setSelected(null);
    }
  }, []);

  const fetchWorkspaces = useCallback(async (selectId) => {
    try {
      const { data } = await api.get('/workspaces/');
      setWorkspaces(data);
      if (selectId) {
        const found = data.find((w) => w.id === selectId);
        if (found) { fetchDetail(found.id); return; }
      }
      if (data.length > 0 && !selected) {
        fetchDetail(data[0].id);
      }
    } catch {
      /* ignore */
    } finally {
      setLoadingList(false);
    }
  }, [fetchDetail]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchWorkspaces(); }, [fetchWorkspaces]);

  const handleLogout = () => { logout(); navigate('/login'); };

  // ── create ──────────────────────────────────────────────────────────────────

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormBusy(true);
    setFormError('');
    try {
      const { data } = await api.post('/workspaces/', { name: newName.trim() });
      setShowNewModal(false);
      setNewName('');
      await fetchWorkspaces(data.id);
    } catch (err) {
      setFormError(extractError(err, 'Failed to create workspace.'));
    } finally {
      setFormBusy(false);
    }
  };

  // ── rename ──────────────────────────────────────────────────────────────────

  const openRename = (ws) => {
    setRenameName(ws.name);
    setFormError('');
    setShowRenameModal(true);
  };

  const handleRename = async (e) => {
    e.preventDefault();
    setFormBusy(true);
    setFormError('');
    try {
      const { data } = await api.patch(`/workspaces/${selected.id}/`, { name: renameName.trim() });
      setSelected((prev) => ({ ...prev, name: data.name }));
      setWorkspaces((prev) => prev.map((w) => w.id === data.id ? { ...w, name: data.name } : w));
      setShowRenameModal(false);
    } catch (err) {
      setFormError(extractError(err, 'Failed to rename workspace.'));
    } finally {
      setFormBusy(false);
    }
  };

  // ── delete ──────────────────────────────────────────────────────────────────

  const openDelete = () => {
    setFormError('');
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    setFormBusy(true);
    setFormError('');
    try {
      await api.delete(`/workspaces/${selected.id}/`);
      const remaining = workspaces.filter((w) => w.id !== selected.id);
      setWorkspaces(remaining);
      setSelected(null);
      setShowDeleteModal(false);
      if (remaining.length > 0) fetchDetail(remaining[0].id);
    } catch (err) {
      setFormError(extractError(err, 'Failed to delete workspace.'));
    } finally {
      setFormBusy(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Top nav */}
      <header className="bg-white border-b border-gray-200 px-6 py-3.5 flex items-center justify-between flex-shrink-0">
        <span className="text-xl font-bold text-indigo-600 tracking-tight">TaskFlow</span>
        <div className="flex items-center gap-3">
          {user && <Avatar user={user} size="sm" />}
          <span className="text-sm text-gray-600">{user?.first_name || user?.email}</span>
          <button
            onClick={handleLogout}
            className="text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Log out
          </button>
        </div>
      </header>

      {/* Sidebar + main */}
      <div className="flex flex-1 min-h-0">
        <WorkspaceSidebar
          workspaces={workspaces}
          selectedId={selected?.id}
          onSelect={(ws) => fetchDetail(ws.id)}
          onNew={() => { setNewName(''); setFormError(''); setShowNewModal(true); }}
          loading={loadingList}
        />

        {selected ? (
          <WorkspaceArea
            key={selected.id}
            workspace={selected}
            currentUser={user}
            onRename={openRename}
            onDelete={openDelete}
            onMemberRemoved={() => fetchWorkspaces(selected.id)}
          />
        ) : (
          !loadingList && (
            <EmptyState onNew={() => { setNewName(''); setFormError(''); setShowNewModal(true); }} />
          )
        )}
      </div>

      {/* ── Modals ───────────────────────────────────────────────────────────── */}

      {showNewModal && (
        <Modal title="New Workspace" onClose={() => setShowNewModal(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            {formError && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{formError}</div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Workspace name</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                autoFocus
                placeholder="My Project"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowNewModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={formBusy}
                className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors">
                {formBusy ? 'Creating…' : 'Create'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {showRenameModal && (
        <Modal title="Rename Workspace" onClose={() => setShowRenameModal(false)}>
          <form onSubmit={handleRename} className="space-y-4">
            {formError && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{formError}</div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New name</label>
              <input
                type="text"
                value={renameName}
                onChange={(e) => setRenameName(e.target.value)}
                required
                autoFocus
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowRenameModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={formBusy}
                className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors">
                {formBusy ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {showDeleteModal && (
        <Modal title="Delete Workspace" onClose={() => setShowDeleteModal(false)}>
          <div className="space-y-4">
            {formError && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{formError}</div>
            )}
            <p className="text-sm text-gray-600">
              Are you sure you want to delete{' '}
              <strong className="text-gray-900">{selected?.name}</strong>?
              This cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={formBusy}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-60 transition-colors">
                {formBusy ? 'Deleting…' : 'Delete workspace'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
