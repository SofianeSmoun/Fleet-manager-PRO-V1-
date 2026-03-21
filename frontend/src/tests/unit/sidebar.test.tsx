import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import type { Role } from '@/types';

// ─── Mock useAuth ────────────────────────────────────────────────────────────

const mockLogout = vi.fn();

const mockAuth = vi.hoisted(() => ({
  user: null as { id: string; email: string; firstName: string; lastName: string; role: Role } | null,
  role: null as Role | null,
  isAuthenticated: true,
  logout: vi.fn(),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockAuth,
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function setRole(role: Role): void {
  mockAuth.user = {
    id: '1',
    email: `${role.toLowerCase()}@test.com`,
    firstName: 'Test',
    lastName: 'User',
    role,
  };
  mockAuth.role = role;
  mockAuth.logout = mockLogout;
}

function renderSidebar(currentPath = '/dashboard'): void {
  render(
    <MemoryRouter initialEntries={[currentPath]}>
      <Sidebar />
    </MemoryRouter>,
  );
}

// ─── All navigation labels ───────────────────────────────────────────────────

const ALL_LABELS = [
  'Dashboard', 'Flotte', 'Locations',
  'Clients', 'Mécaniciens', 'Garages',
  'Stock', 'Assurances', 'Rapports', 'Paramètres',
];

// ─── Tests ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Sidebar — RBAC visibility', () => {
  it('ADMIN sees all 10 navigation items', () => {
    setRole('ADMIN');
    renderSidebar();

    for (const label of ALL_LABELS) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('GESTIONNAIRE sees 7 items — hides Assurances, Rapports, Paramètres', () => {
    setRole('GESTIONNAIRE');
    renderSidebar();

    const visible = ['Dashboard', 'Flotte', 'Locations', 'Clients', 'Mécaniciens', 'Garages', 'Stock'];
    const hidden = ['Assurances', 'Rapports', 'Paramètres'];

    for (const label of visible) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    for (const label of hidden) {
      expect(screen.queryByText(label)).not.toBeInTheDocument();
    }
  });

  it('COMMERCIAL sees 3 items — Dashboard, Clients, Assurances', () => {
    setRole('COMMERCIAL');
    renderSidebar();

    const visible = ['Dashboard', 'Clients', 'Assurances'];
    const hidden = ['Flotte', 'Locations', 'Mécaniciens', 'Garages', 'Stock', 'Rapports', 'Paramètres'];

    for (const label of visible) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    for (const label of hidden) {
      expect(screen.queryByText(label)).not.toBeInTheDocument();
    }
  });

  it('LECTEUR sees 6 items — hides Garages, Assurances, Rapports, Paramètres', () => {
    setRole('LECTEUR');
    renderSidebar();

    const visible = ['Dashboard', 'Flotte', 'Locations', 'Clients', 'Mécaniciens', 'Stock'];
    const hidden = ['Garages', 'Assurances', 'Rapports', 'Paramètres'];

    for (const label of visible) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    for (const label of hidden) {
      expect(screen.queryByText(label)).not.toBeInTheDocument();
    }
  });
});

describe('Sidebar — active state', () => {
  it('highlights the current route item', () => {
    setRole('ADMIN');
    renderSidebar('/flotte');

    const flotteLink = screen.getByText('Flotte').closest('a');
    expect(flotteLink?.className).toContain('bg-white/10');

    const dashboardLink = screen.getByText('Dashboard').closest('a');
    expect(dashboardLink?.className).not.toContain('bg-white/10');
  });
});

describe('Sidebar — UI elements', () => {
  it('hamburger button is present', () => {
    setRole('ADMIN');
    renderSidebar();

    expect(screen.getByTestId('hamburger-button')).toBeInTheDocument();
  });

  it('logout button is present and clickable', () => {
    setRole('ADMIN');
    renderSidebar();

    const logoutBtn = screen.getByTestId('logout-button');
    expect(logoutBtn).toBeInTheDocument();
    logoutBtn.click();
    expect(mockLogout).toHaveBeenCalledOnce();
  });

  it('displays user initials and role', () => {
    setRole('GESTIONNAIRE');
    renderSidebar();

    // Initials "TU" for "Test User"
    expect(screen.getByText('TU')).toBeInTheDocument();
    // Role displayed
    expect(screen.getByText('GESTIONNAIRE')).toBeInTheDocument();
  });
});
