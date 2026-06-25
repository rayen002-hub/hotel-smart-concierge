import React from 'react';

interface CategoryBadgeProps {
  category: string;
}

const categoryConfig: Record<string, { label: string; classes: string }> = {
  MAINTENANCE: { label: '🔧 Maintenance', classes: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/20 dark:text-orange-300 dark:border-orange-900/30' },
  HOUSEKEEPING: { label: '🧹 Ménage',      classes: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/20 dark:text-teal-300 dark:border-teal-900/30' },
  RECEPTION:   { label: '🛎️ Réception',   classes: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/20 dark:text-indigo-300 dark:border-indigo-900/30' },
  RESTAURANT:  { label: '🍽️ Restaurant',  classes: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-300 dark:border-rose-900/30' },
  COMPLAINT:   { label: '📢 Général',      classes: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/20 dark:text-violet-300 dark:border-violet-900/30' },
  OTHER:       { label: '📌 Autre',        classes: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800/20 dark:text-slate-300 dark:border-slate-700/30' },
};

export const CategoryBadge: React.FC<CategoryBadgeProps> = ({ category }) => {
  const config = categoryConfig[category];
  const label = config?.label ?? category;
  const classes = config?.classes ?? 'bg-slate-50 text-slate-700 border-slate-200';

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border select-none whitespace-nowrap ${classes}`}>
      {label}
    </span>
  );
};
