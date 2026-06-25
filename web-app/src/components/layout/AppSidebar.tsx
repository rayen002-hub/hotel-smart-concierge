import React from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { logout } from '../../api/authApi';
import { getStoredUser, clearStaffSession } from '../AuthGuard';

// ── Types ─────────────────────────────────────────────────────────────

interface NavItem {
  key: string;
  label: string;
  icon: string;
  route: string;
  tab: string;
  roles: string[];
}

// ── Navigation items — one entry per tab per role ──────────────────────
// All link to the same route but with different ?tab= params.

const navItems: NavItem[] = [
  // ── Admin tabs ─────────────────────────────────────────────────────
  { key: 'admin-users',      label: 'Utilisateurs',     icon: '👷', route: '/dashboard/admin', tab: 'users',      roles: ['ADMIN'] },
  { key: 'admin-rooms',      label: 'Chambres',          icon: '🚪', route: '/dashboard/admin', tab: 'rooms',      roles: ['ADMIN'] },
  { key: 'admin-complaints', label: 'Réclamations',      icon: '📢', route: '/dashboard/admin', tab: 'complaints', roles: ['ADMIN'] },
  { key: 'admin-logs',       label: "Logs d'activité",   icon: '📜', route: '/dashboard/admin', tab: 'logs',       roles: ['ADMIN'] },
  { key: 'admin-hotel',      label: 'Infos Hôtel',       icon: '🛎️', route: '/dashboard/admin', tab: 'hotel',      roles: ['ADMIN'] },
  { key: 'admin-currency',   label: 'Devises',           icon: '💱', route: '/dashboard/admin', tab: 'currency',   roles: ['ADMIN'] },

  // ── Reception tabs ─────────────────────────────────────────────────
  { key: 'rec-reservations', label: 'Réservations',      icon: '📋', route: '/dashboard/reception', tab: 'reservations', roles: ['RECEPTIONIST'] },
  { key: 'rec-rooms',        label: 'Chambres',           icon: '🚪', route: '/dashboard/reception', tab: 'rooms',        roles: ['RECEPTIONIST'] },
  { key: 'rec-fiches',       label: 'Fiches voyageurs',  icon: '🛂', route: '/dashboard/reception', tab: 'fiches',       roles: ['RECEPTIONIST'] },
  { key: 'rec-complaints',   label: 'Réclamations',      icon: '📢', route: '/dashboard/reception', tab: 'complaints',   roles: ['RECEPTIONIST'] },
  { key: 'rec-messages',     label: 'Messages',           icon: '💬', route: '/dashboard/reception', tab: 'messages',     roles: ['RECEPTIONIST'] },
  { key: 'rec-events',       label: 'Événements',         icon: '🎉', route: '/dashboard/reception', tab: 'events',       roles: ['RECEPTIONIST'] },
  { key: 'rec-qr',           label: 'QR Codes',           icon: '📱', route: '/dashboard/reception', tab: 'qr',           roles: ['RECEPTIONIST'] },

  // ── Manager tabs (Maintenance) ─────────────────────────────────────
  { key: 'maint-complaints',   label: 'Réclamations',    icon: '📢', route: '/dashboard/manager', tab: 'complaints',   roles: ['MAINTENANCE_MANAGER'] },
  { key: 'maint-employees',    label: 'Employés',         icon: '👷', route: '/dashboard/manager', tab: 'employees',    roles: ['MAINTENANCE_MANAGER'] },
  { key: 'maint-housekeeping', label: 'Ménage',           icon: '🧹', route: '/dashboard/manager', tab: 'housekeeping', roles: ['MAINTENANCE_MANAGER'] },

  // ── Manager tabs (Housekeeping) ────────────────────────────────────
  { key: 'hk-complaints',   label: 'Réclamations',       icon: '📢', route: '/dashboard/manager', tab: 'complaints',   roles: ['HOUSEKEEPING_MANAGER'] },
  { key: 'hk-employees',    label: 'Employés',            icon: '👷', route: '/dashboard/manager', tab: 'employees',    roles: ['HOUSEKEEPING_MANAGER'] },
  { key: 'hk-housekeeping', label: 'Ménage',              icon: '🧹', route: '/dashboard/manager', tab: 'housekeeping', roles: ['HOUSEKEEPING_MANAGER'] },
];

const roleColors: Record<string, string> = {
  ADMIN:                 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  RECEPTIONIST:          'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  MAINTENANCE_MANAGER:   'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  HOUSEKEEPING_MANAGER:  'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
};

