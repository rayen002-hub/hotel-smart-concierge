import React from 'react';
import { NavLink } from 'react-router-dom';

interface RoomNavItem {
  to: string;
  label: string;
  icon: string;
}

const navItems: RoomNavItem[] = [
  { to: '/room',            label: 'Accueil',     icon: '🏠' },
  { to: '/room/messages',   label: 'Messages',    icon: '💬' },
  { to: '/room/complaint',  label: 'Réclamation', icon: '📝' },
  { to: '/room/hotel-info', label: 'Hôtel',       icon: '🏨' },
  { to: '/room/events',     label: 'Événements',  icon: '🎉' },
];

export const RoomNavBar: React.FC = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 h-16 flex items-center justify-around bg-[hsl(var(--card))]/95 backdrop-blur-md border-t border-[hsl(var(--border))] shadow-[0_-4px_24px_0_rgba(0,0,0,0.08)] safe-area-inset-bottom">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/room'}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-0.5 min-w-[56px] h-full px-2 transition-all duration-150
            ${isActive
              ? 'text-[hsl(var(--primary))]'
              : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
            }`
          }
        >
          {({ isActive }) => (
            <>
              {/* Icon with active background pill */}
              <div className={`text-xl transition-all duration-150 ${isActive ? 'scale-110' : ''}`}>
                {item.icon}
              </div>
              <span className={`text-[9px] font-semibold leading-none tracking-wide transition-all duration-150 ${
                isActive ? 'text-[hsl(var(--primary))]' : ''
              }`}>
                {item.label}
              </span>
              {/* Active dot */}
              {isActive && (
                <span className="absolute bottom-1.5 w-1 h-1 rounded-full bg-[hsl(var(--primary))]" />
              )}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
};
