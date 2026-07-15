import { useNavigate } from 'react-router-dom';
import ActivityFeed from '../components/ActivityFeed';

export default function MyActivity() {
  const navigate = useNavigate();

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
        <span className="text-sm font-bold text-indigo-600 tracking-tight">My Activity</span>
      </header>

      <div className="flex-1 overflow-y-auto px-8 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-xl font-bold text-gray-900 mb-6">My Activity</h1>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <ActivityFeed
              fetchUrl="/me/activity/"
              showTaskTitle
              groupByDate
              emptyMessage="No activity yet"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
