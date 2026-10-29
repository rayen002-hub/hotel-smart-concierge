import { getStatusLabel } from './statusPresentation';

const actionLabels: Record<string, string> = {
  CREATE_COMPLAINT: 'Création d’une réclamation',
  ASSIGN_COMPLAINT: 'Affectation d’une réclamation',
  UPDATE_COMPLAINT_STATUS: 'Mise à jour du statut d’une réclamation',
  RESOLVE_COMPLAINT: 'Résolution d’une réclamation',
  CONFIRM_COMPLAINT: 'Confirmation d’une réclamation',
  REOPEN_COMPLAINT: 'Réouverture d’une réclamation',
  TRANSFER_COMPLAINT: 'Transfert d’une réclamation',
  UPDATE_COMPLAINT_CATEGORY: 'Mise à jour de la catégorie d’une réclamation',
  COMPLAINT_INTERVENTION_EXIT: 'Clôture d’une intervention',
  GENERATE_CLIENT_ROOM_LINK: 'Génération du QR code client',
  GENERATE_WORKER_QR: 'Génération du QR code employé',
  REGENERATE_WORKER_QR: 'Renouvellement du QR code employé',
  CREATE_HOUSEKEEPING_TASK: 'Création d’une tâche de ménage',
  UPDATE_HOUSEKEEPING_TASK: 'Mise à jour d’une tâche de ménage',
  START_HOUSEKEEPING_TASK: 'Démarrage d’une tâche de ménage',
  FINISH_HOUSEKEEPING_TASK: 'Fin d’une tâche de ménage',
  CREATE_EMPLOYEE: 'Création d’un employé',
  UPDATE_EMPLOYEE: 'Mise à jour d’un employé',
  UPDATE_HOTEL_INFO: 'Mise à jour des informations de l’hôtel',
  UPDATE_CURRENCY_RATE: 'Mise à jour d’un taux de change',
  CREATE_RESERVATION: 'Création d’une réservation',
  UPDATE_RESERVATION: 'Mise à jour d’une réservation',
  DELETE_RESERVATION: 'Suppression d’une réservation',
  CHECKIN_COMPLETE: 'Validation du check-in',
  CHECKIN_TRAVELER: 'Validation du check-in voyageur',
  SUBMIT_TRAVELER_FORM: 'Envoi d’une fiche voyageur',
  LOGIN: 'Connexion',
  LOGOUT: 'Déconnexion',
  CREATE_DAILY_TASK: 'Création d’une tâche quotidienne',
  START_DAILY_TASK: 'Démarrage d’une tâche quotidienne',
  COMPLETE_DAILY_TASK: 'Fin d’une tâche quotidienne',
  UPSERT_SHIFT: 'Mise à jour du planning',
  CREATE_EVENT: 'Création d’un événement',
  UPDATE_EVENT: 'Mise à jour d’un événement',
  DELETE_EVENT: 'Suppression d’un événement',
  CREATE: 'Création',
  UPDATE: 'Mise à jour',
  DELETE: 'Suppression',
  RESERVATION_CHECKED_OUT: 'Enregistrement du départ',
};

const entityActionLabels: Record<string, Record<string, string>> = {
  Reservation: { CREATE: 'Création d’une réservation', UPDATE: 'Mise à jour d’une réservation', DELETE: 'Suppression d’une réservation' },
  Room: { CREATE: 'Création d’une chambre', UPDATE: 'Mise à jour d’une chambre', DELETE: 'Suppression d’une chambre' },
};

const entityLabels: Record<string, string> = {
  Reservation: 'Réservation',
  GuestForm: 'Fiche voyageur',
  HotelEvent: 'Événement hôtelier',
  Complaint: 'Réclamation',
  WorkerShiftSchedule: 'Planning de travail',
  Room: 'Chambre',
  DailyCleaningTask: 'Tâche de ménage quotidienne',
  HousekeepingTask: 'Tâche de ménage',
  User: 'Utilisateur',
  HotelInfo: 'Information de l’hôtel',
  CurrencyRate: 'Taux de change',
};

const roleLabels: Record<string, string> = {
  ADMIN: 'Administrateur',
  RECEPTIONIST: 'Réception',
  MAINTENANCE_MANAGER: 'Responsable maintenance',
  HOUSEKEEPING_MANAGER: 'Responsable ménage',
  EMPLOYEE: 'Employé',
};

export const getActionLabel = (action: string, entity?: string): string =>
  entityActionLabels[entity ?? '']?.[action] ?? actionLabels[action] ?? 'Action non répertoriée';
