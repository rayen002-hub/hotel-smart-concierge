import React from 'react';

interface StatusBadgeProps {
  status: string;
}

const statusLabels: Record<string, string> = {
  // Reservations
  PENDING: 'En attente',
  CONFIRMED: 'Confirmé',
  CHECKED_IN: 'Arrivé (In)',
  CHECKED_OUT: 'Parti (Out)',
  CANCELLED: 'Annulé',
  // Rooms
  AVAILABLE: 'Disponible',
  OCCUPIED: 'Occupé',
  MAINTENANCE: 'Maintenance',
  // Complaints
  ASSIGNED: 'Assigné',
  IN_PROGRESS: 'En cours',
  NEEDS_REVIEW: 'À réviser',
  RESOLVED: 'Résolu',
  REOPENED: 'Réouvert',
};

const statusColors: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/20 dark:text-amber-300 dark:border-amber-900/30',
  CONFIRMED: 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/20 dark:text-blue-300 dark:border-blue-900/30',
  CHECKED_IN: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-300 dark:border-emerald-900/30',
  CHECKED_OUT: 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800/20 dark:text-gray-300 dark:border-gray-700/30',
  CANCELLED: 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/20 dark:text-red-300 dark:border-red-900/30',
  AVAILABLE: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-300 dark:border-emerald-900/30',
  OCCUPIED: 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/20 dark:text-blue-300 dark:border-blue-900/30',
  MAINTENANCE: 'bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-950/20 dark:text-orange-300 dark:border-orange-900/30',
  ASSIGNED: 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/20 dark:text-blue-300 dark:border-blue-900/30',
  IN_PROGRESS: 'bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950/20 dark:text-indigo-300 dark:border-indigo-900/30',
  NEEDS_REVIEW: 'bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-950/20 dark:text-orange-300 dark:border-orange-900/30',
  RESOLVED: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-300 dark:border-emerald-900/30',
  REOPENED: 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/20 dark:text-red-300 dark:border-red-900/30',
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const label = statusLabels[status] || status;
  const classes = statusColors[status] || 'bg-gray-100 text-gray-700 border-gray-200';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border select-none ${classes}`}>
      {label}
    </span>
  );
};
