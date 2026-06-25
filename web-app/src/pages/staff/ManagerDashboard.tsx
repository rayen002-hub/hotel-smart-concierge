import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  listComplaints,
  getComplaint,
  updateComplaintCategory,
  assignComplaint,
  getComplaintMessages,
  sendComplaintMessage,
  listEmployees,
  createEmployee,
  listOccupiedRooms,
  createHousekeepingTask,
  listHousekeepingTasks,
} from '../../api/staffApi';
import { getStoredUser } from '../../components/AuthGuard';
import type { ApiError } from '../../api/apiClient';
import {
  StatusBadge,
  CategoryBadge,
  LoadingSpinner,
  EmptyState,
  ErrorMessage,
} from '../../components';
import { TabNav } from '../../components/ui/TabNav';
import { StatCard } from '../../components/ui/StatCard';

// ─── Types ───────────────────────────────────────────────────────────

interface InterventionLog {
  id: string;
  entryTime?: string | null;
  exitTime?: string | null;
  result?: string | null;
  employeeComment?: string | null;
  employee?: { id: string; name: string } | null;
  createdAt: string;
}

interface Complaint {
  id: string;
  originalMessage: string;
  normalizedMessageEn?: string | null;
  staffMessage?: string | null;
  category: string;
  status: string;
  createdAt: string;
  resolvedAt?: string | null;
  room?: { id: string; roomNumber: string; type?: string; floor?: number } | null;
  reservation?: { id: string; reservationNumber: string; guestFirstName: string; guestLastName: string } | null;
  assignedTo?: { id: string; name: string; role?: string } | null;
  assignedBy?: { id: string; name: string } | null;
  interventionLogs?: InterventionLog[];
}

interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  employeeProfile?: {
    department: string;
    isAvailable: boolean;
    lastSeenAt?: string | null;
    lastLoginAt?: string | null;
    lastLogoutAt?: string | null;
  } | null;
}

interface Message {
  id: string;
  message: string;
  createdAt: string;
  sender?: { id: string; name: string } | null;
  receiver?: { id: string; name: string } | null;
}

// ─── Constants ───────────────────────────────────────────────────────

type Tab = 'complaints' | 'employees' | 'housekeeping';

const baseTabs: { key: Tab; label: string; icon: string }[] = [
  { key: 'complaints', label: 'Réclamations', icon: '📢' },
  { key: 'employees', label: 'Employés', icon: '👷' },
];

const housekeepingTab = { key: 'housekeeping' as Tab, label: 'Ménage', icon: '🏠' };

const resultLabels: Record<string, string> = {
  RESOLVED: '✅ Résolu',
  PARTIALLY_RESOLVED: '⚠️ Partiellement résolu',
  UNRESOLVED: '❌ Non résolu',
  NEEDS_FOLLOWUP: '🔄 Suivi nécessaire',
};

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

const isOnline = (lastSeenAt?: string | null) => {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() < 2 * 60 * 1000;
};



// ─── Main Component ──────────────────────────────────────────────────

