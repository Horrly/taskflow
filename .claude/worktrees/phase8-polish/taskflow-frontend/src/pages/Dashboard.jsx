import { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Modal from '../components/Modal';
import Avatar from '../components/Avatar';
import ActivityFeed from '../components/ActivityFeed';
import StatsBar from '../components/StatsBar';
import DarkModeToggle from '../components/DarkModeToggle';
import { useToast } from '../context/ToastContext';

const STATUS_BADGE = {
  ACTIVE: 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300',
  ARCHIVED: 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400',
};
const STATUS_LABELS = { ACTIVE: 'Active', ARCHIVED: 'Archived' };

// ── helpers ───────────────────────────────────────────────────────────────────

function extractError(err, fallback = 'Something went wrong.') {
  return err?.response?.data?.detail || fallback;
}

// ── WorkspaceSidebar ──────────────────────────────────────────────────────────

function WorkspaceSidebar({ workspaces, selectedId, onSelect, onNew, loading }) {
  const navigate = useNavigate();

  return (
    <aside className="w-64 flex-shrink-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col h-full">
      <nav className="px-3 pt-3 pb-2 border-b border-gray-100 dark:border-gray-800 space-y-0.5">
        <button
          onClick={() => navigate('/me/tasks')}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          My Tasks
        </button>
        <button
          onClick={() => navigate('/activity')}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          My Activity
        </button>
      </nav>

      <div className="px-4 py-4 border-b border-gray-100 dark:border-gray-800">
        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Workspaces</p>
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        {loading ? (
          <div className="px-4 py-2 space-y-1">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-2 px-1 py-2 animate-pulse">
                <div className="h-3.5 flex-1 rounded bg-gray-100 dark:bg-gray-800" />
                <div className="h-3 w-5 rounded bg-gray-100 dark:bg-gray-800" />
              </div>
            ))}
          </div>
        ) : workspaces.length === 0 ? (
          <div className="px-4 py-3 text-sm text-gray-400 dark:text-gray-500">No workspaces yet</div>
        ) : (
          workspaces.map((ws) => (
            <button
              key={ws.id}
              onClick={() => onSelect(ws)}
              className={`w-full text-left px-4 py-2.5 flex items-center gap-2 transition-colors ${
                selectedId === ws.id
                  ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <span className="flex-1 text-sm font-medium truncate">{ws.name}</span>
              <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">{ws.member_count}</span>
            </button>
          ))
        )}
      </nav>

      <div className="p-3 border-t border-gray-100 dark:border-gray-800">
        <button
          onClick={onNew}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 text-sm text-gray-500 dark:text-gray-400 hover:border-indigo-400 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
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
      <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-950 rounded-2xl flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-indigo-400 dark:text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">No workspace selected</h2>
      <p className="mt-2 text-gray-500 dark:text-gray-400 text-sm max-w-xs">
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
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
          {member.first_name && member.last_name
            ? `${member.first_name} ${member.last_name}`
            : member.email}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{member.email}</p>
      </div>
      {isOwner && (
        <span className="text-xs font-medium text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded-full">
          Owner
        </span>
      )}
      {canRemove && (
        <button
          onClick={() => onRemove(member)}
          className="text-xs text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
        >
          Remove
        </button>
      )}
    </div>
  );
}

// ── ProjectCard ───────────────────────────────────────────────────────────────

function ProjectCard({ project, workspaceId, onClick }) {
  return (
    <button
      onClick={() => onClick(project)}
      className="text-left bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-sm transition-all group"
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
          {project.name}
        </h3>
        <span className={`ml-2 flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE[project.status] || STATUS_BADGE.ACTIVE}`}>
          {STATUS_LABELS[project.status] || 'Active'}
        </span>
      </div>
      {project.description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">{project.description}</p>
      )}
      {project.progress && project.progress.total_tasks > 0 && (
        <div className="mb-3">
          <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all"
              style={{ width: `${project.progress.percent}%` }}
            />
          </div>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
            {project.progress.completed_tasks}/{project.progress.total_tasks} done ({project.progress.percent}%)
          </p>
        </div>
      )}
      <div className="flex items-center justify-between mt-auto">
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {project.progress ? project.progress.total_tasks : 0} task{project.progress?.total_tasks !== 1 ? 's' : ''}
        </span>
        {project.due_date && (
          <span className="text-xs text-gray-400 dark:text-gray-500">
            Due {new Date(project.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
      </div>
    </button>
  );
}

// ── ProjectsTab ───────────────────────────────────────────────────────────────

function ProjectsTab({ workspace, onNewProject }) {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/workspaces/${workspace.id}/projects/`);
      setProjects(data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [workspace.id]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 animate-pulse">
            <div className="flex items-start justify-between mb-3">
              <div className="h-4 w-2/3 rounded bg-gray-100 dark:bg-gray-700" />
              <div className="h-4 w-12 rounded-full bg-gray-100 dark:bg-gray-700" />
            </div>
            <div className="h-3 w-full rounded bg-gray-100 dark:bg-gray-700 mb-2" />
            <div className="h-3 w-4/5 rounded bg-gray-100 dark:bg-gray-700 mb-4" />
            <div className="h-1.5 w-full rounded-full bg-gray-100 dark:bg-gray-700 mb-3" />
            <div className="flex items-center justify-between">
              <div className="h-3 w-10 rounded bg-gray-100 dark:bg-gray-700" />
              <div className="h-3 w-16 rounded bg-gray-100 dark:bg-gray-700" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="py-12 flex flex-col items-center text-center">
        <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950 rounded-xl flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-indigo-400 dark:text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">No projects yet</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Create your first project to get started.</p>
        <button
          onClick={onNewProject}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
        >
          + New Project
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-gray-400 dark:text-gray-500">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        <button
          onClick={onNewProject}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
        >
          + New Project
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((p) => (
          <ProjectCard
            key={p.id}
            project={p}
            workspaceId={workspace.id}
            onClick={() => navigate(`/workspace/${workspace.id}/project/${p.id}`)}
          />
        ))}
      </div>
    </div>
  );
}

// ── WorkspaceArea ─────────────────────────────────────────────────────────────

function WorkspaceArea({ workspace, currentUser, onRename, onDelete, onMemberRemoved }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('projects');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [inviting, setInviting] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [members, setMembers] = useState(workspace.members || []);

  // New project modal
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newProjectDue, setNewProjectDue] = useState('');
  const [projectBusy, setProjectBusy] = useState(false);
  const [projectError, setProjectError] = useState('');
  const [projectsKey, setProjectsKey] = useState(0);

  useEffect(() => {
    setMembers(workspace.members || []);
    setInviteError('');
    setShowInvite(false);
    setInviteEmail('');
  }, [workspace.id]);

  const isOwner = workspace.owner?.id === currentUser?.id;

  const handleInvite = async (e) => {
    e.preventDefault();
    setInviting(true);
    setInviteError('');
    try {
      const { data } = await api.post(`/workspaces/${workspace.id}/invite/`, { email: inviteEmail });
      setMembers((prev) => [...prev, data.member]);
      setInviteEmail('');
      setShowInvite(false);
      toast.success('Member invited.');
      onMemberRemoved();
    } catch (err) {
      setInviteError(extractError(err));
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
      toast.error(extractError(err));
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    setProjectBusy(true);
    setProjectError('');
    try {
      await api.post(`/workspaces/${workspace.id}/projects/`, {
        name: newProjectName.trim(),
        description: newProjectDesc.trim(),
        due_date: newProjectDue || null,
      });
      setShowNewProject(false);
      setNewProjectName('');
      setNewProjectDesc('');
      setNewProjectDue('');
      setProjectsKey((k) => k + 1);
    } catch (err) {
      setProjectError(extractError(err, 'Failed to create project.'));
    } finally {
      setProjectBusy(false);
    }
  };

  const openNewProject = () => {
    setNewProjectName('');
    setNewProjectDesc('');
    setNewProjectDue('');
    setProjectError('');
    setShowNewProject(true);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Workspace header */}
      <div className="flex items-start justify-between px-8 pt-8 pb-4 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{workspace.name}</h1>
          <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
            {members.length} member{members.length !== 1 ? 's' : ''}
          </p>
        </div>
        {isOwner && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onRename(workspace)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Rename
            </button>
            <button
              onClick={() => onDelete(workspace)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 border border-red-200 dark:border-red-900 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
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

      {/* Tabs */}
      <div className="flex gap-1 px-8 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        {['projects', 'members', 'activity'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium capitalize border-b-2 transition-colors -mb-px ${
              activeTab === tab
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {activeTab === 'projects' && (
          <ProjectsTab
            key={`${workspace.id}-${projectsKey}`}
            workspace={workspace}
            onNewProject={openNewProject}
          />
        )}

        {activeTab === 'members' && (
          <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Members</h2>
              <button
                onClick={() => { setShowInvite((v) => !v); setInviteError(''); }}
                className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
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
                  className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
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

            {inviteError && (
              <div className="mb-3 rounded-lg px-3 py-2 text-sm bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300">
                {inviteError}
              </div>
            )}

            <div className="divide-y divide-gray-100 dark:divide-gray-700">
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
        )}

        {activeTab === 'activity' && (
          <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-4">Activity</h2>
            <ActivityFeed
              key={workspace.id}
              fetchUrl={`/workspaces/${workspace.id}/activity/`}
              showTaskTitle
              onEntryClick={(entry) => navigate(`/workspace/${workspace.id}/project/${entry.project_id}?task=${entry.task_id}`)}
            />
          </section>
        )}
      </div>

      {/* New Project Modal */}
      {showNewProject && (
        <Modal title="New Project" onClose={() => setShowNewProject(false)}>
          <form onSubmit={handleCreateProject} className="space-y-4">
            {projectError && (
              <div className="rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 px-3 py-2 text-sm text-red-700 dark:text-red-300">{projectError}</div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Project name</label>
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                required
                autoFocus
                placeholder="My Project"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description <span className="text-gray-400 dark:text-gray-500 font-normal">(optional)</span></label>
              <textarea
                value={newProjectDesc}
                onChange={(e) => setNewProjectDesc(e.target.value)}
                rows={3}
                placeholder="What is this project about?"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due date <span className="text-gray-400 dark:text-gray-500 font-normal">(optional)</span></label>
              <input
                type="date"
                value={newProjectDue}
                onChange={(e) => setNewProjectDue(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowNewProject(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={projectBusy}
                className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors">
                {projectBusy ? 'Creating…' : 'Create project'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ── Dashboard (page) ──────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

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
      toast.success('Workspace created.');
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
      toast.success('Workspace renamed.');
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
      toast.success('Workspace deleted.');
    } catch (err) {
      setFormError(extractError(err, 'Failed to delete workspace.'));
    } finally {
      setFormBusy(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <Helmet><title>Dashboard · TaskFlow</title></Helmet>
      {/* Top nav */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3.5 flex items-center justify-between flex-shrink-0">
        <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400 tracking-tight">TaskFlow</span>
        <div className="flex items-center gap-3">
          <DarkModeToggle />
          {user && <Avatar user={user} size="sm" />}
          <span className="text-sm text-gray-600 dark:text-gray-300">{user?.first_name || user?.email}</span>
          <button
            onClick={handleLogout}
            className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 border border-gray-300 dark:border-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Log out
          </button>
        </div>
      </header>

      {/* Stats */}
      <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
        <StatsBar />
      </div>

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
              <div className="rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 px-3 py-2 text-sm text-red-700 dark:text-red-300">{formError}</div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Workspace name</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                autoFocus
                placeholder="My Project"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowNewModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
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
              <div className="rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 px-3 py-2 text-sm text-red-700 dark:text-red-300">{formError}</div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New name</label>
              <input
                type="text"
                value={renameName}
                onChange={(e) => setRenameName(e.target.value)}
                required
                autoFocus
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowRenameModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
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
              <div className="rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 px-3 py-2 text-sm text-red-700 dark:text-red-300">{formError}</div>
            )}
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Are you sure you want to delete{' '}
              <strong className="text-gray-900 dark:text-gray-100">{selected?.name}</strong>?
              This cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
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