const roleLabels: Record<string, string> = {
  ADMIN:                 'Administrateur',
  RECEPTIONIST:          'Réceptionniste',
  MAINTENANCE_MANAGER:   'Manager Maintenance',
  HOUSEKEEPING_MANAGER:  'Manager Ménage',
};

// ── AppSidebar ─────────────────────────────────────────────────────────

interface AppSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const user = getStoredUser();
  const userRole = user?.role || '';

  const visibleItems = navItems.filter((item) => item.roles.includes(userRole));
  const roleBadge = roleColors[userRole] || 'bg-slate-100 text-slate-600';
  const roleLabel = roleLabels[userRole] || userRole;

  const activeTab = searchParams.get('tab') || '';

  // An item is active when we're on its route AND its tab matches (or it's the first item and no tab set)
  const isItemActive = (item: NavItem) => {
    if (location.pathname !== item.route) return false;
    if (!activeTab) {
      // Highlight the first item for this route when no tab is set
      const firstForRoute = visibleItems.find(i => i.route === item.route);
      return firstForRoute?.key === item.key;
    }
    return activeTab === item.tab;
  };

  const handleNavClick = (item: NavItem) => {
    navigate(`${item.route}?tab=${item.tab}`);
    onClose();
  };

  const handleLogout = async () => {
    try { await logout(); } catch { /* ignore */ }
    finally {
      clearStaffSession();
      navigate('/login', { replace: true });
    }
  };

  return (
    <>
      {/* ── Mobile overlay ──────────────────────── */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar panel ───────────────────────── */}
      {/*
        On MOBILE: fixed overlay that slides in/out
        On DESKTOP (lg+): relative flex item with fixed width — pushes main content right
      */}
      <aside
        className={`
          z-40 h-full w-64 flex flex-col shrink-0
          bg-[hsl(var(--sidebar-bg))] border-r border-[hsl(var(--sidebar-border))]
          transition-transform duration-300 ease-in-out
          fixed top-0 left-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:relative lg:translate-x-0 lg:flex
        `}
      >
        {/* Brand header */}
        <div className="flex items-center gap-3 h-16 px-5 border-b border-[hsl(var(--sidebar-border))] shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-lg shadow-md shadow-amber-900/30 shrink-0">
            🏨
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white font-bold text-sm leading-tight tracking-tight">LoomStay</p>
            <p className="text-[hsl(var(--sidebar-fg))] text-[10px] leading-tight">Management Console</p>
          </div>
          {/* Mobile close button */}
          <button
            onClick={onClose}
            className="ml-auto w-7 h-7 flex items-center justify-center rounded-lg text-[hsl(var(--sidebar-fg))] hover:text-white hover:bg-white/10 transition-colors lg:hidden"
            aria-label="Fermer le menu"
          >
            ✕
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
          <p className="text-[9px] font-bold uppercase tracking-widest text-[hsl(var(--sidebar-fg))]/50 px-3 pb-3">
            Navigation
          </p>

          {visibleItems.map((item) => {
            const active = isItemActive(item);
            return (
              <button
                key={item.key}
                onClick={() => handleNavClick(item)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                  transition-all duration-150 text-left group cursor-pointer
                  ${active
                    ? 'bg-[hsl(var(--primary))] text-white shadow-md shadow-amber-600/20'
                    : 'text-[hsl(var(--sidebar-fg))] hover:bg-white/8 hover:text-white'
                  }
                `}
              >
                <span className={`text-base leading-none shrink-0 transition-transform duration-150 ${active ? '' : 'group-hover:scale-110'}`}>
                  {item.icon}
                </span>
                <span className="truncate">{item.label}</span>
                {active && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/70 shrink-0" />
                )}
              </button>
            );
          })}
        </nav>

        {/* User section */}
        <div className="border-t border-[hsl(var(--sidebar-border))] p-4 space-y-3 shrink-0">
          {/* User info */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm">
              {user?.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white text-sm font-semibold leading-tight truncate">
                {user?.name || 'Utilisateur'}
              </p>
              <p className="text-[hsl(var(--sidebar-fg))] text-[10px] leading-tight truncate">
                {user?.email}
              </p>
            </div>
          </div>

          {/* Role badge */}
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${roleBadge}`}>
            {roleLabel}
          </span>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 h-9 rounded-xl border border-red-800/40 bg-red-950/30 text-red-400 text-xs font-semibold hover:bg-red-900/40 hover:text-red-300 transition-all duration-150 cursor-pointer"
          >
            <span className="rotate-180 inline-block">→</span>
            Déconnexion
          </button>
        </div>
      </aside>
    </>
  );
};
