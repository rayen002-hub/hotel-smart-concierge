import { useState, useEffect, useCallback } from 'react';
import {
  listComplaints,
  getComplaint,
  updateComplaintCategory,
  assignComplaint,
  getComplaintMessages,
  sendComplaintMessage,
  listEmployees,
  createEmployee,
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

type Tab = 'complaints' | 'employees';

const tabs: { key: Tab; label: string; icon: string }[] = [
  { key: 'complaints', label: 'Réclamations', icon: '📢' },
  { key: 'employees', label: 'Employés', icon: '👷' },
];

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

  const [activeTab, setActiveTab] = useState<Tab>('complaints');
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

  // Repatriation
  const [repatriateId, setRepatriateId] = useState('');
  const [repatriateLoading, setRepatriateLoading] = useState(false);

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
    if (activeTab === 'complaints') {
      fetchComplaints();
      fetchEmployees(); // needed for assign dropdown
    }
    if (activeTab === 'employees') fetchEmployees();
  }, [activeTab, fetchComplaints, fetchEmployees]);

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

  const handleRepatriate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repatriateId.trim()) return;
    setRepatriateLoading(true);
    setError('');
    setSuccess('');
    try {
      await updateComplaintCategory(repatriateId.trim(), department);
      setSuccess('Réclamation rapatriée avec succès dans votre service !');
      setRepatriateId('');
      await fetchComplaints();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError((err as ApiError).error || 'Erreur lors du rapatriement. Vérifiez l\'identifiant.');
    } finally {
      setRepatriateLoading(false);
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
        {/* Repatriate Section */}
        <div className="rounded-xl border bg-[hsl(var(--card))] p-4 shadow-sm space-y-3">
          <h3 className="text-xs font-bold flex items-center gap-2">
            📥 Rapatrier une réclamation d'un autre service
          </h3>
          <p className="text-[10px] text-[hsl(var(--muted-foreground))]">
            Si une réclamation d'un autre service relève en réalité de la <strong>{departmentLabel.toLowerCase()}</strong>, saisissez son identifiant unique ci-dessous pour la transférer automatiquement.
          </p>
          <form onSubmit={handleRepatriate} className="flex gap-2">
            <input
              type="text"
              placeholder="Ex: 550e8400-e29b-41d4-a716-446655440000"
              value={repatriateId}
              onChange={(e) => setRepatriateId(e.target.value)}
              className="flex-1 h-9 rounded-md border bg-transparent px-3 text-xs placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={repatriateLoading || !repatriateId.trim()}
              className="h-9 px-4 rounded-md bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors shrink-0"
            >
              {repatriateLoading ? 'Rapatriement…' : 'Rapatrier'}
            </button>
          </form>
        </div>

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

                  {/* Category correction */}
                  {c.category !== department && (
                    <button
                      onClick={() => handleCategoryCorrection(c.id)}
                      className="h-7 px-2 rounded-md border border-amber-200 bg-amber-50 text-amber-800 text-[10px] font-medium hover:bg-amber-100 transition-colors dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-amber-300"
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
                <div>
                  <h2 className="text-base font-bold">Détail réclamation</h2>
                  <p className="text-[10px] text-[hsl(var(--muted-foreground))] font-mono mt-0.5">{c.id.slice(0, 8)}…</p>
                </div>
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
  //  Main render
  // ═══════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight">Dashboard Manager — {departmentLabel}</h1>
        <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
          Gestion des réclamations, employés et interventions de votre service.
        </p>
      </div>

      {/* Banners */}
      <ErrorMessage message={error} onRetry={() => activeTab === 'complaints' ? fetchComplaints() : fetchEmployees()} />
      {success && (
        <div className="rounded-xl border border-emerald-200/50 bg-emerald-50/50 p-4 text-xs dark:border-emerald-950/25 dark:bg-emerald-950/15 text-emerald-800 dark:text-emerald-300 shadow-sm transition-all animate-in fade-in">
          <div className="flex items-start gap-2.5">
            <span className="text-sm select-none" role="img" aria-label="success">✅</span>
            <div className="space-y-0.5">
              <span className="font-bold text-[10px] uppercase tracking-wider block text-emerald-900 dark:text-emerald-200">Succès</span>
              <p className="leading-relaxed text-[11px] text-emerald-700 dark:text-emerald-400/90">{success}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-1 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/25 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 h-9 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer ${
              activeTab === tab.key
                ? 'bg-[hsl(var(--card))] shadow-sm text-[hsl(var(--foreground))]'
                : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
            }`}
          >
            <span className="mr-1">{tab.icon}</span>{tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'complaints' && renderComplaints()}
      {activeTab === 'employees' && renderEmployees()}

      {/* Detail Drawer */}
      {renderDetailDrawer()}
    </div>
  );
};
