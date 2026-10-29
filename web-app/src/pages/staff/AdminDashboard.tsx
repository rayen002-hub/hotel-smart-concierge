import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  listRooms,
  listComplaints,
  listAuditLogs,
  updateHotelInfo,
  adminListUsers,
  adminCreateUser,
  adminUpdateUser,
  adminDeactivateUser,
  adminReactivateUser,
} from '../../api/staffApi';
import { getHotelInfo } from '../../api/publicApi';
import type { ApiError } from '../../api/apiClient';
import {
  StatusBadge,
  CategoryBadge,
  LoadingSpinner,
  EmptyState,
  ErrorMessage,
  SuccessMessage,
} from '../../components';
import { TabNav } from '../../components/ui/TabNav';
import { StatCard } from '../../components/ui/StatCard';
import {
  getActionLabel,
  getActorLabel,
  getEntityContext,
  getEntityLabel,
  getRoleLabel,
  getSafeMetadata,
} from '../../utils/auditLogPresentation';
import { getStatusLabel } from '../../utils/statusPresentation';
import { formatHotelDateTime } from '../../utils/hotelDate';

// ─── Types ────────────────────────────────────────────────────────────

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  availability?: {
    status: string;
    label: string;
    eligible: boolean;
    at: string;
  } | null;
  employeeProfile?: {
    department: string;
    isAvailable: boolean;
    lastSeenAt?: string | null;
  } | null;
}

interface Room {
  id: string;
  roomNumber: string;
  type: string;
  floor: number;
  status: string;
  displayStatus?: string;
}

interface Complaint {
  id: string;
  originalMessage: string;
  staffMessage?: string | null;
  category: string;
  status: string;
  createdAt: string;
  room?: { roomNumber: string } | null;
}

interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  actor?: { name: string; role: string; email: string } | null;
}

interface HotelInfo {
  id: string;
  title: string;
  content: string;
  type: string;
  updatedAt: string;
}

type Tab = 'users' | 'rooms' | 'complaints' | 'logs' | 'hotel';

const tabs: { key: Tab; label: string; icon: string }[] = [
  { key: 'users',      label: 'Utilisateurs',      icon: '👷' },
  { key: 'rooms',      label: 'Chambres',           icon: '🚪' },
  { key: 'complaints', label: 'Réclamations',       icon: '📢' },
  { key: 'logs',       label: 'Logs d\'activité',   icon: '📜' },
  { key: 'hotel',      label: 'Infos Hôtel',        icon: '🏨' },
];

const ROLES = ['ADMIN', 'RECEPTIONIST', 'MAINTENANCE_MANAGER', 'HOUSEKEEPING_MANAGER', 'EMPLOYEE'];
const DEPTS = ['RECEPTION', 'MAINTENANCE', 'HOUSEKEEPING', 'RESTAURANT', 'GENERAL'];

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrateur',
  RECEPTIONIST: 'Réceptionniste',
  MAINTENANCE_MANAGER: 'Responsable Maintenance',
  HOUSEKEEPING_MANAGER: 'Responsable Ménage',
  EMPLOYEE: 'Employé',
};

const DEPT_LABELS: Record<string, string> = {
  RECEPTION: 'Réception',
  MAINTENANCE: 'Maintenance',
  HOUSEKEEPING: 'Ménage',
  RESTAURANT: 'Restaurant',
  GENERAL: 'Général',
};

const COMPLAINT_CATEGORY_LABELS: Record<string, string> = {
  MAINTENANCE: 'Maintenance', HOUSEKEEPING: 'Ménage', RECEPTION: 'Réception',
  RESTAURANT: 'Restaurant', COMPLAINT: 'Générale', OTHER: 'Autre',
};

// ─── Helpers ──────────────────────────────────────────────────────────

const formatDateTime = (iso: string) =>
  formatHotelDateTime(iso, { year: 'numeric' });

const isOnline = (lastSeenAt?: string | null) => {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() < 2 * 60 * 1000;
};

// ─── Shared UI primitives ─────────────────────────────────────────────

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="block text-[10px] font-semibold uppercase text-[hsl(var(--muted-foreground))] mb-1">
    {children}
  </span>
);

const inputCls =
  'w-full h-9 px-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-xs focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]';

const selectCls =
  'h-8 px-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-xs focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]';

// ─── User Form Modal ──────────────────────────────────────────────────

interface UserFormModalProps {
  user?: AdminUser | null;
  onClose: () => void;
  onSaved: () => void;
  setGlobalSuccess: (msg: string) => void;
}

