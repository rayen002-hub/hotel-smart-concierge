import React from 'react';
import { getStoredUser } from '../AuthGuard';

interface DashboardTopbarProps {
  title: string;
  description?: string;
  onMenuOpen: () => void;
}

const roleLabels: Record<string, string> = {
  ADMIN:                'Administrateur',
  RECEPTIONIST:         'Réceptionniste',
  MAINTENANCE_MANAGER:  'Manager Maintenance',
  HOUSEKEEPING_MANAGER: 'Manager Ménage',
};

const roleDotColor: Record<string, string> = {
  ADMIN:                'bg-violet-500',
  RECEPTIONIST:         'bg-blue-500',
  MAINTENANCE_MANAGER:  'bg-orange-500',
  HOUSEKEEPING_MANAGER: 'bg-teal-500',
};

export const DashboardTopbar: React.FC<DashboardTopbarProps> = ({
  title,
  description,
  onMenuOpen,
}) => {
  const user = getStoredUser();
  const role = user?.role || '';
  const roleLabel = roleLabels[role] || role;
  const dotColor = roleDotColor[role] || 'bg-slate-400';
  const initial = user?.name?.charAt(0)?.toUpperCase() || '?';

  return (
    <header className="sticky top-0 z-20 h-16 flex items-center justify-between gap-4 px-6 bg-[hsl(var(--card))]/95 backdrop-blur-md border-b border-[hsl(var(--border))] shadow-sm">
      {/* Left: hamburger (mobile) + page title */}
      <div className="flex items-center gap-4 min-w-0">
        {/* Hamburger */}
        <button
          onClick={onMenuOpen}
          className="lg:hidden flex flex-col items-center justify-center w-9 h-9 gap-1 rounded-lg hover:bg-[hsl(var(--muted))] transition-colors"
          aria-label="Menu"
        >
          <span className="w-5 h-0.5 bg-[hsl(var(--foreground))] rounded-full" />
          <span className="w-5 h-0.5 bg-[hsl(var(--foreground))] rounded-full" />
          <span className="w-5 h-0.5 bg-[hsl(var(--foreground))] rounded-full" />
        </button>

        <div className="min-w-0">
          <h2 className="text-base font-bold leading-tight text-[hsl(var(--foreground))] truncate">
            {title}
          </h2>
          {description && (
            <p className="text-xs text-[hsl(var(--muted-foreground))] leading-tight truncate hidden sm:block">
              {description}
            </p>
          )}
        </div>
      </div>

      {/* Right: status indicator + user pill */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Role badge */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--background))]">
          <span className={`w-2 h-2 rounded-full ${dotColor} animate-pulse`} />
          <span className="text-xs font-medium text-[hsl(var(--muted-foreground))]">{roleLabel}</span>
        </div>

        {/* Avatar chip */}
        <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--background))] hover:bg-[hsl(var(--muted))] transition-colors">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
            {initial}
          </div>
          <span className="text-sm font-medium text-[hsl(var(--foreground))] hidden sm:block">
            {user?.name?.split(' ')[0]}
          </span>
        </div>
      </div>
    </header>
  );
};
