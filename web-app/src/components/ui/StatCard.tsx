import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: string;
  sub?: string;
  accent?: 'default' | 'gold' | 'emerald' | 'red' | 'blue' | 'indigo';
}

const accentMap: Record<string, string> = {
  default: 'from-slate-100 to-slate-50 border-slate-200 dark:from-slate-800/30 dark:to-slate-800/10 dark:border-slate-700/40',
  gold:    'from-amber-50 to-amber-50/30 border-amber-200/60 dark:from-amber-950/20 dark:to-amber-950/10 dark:border-amber-900/30',
  emerald: 'from-emerald-50 to-emerald-50/30 border-emerald-200/60 dark:from-emerald-950/20 dark:to-emerald-950/10 dark:border-emerald-900/30',
  red:     'from-red-50 to-red-50/30 border-red-200/60 dark:from-red-950/20 dark:to-red-950/10 dark:border-red-900/30',
  blue:    'from-blue-50 to-blue-50/30 border-blue-200/60 dark:from-blue-950/20 dark:to-blue-950/10 dark:border-blue-900/30',
  indigo:  'from-indigo-50 to-indigo-50/30 border-indigo-200/60 dark:from-indigo-950/20 dark:to-indigo-950/10 dark:border-indigo-900/30',
};

const iconBgMap: Record<string, string> = {
  default: 'bg-slate-100 dark:bg-slate-800/50',
  gold:    'bg-amber-100 dark:bg-amber-900/30',
  emerald: 'bg-emerald-100 dark:bg-emerald-900/30',
  red:     'bg-red-100 dark:bg-red-900/30',
  blue:    'bg-blue-100 dark:bg-blue-900/30',
  indigo:  'bg-indigo-100 dark:bg-indigo-900/30',
};

const valueColorMap: Record<string, string> = {
  default: 'text-[hsl(var(--foreground))]',
  gold:    'text-amber-700 dark:text-amber-400',
  emerald: 'text-emerald-700 dark:text-emerald-400',
  red:     'text-red-700 dark:text-red-400',
  blue:    'text-blue-700 dark:text-blue-400',
  indigo:  'text-indigo-700 dark:text-indigo-400',
};

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon,
  sub,
  accent = 'default',
}) => {
  const gradient = accentMap[accent] ?? accentMap.default;
  const iconBg = iconBgMap[accent] ?? iconBgMap.default;
  const valueColor = valueColorMap[accent] ?? valueColorMap.default;

  return (
    <div className={`relative rounded-2xl border bg-gradient-to-br ${gradient} p-5 shadow-sm overflow-hidden`}>
      {/* Background pattern */}
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-white/20 dark:bg-white/5 -translate-y-8 translate-x-8" />

      <div className="relative flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
            {label}
          </p>
          <p className={`text-2xl font-bold tabular-nums tracking-tight ${valueColor}`}>
            {value}
          </p>
          {sub && (
            <p className="text-xs text-[hsl(var(--muted-foreground))]">{sub}</p>
          )}
        </div>

        <div className={`w-11 h-11 rounded-xl ${iconBg} flex items-center justify-center text-xl shrink-0 shadow-sm`}>
          {icon}
        </div>
      </div>
    </div>
  );
};
