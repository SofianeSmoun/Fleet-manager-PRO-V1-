import { Navigate, Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '@/hooks/useAuth';

export default function AppLayout(): JSX.Element {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex min-h-screen bg-[#F4F6F9]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
