import { Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import AccessDeniedPage from '@/pages/AccessDeniedPage';
import type { Role } from '@/types';

interface RoleGuardProps {
  allowed: Role[];
}

export default function RoleGuard({ allowed }: RoleGuardProps): JSX.Element {
  const { role } = useAuth();

  if (!role || !allowed.includes(role)) {
    return <AccessDeniedPage />;
  }

  return <Outlet />;
}
