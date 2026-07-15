import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import Avatar from './Avatar';

function dateLabel(iso) {
  const d = new Date(iso);
  const now = new Date();
  const startOf = (dt) => new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
  const diffDays = Math.round((startOf(now) - startOf(d)) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
}

function ActivityItem({ entry, showTaskTitle, onClick, isLast }) {
  const actorName = entry.actor
    ? (`${entry.actor.first_name} ${entry.actor.last_name}`.trim() || 'Someone')
    : 'Someone';

  return (
    <div
      onClick={onClick}
      className={`relative flex gap-3 pl-0.5 ${isLast ? 'pb-1' : 'pb-5'} ${onClick ? 'cursor-pointer group' : ''}`}
    >
      {!isLast && (
        <span className="absolute left-[13px] top-8 bottom-0 w-px bg-gray-100 dark:bg-gray-700" />
      )}
      <div className="flex-shrink-0 z-10">
        {entry.actor ? (
          <Avatar user={entry.actor} size="sm" />
        ) : (
          <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700" />
        )}
      </div>
      <div className="flex-1 min-w-0 pt-0.5">
        <p className={`text-sm text-gray-700 dark:text-gray-200 ${onClick ? 'group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition-colors' : ''}`}>
          <span className="font-semibold text-gray-900 dark:text-gray-100">{actorName}</span>{' '}
          {entry.verb}
          {entry.detail && <span> {entry.detail}</span>}
          {showTaskTitle && entry.task_title && (
            <span className="text-gray-400 dark:text-gray-500"> · {entry.task_title}</span>
          )}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{entry.human_time}</p>
      </div>
    </div>
  );
}

function ActivitySkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex gap-3 pl-0.5">
          <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
          <div className="flex-1 min-w-0 pt-0.5 space-y-2">
            <div className="h-3 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-2.5 w-1/4 rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ActivityFeed({
  fetchUrl,
  emptyMessage = 'No activity yet',
  showTaskTitle = false,
  groupByDate = false,
  onEntryClick,
  refreshToken,
}) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextUrl, setNextUrl] = useState(null);
  const [paginated, setPaginated] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(fetchUrl);
      if (Array.isArray(data)) {
        setPaginated(false);
        setEntries(data);
        setNextUrl(null);
      } else {
        setPaginated(true);
        setEntries(data.results || []);
        setNextUrl(data.next);
      }
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [fetchUrl]);

  useEffect(() => { load(); }, [load, refreshToken]);

  const loadMore = async () => {
    if (!nextUrl || loadingMore) return;
    setLoadingMore(true);
    try {
      const { data } = await api.get(nextUrl);
      setEntries((prev) => [...prev, ...(data.results || [])]);
      setNextUrl(data.next);
    } catch {
      /* ignore */
    } finally {
      setLoadingMore(false);
    }
  };

  if (loading) {
    return <ActivitySkeleton />;
  }

  if (entries.length === 0) {
    return <p className="text-xs text-gray-400 dark:text-gray-500 py-4">{emptyMessage}</p>;
  }

  const renderEntry = (entry, isLast) => (
    <ActivityItem
      key={entry.id}
      entry={entry}
      showTaskTitle={showTaskTitle}
      isLast={isLast}
      onClick={
        onEntryClick && entry.task_id && entry.project_id
          ? () => onEntryClick(entry)
          : undefined
      }
    />
  );

  let content;
  if (groupByDate) {
    const groups = [];
    let currentLabel = null;
    for (const entry of entries) {
      const label = dateLabel(entry.created_at);
      if (label !== currentLabel) {
        groups.push({ label, items: [] });
        currentLabel = label;
      }
      groups[groups.length - 1].items.push(entry);
    }
    content = groups.map((group) => (
      <div key={group.label} className="mb-5 last:mb-0">
        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
          {group.label}
        </p>
        {group.items.map((entry, idx) => renderEntry(entry, idx === group.items.length - 1))}
      </div>
    ));
  } else {
    content = entries.map((entry, idx) => renderEntry(entry, idx === entries.length - 1));
  }

  return (
    <div>
      {content}
      {paginated && nextUrl && (
        <button
          onClick={loadMore}
          disabled={loadingMore}
          className="mt-2 w-full py-2 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          {loadingMore ? 'Loading…' : 'Load more'}
        </button>
      )}
    </div>
  );
}