export const ManagerDashboard: React.FC = () => {
  const user = getStoredUser();
  const department = user?.role === 'MAINTENANCE_MANAGER' ? 'MAINTENANCE' : 'HOUSEKEEPING';
  const departmentLabel = department === 'MAINTENANCE' ? 'Maintenance' : 'Ménage';

  const [searchParams, setSearchParams] = useSearchParams();

  // Read initial tab from URL ?tab= param
  const urlTab = searchParams.get('tab') as Tab | null;
  const [activeTab, setActiveTab] = useState<Tab>(
    urlTab && ['complaints', 'employees', 'housekeeping'].includes(urlTab) ? urlTab : 'complaints'
  );
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Detail drawer
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Messages
  const [messages, setMessages] = useState<Message[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [showMessages, setShowMessages] = useState(false);

  // Assign
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [assignEmployeeId, setAssignEmployeeId] = useState('');

  // Create employee form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', email: '', password: '' });
  const [createLoading, setCreateLoading] = useState(false);

  // Transfer
  const otherDepartment = department === 'MAINTENANCE' ? 'HOUSEKEEPING' : 'MAINTENANCE';
  const otherDepartmentLabel = department === 'MAINTENANCE' ? 'Ménage' : 'Maintenance';

  // Build tabs dynamically — housekeeping tab only for HOUSEKEEPING_MANAGER
  const tabs = department === 'HOUSEKEEPING' ? [...baseTabs, housekeepingTab] : baseTabs;

  // ── Housekeeping state ──────────────────────────────────────────────
  interface OccupiedRoom {
    id: string;
    roomNumber: string;
    floor: number;
    type: string;
    status: string;
    activeReservation?: { id: string; reservationNumber: string; guestFirstName: string; guestLastName: string; checkInDate: string; checkOutDate: string } | null;
    activeTask?: { id: string; status: string; note?: string | null; entryTime?: string | null; exitTime?: string | null; result?: string | null; workerComment?: string | null; createdAt: string; assignedTo?: { id: string; name: string } | null; assignedBy?: { id: string; name: string } | null } | null;
  }

  interface HkTask {
    id: string;
    status: string;
    note?: string | null;
    entryTime?: string | null;
    exitTime?: string | null;
    result?: string | null;
    workerComment?: string | null;
    createdAt: string;
    room?: { id: string; roomNumber: string; floor: number; type?: string } | null;
    assignedTo?: { id: string; name: string } | null;
    assignedBy?: { id: string; name: string } | null;
    reservation?: { id: string; reservationNumber: string; guestFirstName: string; guestLastName: string } | null;
  }

  const [occupiedRooms, setOccupiedRooms] = useState<OccupiedRoom[]>([]);
  const [hkTasks, setHkTasks] = useState<HkTask[]>([]);
  const [hkFilter, setHkFilter] = useState<string>('all');
  const [hkLoading, setHkLoading] = useState(false);
  const [assigningRoomId, setAssigningRoomId] = useState<string | null>(null);
  const [hkAssignEmployeeId, setHkAssignEmployeeId] = useState('');
  const [hkAssignNote, setHkAssignNote] = useState('');
  const [hkAssignLoading, setHkAssignLoading] = useState(false);

  // ── Data fetching ──────────────────────────────────────────────────

  const fetchComplaints = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await listComplaints();
      const filtered = (res.data || []).filter((c: Complaint) => c.category === department);
      setComplaints(filtered);
    } catch (err) {
      setError((err as ApiError).error || 'Erreur de chargement.');
    } finally {
      setLoading(false);
    }
  }, [department]);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await listEmployees();
      setEmployees(res.data || []);
    } catch (err) {
      setError((err as ApiError).error || 'Erreur de chargement.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Sync local tab when sidebar changes URL param
    const t = searchParams.get('tab') as Tab | null;
    if (t && tabs.find(tab => tab.key === t) && t !== activeTab) {
      setActiveTab(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    if (activeTab === 'complaints') {
      fetchComplaints();
      fetchEmployees(); // needed for assign dropdown
    }
    if (activeTab === 'employees') fetchEmployees();
  }, [activeTab, fetchComplaints, fetchEmployees]);

  // Sync URL when tab changes via TabNav click
  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setSearchParams({ tab }, { replace: true });
  };

  // ── Complaint detail ───────────────────────────────────────────────

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    setShowMessages(false);
    setMessages([]);
    try {
      const res = await getComplaint(id);
      setSelectedComplaint(res.data);
    } catch (err) {
      setError((err as ApiError).error || 'Erreur lors du chargement du détail.');
    } finally {
      setDetailLoading(false);
    }
  };

  // ── Messages ───────────────────────────────────────────────────────

  const loadMessages = async (complaintId: string) => {
    setMsgLoading(true);
    try {
      const res = await getComplaintMessages(complaintId);
      setMessages(res.data || []);
      setShowMessages(true);
    } catch (err) {
      setError((err as ApiError).error || 'Erreur lors du chargement des messages.');
    } finally {
      setMsgLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedComplaint || !newMessage.trim()) return;
    setMsgLoading(true);
    try {
      await sendComplaintMessage(selectedComplaint.id, newMessage.trim());
      setNewMessage('');
      await loadMessages(selectedComplaint.id);
    } catch (err) {
      setError((err as ApiError).error || 'Erreur lors de l\'envoi du message.');
    } finally {
      setMsgLoading(false);
    }
  };

  // ── Category correction ────────────────────────────────────────────

  const handleCategoryCorrection = async (complaintId: string) => {
    setError('');
    try {
      await updateComplaintCategory(complaintId, department);
      setSuccess('Catégorie corrigée.');
      await fetchComplaints();
      if (selectedComplaint?.id === complaintId) await openDetail(complaintId);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError((err as ApiError).error || 'Erreur lors de la correction.');
    }
  };



  /** Transfer a complaint to the OTHER department */
  const handleTransferOut = async (complaintId: string) => {
    setError('');
    try {
      await updateComplaintCategory(complaintId, otherDepartment);
      setSuccess(`Réclamation transférée vers ${otherDepartmentLabel}.`);
      await fetchComplaints();
      if (selectedComplaint?.id === complaintId) setSelectedComplaint(null);
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError((err as ApiError).error || 'Erreur lors du transfert.');
    }
  };

  // ── Assign ─────────────────────────────────────────────────────────

  const handleAssign = async (complaintId: string) => {
    if (!assignEmployeeId) return;
    setError('');
    try {
      await assignComplaint(complaintId, assignEmployeeId);
      setSuccess('Réclamation assignée.');
      setAssigningId(null);
      setAssignEmployeeId('');
      await fetchComplaints();
      if (selectedComplaint?.id === complaintId) await openDetail(complaintId);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError((err as ApiError).error || 'Erreur lors de l\'assignation.');
    }
  };

  // ── Create employee ────────────────────────────────────────────────

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name || !createForm.email || !createForm.password) {
      setError('Veuillez remplir tous les champs.');
      return;
    }
    setCreateLoading(true);
    setError('');
    try {
      await createEmployee({ ...createForm, department });
      setSuccess(`Employé ${createForm.name} créé avec succès.`);
      setCreateForm({ name: '', email: '', password: '' });
      setShowCreateForm(false);
      await fetchEmployees();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError((err as ApiError).error || 'Erreur lors de la création.');
    } finally {
      setCreateLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  //  TAB: Réclamations
  // ═══════════════════════════════════════════════════════════════════

  const renderComplaints = () => {
    if (loading) return <LoadingSpinner message="Chargement des réclamations..." />;

    return (
      <div className="space-y-4">


        {complaints.length === 0 ? (
          <EmptyState
            message="Aucune réclamation active dans votre service"
            icon="📢"
            description="Toutes les réclamations de votre service ont été résolues ou traitées."
          />
        ) : (
          <div className="space-y-3">
            {complaints.map((c) => (
              <div
                key={c.id}
                className={`rounded-xl border bg-[hsl(var(--card))] p-4 shadow-sm space-y-3 cursor-pointer hover:shadow-md transition-shadow ${selectedComplaint?.id === c.id ? 'ring-2 ring-indigo-500' : ''}`}
                onClick={() => openDetail(c.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <StatusBadge status={c.status} />
                      <CategoryBadge category={c.category} />
                      <span className="text-[10px] text-[hsl(var(--muted-foreground))]">·</span>
                      <span className="text-[10px] text-[hsl(var(--muted-foreground))]">{formatDateTime(c.createdAt)}</span>
                    </div>
                    <p className="text-xs mt-1 truncate font-medium" title={c.staffMessage || c.originalMessage}>
                      {c.staffMessage || c.originalMessage}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold">Ch. {c.room?.roomNumber || '—'}</p>
                    <p className="text-[10px] text-[hsl(var(--muted-foreground))]">
                      {c.assignedTo ? `→ ${c.assignedTo.name}` : 'Non assignée'}
                    </p>
                  </div>
                </div>

                {/* Quick actions row */}
                <div className="flex items-center gap-2 pt-1 border-t border-[hsl(var(--border))]" onClick={(e) => e.stopPropagation()}>
                  {/* Assign button */}
                  {(c.status === 'PENDING' || c.status === 'REOPENED' || c.status === 'NEEDS_REVIEW') && (
                    assigningId === c.id ? (
                      <div className="flex items-center gap-1 flex-1">
                        <select
                          value={assignEmployeeId}
                          onChange={(e) => setAssignEmployeeId(e.target.value)}
                          className="flex-1 h-7 rounded-md border bg-[hsl(var(--card))] text-[10px] px-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="">Choisir…</option>
                          {employees.map((emp) => (
                            <option key={emp.id} value={emp.id}>
                              {emp.name} {isOnline(emp.employeeProfile?.lastSeenAt) ? '🟢' : '⚪'}
                            </option>
                          ))}
                        </select>
                        <button onClick={() => handleAssign(c.id)} className="h-7 px-2 rounded-md bg-indigo-600 text-white text-[10px] font-semibold hover:bg-indigo-700 transition-colors">OK</button>
                        <button onClick={() => { setAssigningId(null); setAssignEmployeeId(''); }} className="h-7 px-2 rounded-md border text-[10px] hover:bg-[hsl(var(--accent))] transition-colors">✕</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setAssigningId(c.id)}
                        className="h-7 px-2 rounded-md border text-[10px] font-medium hover:bg-[hsl(var(--accent))] transition-colors"
                      >
                        👤 Assigner
                      </button>
                    )
                  )}

                  {/* Transfer to other department */}
                  <button
                    onClick={() => handleTransferOut(c.id)}
                    className="h-7 px-2 rounded-md border border-amber-200 bg-amber-50 text-amber-800 text-[10px] font-medium hover:bg-amber-100 transition-colors dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-amber-300"
                    title={`Transférer vers ${otherDepartmentLabel}`}
                  >
                    ↗️ Transférer → {otherDepartmentLabel}
                  </button>

                  {/* Category correction (if miscategorized) */}
                  {c.category !== department && (
                    <button
                      onClick={() => handleCategoryCorrection(c.id)}
                      className="h-7 px-2 rounded-md border border-orange-200 bg-orange-50 text-orange-800 text-[10px] font-medium hover:bg-orange-100 transition-colors dark:border-orange-900/30 dark:bg-orange-950/20 dark:text-orange-300"
                    >
                      🏷️ Corriger → {departmentLabel}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════
  //  Complaint Detail Drawer
  // ═══════════════════════════════════════════════════════════════════

  const renderDetailDrawer = () => {
    if (!selectedComplaint) return null;
    const c = selectedComplaint;

    return (
      <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm animate-in fade-in" onClick={() => setSelectedComplaint(null)}>
        <div
          className="w-full max-w-lg bg-[hsl(var(--background))] h-full overflow-y-auto border-l shadow-2xl animate-in slide-in-from-right"
          onClick={(e) => e.stopPropagation()}
        >
          {detailLoading ? (
            <LoadingSpinner message="Chargement du détail..." />
          ) : (
            <div className="p-6 space-y-5">
              {/* Header */}
              <div className="flex items-start justify-between">
                <h2 className="text-base font-bold">Détail réclamation</h2>
                <button onClick={() => setSelectedComplaint(null)} className="h-8 w-8 rounded-md border flex items-center justify-center hover:bg-[hsl(var(--accent))] transition-colors text-sm">✕</button>
              </div>

              {/* Status + Category */}
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={c.status} />
                <CategoryBadge category={c.category} />
                <span className="text-[10px] text-[hsl(var(--muted-foreground))]">{formatDateTime(c.createdAt)}</span>
              </div>

              {/* Room + Guest */}
              <div className="grid grid-cols-2 gap-3 rounded-lg border p-3 text-xs">
                <div>
                  <span className="text-[hsl(var(--muted-foreground))] text-[10px]">Chambre</span>
                  <p className="font-bold">{c.room?.roomNumber || '—'} <span className="font-normal text-[10px]">· Étage {c.room?.floor}</span></p>
                </div>
                <div>
                  <span className="text-[hsl(var(--muted-foreground))] text-[10px]">Client</span>
                  <p className="font-bold">{c.reservation ? `${c.reservation.guestFirstName} ${c.reservation.guestLastName}` : '—'}</p>
                </div>
                <div>
                  <span className="text-[hsl(var(--muted-foreground))] text-[10px]">Assigné à</span>
                  <p className="font-semibold">{c.assignedTo?.name || 'Non assignée'}</p>
                </div>
                <div>
                  <span className="text-[hsl(var(--muted-foreground))] text-[10px]">Assigné par</span>
                  <p className="font-semibold">{c.assignedBy?.name || '—'}</p>
                </div>
              </div>

              {/* Staff message (translated) */}
              <div className="rounded-lg border p-3 space-y-2">
                <h3 className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Message Staff (traduit)</h3>
                <p className="text-xs leading-relaxed whitespace-pre-wrap">{c.staffMessage || c.normalizedMessageEn || '—'}</p>
              </div>

              {/* Original message */}
              <div className="rounded-lg border p-3 space-y-2">
                <h3 className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Message original client</h3>
                <p className="text-xs leading-relaxed whitespace-pre-wrap text-[hsl(var(--muted-foreground))]">{c.originalMessage}</p>
              </div>

              {/* Intervention Logs */}
              {c.interventionLogs && c.interventionLogs.length > 0 && (
                <div className="rounded-lg border p-3 space-y-3">
                  <h3 className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Logs d'intervention</h3>
                  <div className="space-y-2">
                    {c.interventionLogs.map((log) => (
                      <div key={log.id} className="rounded-md bg-[hsl(var(--muted))]/20 p-2.5 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">{log.employee?.name || '—'}</span>
                          {log.result && <span className="text-[10px]">{resultLabels[log.result] || log.result}</span>}
                        </div>
                        <div className="grid grid-cols-2 gap-1 text-[10px] text-[hsl(var(--muted-foreground))]">
                          <span>Entrée: {log.entryTime ? formatDateTime(log.entryTime) : '—'}</span>
                          <span>Sortie: {log.exitTime ? formatDateTime(log.exitTime) : '—'}</span>
                        </div>
                        {log.employeeComment && (
                          <p className="text-[10px] text-[hsl(var(--muted-foreground))] italic">{log.employeeComment}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Messages button */}
              <button
                onClick={() => loadMessages(c.id)}
                disabled={msgLoading}
                className="w-full h-9 rounded-lg border text-xs font-medium hover:bg-[hsl(var(--accent))] transition-colors"
              >
                {msgLoading ? 'Chargement…' : '💬 Messagerie interne'}
              </button>

              {/* Messages panel */}
              {showMessages && (
                <div className="rounded-lg border p-3 space-y-3">
                  <h3 className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Messages internes</h3>
                  
                  {messages.length === 0 ? (
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">Aucun message pour cette réclamation.</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {messages.map((m) => (
                        <div key={m.id} className={`rounded-md p-2 text-xs ${m.sender?.id === user?.id ? 'bg-indigo-50 dark:bg-indigo-950/30 ml-6' : 'bg-[hsl(var(--muted))]/20 mr-6'}`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-bold">{m.sender?.name || '—'}</span>
                            <span className="text-[10px] text-[hsl(var(--muted-foreground))]">{formatDateTime(m.createdAt)}</span>
                          </div>
                          <p className="whitespace-pre-wrap">{m.message}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Compose */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage(); }}
                      placeholder="Écrire un message…"
                      className="flex-1 h-8 rounded-md border bg-transparent px-3 text-xs placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-shadow"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || msgLoading}
                      className="h-8 px-3 rounded-md bg-indigo-600 text-white text-[10px] font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                    >
                      Envoyer
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════
  //  TAB: Employés
  // ═══════════════════════════════════════════════════════════════════

  const renderEmployees = () => {
    if (loading) return <LoadingSpinner message="Chargement des employés..." />;

    return (
      <div className="space-y-4">
        {/* Create button */}
        <div className="flex justify-end">
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="h-9 px-4 rounded-lg bg-indigo-600 text-white text-xs font-semibold shadow-sm hover:bg-indigo-700 transition-colors"
          >
            {showCreateForm ? '✕ Annuler' : '+ Créer un employé'}
          </button>
        </div>

        {/* Create form */}
        {showCreateForm && (
          <form onSubmit={handleCreateEmployee} className="rounded-xl border bg-[hsl(var(--card))] p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-bold">Nouvel employé — {departmentLabel}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="Nom complet"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                className="h-9 rounded-md border bg-transparent px-3 text-xs placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <input
                type="email"
                placeholder="Email"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                className="h-9 rounded-md border bg-transparent px-3 text-xs placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <input
                type="password"
                placeholder="Mot de passe"
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                className="h-9 rounded-md border bg-transparent px-3 text-xs placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <button
              type="submit"
              disabled={createLoading}
              className="h-9 px-4 rounded-md bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {createLoading ? 'Création…' : 'Créer l\'employé'}
            </button>
          </form>
        )}

        {/* Employee list */}
        {employees.length === 0 ? (
          <EmptyState
            message="Aucun employé"
            icon="👷"
            description="Utilisez le bouton ci-dessus pour ajouter des employés à votre service."
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {employees.map((emp) => {
              const online = isOnline(emp.employeeProfile?.lastSeenAt);
              return (
                <div key={emp.id} className="rounded-xl border bg-[hsl(var(--card))] p-4 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${online ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300 dark:bg-gray-600'}`} />
                      <h3 className="text-xs font-bold">{emp.name}</h3>
                    </div>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                      emp.employeeProfile?.isAvailable
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
                        : 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-300'
                    }`}>
                      {emp.employeeProfile?.isAvailable ? 'Disponible' : 'Indisponible'}
                    </span>
                  </div>
                  <div className="text-[10px] text-[hsl(var(--muted-foreground))] space-y-0.5">
                    <p>📧 {emp.email}</p>
                    <p>🏢 {emp.employeeProfile?.department || '—'}</p>
                    <p>
                      {online
                        ? '🟢 En ligne'
                        : emp.employeeProfile?.lastSeenAt
                          ? `⏱️ Vu le ${formatDateTime(emp.employeeProfile.lastSeenAt)}`
                          : '⚪ Jamais connecté'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════
  //  Housekeeping tab — data fetching & rendering
  // ═══════════════════════════════════════════════════════════════════

  const fetchOccupiedRooms = useCallback(async () => {
    setHkLoading(true);
    setError('');
    try {
      const res = await listOccupiedRooms();
      setOccupiedRooms(res.data || []);
    } catch (err) {
      setError((err as ApiError).error || 'Erreur de chargement des chambres.');
    } finally {
      setHkLoading(false);
    }
  }, []);

  const fetchHkTasks = useCallback(async () => {
    try {
      const res = await listHousekeepingTasks({ limit: 100 });
      setHkTasks(res.data || []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    if (activeTab === 'housekeeping') {
      fetchOccupiedRooms();
      fetchHkTasks();
      fetchEmployees();
    }
  }, [activeTab, fetchOccupiedRooms, fetchHkTasks, fetchEmployees]);

  const handleHkAssign = async (roomId: string, reservationId?: string | null) => {
    if (!hkAssignEmployeeId) return;
    setHkAssignLoading(true);
    setError('');
    try {
      await createHousekeepingTask({
        roomId,
        reservationId: reservationId || undefined,
        assignedToId: hkAssignEmployeeId,
        note: hkAssignNote || undefined,
      });
      setSuccess('Tâche de ménage assignée !');
      setAssigningRoomId(null);
      setHkAssignEmployeeId('');
      setHkAssignNote('');
      await Promise.all([fetchOccupiedRooms(), fetchHkTasks()]);
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError((err as ApiError).error || 'Erreur lors de l\'assignation.');
    } finally {
      setHkAssignLoading(false);
    }
  };

  const hkStatusFilters = [
    { key: 'all', label: 'Toutes' },
    { key: 'no_task', label: 'Sans tâche' },
    { key: 'ASSIGNED', label: 'Assignée' },
    { key: 'IN_PROGRESS', label: 'En cours' },
    { key: 'COMPLETED', label: 'Terminée' },
    { key: 'NEEDS_REVIEW', label: 'À revoir' },
  ];

  const filteredRooms = occupiedRooms.filter((r) => {
    if (hkFilter === 'all') return true;
    if (hkFilter === 'no_task') return !r.activeTask;
    return r.activeTask?.status === hkFilter;
  });

  const hkStatusLabel = (s: string) => {
    const map: Record<string, string> = { PENDING: '⏳ En attente', ASSIGNED: '👤 Assignée', IN_PROGRESS: '🔄 En cours', COMPLETED: '✅ Terminée', NEEDS_REVIEW: '⚠️ À revoir', CANCELLED: '❌ Annulée' };
    return map[s] || s;
  };

  const hkResultLabel = (r: string | null | undefined) => {
    if (!r) return '—';
    return r === 'DONE' ? '✅ Fait' : '❌ Non fait';
  };

  const housekeepingEmployees = employees.filter(
    (e) => e.employeeProfile?.department === 'HOUSEKEEPING'
  );

  const renderHousekeeping = () => {
    if (hkLoading) return <LoadingSpinner message="Chargement des chambres..." />;

    return (
      <div className="space-y-6">
        {/* Filter chips */}
        <div className="flex flex-wrap gap-2">
          {hkStatusFilters.map((f) => (
            <button
              key={f.key}
              onClick={() => setHkFilter(f.key)}
              className={`h-7 px-3 rounded-full text-[10px] font-semibold transition-all cursor-pointer ${
                hkFilter === f.key
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-[hsl(var(--muted))]/30 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]/50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Occupied rooms */}
        <div>
          <h3 className="text-sm font-bold mb-3">🏨 Chambres occupées ({filteredRooms.length})</h3>
          {filteredRooms.length === 0 ? (
            <EmptyState message="Aucune chambre pour ce filtre" icon="🏠" description="Changez de filtre ou vérifiez les réservations." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredRooms.map((room) => (
                <div key={room.id} className="rounded-xl border bg-[hsl(var(--card))] p-4 shadow-sm space-y-3">
                  {/* Room header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🚪</span>
                      <div>
                        <p className="text-sm font-bold">Chambre {room.roomNumber}</p>
                        <p className="text-[10px] text-[hsl(var(--muted-foreground))]">Étage {room.floor} · {room.type}</p>
                      </div>
                    </div>
                    {room.activeTask ? (
                      <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${
                        room.activeTask.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' :
                        room.activeTask.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400' :
                        room.activeTask.status === 'NEEDS_REVIEW' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400' :
                        'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400'
                      }`}>
                        {hkStatusLabel(room.activeTask.status)}
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-[hsl(var(--muted))]/30 text-[hsl(var(--muted-foreground))]">Pas de tâche</span>
                    )}
                  </div>

                  {/* Reservation info */}
                  {room.activeReservation && (
                    <p className="text-[10px] text-[hsl(var(--muted-foreground))]">
                      🏷️ {room.activeReservation.guestFirstName} {room.activeReservation.guestLastName} — #{room.activeReservation.reservationNumber}
                    </p>
                  )}

                  {/* Active task details */}
                  {room.activeTask && (
                    <div className="text-[10px] space-y-1 bg-[hsl(var(--muted))]/10 rounded-lg p-2">
                      <p>👤 <strong>{room.activeTask.assignedTo?.name || '—'}</strong></p>
                      {room.activeTask.note && <p>📝 {room.activeTask.note}</p>}
                      {room.activeTask.entryTime && <p>🔑 Entrée : {formatDateTime(room.activeTask.entryTime)}</p>}
                      {room.activeTask.exitTime && <p>🚪 Sortie : {formatDateTime(room.activeTask.exitTime)}</p>}
                      {room.activeTask.result && <p>📋 Résultat : {hkResultLabel(room.activeTask.result)}</p>}
                      {room.activeTask.workerComment && <p>💬 {room.activeTask.workerComment}</p>}
                    </div>
                  )}

                  {/* Assign button / form */}
                  {!room.activeTask && (
                    assigningRoomId === room.id ? (
                      <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={hkAssignEmployeeId}
                          onChange={(e) => setHkAssignEmployeeId(e.target.value)}
                          className="w-full h-8 rounded-md border bg-[hsl(var(--card))] text-[10px] px-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="">Choisir un(e) gouvernant(e)…</option>
                          {housekeepingEmployees.map((emp) => (
                            <option key={emp.id} value={emp.id}>
                              {emp.name} {isOnline(emp.employeeProfile?.lastSeenAt) ? '🟢' : '⚪'}
                            </option>
                          ))}
                        </select>
                        <textarea
                          placeholder="Note optionnelle…"
                          value={hkAssignNote}
                          onChange={(e) => setHkAssignNote(e.target.value)}
                          rows={2}
                          className="w-full rounded-md border bg-transparent px-3 py-2 text-[10px] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleHkAssign(room.id, room.activeReservation?.id)}
                            disabled={hkAssignLoading || !hkAssignEmployeeId}
                            className="h-7 px-3 rounded-md bg-indigo-600 text-white text-[10px] font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                          >
                            {hkAssignLoading ? 'Assignation…' : '✓ Assigner'}
                          </button>
                          <button
                            onClick={() => { setAssigningRoomId(null); setHkAssignEmployeeId(''); setHkAssignNote(''); }}
                            className="h-7 px-3 rounded-md border text-[10px] hover:bg-[hsl(var(--accent))] transition-colors"
                          >
                            ✕ Annuler
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setAssigningRoomId(room.id)}
                        className="w-full h-8 rounded-md bg-indigo-600 text-white text-[10px] font-semibold hover:bg-indigo-700 transition-colors"
                      >
                        👤 Assigner un(e) gouvernant(e)
                      </button>
                    )
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Task history */}
        {hkTasks.length > 0 && (
          <div>
            <h3 className="text-sm font-bold mb-3">📋 Historique des tâches ({hkTasks.length})</h3>
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="bg-[hsl(var(--muted))]/25 border-b">
                    <th className="px-3 py-2 text-left font-semibold">Chambre</th>
                    <th className="px-3 py-2 text-left font-semibold">Employé(e)</th>
                    <th className="px-3 py-2 text-left font-semibold">Note</th>
                    <th className="px-3 py-2 text-left font-semibold">Statut</th>
                    <th className="px-3 py-2 text-left font-semibold">Entrée</th>
                    <th className="px-3 py-2 text-left font-semibold">Sortie</th>
                    <th className="px-3 py-2 text-left font-semibold">Résultat</th>
                    <th className="px-3 py-2 text-left font-semibold">Commentaire</th>
                  </tr>
                </thead>
                <tbody>
                  {hkTasks.map((t) => (
                    <tr key={t.id} className="border-b hover:bg-[hsl(var(--muted))]/10 transition-colors">
                      <td className="px-3 py-2 font-bold">Ch. {t.room?.roomNumber || '—'}</td>
                      <td className="px-3 py-2">{t.assignedTo?.name || '—'}</td>
                      <td className="px-3 py-2 max-w-[120px] truncate" title={t.note || ''}>{t.note || '—'}</td>
                      <td className="px-3 py-2">{hkStatusLabel(t.status)}</td>
                      <td className="px-3 py-2">{t.entryTime ? formatDateTime(t.entryTime) : '—'}</td>
                      <td className="px-3 py-2">{t.exitTime ? formatDateTime(t.exitTime) : '—'}</td>
                      <td className="px-3 py-2">{hkResultLabel(t.result)}</td>
                      <td className="px-3 py-2 max-w-[150px] truncate" title={t.workerComment || ''}>{t.workerComment || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════
  //  Main render
  // ═══════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-6">
      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Réclamations actives" value={complaints.filter(c => c.status !== 'RESOLVED').length || '—'} icon="📢" accent="red" />
        <StatCard label="Employés" value={employees.length || '—'} icon="👷" accent="blue" />
        <StatCard label="Disponibles" value={employees.filter(e => e.employeeProfile?.isAvailable).length || '—'} icon="✅" accent="emerald" />
      </div>

      {/* Banners */}
      <ErrorMessage message={error} onRetry={() => activeTab === 'complaints' ? fetchComplaints() : activeTab === 'housekeeping' ? fetchOccupiedRooms() : fetchEmployees()} />
      {success && (
        <div className="rounded-xl border border-emerald-200/60 bg-emerald-50 p-4 text-sm dark:border-emerald-900/30 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 shadow-sm">
          <div className="flex items-center gap-2.5">
            <span className="text-base select-none">✅</span>
            <p className="font-medium">{success}</p>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <TabNav
        tabs={tabs}
        active={activeTab}
        onChange={handleTabChange}
      />

      {/* Tab Content */}
      {activeTab === 'complaints' && renderComplaints()}
      {activeTab === 'employees' && renderEmployees()}
      {activeTab === 'housekeeping' && renderHousekeeping()}

      {/* Detail Drawer */}
      {renderDetailDrawer()}
    </div>
  );
};
