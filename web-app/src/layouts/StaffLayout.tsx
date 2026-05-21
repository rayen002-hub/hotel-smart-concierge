import { Outlet, useNavigate, NavLink } from 'react-router-dom';
import { logout } from '../api/authApi';
import { getStoredUser, clearStaffSession } from '../components/AuthGuard';

const roleLabels: Record<string, string> = {
  ADMIN: 'Administrateur',
  RECEPTIONIST: 'Réception',
  MAINTENANCE_MANAGER: 'Manager Maintenance',
  HOUSEKEEPING_MANAGER: 'Manager Ménage',
};

export const StaffLayout: React.FC = () => {
  const navigate = useNavigate();
  const user = getStoredUser();

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // Ignore API errors on logout
    } finally {
      clearStaffSession();
      navigate('/login', { replace: true });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[hsl(var(--background))]">

      {/* ── Top Navigation Bar ─────────────────────────────────── */}
      <header className="sticky top-0 z-40 w-full border-b bg-[hsl(var(--card))]/95 backdrop-blur-md supports-[backdrop-filter]:bg-[hsl(var(--card))]/80">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 md:px-6">

          {/* Brand */}
          <div className="flex items-center gap-3">
            <span className="text-xl">🏨</span>
            <div className="hidden sm:block">
              <h1 className="text-sm font-bold leading-none">Smart Concierge</h1>
              <p className="text-[10px] text-[hsl(var(--muted-foreground))] leading-tight mt-0.5">
                {roleLabels[user?.role || ''] || 'Personnel'}
              </p>
            </div>
          </div>

          {/* Navigation links */}
          <nav className="flex items-center gap-1">
            {user?.role === 'ADMIN' && (
              <NavLink
                to="/dashboard/admin"
                className={({ isActive }) =>
                  `h-8 px-3 rounded-md text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
                      : 'hover:bg-[hsl(var(--accent))] text-[hsl(var(--muted-foreground))]'
                  } inline-flex items-center`
                }
              >
                Administration
              </NavLink>
            )}
            {user?.role === 'RECEPTIONIST' && (
              <NavLink
                to="/dashboard/reception"
                className={({ isActive }) =>
                  `h-8 px-3 rounded-md text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
                      : 'hover:bg-[hsl(var(--accent))] text-[hsl(var(--muted-foreground))]'
                  } inline-flex items-center`
                }
              >
                Réception
              </NavLink>
            )}
            {(user?.role === 'MAINTENANCE_MANAGER' || user?.role === 'HOUSEKEEPING_MANAGER') && (
              <NavLink
                to="/dashboard/manager"
                className={({ isActive }) =>
                  `h-8 px-3 rounded-md text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
                      : 'hover:bg-[hsl(var(--accent))] text-[hsl(var(--muted-foreground))]'
                  } inline-flex items-center`
                }
              >
                Dashboard Manager
              </NavLink>
            )}
          </nav>

          {/* User info + Logout */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-xs font-semibold leading-tight">{user?.name}</span>
              <span className="text-[10px] text-[hsl(var(--muted-foreground))] leading-tight">{user?.email}</span>
            </div>
            <button
              onClick={handleLogout}
              className="h-8 px-3 rounded-md border border-red-200 bg-red-50 text-red-700 text-xs font-medium hover:bg-red-100 transition-colors dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400 dark:hover:bg-red-950/30"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Content ───────────────────────────────────────── */}
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
