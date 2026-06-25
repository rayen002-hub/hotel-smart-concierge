
export interface TabItem<T extends string = string> {
  key: T;
  label: string;
  icon?: string;
  badge?: number;
}

interface TabNavProps<T extends string = string> {
  tabs: TabItem<T>[];
  active: T;
  onChange: (key: T) => void;
  className?: string;
}

export function TabNav<T extends string = string>({
  tabs,
  active,
  onChange,
  className = '',
}: TabNavProps<T>) {
  return (
    <div className={`relative flex items-end gap-1 border-b border-[hsl(var(--border))] ${className}`}>
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`
              relative flex items-center gap-2 px-4 h-11 text-sm font-medium whitespace-nowrap
              transition-all duration-150 cursor-pointer select-none rounded-t-lg
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-1
              ${isActive
                ? 'text-[hsl(var(--primary))] bg-[hsl(var(--card))]'
                : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]/50'
              }
            `}
          >
            {tab.icon && <span className="text-base leading-none">{tab.icon}</span>}
            <span>{tab.label}</span>

            {/* Badge */}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className="min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-[hsl(var(--primary))] text-white text-[10px] font-bold px-1">
                {tab.badge}
              </span>
            )}

            {/* Active underline bar */}
            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-[hsl(var(--primary))]" />
            )}
          </button>
        );
      })}
    </div>
  );
}
