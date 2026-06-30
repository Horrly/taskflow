import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <span className="text-xl font-bold text-indigo-600 tracking-tight">TaskFlow</span>
        <button
          onClick={handleLogout}
          className="text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Log out
        </button>
      </header>
      <main className="max-w-4xl mx-auto px-6 py-16 text-center">
        <h1 className="text-3xl font-semibold text-gray-900">
          Welcome, {user?.first_name || user?.email}!
        </h1>
        <p className="mt-3 text-gray-500">
          Your workspace is ready. Boards and tasks are coming in Phase 2.
        </p>
      </main>
    </div>
  );
}
