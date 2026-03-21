import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import type { Role } from '@/types';

// ─── Navigation config ──────────────────────────────────────────────────────

interface NavItem {
  label: string;
  path: string;
  icon: string;
  allowedRoles: Role[];
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const ALL_ROLES: Role[] = ['ADMIN', 'GESTIONNAIRE', 'COMMERCIAL', 'LECTEUR'];

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Principal',
    items: [
      { label: 'Dashboard', path: '/dashboard', icon: '📊', allowedRoles: ALL_ROLES },
      {
        label: 'Flotte',
        path: '/flotte',
        icon: '🚗',
        allowedRoles: ['ADMIN', 'GESTIONNAIRE', 'LECTEUR'],
      },
      {
        label: 'Locations',
        path: '/locations',
        icon: '📋',
        allowedRoles: ['ADMIN', 'GESTIONNAIRE', 'LECTEUR'],
      },
    ],
  },
  {
    title: 'Opérations',
    items: [
      { label: 'Clients', path: '/clients', icon: '🏢', allowedRoles: ALL_ROLES },
      {
        label: 'Mécaniciens',
        path: '/mecaniciens',
        icon: '🔧',
        allowedRoles: ['ADMIN', 'GESTIONNAIRE', 'LECTEUR'],
      },
      {
        label: 'Garages',
        path: '/garages',
        icon: '🏭',
        allowedRoles: ['ADMIN', 'GESTIONNAIRE'],
      },
    ],
  },
  {
    title: 'Administration',
    items: [
      {
        label: 'Stock',
        path: '/stock',
        icon: '📦',
        allowedRoles: ['ADMIN', 'GESTIONNAIRE', 'LECTEUR'],
      },
      {
        label: 'Assurances',
        path: '/assurances',
        icon: '🛡️',
        allowedRoles: ['ADMIN', 'COMMERCIAL'],
      },
      {
        label: 'Rapports',
        path: '/rapports',
        icon: '📈',
        allowedRoles: ['ADMIN'],
      },
      {
        label: 'Paramètres',
        path: '/parametres',
        icon: '⚙️',
        allowedRoles: ['ADMIN'],
      },
    ],
  },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function Sidebar(): JSX.Element {
  const { user, role, logout } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const initials = user
    ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()
    : '??';

  const fullName = user ? `${user.firstName} ${user.lastName}` : '';

  function isItemVisible(item: NavItem): boolean {
    if (!role) return false;
    return item.allowedRoles.includes(role);
  }

  function isSectionVisible(section: NavSection): boolean {
    return section.items.some(isItemVisible);
  }

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#0D1B2A] text-white w-[230px]">
      {/* Logo */}
      <div className="px-5 py-6 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-[#1D6FA4] flex items-center justify-center text-lg">
          🚗
        </div>
        <div>
          <h1 className="text-sm font-bold leading-tight font-['IBM_Plex_Sans']">
            FleetManager Pro
          </h1>
          <p className="text-[10px] text-white/50">Gestion de flotte</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 space-y-5 mt-2">
        {NAV_SECTIONS.map((section) => {
          if (!isSectionVisible(section)) return null;
          return (
            <div key={section.title}>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40 px-2 mb-1.5">
                {section.title}
              </p>
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  if (!isItemVisible(item)) return null;
                  const isActive =
                    location.pathname === item.path ||
                    (item.path !== '/dashboard' && location.pathname.startsWith(item.path + '/'));
                  return (
                    <li key={item.path}>
                      <NavLink
                        to={item.path}
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors ${
                          isActive
                            ? 'bg-white/10 text-white border-l-[3px] border-[#1D6FA4]'
                            : 'text-white/70 hover:bg-white/5 border-l-[3px] border-transparent'
                        }`}
                      >
                        <span className="text-base w-5 text-center">{item.icon}</span>
                        <span>{item.label}</span>
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* Footer — user info */}
      <div className="px-3 py-4 border-t border-white/10">
        <div className="flex items-center gap-2.5 px-2">
          <div className="w-8 h-8 rounded-full bg-[#1D6FA4] flex items-center justify-center text-xs font-bold">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{fullName}</p>
            <p className="text-[10px] text-white/50 font-['IBM_Plex_Mono']">{role}</p>
          </div>
          <button
            onClick={logout}
            title="Déconnexion"
            className="text-white/50 hover:text-white transition-colors text-sm"
            data-testid="logout-button"
          >
            ⏻
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-3 left-3 z-50 md:hidden w-10 h-10 rounded-lg bg-[#0D1B2A] text-white flex items-center justify-center text-xl"
        data-testid="hamburger-button"
        aria-label="Menu"
      >
        {mobileOpen ? '✕' : '☰'}
      </button>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex sticky top-0 h-screen flex-shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-40 md:hidden">
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  );
}

// Export for route guards
export { NAV_SECTIONS };
export type { NavItem };
