import React from 'react';

interface StatusBadgeProps {
  status: string;
}

const statusConfig: Record<string, { label: string; classes: string; dot: string }> = {
  // Reservations
  PENDING:      { label: 'En attente',   classes: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/20 dark:text-amber-300 dark:border-amber-900/30',    dot: 'bg-amber-500' },
  CONFIRMED:    { label: 'Confirmé',     classes: 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/20 dark:text-blue-300 dark:border-blue-900/30',           dot: 'bg-blue-500' },
  CHECKED_IN:   { label: 'Arrivé',       classes: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-300 dark:border-emerald-900/30', dot: 'bg-emerald-500' },
  CHECKED_OUT:  { label: 'Parti',        classes: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800/30 dark:text-slate-300 dark:border-slate-700/30',     dot: 'bg-slate-400' },
  CANCELLED:    { label: 'Annulé',       classes: 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/20 dark:text-red-300 dark:border-red-900/30',                dot: 'bg-red-500' },
  // Rooms
  AVAILABLE:    { label: 'Disponible',   classes: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-300 dark:border-emerald-900/30', dot: 'bg-emerald-500' },
  OCCUPIED:     { label: 'Occupé',       classes: 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/20 dark:text-blue-300 dark:border-blue-900/30',           dot: 'bg-blue-500' },
  MAINTENANCE:  { label: 'Maintenance',  classes: 'bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-950/20 dark:text-orange-300 dark:border-orange-900/30', dot: 'bg-orange-500' },
  // Complaints & interventions
  ASSIGNED:     { label: 'Assigné',      classes: 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/20 dark:text-blue-300 dark:border-blue-900/30',           dot: 'bg-blue-500' },
  IN_PROGRESS:  { label: 'En cours',     classes: 'bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950/20 dark:text-indigo-300 dark:border-indigo-900/30', dot: 'bg-indigo-500' },
  NEEDS_REVIEW: { label: 'À réviser',   classes: 'bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-950/20 dark:text-orange-300 dark:border-orange-900/30', dot: 'bg-orange-500' },
  RESOLVED:     { label: 'Résolu',       classes: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-300 dark:border-emerald-900/30', dot: 'bg-emerald-500' },
  REOPENED:     { label: 'Réouvert',     classes: 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/20 dark:text-red-300 dark:border-red-900/30',                dot: 'bg-red-500' },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const config = statusConfig[status];
  const label = config?.label ?? status;
  const classes = config?.classes ?? 'bg-slate-50 text-slate-700 border-slate-200';
  const dot = config?.dot ?? 'bg-slate-400';

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border select-none whitespace-nowrap ${classes}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
      {label}
    </span>
  );
};
