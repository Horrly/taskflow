import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import ActivityFeed from '../components/ActivityFeed';
import DarkModeToggle from '../components/DarkModeToggle';

export default function MyActivity() {
  const navigate = useNavigate();

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <Helmet><title>My Activity · TaskFlow</title></Helmet>
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3.5 flex items-center gap-4 flex-shrink-0">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Dashboard
        </button>
        <span className="text-gray-300 dark:text-gray-600">/</span>
        <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 tracking-tight">My Activity</span>
        <div className="ml-auto">
          <DarkModeToggle />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-8 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">My Activity</h1>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
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
