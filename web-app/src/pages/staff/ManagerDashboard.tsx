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
  listRooms,
  createHousekeepingTask,
  listHousekeepingTasks,
  getShifts,
  upsertShift,
  listDailyCleaningTasks,
  createDailyCleaningTask,
  deleteDailyCleaningTask,
  SHIFT_LABELS,
} from '../../api/staffApi';
import type { WorkerShift, DailyCleaningStatus } from '../../api/staffApi';
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

type Tab = 'complaints' | 'employees' | 'housekeeping' | 'planification' | 'daily_cleaning';

const baseTabs: { key: Tab; label: string; icon: string }[] = [
  { key: 'complaints', label: 'Réclamations', icon: '📢' },
  { key: 'employees', label: 'Employés', icon: '👷' },
  { key: 'planification', label: 'Planning', icon: '📅' },
];

const housekeepingTab = { key: 'housekeeping' as Tab, label: 'Ménage', icon: '🏠' };
const dailyCleaningTab = { key: 'daily_cleaning' as Tab, label: 'Ménage quotidien', icon: '🧹' };

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

  // Build tabs dynamically — housekeeping & daily cleaning tabs only for HOUSEKEEPING_MANAGER
  const tabs = department === 'HOUSEKEEPING'
    ? [...baseTabs, housekeepingTab, dailyCleaningTab]
    : baseTabs;

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

  // ── Shift planning state ────────────────────────────────────────────
  interface ShiftWorkerEntry {
    id: string;
    name: string;
    email: string;
    isAvailable: boolean;
    lastSeenAt?: string | null;
    shift: WorkerShift | null;
  }
  const [shiftWorkers, setShiftWorkers] = useState<ShiftWorkerEntry[]>([]);
  const [shiftBusinessDay, setShiftBusinessDay] = useState('');
  const [shiftLoading, setShiftLoading] = useState(false);
  const [shiftSaving, setShiftSaving] = useState<string | null>(null);

  // ── Daily cleaning state ────────────────────────────────────────────
  interface DailyCleaningEntry {
    id: string;
    roomId: string;
    workerId: string;
    businessDay: string;
    status: DailyCleaningStatus;
    note?: string | null;
    startedAt?: string | null;
    completedAt?: string | null;
    createdAt: string;
    room?: { id: string; roomNumber: string; floor: number; type?: string } | null;
    worker?: { id: string; name: string } | null;
  }
  const [dailyTasks, setDailyTasks] = useState<DailyCleaningEntry[]>([]);
  const [dailyBusinessDay, setDailyBusinessDay] = useState('');
  const [dailyLoading, setDailyLoading] = useState(false);
  const [dailyRefreshing, setDailyRefreshing] = useState(false);
  const [dailyFilterWorker, setDailyFilterWorker] = useState('');
  const [dailyFilterStatus, setDailyFilterStatus] = useState('');
  const [dailyFilterRoom, setDailyFilterRoom] = useState('');
  const [showDailyForm, setShowDailyForm] = useState(false);
  const [dailyFormRoomId, setDailyFormRoomId] = useState('');
  const [dailyFormWorkerId, setDailyFormWorkerId] = useState('');
  const [dailyFormNote, setDailyFormNote] = useState('');
  const [dailyFormLoading, setDailyFormLoading] = useState(false);
  const [allRooms, setAllRooms] = useState<{ id: string; roomNumber: string; floor: number; type?: string }[]>([]);

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
    if (activeTab === 'complaints') { fetchComplaints(); fetchEmployees(); }
    if (activeTab === 'employees') fetchEmployees();
    if (activeTab === 'planification') fetchShifts();
    if (activeTab === 'daily_cleaning') { fetchDailyTasks(); fetchEmployees(); fetchAllRooms(); fetchShifts(); }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Sync URL when tab changes via TabNav click
  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setSearchParams({ tab }, { replace: true });
  };

  // ── Shift fetch/save ───────────────────────────────────────────────
  const fetchShifts = useCallback(async () => {
    setShiftLoading(true);
    setError('');
    try {
      const res = await getShifts();
      setShiftWorkers(res.data?.workers || []);
      setShiftBusinessDay(res.data?.businessDay || '');
    } catch (err) { setError((err as { error?: string }).error || 'Erreur planning.'); }
    finally { setShiftLoading(false); }
  }, []);

  const handleUpsertShift = async (workerId: string, shift: WorkerShift) => {
    setShiftSaving(workerId);
    try {
      await upsertShift({ workerId, shift });
      setShiftWorkers(prev => prev.map(w => w.id === workerId ? { ...w, shift } : w));
      setSuccess('Planning mis à jour !');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) { setError((err as { error?: string }).error || 'Erreur.'); }
    finally { setShiftSaving(null); }
  };

  // ── Daily cleaning fetch/save ──────────────────────────────────────
  const fetchAllRooms = useCallback(async () => {
    try {
      const res = await listRooms();
      setAllRooms(res.data || []);
    } catch (err) {
      setError((err as ApiError).error || 'Erreur chargement des chambres.');
    }
  }, []);

  const fetchDailyTasks = useCallback(async (isRefresh = false) => {
    if (isRefresh) setDailyRefreshing(true);
    else setDailyLoading(true);
    try {
      const res = await listDailyCleaningTasks();
      setDailyTasks(res.data || []);
      if (res.businessDay) setDailyBusinessDay(res.businessDay);
    } catch (err) { setError((err as { error?: string }).error || 'Erreur.'); }
    finally { setDailyLoading(false); setDailyRefreshing(false); }
  }, []);

  const handleCreateDailyTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dailyFormRoomId || !dailyFormWorkerId) { setError('Chambre et agent requis.'); return; }
    setDailyFormLoading(true);
    try {
      await createDailyCleaningTask({ roomId: dailyFormRoomId, workerId: dailyFormWorkerId, note: dailyFormNote || undefined });
      setSuccess('Tâche quotidienne assignée !');
      setShowDailyForm(false); setDailyFormRoomId(''); setDailyFormWorkerId(''); setDailyFormNote('');
      await fetchDailyTasks();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) { setError((err as { error?: string }).error || 'Erreur.'); }
    finally { setDailyFormLoading(false); }
  };

  const handleDeleteDailyTask = async (id: string) => {
    try {
      await deleteDailyCleaningTask(id);
      setDailyTasks(prev => prev.filter(t => t.id !== id));
      setSuccess('Tâche supprimée.'); setTimeout(() => setSuccess(''), 3000);
    } catch (err) { setError((err as { error?: string }).error || 'Erreur.'); }
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
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-sm font-bold">👷 Employés — {departmentLabel}</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchEmployees}
              className="h-8 px-3 rounded-lg border border-[hsl(var(--border))] text-xs font-semibold hover:bg-[hsl(var(--accent))] cursor-pointer transition-colors"
            >
              🔄 Rafraîchir
            </button>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="h-9 px-4 rounded-lg bg-indigo-600 text-white text-xs font-semibold shadow-sm hover:bg-indigo-700 transition-colors cursor-pointer"
            >
              {showCreateForm ? '✕ Annuler' : '+ Créer un employé'}
            </button>
          </div>
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
            description="Les employés sont créés par le responsable ou l'administrateur."
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
  }; // end renderHousekeeping

  // ═══════════════════════════════════════════════════════════════════
  //  TAB: Planning des quarts (Planification)
  // ═══════════════════════════════════════════════════════════════════

  const SHIFT_ICONS: Record<WorkerShift, string> = { MORNING: '🌅', EVENING: '🌆', NIGHT: '🌙', DAY_OFF: '😴' };
  const SHIFT_COLORS: Record<WorkerShift, string> = {
    MORNING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    EVENING: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
    NIGHT:   'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
    DAY_OFF: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  };

  const renderPlanification = () => {
    if (shiftLoading) return <LoadingSpinner message="Chargement du planning..." />;
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-sm font-bold">📅 Planning des quarts — <span className="font-mono text-[hsl(var(--muted-foreground))]">{shiftBusinessDay || "Aujourd'hui"}</span></h2>
            <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">Réinitialisation chaque jour à 06:00. Cliquez pour changer le quart.</p>
          </div>
          <button onClick={() => fetchShifts()} className="h-8 px-4 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-xs font-semibold hover:bg-[hsl(var(--accent))] transition-colors cursor-pointer">🔄 Rafraîchir</button>
        </div>
        {shiftWorkers.length === 0 ? (
          <EmptyState message="Aucun employé" icon="👷" description="Créez des employés dans l'onglet Employés." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {shiftWorkers.map((w) => (
              <div key={w.id} className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${w.isAvailable ? 'bg-emerald-400' : 'bg-gray-400'}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate">{w.name}</p>
                      <p className="text-[10px] text-[hsl(var(--muted-foreground))] truncate">{w.email}</p>
                    </div>
                  </div>
                  <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    w.shift ? SHIFT_COLORS[w.shift] : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                  }`}>
                    {w.shift ? `${SHIFT_ICONS[w.shift]} ${SHIFT_LABELS[w.shift]}` : '⬜ Non défini'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['MORNING', 'EVENING', 'NIGHT', 'DAY_OFF'] as WorkerShift[]).map((shift) => (
                    <button key={shift} disabled={shiftSaving === w.id} onClick={() => handleUpsertShift(w.id, shift)}
                      className={`h-8 rounded-lg text-[10px] font-semibold transition-all cursor-pointer border ${
                        w.shift === shift ? `${SHIFT_COLORS[shift]} border-current` : 'border-[hsl(var(--border))] bg-[hsl(var(--muted))]/20 hover:bg-[hsl(var(--accent))]'
                      } disabled:opacity-50`}>
                      {shiftSaving === w.id ? '⏳' : `${SHIFT_ICONS[shift]} ${shift === 'DAY_OFF' ? 'Repos' : SHIFT_LABELS[shift].split('–')[0]}`}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════
  //  TAB: Ménage quotidien (Daily Cleaning)
  // ═══════════════════════════════════════════════════════════════════

  const DAILY_STATUS_LABEL: Record<string, string> = {
    ASSIGNED: '👤 Assignée', IN_PROGRESS: '🔄 En cours', DONE: '✅ Terminée', SKIPPED: '⏭️ Ignorée',
  };
  const DAILY_STATUS_CLS: Record<string, string> = {
    ASSIGNED: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
    IN_PROGRESS: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    DONE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    SKIPPED: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
  };
  const SHIFT_ICONS_DC: Record<WorkerShift, string> = { MORNING: '🌅', EVENING: '🌆', NIGHT: '🌙', DAY_OFF: '😴' };
  const SHIFT_COLORS_DC: Record<WorkerShift, string> = {
    MORNING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    EVENING: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
    NIGHT:   'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
    DAY_OFF: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  };

  const housekeepingWorkers = employees.filter(e => e.employeeProfile?.department === 'HOUSEKEEPING');
  const filteredDailyTasks = dailyTasks.filter(t => {
    const mW = !dailyFilterWorker || t.workerId === dailyFilterWorker;
    const mS = !dailyFilterStatus || t.status === dailyFilterStatus;
    const mR = !dailyFilterRoom || (t.room?.roomNumber || '').toLowerCase().includes(dailyFilterRoom.toLowerCase());
    return mW && mS && mR;
  });

  const renderDailyCleaning = () => {
    if (dailyLoading) return <LoadingSpinner message="Chargement du ménage quotidien..." />;
    return (
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-sm font-bold">🧹 Ménage quotidien — <span className="font-mono text-[hsl(var(--muted-foreground))]">{dailyBusinessDay || "Aujourd'hui"}</span></h2>
            <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">Assignation de chambres indépendante des réclamations. Réinitialisation à 06:00.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowDailyForm(v => !v)} className="h-8 px-4 rounded-lg bg-gradient-to-r from-teal-500 to-teal-600 text-white text-xs font-bold cursor-pointer hover:opacity-90 transition-opacity">➕ Assigner chambre</button>
            <button onClick={() => fetchDailyTasks(true)} disabled={dailyRefreshing}
              className="h-8 px-4 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-xs font-semibold hover:bg-[hsl(var(--accent))] transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5">
              <span className={dailyRefreshing ? 'animate-spin inline-block' : ''}>🔄</span>
              {dailyRefreshing ? 'Chargement...' : 'Rafraîchir'}
            </button>
          </div>
        </div>

        {/* Assignment form */}
        {showDailyForm && (
          <form onSubmit={handleCreateDailyTask} className="rounded-xl border border-teal-200 dark:border-teal-900/40 bg-teal-50 dark:bg-teal-950/20 p-5 space-y-4">
            <h3 className="text-xs font-bold text-teal-700 dark:text-teal-300">Nouvelle assignation quotidienne</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-semibold uppercase text-[hsl(var(--muted-foreground))] mb-1">Chambre</label>
                <select required value={dailyFormRoomId} onChange={e => setDailyFormRoomId(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-xs focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]">
                  <option value="">-- Sélectionner une chambre --</option>
                  {allRooms.length === 0 && (
                    <option disabled>Aucune chambre disponible (chargement en cours...)</option>
                  )}
                  {allRooms.map(r => {
                    const roomLabel = `Ch. ${r.roomNumber} — Étage ${r.floor}${r.type ? ` · ${r.type}` : ''}`;
                    return <option key={r.id} value={r.id}>{roomLabel}</option>;
                  })}
                </select>
                {allRooms.length === 0 && (
                  <p className="text-[10px] text-red-600 dark:text-red-400 mt-1">❌ Aucune chambre chargée. Rafraîchissez la page.</p>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-semibold uppercase text-[hsl(var(--muted-foreground))] mb-1">Agent de ménage</label>
                {(() => {
                  // Determine current shift for availability check
                  const hour = new Date().getUTCHours();
                  const currentShift: typeof shiftWorkers[0]['shift'] = hour >= 7 && hour < 15 ? 'MORNING' : hour >= 15 && hour < 23 ? 'EVENING' : 'NIGHT';
                  const availableWorkers = housekeepingWorkers.filter(w => {
                    const wShift = shiftWorkers.find(s => s.id === w.id)?.shift;
                    if (wShift === 'DAY_OFF') return false;
                    if (!w.employeeProfile?.isAvailable) return false;
                    return true;
                  });
                  return (
                    <>
                      <select required value={dailyFormWorkerId} onChange={e => setDailyFormWorkerId(e.target.value)}
                        className="w-full h-9 px-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-xs focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]">
                        <option value="">-- Sélectionner un agent --</option>
                        {housekeepingWorkers.length === 0 && (
                          <option disabled>Aucun agent de ménage disponible</option>
                        )}
                        {housekeepingWorkers.map(w => {
                          const wShift = shiftWorkers.find(s => s.id === w.id)?.shift;
                          const isDayOff = wShift === 'DAY_OFF';
                          const isUnavailable = !w.employeeProfile?.isAvailable;
                          const wrongShift = wShift && wShift !== 'DAY_OFF' && wShift !== currentShift;
                          const blocked = isDayOff || isUnavailable;
                          const label = isDayOff ? `${w.name} — 😴 Repos (non assignable)`
                            : isUnavailable ? `${w.name} — ⚠️ Indisponible`
                            : wrongShift ? `${w.name} — ⚠️ Shift ${wShift ? SHIFT_LABELS[wShift].split('–')[0] : ''} (hors shift actuel)`
                            : `${w.name}${wShift ? ` — ${SHIFT_LABELS[wShift]}` : ' — ⬜ Shift non défini'}`;
                          return <option key={w.id} value={w.id} disabled={blocked}>{label}</option>;
                        })}
                      </select>
                      {availableWorkers.length === 0 && housekeepingWorkers.length > 0 && (
                        <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">⚠️ Tous les agents sont en repos ou indisponibles pour le shift actuel.</p>
                      )}
                      {housekeepingWorkers.length === 0 && (
                        <p className="text-[10px] text-red-600 dark:text-red-400 mt-1">❌ Aucun agent de ménage trouvé. Vérifiez l'onglet Employés.</p>
                      )}
                    </>
                  );
                })()}
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-semibold uppercase text-[hsl(var(--muted-foreground))] mb-1">Note (optionnelle)</label>
                <input type="text" value={dailyFormNote} onChange={e => setDailyFormNote(e.target.value)} placeholder="Instructions..." maxLength={500}
                  className="w-full h-9 px-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-xs focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowDailyForm(false)} className="h-8 px-4 rounded-lg border border-[hsl(var(--border))] text-xs font-semibold cursor-pointer hover:bg-[hsl(var(--muted))] transition-colors">Annuler</button>
              <button type="submit" disabled={dailyFormLoading} className="h-8 px-5 rounded-lg bg-teal-600 text-white text-xs font-bold cursor-pointer hover:bg-teal-700 transition-colors disabled:opacity-50">
                {dailyFormLoading ? 'Assignation...' : 'Assigner'}
              </button>
            </div>
          </form>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <input type="text" value={dailyFilterRoom} onChange={e => setDailyFilterRoom(e.target.value)} placeholder="🔍 N° chambre"
            className="h-8 px-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-xs focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] flex-1 min-w-[120px]" />
          <select value={dailyFilterWorker} onChange={e => setDailyFilterWorker(e.target.value)}
            className="h-8 px-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-xs focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]">
            <option value="">Tous agents</option>
            {housekeepingWorkers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
          <select value={dailyFilterStatus} onChange={e => setDailyFilterStatus(e.target.value)}
            className="h-8 px-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-xs focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]">
            <option value="">Tous statuts</option>
            {['ASSIGNED','IN_PROGRESS','DONE','SKIPPED'].map(s => <option key={s} value={s}>{DAILY_STATUS_LABEL[s]}</option>)}
          </select>
          <p className="text-[10px] text-[hsl(var(--muted-foreground))]">{filteredDailyTasks.length}/{dailyTasks.length} tâches</p>
        </div>

        {/* Task cards */}
        {filteredDailyTasks.length === 0 ? (
          <EmptyState message="Aucune tâche" icon="🧹" description="Assignez des chambres avec le bouton ci-dessus." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredDailyTasks.map(t => {
              const wShift = shiftWorkers.find(s => s.id === t.workerId)?.shift;
              return (
                <div key={t.id} className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 shadow-sm space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold">🚪 Chambre {t.room?.roomNumber || '—'}</p>
                      <p className="text-[10px] text-[hsl(var(--muted-foreground))]">Étage {t.room?.floor ?? '—'} · {t.room?.type || '—'}</p>
                    </div>
                    <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${DAILY_STATUS_CLS[t.status] || ''}`}>
                      {DAILY_STATUS_LABEL[t.status] || t.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))] uppercase">Agent:</span>
                    <span className="text-xs font-medium">{t.worker?.name || '—'}</span>
                    {wShift && wShift !== 'DAY_OFF' && (
                      <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold ${SHIFT_COLORS_DC[wShift]}`}>
                        {SHIFT_ICONS_DC[wShift]} {SHIFT_LABELS[wShift].split('–')[0]}
                      </span>
                    )}
                  </div>
                  {t.note && <p className="text-[10px] text-[hsl(var(--muted-foreground))] italic">📝 {t.note}</p>}
                  {(t.startedAt || t.completedAt) && (
                    <div className="grid grid-cols-2 gap-2 text-[10px] text-[hsl(var(--muted-foreground))] pt-2 border-t border-[hsl(var(--border))]/60">
                      {t.startedAt && <div><span className="font-semibold">Début:</span> {formatDateTime(t.startedAt)}</div>}
                      {t.completedAt && <div><span className="font-semibold">Fin:</span> {formatDateTime(t.completedAt)}</div>}
                    </div>
                  )}
                  {t.status !== 'DONE' && (
                    <button onClick={() => handleDeleteDailyTask(t.id)}
                      className="w-full h-7 rounded-lg border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 text-[10px] font-semibold hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors cursor-pointer">
                      🗑️ Supprimer
                    </button>
                  )}
                </div>
              );
            })}
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
      {activeTab === 'planification' && renderPlanification()}
      {activeTab === 'daily_cleaning' && renderDailyCleaning()}


      {/* Detail Drawer */}
      {renderDetailDrawer()}
    </div>
  );
};
