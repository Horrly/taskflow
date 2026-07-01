import { useState, useEffect } from 'react';
import api from '../api/axios';

const STAT_META = [
  { key: 'total_assigned', label: 'Assigned to me', color: 'text-gray-900' },
  { key: 'overdue', label: 'Overdue', color: 'text-red-600' },
  { key: 'due_today', label: 'Due today', color: 'text-amber-600' },
  { key: 'due_this_week', label: 'Due this week', color: 'text-indigo-600' },
  { key: 'completed_this_week', label: 'Completed this week', color: 'text-emerald-600' },
];

export default function StatsBar() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api.get('/me/stats/')
      .then(({ data }) => { if (!cancelled) setStats(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  if (!stats) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      {STAT_META.map(({ key, label, color }) => (
        <div key={key} className="bg-white rounded-xl border border-gray-200 px-4 py-3">
          <p className={`text-2xl font-bold ${color}`}>{stats[key]}</p>
          <p className="text-xs text-gray-500 mt-0.5">{label}</p>
        </div>
      ))}
    </div>
  );
}
