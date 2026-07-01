import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Avatar from '../components/Avatar';
import StatsBar from '../components/StatsBar';

const PRIORITY_META = {
  NONE:   { label: 'None',   color: '#9CA3AF' },
  LOW:    { label: 'Low',    color: '#3B82F6' },
  MEDIUM: { label: 'Medium', color: '#F59E0B' },
  HIGH:   { label: 'High',   color: '#F97316' },
  URGENT: { label: 'Urgent', color: '#EF4444' },
};

const PRIORITY_ORDER = ['NONE', 'LOW', 'MEDIUM', 'HIGH', 'URGENT'];

const DUE_OPTIONS = [
  { value: 'any', label: 'Any' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'today', label: 'Due today' },
  { value: 'week', label: 'Due this week' },
  { value: 'custom', label: 'Custom range' },
];

const DEFAULT_FILTERS = { priorities: [], due: 'any', customFrom: '', customTo: '', label: '', workspace: '' };

function isOverdue(dateStr) {
  return !!dateStr && new Date(dateStr + 'T23:59:59') < new Date();
}

function fmtDate(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function buildQuery(filters) {
  const params = new URLSearchParams();
  if (filters.priorities.length > 0) params.set('priority', filters.priorities.join(','));
  if (filters.label) params.set('label', filters.label);
  if (filters.workspace) params.set('workspace', filters.workspace);

  if (filters.due === 'overdue') {
    params.set('overdue', 'true');
  } else if (filters.due === 'today') {
    const t = todayStr();
    params.set('due_after', t);
    params.set('due_before', t);
  } else if (filters.due === 'week') {
    const weekLater = new Date();
    weekLater.setDate(weekLater.getDate() + 7);
    params.set('due_after', todayStr());
    params.set('due_before', weekLater.toISOString().slice(0, 10));
  } else if (filters.due === 'custom') {
    if (filters.customFrom) params.set('due_after', filters.customFrom);
    if (filters.customTo) params.set('due_before', filters.customTo);
  }
  return params.toString();
}

// ── FilterPanel ───────────────────────────────────────────────────────────────

function FilterPanel({ filters, onChange, onClear, workspaces, labels }) {
  const togglePriority = (p) => {
    const next = filters.priorities.includes(p)
      ? filters.priorities.filter((x) => x !== p)
      : [...filters.priorities, p];
    onChange({ ...filters, priorities: next });
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Filters</h2>
        <button onClick={onClear} className="text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors">
          Clear all
        </button>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Priority</p>
        <div className="space-y-1.5">
          {PRIORITY_ORDER.map((p) => (
            <label key={p} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.priorities.includes(p)}
                onChange={() => togglePriority(p)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: PRIORITY_META[p].color }} />
              {PRIORITY_META[p].label}
            </label>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Due date</p>
        <div className="space-y-1.5">
          {DUE_OPTIONS.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="radio"
                name="dueFilter"
                checked={filters.due === opt.value}
                onChange={() => onChange({ ...filters, due: opt.value })}
                className="border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              {opt.label}
            </label>
          ))}
        </div>
        {filters.due === 'custom' && (
          <div className="mt-2 space-y-2">
            <div>
              <label className="block text-[11px] text-gray-400 mb-0.5">From</label>
              <input
                type="date"
                value={filters.customFrom}
                onChange={(e) => onChange({ ...filters, customFrom: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-gray-900 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="block text-[11px] text-gray-400 mb-0.5">To</label>
              <input
                type="date"
                value={filters.customTo}
                onChange={(e) => onChange({ ...filters, customTo: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-gray-900 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              />
            </div>
          </div>
        )}
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Label</p>
        <select
          value={filters.label}
          onChange={(e) => onChange({ ...filters, label: e.target.value })}
          className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-gray-900 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
        >
          <option value="">All labels</option>
          {labels.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}{l.workspaceName ? ` (${l.workspaceName})` : ''}
            </option>
          ))}
        </select>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Workspace</p>
        <select
          value={filters.workspace}
          onChange={(e) => onChange({ ...filters, workspace: e.target.value })}
          className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-gray-900 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
        >
          <option value="">All workspaces</option>
          {workspaces.map((w) => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

// ── TaskRow ───────────────────────────────────────────────────────────────────

function TaskRow({ task, onClick }) {
  const pm = PRIORITY_META[task.priority] || PRIORITY_META.NONE;
  const overdue = isOverdue(task.due_date);
  const labels = task.labels || [];
  const shown = labels.slice(0, 2);
  const extra = labels.length - shown.length;

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-xl border border-gray-200 p-4 hover:border-indigo-300 hover:shadow-sm transition-all flex items-center gap-3"
    >
      <span
        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: pm.color }}
        title={pm.label}
      />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
        <p className="text-xs text-gray-400 truncate mt-0.5">
          {task.workspace_name} <span className="mx-1">›</span> {task.project_name}{' '}
          <span className="mx-1">›</span> {task.task_list_name}
        </p>
      </div>

      {labels.length > 0 && (
        <div className="hidden sm:flex items-center gap-1 flex-shrink-0">
          {shown.map((l) => (
            <span
              key={l.id}
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full text-white leading-tight"
              style={{ backgroundColor: l.color }}
            >
              {l.name}
            </span>
          ))}
          {extra > 0 && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-200 text-gray-600 leading-tight">
              +{extra}
            </span>
          )}
        </div>
      )}

      {task.due_date && (
        <span className={`text-xs font-medium flex-shrink-0 ${overdue ? 'text-red-500' : 'text-gray-400'}`}>
          {overdue && '⚠ '}{fmtDate(task.due_date)}
        </span>
      )}

      {task.comment_count > 0 && (
        <span className="hidden sm:flex items-center gap-0.5 text-xs text-gray-400 flex-shrink-0">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          {task.comment_count}
        </span>
      )}

      {task.assignees?.length > 0 && (
        <div className="flex -space-x-1.5 flex-shrink-0">
          {task.assignees.slice(0, 3).map((u) => (
            <div key={u.id} className="ring-2 ring-white rounded-full">
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
    </button>
  );
}

// ── MyTasks (page) ────────────────────────────────────────────────────────────

export default function MyTasks() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [tasks, setTasks] = useState([]);
  const [count, setCount] = useState(0);
  const [nextUrl, setNextUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [workspaces, setWorkspaces] = useState([]);
  const [labels, setLabels] = useState([]);

  // Quick search is client-side only — debounce so it doesn't re-filter on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 200);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    api.get('/workspaces/').then(async ({ data: wsList }) => {
      setWorkspaces(wsList);
      const perWorkspace = await Promise.all(
        wsList.map((w) =>
          api.get(`/workspaces/${w.id}/labels/`).then(({ data }) =>
            data.map((l) => ({ ...l, workspaceName: wsList.length > 1 ? w.name : null }))
          )
        )
      );
      setLabels(perWorkspace.flat());
    }).catch(() => {});
  }, []);

  const fetchTasks = useCallback(() => {
    setLoading(true);
    const qs = buildQuery(filters);
    api.get(`/me/tasks/${qs ? `?${qs}` : ''}`)
      .then(({ data }) => {
        setTasks(data.results || []);
        setCount(data.count || 0);
        setNextUrl(data.next);
      })
      .catch(() => { setTasks([]); setCount(0); setNextUrl(null); })
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const loadMore = async () => {
    if (!nextUrl || loadingMore) return;
    setLoadingMore(true);
    try {
      const { data } = await api.get(nextUrl);
      setTasks((prev) => [...prev, ...(data.results || [])]);
      setNextUrl(data.next);
    } catch {
      /* ignore */
    } finally {
      setLoadingMore(false);
    }
  };

  const visibleTasks = debouncedSearch.trim()
    ? tasks.filter((t) => t.title.toLowerCase().includes(debouncedSearch.trim().toLowerCase()))
    : tasks;

  const handleTaskClick = (task) => {
    navigate(`/workspace/${task.workspace_id}/project/${task.project_id}?task=${task.id}`);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
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
        <span className="text-sm font-bold text-indigo-600 tracking-tight">My Tasks</span>
      </header>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <StatsBar />

          <div className="flex gap-6 items-start">
            <div className="w-1/4 flex-shrink-0">
              <FilterPanel
                filters={filters}
                onChange={setFilters}
                onClear={() => setFilters(DEFAULT_FILTERS)}
                workspaces={workspaces}
                labels={labels}
              />
            </div>

            <div className="w-3/4 min-w-0">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tasks…"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 mb-3"
              />
              <p className="text-xs text-gray-400 mb-3">{count} task{count !== 1 ? 's' : ''}</p>

              {loading ? (
                <p className="text-sm text-gray-400 py-8 text-center">Loading…</p>
              ) : visibleTasks.length === 0 ? (
                <p className="text-sm text-gray-400 py-8 text-center">No tasks match your filters.</p>
              ) : (
                <div className="space-y-2">
                  {visibleTasks.map((t) => (
                    <TaskRow key={t.id} task={t} onClick={() => handleTaskClick(t)} />
                  ))}
                </div>
              )}

              {nextUrl && (
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="mt-3 w-full py-2 text-xs font-medium text-indigo-600 hover:text-indigo-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  {loadingMore ? 'Loading…' : 'Load more'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