export const getEntityLabel = (entity: string): string => entityLabels[entity] ?? 'Élément';
export const getRoleLabel = (role?: string | null): string =>
  role ? roleLabels[role] ?? 'Rôle non renseigné' : 'Non renseigné';

const asText = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;

export function getActorLabel(log: { actor?: { name?: string | null } | null; action: string; metadata?: Record<string, unknown> | null }): string {
  if (log.actor?.name) return log.actor.name;
  const source = asText(log.metadata?.source)?.toLowerCase();
  if (source?.includes('public') || source?.includes('client') || log.action === 'CHECKIN_TRAVELER') return 'Client';
  if (log.action === 'RESERVATION_CHECKED_OUT') return 'Système';
  return 'Origine non identifiée';
}

export function getEntityContext(entity: string, metadata?: Record<string, unknown> | null): string | undefined {
  if (!metadata) return undefined;
  const roomNumber = asText(metadata.roomNumber) ?? asText(metadata.room);
  const reservationNumber = asText(metadata.reservationNumber);
  const subject = asText(metadata.subject);
  const title = asText(metadata.title);
  const name = asText(metadata.name);
  if (entity === 'Room' && roomNumber) return `Chambre ${roomNumber}`;
  if (reservationNumber) return `Réservation ${reservationNumber}`;
  if (entity === 'Complaint' && subject) return `Réclamation — ${subject}`;
  if (entity === 'HotelEvent' && title) return `Événement — ${title}`;
  if (name) return `${getEntityLabel(entity)} — ${name}`;
  return undefined;
}

const hiddenKey = /(password|passwd|secret|token|authorization|credential|hash)/i;
const keyLabels: Record<string, string> = {
  reservationNumber: 'Numéro de réservation', roomNumber: 'Numéro de chambre', travelerIndex: 'Voyageur',
  travelerType: 'Type de voyageur', source: 'Origine', department: 'Service', status: 'Statut',
  category: 'Catégorie', title: 'Titre', subject: 'Sujet', name: 'Nom', email: 'Adresse e-mail',
  changes: 'Modifications', from: 'Valeur précédente', to: 'Nouvelle valeur', assignedTo: 'Attribué à',
  assignedBy: 'Attribué par', result: 'Résultat', note: 'Note', date: 'Date', shift: 'Équipe',
  description: 'Description', clientComment: 'Message du client', reservationId: 'Réservation liée',
  roomId: 'Chambre liée', employeeId: 'Employé lié', newStatus: 'Nouveau statut', previousStatus: 'Statut précédent',
};

export function getSafeMetadata(metadata: Record<string, unknown>): Array<[string, string]> {
  const entries: Array<[string, string]> = [];
  const visit = (value: unknown, prefix = '', depth = 0) => {
    if (depth > 3 || value == null) return;
    if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, `${prefix} ${index + 1}`.trim(), depth + 1));
      return;
    }
    if (typeof value === 'object') {
      Object.entries(value as Record<string, unknown>).forEach(([key, child]) => {
        if (hiddenKey.test(key)) return;
        const label = keyLabels[key] ?? key.replace(/([A-Z])/g, ' $1').replace(/[_-]/g, ' ').trim();
        visit(child, prefix ? `${prefix} · ${label}` : label, depth + 1);
      });
      return;
    }
    const text = String(value);
    const display = prefix.endsWith('Catégorie')
      ? ({ MAINTENANCE: 'Maintenance', HOUSEKEEPING: 'Ménage', RECEPTION: 'Réception', RESTAURANT: 'Restaurant', COMPLAINT: 'Générale', OTHER: 'Autre' }[text] ?? text)
      : prefix.endsWith('Service')
        ? ({ MAINTENANCE: 'Maintenance', HOUSEKEEPING: 'Ménage', RECEPTION: 'Réception', RESTAURANT: 'Restaurant', GENERAL: 'Général' }[text] ?? text)
        : prefix.endsWith('Origine')
          ? ({ public_client: 'Client — interface publique', public_checkin: 'Client — check-in en ligne' }[text] ?? text)
          : prefix.endsWith('Type de voyageur')
            ? ({ ADULT: 'Adulte', CHILD: 'Enfant' }[text] ?? text)
            : prefix.endsWith('Statut')
              ? getStatusLabel(text)
              : prefix.endsWith('Action')
                ? getActionLabel(text)
                : text === 'true' ? 'Oui' : text === 'false' ? 'Non' : text;
    entries.push([prefix || 'Détail', display]);
  };
  visit(metadata);
  return entries;
}
