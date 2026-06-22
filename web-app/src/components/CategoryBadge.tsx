import React from 'react';

interface CategoryBadgeProps {
  category: string;
}

const categoryLabels: Record<string, string> = {
  MAINTENANCE: '🔧 Maintenance',
  HOUSEKEEPING: '🧹 Ménage',
  RECEPTION: '🛎️ Réception',
  RESTAURANT: '🍽️ Restaurant',
  COMPLAINT: '📢 Général',
  OTHER: '📌 Autre',
};

const categoryColors: Record<string, string> = {
  MAINTENANCE: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/20 dark:text-orange-300 dark:border-orange-900/30',
  HOUSEKEEPING: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/20 dark:text-teal-300 dark:border-teal-900/30',
  RECEPTION: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/20 dark:text-indigo-300 dark:border-indigo-900/30',
  RESTAURANT: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-300 dark:border-rose-900/30',
  COMPLAINT: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/20 dark:text-violet-300 dark:border-violet-900/30',
  OTHER: 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800/20 dark:text-gray-300 dark:border-gray-700/30',
};

export const CategoryBadge: React.FC<CategoryBadgeProps> = ({ category }) => {
  const label = categoryLabels[category] || category;
  const classes = categoryColors[category] || 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800/20 dark:text-gray-300 dark:border-gray-700/30';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border select-none whitespace-nowrap ${classes}`}>
      {label}
    </span>
  );
};
