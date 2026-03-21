import { getAccessToken, setAccessToken } from '@/lib/auth-token';
import type { Role } from '@/types';

interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
}

interface UseAuthReturn {
  user: AuthUser | null;
  role: Role | null;
  isAuthenticated: boolean;
  logout: () => void;
}

function decodeToken(): AuthUser | null {
  const token = getAccessToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1] ?? '')) as Partial<AuthUser>;
    if (!payload.role || !payload.id) return null;
    return {
      id: payload.id,
      email: payload.email ?? '',
      firstName: payload.firstName ?? '',
      lastName: payload.lastName ?? '',
      role: payload.role,
    };
  } catch {
    return null;
  }
}

export function useAuth(): UseAuthReturn {
  const user = decodeToken();

  return {
    user,
    role: user?.role ?? null,
    isAuthenticated: user !== null,
    logout: () => {
      setAccessToken(null);
      window.location.href = '/login';
    },
  };
}
