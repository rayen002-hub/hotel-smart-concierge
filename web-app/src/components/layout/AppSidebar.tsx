import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { logout } from '../../api/authApi';
import { getStoredUser, clearStaffSession } from '../AuthGuard';

// ── Types ─────────────────────────────────────────────────────────────

interface NavItem {
  key: string;
  label: string;
  icon: string;
  to: string;
  roles: string[];
}

// ── Navigation items per role ──────────────────────────────────────────

const navItems: NavItem[] = [
  // Admin
  { key: 'admin-users',      label: 'Utilisateurs',   icon: '👷', to: '/dashboard/admin',      roles: ['ADMIN'] },
  // Reception
  { key: 'rec-reservations', label: 'Réservations',   icon: '📋', to: '/dashboard/reception',  roles: ['ADMIN', 'RECEPTIONIST'] },
  // Manager
  { key: 'mgr-complaints',   label: 'Réclamations',   icon: '📢', to: '/dashboard/manager',    roles: ['ADMIN', 'MAINTENANCE_MANAGER', 'HOUSEKEEPING_MANAGER'] },
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
  const user = getStoredUser();
  const userRole = user?.role || '';

  const visibleItems = navItems.filter((item) => item.roles.includes(userRole));
  const roleBadge = roleColors[userRole] || 'bg-slate-100 text-slate-600';
  const roleLabel = roleLabels[userRole] || userRole;

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
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar panel ───────────────────────── */}
      <aside
        className={`
          fixed top-0 left-0 z-40 h-full w-64 flex flex-col
          bg-[hsl(var(--sidebar-bg))] border-r border-[hsl(var(--sidebar-border))]
          transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:z-auto
        `}
      >
        {/* Brand header */}
        <div className="flex items-center gap-3 h-16 px-5 border-b border-[hsl(var(--sidebar-border))]">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-lg shadow-md shadow-amber-900/30 shrink-0">
            🏨
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight tracking-tight">LoomStay</p>
            <p className="text-[hsl(var(--sidebar-fg))] text-[10px] leading-tight">Management Console</p>
          </div>
          {/* Mobile close */}
          <button
            onClick={onClose}
            className="ml-auto text-[hsl(var(--sidebar-fg))] hover:text-white transition-colors lg:hidden"
          >
            ✕
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--sidebar-fg))] px-3 pb-2">
            Navigation
          </p>

          {visibleItems.map((item) => (
            <NavLink
              key={item.key}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group
                ${isActive
                  ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-md shadow-amber-600/20'
                  : 'text-[hsl(var(--sidebar-fg))] hover:bg-[hsl(var(--sidebar-hover))] hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={`text-lg leading-none shrink-0 transition-transform duration-150 ${isActive ? '' : 'group-hover:scale-110'}`}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                  {isActive && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[hsl(var(--primary-foreground))] opacity-70" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User section */}
        <div className="border-t border-[hsl(var(--sidebar-border))] p-4 space-y-3">
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
            <span>→</span>
            Déconnexion
          </button>
        </div>
      </aside>
    </>
  );
};