const UserFormModal: React.FC<UserFormModalProps> = ({
  user, onClose, onSaved, setGlobalSuccess,
}: UserFormModalProps) => {
  const isEdit = !!user;
  const [form, setForm] = useState({
    name: user?.name ?? '',
    email: user?.email ?? '',
    role: user?.role ?? 'EMPLOYEE',
    department: user?.employeeProfile?.department ?? '',
    isAvailable: user?.employeeProfile?.isAvailable ?? true,
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const needsDept = form.role === 'EMPLOYEE';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!form.name.trim() || !form.email.trim()) {
      setFormError('Nom et email requis.');
      return;
    }
    if (!isEdit && form.password.length < 6) {
      setFormError('Mot de passe requis (min 6 caractères).');
      return;
    }
    if (needsDept && !form.department) {
      setFormError('Le département est requis pour un EMPLOYEE.');
      return;
    }

    setLoading(true);
    try {
      if (isEdit && user) {
        const payload: Record<string, unknown> = {
          name: form.name,
          email: form.email,
          role: form.role,
        };
        if (form.password.length >= 6) payload.password = form.password;
        if (needsDept) {
          payload.department = form.department;
          payload.isAvailable = form.isAvailable;
        }
        await adminUpdateUser(user.id, payload);
        setGlobalSuccess(`Utilisateur ${form.name} mis à jour.`);
      } else {
        const payload: Record<string, unknown> = {
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
        };
        if (needsDept) payload.department = form.department;
        await adminCreateUser(payload as unknown as Parameters<typeof adminCreateUser>[0]);
        setGlobalSuccess(`Utilisateur ${form.name} créé avec succès.`);
      }
      onSaved();
      onClose();
    } catch (err) {
      setFormError((err as ApiError).error || 'Erreur lors de la sauvegarde.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold">
            {isEdit ? `✏️ Modifier — ${user?.name}` : '➕ Créer un utilisateur'}
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-[hsl(var(--accent))] flex items-center justify-center text-[hsl(var(--muted-foreground))] cursor-pointer"
          >✕</button>
        </div>

        <ErrorMessage message={formError} />

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label>Nom complet *</Label>
            <input
              type="text" required value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className={inputCls} placeholder="Prénom Nom"
            />
          </div>
          <div>
            <Label>Email *</Label>
            <input
              type="email" required value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className={inputCls} placeholder="email@example.com"
            />
          </div>
          <div>
            <Label>Mot de passe {isEdit ? '(laisser vide pour ne pas changer)' : '*'}</Label>
            <input
              type="password" value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              className={inputCls} placeholder={isEdit ? 'Nouveau mot de passe...' : 'Min 6 caractères'}
              minLength={isEdit ? 0 : 6}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Rôle *</Label>
              <select
                value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value, department: '' }))}
                className={`${inputCls}`}
              >
                {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
            </div>
            {needsDept && (
              <div>
                <Label>Département *</Label>
                <select
                  value={form.department}
                  onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
                  className={`${inputCls}`}
                >
                  <option value="">-- Choisir --</option>
                  {DEPTS.map(d => <option key={d} value={d}>{DEPT_LABELS[d]}</option>)}
                </select>
              </div>
            )}
          </div>
          {isEdit && needsDept && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox" checked={form.isAvailable}
                onChange={e => setForm(f => ({ ...f, isAvailable: e.target.checked }))}
                className="rounded"
              />
              <span className="text-xs font-medium">Disponible</span>
            </label>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="h-9 px-4 rounded-lg border border-[hsl(var(--border))] text-xs font-semibold hover:bg-[hsl(var(--accent))] cursor-pointer transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={loading}
              className="h-9 px-5 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 cursor-pointer transition-colors disabled:opacity-50">
              {loading ? 'Enregistrement...' : isEdit ? 'Mettre à jour' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Log Details Modal ────────────────────────────────────────────────

const LogDetailsModal: React.FC<{ log: AuditLog; onClose: () => void }> = ({ log, onClose }) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    onClick={e => { if (e.target === e.currentTarget) onClose(); }}
  >
    <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-2xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold">📜 Détails de l’activité</h2>
        <button onClick={onClose}
          className="w-7 h-7 rounded-lg hover:bg-[hsl(var(--accent))] flex items-center justify-center text-[hsl(var(--muted-foreground))] cursor-pointer">
          ✕
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <DetailField label="Date et heure" value={formatDateTime(log.createdAt)} />
        <DetailField label="Action" value={getActionLabel(log.action, log.entity)} />
        <DetailField label="Acteur" value={getActorLabel(log)} />
        <DetailField label="Rôle" value={log.actor?.role ? getRoleLabel(log.actor.role) : ['Client', 'Système'].includes(getActorLabel(log)) ? getActorLabel(log) : 'Non renseigné'} />
        <DetailField label="Élément concerné" value={getEntityContext(log.entity, log.metadata) ?? getEntityLabel(log.entity)} />
        {log.actor?.email && <DetailField label="Adresse e-mail" value={log.actor.email} />}
        {log.entityId && <DetailField label="Identifiant technique" value={log.entityId} mono />}
        {log.metadata && getSafeMetadata(log.metadata).map(([key, value]) => (
          <DetailField key={key} label={key} value={value} />
        ))}
      </div>
    </div>
  </div>
);

const DetailField: React.FC<{ label: string; value: string; mono?: boolean }> = ({ label, value, mono }) => (
  <div className="min-w-0 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/10 p-3">
    <span className="block text-[10px] font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">{label}</span>
    <p className={`mt-1 break-words text-[hsl(var(--foreground))] ${mono ? 'font-mono text-[10px]' : 'font-medium'}`}>{value}</p>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────

export const AdminDashboard: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get('tab') as Tab | null;
  const [activeTab, setActiveTab] = useState<Tab>(
    urlTab && tabs.find(t => t.key === urlTab) ? urlTab : 'users'
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // ── Data states ────────────────────────────────────────────────────
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [userTotal, setUserTotal] = useState(0);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [hotelInfos, setHotelInfos] = useState<HotelInfo[]>([]);

  // ── User filter state ──────────────────────────────────────────────
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [userDeptFilter, setUserDeptFilter] = useState('');
  const [userActiveFilter, setUserActiveFilter] = useState('');
  const userSearchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Room filter state ──────────────────────────────────────────────
  const [roomSearch, setRoomSearch] = useState('');
  const [roomStatusFilter, setRoomStatusFilter] = useState('');

  // ── Complaint filter state ─────────────────────────────────────────
  const [compSearch, setCompSearch] = useState('');
  const [compStatus, setCompStatus] = useState('');
  const [compCategory, setCompCategory] = useState('');

  // ── Log filter state ───────────────────────────────────────────────
  const [logSearch, setLogSearch] = useState('');
  const [logAction, setLogAction] = useState('');
  const [logEntity, setLogEntity] = useState('');
  const [logActor, setLogActor] = useState('');
  const [logRole, setLogRole] = useState('');
  const [logDateFrom, setLogDateFrom] = useState('');
  const [logDateTo, setLogDateTo] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  // ── User modal state ───────────────────────────────────────────────
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [confirmDeactivateId, setConfirmDeactivateId] = useState<string | null>(null);

  // ── Hotel info editing ─────────────────────────────────────────────
  const [editingInfo, setEditingInfo] = useState<HotelInfo | null>(null);
  const [editForm, setEditForm] = useState({ title: '', content: '', type: '' });

  // ── Fetch functions ────────────────────────────────────────────────

  const fetchUsers = useCallback(async (opts?: {
    search?: string; role?: string; department?: string; isActive?: string;
  }) => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, unknown> = { limit: 100 };
      if (opts?.search) params.search = opts.search;
      if (opts?.role) params.role = opts.role;
      if (opts?.department) params.department = opts.department;
      if (opts?.isActive !== undefined && opts.isActive !== '') params.isActive = opts.isActive;
      const res = await adminListUsers(params as Parameters<typeof adminListUsers>[0]);
      setUsers(res.data || []);
      setUserTotal(res.total ?? res.data?.length ?? 0);
    } catch (err) {
      setError((err as ApiError).error || 'Erreur chargement utilisateurs.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRooms = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await listRooms();
      setRooms(res.data || []);
    } catch (err) { setError((err as ApiError).error || 'Erreur chargement chambres.'); }
    finally { setLoading(false); }
  }, []);

  const fetchComplaints = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await listComplaints();
      setComplaints(res.data || []);
    } catch (err) { setError((err as ApiError).error || 'Erreur chargement réclamations.'); }
    finally { setLoading(false); }
  }, []);

  const fetchLogs = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await listAuditLogs();
      setLogs(res.data || []);
    } catch (err) { setError((err as ApiError).error || 'Erreur chargement logs.'); }
    finally { setLoading(false); }
  }, []);

  const fetchHotel = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await getHotelInfo();
      setHotelInfos(res.data || []);
    } catch (err) { setError((err as ApiError).error || 'Erreur chargement infos hôtel.'); }
    finally { setLoading(false); }
  }, []);

  // Sync URL tab param
  useEffect(() => {
    const t = searchParams.get('tab') as Tab | null;
    if (t && tabs.find(tab => tab.key === t) && t !== activeTab) setActiveTab(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
    else if (activeTab === 'rooms') fetchRooms();
    else if (activeTab === 'complaints') fetchComplaints();
    else if (activeTab === 'logs') fetchLogs();
    else if (activeTab === 'hotel') fetchHotel();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setSearchParams({ tab }, { replace: true });
  };

  // Debounced user search
  useEffect(() => {
    if (activeTab !== 'users') return;
    if (userSearchTimeout.current) clearTimeout(userSearchTimeout.current);
    userSearchTimeout.current = setTimeout(() => {
      fetchUsers({
        search: userSearch,
        role: userRoleFilter,
        department: userDeptFilter,
        isActive: userActiveFilter,
      });
    }, 400);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userSearch, userRoleFilter, userDeptFilter, userActiveFilter]);

  const showSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 4000);
  };

  // ── User CRUD actions ──────────────────────────────────────────────

  const handleDeactivate = async (id: string) => {
    setError('');
    try {
      await adminDeactivateUser(id);
      showSuccess('Utilisateur désactivé.');
      setConfirmDeactivateId(null);
      fetchUsers({ search: userSearch, role: userRoleFilter, department: userDeptFilter, isActive: userActiveFilter });
    } catch (err) {
      setError((err as ApiError).error || 'Erreur lors de la désactivation.');
    }
  };

  const handleReactivate = async (id: string) => {
    setError('');
    try {
      await adminReactivateUser(id);
      showSuccess('Utilisateur réactivé.');
      fetchUsers({ search: userSearch, role: userRoleFilter, department: userDeptFilter, isActive: userActiveFilter });
    } catch (err) {
      setError((err as ApiError).error || 'Erreur lors de la réactivation.');
    }
  };

  // ── Hotel info edit ────────────────────────────────────────────────

  const handleEditInfoStart = (info: HotelInfo) => {
    setEditingInfo(info);
    setEditForm({ title: info.title, content: info.content, type: info.type });
  };

  const handleEditInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInfo) return;
    try {
      await updateHotelInfo(editingInfo.id, editForm);
      showSuccess('Informations de l\'hôtel mises à jour.');
      setEditingInfo(null);
      fetchHotel();
    } catch (err) {
      setError((err as ApiError).error || 'Erreur lors de la mise à jour.');
    }
  };

  // ── Filtered data ──────────────────────────────────────────────────

  const filteredRooms = rooms.filter(r => {
    const matchNum = !roomSearch || r.roomNumber.toLowerCase().includes(roomSearch.toLowerCase());
    const matchStatus = !roomStatusFilter || (r.displayStatus ?? r.status) === roomStatusFilter;
    return matchNum && matchStatus;
  });

  const filteredComplaints = complaints.filter(c => {
    const matchSearch = !compSearch || (
      c.room?.roomNumber?.includes(compSearch) ||
      c.originalMessage.toLowerCase().includes(compSearch.toLowerCase()) ||
      (c.staffMessage ?? '').toLowerCase().includes(compSearch.toLowerCase())
    );
    const matchStatus = !compStatus || c.status === compStatus;
    const matchCat = !compCategory || c.category === compCategory;
    return matchSearch && matchStatus && matchCat;
  });

  const filteredLogs = logs.filter(l => {
    const actorLabel = getActorLabel(l);
    const actionName = getActionLabel(l.action, l.entity);
    const entityName = getEntityLabel(l.entity);
    const matchSearch = !logSearch || (
      actorLabel.toLowerCase().includes(logSearch.toLowerCase()) ||
      l.action.toLowerCase().includes(logSearch.toLowerCase()) ||
      actionName.toLowerCase().includes(logSearch.toLowerCase()) ||
      l.entity.toLowerCase().includes(logSearch.toLowerCase()) ||
      entityName.toLowerCase().includes(logSearch.toLowerCase())
    );
    const matchAction = !logAction || `${l.action}::${l.entity}` === logAction;
    const matchEntity = !logEntity || l.entity === logEntity;
    const matchActor = !logActor || actorLabel === logActor;
    const matchRole = !logRole || l.actor?.role === logRole;
    const logDate = new Date(l.createdAt);
    const matchFrom = !logDateFrom || logDate >= new Date(logDateFrom);
    const matchTo = !logDateTo || logDate <= new Date(logDateTo + 'T23:59:59');
    return matchSearch && matchAction && matchEntity && matchActor && matchRole && matchFrom && matchTo;
  });

  const logActions = [...new Map(logs.map(l => [`${l.action}::${l.entity}`, { action: l.action, entity: l.entity }])).values()]
    .sort((a, b) => getActionLabel(a.action, a.entity).localeCompare(getActionLabel(b.action, b.entity), 'fr'));
  const logEntities = [...new Set(logs.map(l => l.entity))].sort();
  const logActors = [...new Set(logs.map(l => getActorLabel(l)))].sort((a, b) => a.localeCompare(b, 'fr'));
  const logRoles = [...new Set(logs.flatMap(l => l.actor?.role ? [l.actor.role] : []))].sort();

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Utilisateurs total" value={userTotal || users.length || '—'} icon="👷" accent="indigo" />
        <StatCard label="Chambres" value={rooms.length || '—'} icon="🚪" accent="gold" />
        <StatCard label="Réclamations" value={complaints.length || '—'} icon="📢" accent="red" />
        <StatCard label="Logs enregistrés" value={logs.length || '—'} icon="📜" accent="emerald" />
      </div>

      {/* Banners */}
      <ErrorMessage message={error} onRetry={() => {
        if (activeTab === 'users') fetchUsers();
        else if (activeTab === 'rooms') fetchRooms();
        else if (activeTab === 'complaints') fetchComplaints();
        else if (activeTab === 'logs') fetchLogs();
        else fetchHotel();
      }} />
      <SuccessMessage message={success} />

      {/* Tab Navigation */}
      <TabNav tabs={tabs} active={activeTab} onChange={handleTabChange} />

      {/* Tab Content */}
      <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-sm">
        {loading ? <LoadingSpinner message="Chargement des données..." /> : (
          <>

            {/* ══════════════ TAB: USERS ══════════════ */}
            {activeTab === 'users' && (
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <h2 className="text-sm font-bold">👷 Gestion des Utilisateurs</h2>
                  <button
                    onClick={() => { setEditingUser(null); setShowUserModal(true); }}
                    className="h-8 px-4 rounded-lg bg-gradient-to-r from-indigo-500 to-indigo-600 text-white text-xs font-bold cursor-pointer hover:opacity-90 transition-opacity"
                  >
                    ➕ Créer utilisateur
                  </button>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-2 items-center">
                  <input
                    type="text" value={userSearch}
                    onChange={e => setUserSearch(e.target.value)}
                    placeholder="🔍 Nom ou email..."
                    className={`${selectCls} flex-1 min-w-[160px]`}
                  />
                  <select value={userRoleFilter} onChange={e => setUserRoleFilter(e.target.value)} className={selectCls}>
                    <option value="">Tous rôles</option>
                    {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                  </select>
                  <select value={userDeptFilter} onChange={e => setUserDeptFilter(e.target.value)} className={selectCls}>
                    <option value="">Tous depts</option>
                    {DEPTS.map(d => <option key={d} value={d}>{DEPT_LABELS[d]}</option>)}
                  </select>
                  <select value={userActiveFilter} onChange={e => setUserActiveFilter(e.target.value)} className={selectCls}>
                    <option value="">Tous statuts</option>
                    <option value="true">Actifs</option>
                    <option value="false">Désactivés</option>
                  </select>
                  <button onClick={() => fetchUsers({ search: userSearch, role: userRoleFilter, department: userDeptFilter, isActive: userActiveFilter })}
                    className="h-8 px-3 rounded-lg border border-[hsl(var(--border))] text-xs font-semibold hover:bg-[hsl(var(--accent))] cursor-pointer">
                    🔄
                  </button>
                  <span className="text-[10px] text-[hsl(var(--muted-foreground))]">{users.length} résultat(s)</span>
                </div>

                {users.length === 0 ? (
                  <EmptyState message="Aucun utilisateur" icon="👷" description="Aucun compte trouvé pour ces filtres." />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="border-b-2 border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30 text-[hsl(var(--muted-foreground))]">
                          <th className="py-2.5 px-2 font-semibold">Nom</th>
                          <th className="py-2.5 px-2 font-semibold">Email</th>
                          <th className="py-2.5 px-2 font-semibold">Rôle</th>
                          <th className="py-2.5 px-2 font-semibold">Département</th>
                          <th className="py-2.5 px-2 font-semibold">Statut</th>
                          <th className="py-2.5 px-2 font-semibold">Créé le</th>
                          <th className="py-2.5 px-2 font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[hsl(var(--border))]">
                        {users.map(u => {
                          const online = isOnline(u.employeeProfile?.lastSeenAt);
                          const isActive = u.isActive !== false;
                          return (
                            <tr key={u.id} className={`hover:bg-[hsl(var(--muted))]/10 ${!isActive ? 'opacity-50' : ''}`}>
                              <td className="py-2.5 px-2 font-medium">
                                <div className="flex items-center gap-2">
                                  <span className={`w-2 h-2 rounded-full shrink-0 ${online ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300 dark:bg-gray-600'}`} />
                                  <span>{u.name}</span>
                                  {!isActive && <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-900 border border-red-200 dark:bg-red-950/50 dark:text-red-200 dark:border-red-800 text-[10px] font-semibold">Inactif</span>}
                                </div>
                              </td>
                              <td className="py-2.5 px-2 text-[hsl(var(--muted-foreground))]">{u.email}</td>
                              <td className="py-2.5 px-2">
                                <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-300 text-[10px] font-bold">
                                  {ROLE_LABELS[u.role] ?? u.role}
                                </span>
                              </td>
                              <td className="py-2.5 px-2">
                                {u.employeeProfile?.department
                                  ? DEPT_LABELS[u.employeeProfile.department] ?? u.employeeProfile.department
                                  : <span className="text-[hsl(var(--muted-foreground))]">—</span>}
                              </td>
                              <td className="py-2.5 px-2">
                                {u.role === 'EMPLOYEE' && u.employeeProfile ? (
                                  <span title={u.availability?.label || 'Aucun planning valide'} className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold ${u.availability?.eligible ? 'bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-200 dark:border-emerald-800' : 'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/50 dark:text-amber-200 dark:border-amber-800'}`}>
                                    {u.availability?.label || 'Aucun planning valide'}
                                  </span>
                                ) : <span className="text-[hsl(var(--muted-foreground))]">—</span>}
                              </td>
                              <td className="py-2.5 px-2 text-[hsl(var(--muted-foreground))] whitespace-nowrap">
                                {formatDateTime(u.createdAt)}
                              </td>
                              <td className="py-2.5 px-2">
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => { setEditingUser(u); setShowUserModal(true); }}
                                    className="h-7 px-2.5 rounded-lg border border-[hsl(var(--border))] text-[10px] font-semibold hover:bg-[hsl(var(--accent))] cursor-pointer transition-colors"
                                  >
                                    ✏️ Modifier
                                  </button>
                                  {isActive ? (
                                    confirmDeactivateId === u.id ? (
                                      <div className="flex items-center gap-1">
                                        <span className="text-[9px] text-red-600 font-semibold">Confirmer ?</span>
                                        <button onClick={() => handleDeactivate(u.id)} className="h-6 px-2 rounded bg-red-600 text-white text-[9px] font-bold cursor-pointer">Oui</button>
                                        <button onClick={() => setConfirmDeactivateId(null)} className="h-6 px-2 rounded border text-[9px] cursor-pointer">Non</button>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => setConfirmDeactivateId(u.id)}
                                        className="h-7 px-2.5 rounded-lg border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 text-[10px] font-semibold hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer transition-colors"
                                      >
                                        🚫 Désactiver
                                      </button>
                                    )
                                  ) : (
                                    <button
                                      onClick={() => handleReactivate(u.id)}
                                      className="h-7 px-2.5 rounded-lg border border-emerald-200 dark:border-emerald-900/40 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold hover:bg-emerald-50 dark:hover:bg-emerald-950/20 cursor-pointer transition-colors"
                                    >
                                      ✅ Réactiver
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ══════════════ TAB: ROOMS ══════════════ */}
            {activeTab === 'rooms' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <h2 className="text-sm font-bold">🚪 Supervision des Chambres</h2>
                  <button onClick={fetchRooms} className="h-8 px-3 rounded-lg border border-[hsl(var(--border))] text-xs font-semibold hover:bg-[hsl(var(--accent))] cursor-pointer">🔄 Rafraîchir</button>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-2 items-center">
                  <input type="text" value={roomSearch} onChange={e => setRoomSearch(e.target.value)}
                    placeholder="🔍 N° chambre..." className={`${selectCls} flex-1 min-w-[140px]`} />
                  <select value={roomStatusFilter} onChange={e => setRoomStatusFilter(e.target.value)} className={selectCls}>
                    <option value="">Tous statuts</option>
                    <option value="AVAILABLE">Disponible</option>
                    <option value="OCCUPIED">Occupée</option>
                    <option value="CLEANING">En nettoyage</option>
                    <option value="MAINTENANCE">En maintenance</option>
                  </select>
                  <span className="text-[10px] text-[hsl(var(--muted-foreground))]">{filteredRooms.length}/{rooms.length}</span>
                </div>

                {filteredRooms.length === 0 ? (
                  <EmptyState message="Aucune chambre" icon="🚪" description="Changez les filtres ou vérifiez les données." />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]">
                          <th className="py-2.5 px-2 font-semibold">Numéro</th>
                          <th className="py-2.5 px-2 font-semibold">Type</th>
                          <th className="py-2.5 px-2 font-semibold">Étage</th>
                          <th className="py-2.5 px-2 font-semibold">Statut</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[hsl(var(--border))]">
                        {filteredRooms.map(r => (
                          <tr key={r.id} className="hover:bg-[hsl(var(--muted))]/10">
                            <td className="py-2.5 px-2 font-bold">Chambre {r.roomNumber}</td>
                            <td className="py-2.5 px-2">{r.type}</td>
                            <td className="py-2.5 px-2">Étage {r.floor}</td>
                            <td className="py-2.5 px-2"><StatusBadge status={r.displayStatus ?? r.status} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ══════════════ TAB: COMPLAINTS ══════════════ */}
            {activeTab === 'complaints' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <h2 className="text-sm font-bold">📢 Suivi Global des Réclamations</h2>
                  <button onClick={fetchComplaints} className="h-8 px-3 rounded-lg border border-[hsl(var(--border))] text-xs font-semibold hover:bg-[hsl(var(--accent))] cursor-pointer">🔄 Rafraîchir</button>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-2 items-center">
                  <input type="text" value={compSearch} onChange={e => setCompSearch(e.target.value)}
                    placeholder="🔍 Message ou chambre..." className={`${selectCls} flex-1 min-w-[160px]`} />
                  <select value={compStatus} onChange={e => setCompStatus(e.target.value)} className={selectCls}>
                    <option value="">Tous statuts</option>
                    {['PENDING','ASSIGNED','IN_PROGRESS','RESOLVED','NEEDS_REVIEW'].map(s => <option key={s} value={s}>{getStatusLabel(s, 'complaint')}</option>)}
                  </select>
                  <select value={compCategory} onChange={e => setCompCategory(e.target.value)} className={selectCls}>
                    <option value="">Toutes catégories</option>
                    {['MAINTENANCE','HOUSEKEEPING','RECEPTION','RESTAURANT','COMPLAINT','OTHER'].map(c => <option key={c} value={c}>{COMPLAINT_CATEGORY_LABELS[c]}</option>)}
                  </select>
                  <span className="text-[10px] text-[hsl(var(--muted-foreground))]">{filteredComplaints.length}/{complaints.length}</span>
                </div>

                {filteredComplaints.length === 0 ? (
                  <EmptyState message="Aucune réclamation" icon="📢" description="Aucune réclamation pour ces filtres." />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]">
                          <th className="py-2.5 px-2 font-semibold">Date</th>
                          <th className="py-2.5 px-2 font-semibold">Chambre</th>
                          <th className="py-2.5 px-2 font-semibold">Catégorie</th>
                          <th className="py-2.5 px-2 font-semibold">Message</th>
                          <th className="py-2.5 px-2 font-semibold">Statut</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[hsl(var(--border))]">
                        {filteredComplaints.map(c => (
                          <tr key={c.id} className="hover:bg-[hsl(var(--muted))]/10">
                            <td className="py-2.5 px-2 whitespace-nowrap text-[hsl(var(--muted-foreground))]">{formatDateTime(c.createdAt)}</td>
                            <td className="py-2.5 px-2 font-semibold">Ch. {c.room?.roomNumber || '—'}</td>
                            <td className="py-2.5 px-2"><CategoryBadge category={c.category} /></td>
                            <td className="py-2.5 px-2 max-w-[220px] truncate" title={c.staffMessage || c.originalMessage}>
                              {c.staffMessage || c.originalMessage}
                            </td>
                            <td className="py-2.5 px-2"><StatusBadge status={c.status} context="complaint" /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ══════════════ TAB: LOGS ══════════════ */}
            {activeTab === 'logs' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h2 className="text-sm font-bold">📜 Journal d’activité</h2>
                    <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{filteredLogs.length} résultat(s) affiché(s) sur {logs.length}</p>
                  </div>
                  <button onClick={fetchLogs} className="h-9 px-3 rounded-lg border border-[hsl(var(--border))] text-xs font-semibold hover:bg-[hsl(var(--accent))] cursor-pointer" aria-label="Actualiser le journal">🔄 Actualiser</button>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-2 items-center rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3">
                  <input type="text" value={logSearch} onChange={e => setLogSearch(e.target.value)}
                    aria-label="Rechercher dans le journal" placeholder="Rechercher un acteur, une action ou un élément…" className={`${selectCls} flex-1 min-w-[220px]`} />
                  <select aria-label="Filtrer par acteur" value={logActor} onChange={e => setLogActor(e.target.value)} className={selectCls}>
                    <option value="">Tous les acteurs</option>
                    {logActors.map(actor => <option key={actor} value={actor}>{actor}</option>)}
                  </select>
                  <select aria-label="Filtrer par rôle" value={logRole} onChange={e => setLogRole(e.target.value)} className={selectCls}>
                    <option value="">Tous les rôles</option>
                    {logRoles.map(role => <option key={role} value={role}>{getRoleLabel(role)}</option>)}
                  </select>
                  <select value={logAction} onChange={e => setLogAction(e.target.value)} className={selectCls}>
                    <option value="">Toutes les actions</option>
                    {logActions.map(({ action, entity }) => (
                      <option key={`${action}::${entity}`} value={`${action}::${entity}`}>{getActionLabel(action, entity)}</option>
                    ))}
                  </select>
                  <select value={logEntity} onChange={e => setLogEntity(e.target.value)} className={selectCls}>
                    <option value="">Tous les éléments</option>
                    {logEntities.map(entity => <option key={entity} value={entity}>{getEntityLabel(entity)}</option>)}
                  </select>
                  <label className="flex items-center gap-2 text-[10px] font-medium text-[hsl(var(--muted-foreground))]">Du
                    <input type="date" value={logDateFrom} onChange={e => setLogDateFrom(e.target.value)} className={selectCls} aria-label="Date de début" />
                  </label>
                  <label className="flex items-center gap-2 text-[10px] font-medium text-[hsl(var(--muted-foreground))]">Au
                    <input type="date" value={logDateTo} onChange={e => setLogDateTo(e.target.value)} className={selectCls} aria-label="Date de fin" />
                  </label>
                  {(logSearch || logAction || logEntity || logActor || logRole || logDateFrom || logDateTo) && (
                    <button onClick={() => { setLogSearch(''); setLogAction(''); setLogEntity(''); setLogActor(''); setLogRole(''); setLogDateFrom(''); setLogDateTo(''); }}
                      className="h-8 px-3 rounded-lg border border-red-200 bg-red-50 text-[10px] font-semibold text-red-900 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/40 dark:text-red-100 dark:hover:bg-red-950/70 cursor-pointer">Effacer les filtres</button>
                  )}
                </div>

                {filteredLogs.length === 0 ? (
                  <EmptyState message="Aucun résultat trouvé" icon="📜" description="Aucune activité ne correspond aux filtres sélectionnés." />
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
                    <table className="w-full min-w-[900px] table-fixed text-xs text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]/20 text-[hsl(var(--muted-foreground))]">
                          <th className="w-[17%] py-3 px-3 font-semibold whitespace-nowrap">Date et heure</th>
                          <th className="w-[16%] py-3 px-3 font-semibold">Acteur</th>
                          <th className="w-[14%] py-3 px-3 font-semibold">Rôle</th>
                          <th className="w-[23%] py-3 px-3 font-semibold">Action</th>
                          <th className="w-[19%] py-3 px-3 font-semibold">Élément concerné</th>
                          <th className="w-[11%] py-3 px-3 font-semibold">Détails</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[hsl(var(--border))]/70">
                        {filteredLogs.map(l => (
                          <tr key={l.id} className="align-middle transition-colors hover:bg-[hsl(var(--muted))]/20">
                            <td className="py-3 px-3 whitespace-nowrap text-[hsl(var(--muted-foreground))] text-[11px]">
                              {formatDateTime(l.createdAt)}
                            </td>
                            <td className="py-3 px-3">
                              <span className="block truncate font-semibold" title={getActorLabel(l)}>{getActorLabel(l)}</span>
                            </td>
                            <td className="py-3 px-3 text-[11px] text-[hsl(var(--muted-foreground))]">
                              {l.actor?.role ? getRoleLabel(l.actor.role) : getActorLabel(l) === 'Client' || getActorLabel(l) === 'Système' ? getActorLabel(l) : 'Non renseigné'}
                            </td>
                            <td className="py-3 px-3">
                              <span className="block truncate font-semibold text-[11px]" title={getActionLabel(l.action, l.entity)}>{getActionLabel(l.action, l.entity)}</span>
                            </td>
                            <td className="py-3 px-3 text-[hsl(var(--muted-foreground))]">
                              <span className="block truncate font-medium text-[hsl(var(--foreground))]" title={getEntityContext(l.entity, l.metadata) ?? getEntityLabel(l.entity)}>{getEntityContext(l.entity, l.metadata) ?? getEntityLabel(l.entity)}</span>
                              {!getEntityContext(l.entity, l.metadata) && l.entityId && <span className="block text-[10px]">Réf. …{l.entityId.slice(-6)}</span>}
                            </td>
                            <td className="py-3 px-3">
                              <button
                                onClick={() => setSelectedLog(l)}
                                className="min-h-8 px-2.5 rounded-lg border border-[hsl(var(--border))] text-[10px] font-semibold hover:bg-[hsl(var(--accent))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] cursor-pointer transition-colors whitespace-nowrap"
                              >
                                Voir les détails
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ══════════════ TAB: HOTEL INFO ══════════════ */}
            {activeTab === 'hotel' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold">🏨 Configuration des Informations de l'Hôtel</h2>
                </div>

                {editingInfo ? (
                  <form onSubmit={handleEditInfoSubmit} className="rounded-xl border border-[hsl(var(--border))] p-5 space-y-4 max-w-lg">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Modifier : {editingInfo.title}</h3>
                    <div className="space-y-3">
                      <div>
                        <Label>Titre</Label>
                        <input type="text" value={editForm.title}
                          onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                          className={inputCls} required />
                      </div>
                      <div>
                        <Label>Type</Label>
                        <input type="text" value={editForm.type}
                          onChange={e => setEditForm({ ...editForm, type: e.target.value })}
                          className={inputCls} required />
                      </div>
                      <div>
                        <Label>Contenu (Markdown ou Texte)</Label>
                        <textarea rows={5} value={editForm.content}
                          onChange={e => setEditForm({ ...editForm, content: e.target.value })}
                          className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-3 text-xs focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                          required />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" className="h-9 px-5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 cursor-pointer">Enregistrer</button>
                      <button type="button" onClick={() => setEditingInfo(null)} className="h-9 px-4 rounded-lg border text-xs font-medium hover:bg-[hsl(var(--accent))] cursor-pointer">Annuler</button>
                    </div>
                  </form>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {hotelInfos.map(info => (
                      <div key={info.id} className="rounded-xl border bg-[hsl(var(--muted))]/5 p-4 flex flex-col justify-between space-y-3">
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-300">{info.type}</span>
                            <span className="text-[9px] text-[hsl(var(--muted-foreground))]">Modifié: {formatDateTime(info.updatedAt)}</span>
                          </div>
                          <h3 className="text-xs font-bold mt-2">{info.title}</h3>
                          <p className="text-[11px] text-[hsl(var(--muted-foreground))] leading-relaxed line-clamp-3 mt-1 whitespace-pre-wrap">{info.content}</p>
                        </div>
                        <button onClick={() => handleEditInfoStart(info)} className="h-8 w-full rounded-lg border text-xs font-semibold hover:bg-[hsl(var(--accent))] transition-colors cursor-pointer">
                          ✏️ Modifier
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </>
        )}
      </div>

      {/* ── Modals ─────────────────────────────────────────── */}
      {showUserModal && (
        <UserFormModal
          user={editingUser}
          onClose={() => { setShowUserModal(false); setEditingUser(null); }}
          onSaved={() => fetchUsers({ search: userSearch, role: userRoleFilter, department: userDeptFilter, isActive: userActiveFilter })}
          setGlobalSuccess={showSuccess}
        />
      )}


      {selectedLog && (
        <LogDetailsModal log={selectedLog} onClose={() => setSelectedLog(null)} />
      )}
    </div>
  );
};
