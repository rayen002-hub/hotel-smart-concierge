export type StatusTone = 'success' | 'warning' | 'error' | 'info' | 'neutral';
export type StatusContext = 'reservation' | 'room' | 'complaint' | 'task' | 'checkin';

const labels: Record<string, string> = {
  AVAILABLE: 'Disponible',
  OCCUPIED: 'Occupée',
  CLEANING: 'En nettoyage',
  MAINTENANCE: 'En maintenance',
  PENDING: 'En attente',
  CONFIRMED: 'Confirmée',
  CHECKED_IN: 'Arrivé',
  CHECKED_OUT: 'Départ effectué',
  CANCELLED: 'Annulée',
  NO_SHOW: 'Non présenté',
  ASSIGNED: 'Affectée',
  IN_PROGRESS: 'En cours',
  RESOLVED: 'Résolue',
  NEEDS_REVIEW: 'À vérifier',
  REOPENED: 'Réouverte',
  COMPLETED: 'Terminée',
  NOT_STARTED: 'Non commencé',
  PARTIAL: 'Partiellement renseigné',
  DONE: 'Terminée',
  SKIPPED: 'Ignorée',
  FIXED: 'Réparé',
  NOT_FIXED: 'Non réparé',
  NOT_DONE: 'Non effectuée',
  SUCCESS: 'Réussi',
  FAILED: 'Échec',
  ACTIVE: 'Actif',
  INACTIVE: 'Inactif',
  MORNING: 'Matin',
  EVENING: 'Soir',
  NIGHT: 'Nuit',
  DAY_OFF: 'Jour de repos',
};

const tones: Record<string, StatusTone> = {
  AVAILABLE: 'success', CHECKED_IN: 'success', RESOLVED: 'success', COMPLETED: 'success', DONE: 'success',
  SUCCESS: 'success', FIXED: 'success', ACTIVE: 'success',
  PENDING: 'warning', CLEANING: 'warning', NEEDS_REVIEW: 'warning', PARTIAL: 'warning', ASSIGNED: 'warning',
  IN_PROGRESS: 'info', CONFIRMED: 'info', OCCUPIED: 'info', MORNING: 'info', EVENING: 'info', NIGHT: 'info',
  CANCELLED: 'error', NO_SHOW: 'error', FAILED: 'error', NOT_FIXED: 'error', NOT_DONE: 'error', REOPENED: 'error', INACTIVE: 'neutral',
  CHECKED_OUT: 'neutral', MAINTENANCE: 'neutral', NOT_STARTED: 'neutral', SKIPPED: 'neutral', DAY_OFF: 'neutral',
};

const contextLabels: Partial<Record<StatusContext, Record<string, string>>> = {
  reservation: { CHECKED_OUT: 'Parti', CANCELLED: 'Annulée', NO_SHOW: 'Non présentée' },
  room: { OCCUPIED: 'Occupée' },
  complaint: { ASSIGNED: 'Affectée', RESOLVED: 'Résolue' },
  task: { ASSIGNED: 'Affectée', COMPLETED: 'Terminée', CANCELLED: 'Annulée', NEEDS_REVIEW: 'À vérifier' },
  checkin: { NOT_STARTED: 'Non commencé', PARTIAL: 'Partiellement renseigné', COMPLETED: 'Complet' },
};

export function getStatusLabel(status: string, context?: StatusContext): string {
  return (context ? contextLabels[context]?.[status] : undefined) ?? labels[status] ?? 'Statut non renseigné';
}

export function getStatusTone(status: string): StatusTone {
  return tones[status] ?? 'neutral';
}

export const STATUS_TONE_CLASSES: Record<StatusTone, string> = {
  success: 'bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-200 dark:border-emerald-800',
  warning: 'bg-amber-50 text-amber-950 border-amber-200 dark:bg-amber-950/50 dark:text-amber-100 dark:border-amber-800',
  error: 'bg-red-50 text-red-900 border-red-200 dark:bg-red-950/50 dark:text-red-200 dark:border-red-800',
  info: 'bg-blue-50 text-blue-900 border-blue-200 dark:bg-blue-950/50 dark:text-blue-200 dark:border-blue-800',
  neutral: 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600',
};
