import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  listEmployees,
  listRooms,
  listComplaints,
  listAuditLogs,
  updateHotelInfo,
  updateCurrencyRate,
} from '../../api/staffApi';
import { getHotelInfo, getCurrencyRates } from '../../api/publicApi';
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

interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
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
  metadata?: any;
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

interface CurrencyRate {
  id: string;
  currency: string;
  rateToTnd: number;
  updatedAt: string;
}

type Tab = 'users' | 'rooms' | 'complaints' | 'logs' | 'hotel' | 'currency';

const tabs: { key: Tab; label: string; icon: string }[] = [
  { key: 'users', label: 'Utilisateurs', icon: '👷' },
  { key: 'rooms', label: 'Chambres', icon: '🚪' },
  { key: 'complaints', label: 'Réclamations', icon: '📢' },
  { key: 'logs', label: 'Logs d\'activité', icon: '📜' },
  { key: 'hotel', label: 'Infos Hôtel', icon: '🛎️' },
  { key: 'currency', label: 'Devises', icon: '💱' },
];

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

const isOnline = (lastSeenAt?: string | null) => {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() < 2 * 60 * 1000;
};

export const AdminDashboard: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Read initial tab from URL ?tab= param, fallback to 'users'
  const urlTab = searchParams.get('tab') as Tab | null;
  const [activeTab, setActiveTab] = useState<Tab>(urlTab && tabs.find(t => t.key === urlTab) ? urlTab : 'users');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Tab data states
  const [users, setUsers] = useState<Employee[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [hotelInfos, setHotelInfos] = useState<HotelInfo[]>([]);
  const [currencyRates, setCurrencyRates] = useState<CurrencyRate[]>([]);

  // Editing states
  const [editingInfo, setEditingInfo] = useState<HotelInfo | null>(null);
  const [editingCurrency, setEditingCurrency] = useState<CurrencyRate | null>(null);
  const [editForm, setEditForm] = useState({ title: '', content: '', type: '' });
  const [editRate, setEditRate] = useState('');

  // ── Fetch logic ────────────────────────────────────────────────────

  const fetchTabContent = useCallback(async (tab: Tab) => {
    setLoading(true);
    setError('');
    try {
      if (tab === 'users') {
        const res = await listEmployees();
        setUsers(res.data || []);
      } else if (tab === 'rooms') {
        const res = await listRooms();
        setRooms(res.data || []);
      } else if (tab === 'complaints') {
        const res = await listComplaints();
        setComplaints(res.data || []);
      } else if (tab === 'logs') {
        const res = await listAuditLogs();
        setLogs(res.data || []);
      } else if (tab === 'hotel') {
        const res = await getHotelInfo();
        setHotelInfos(res.data || []);
      } else if (tab === 'currency') {
        const res = await getCurrencyRates();
        setCurrencyRates(res.data || []);
      }
    } catch (err) {
      setError((err as ApiError).error || 'Erreur lors du chargement des données.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // When URL tab param changes (sidebar click), update local state
    const t = searchParams.get('tab') as Tab | null;
    if (t && tabs.find(tab => tab.key === t) && t !== activeTab) {
      setActiveTab(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    fetchTabContent(activeTab);
  }, [activeTab, fetchTabContent]);

  // Sync URL when tab changes via TabNav
  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setSearchParams({ tab }, { replace: true });
  };

  // ── Handlers ───────────────────────────────────────────────────────

  const handleEditInfoStart = (info: HotelInfo) => {
    setEditingInfo(info);
    setEditForm({ title: info.title, content: info.content, type: info.type });
  };

  const handleEditInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInfo) return;
    setError('');
    setSuccess('');
    try {
      await updateHotelInfo(editingInfo.id, editForm);
      setSuccess('Informations de l\'hôtel mises à jour avec succès.');
      setEditingInfo(null);
      await fetchTabContent('hotel');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError((err as ApiError).error || 'Erreur lors de la mise à jour.');
    }
  };

  const handleEditCurrencyStart = (rate: CurrencyRate) => {
    setEditingCurrency(rate);
    setEditRate(rate.rateToTnd.toString());
  };

  const handleEditCurrencySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCurrency) return;
    const numericRate = parseFloat(editRate);
    if (isNaN(numericRate) || numericRate <= 0) {
      setError('Taux invalide.');
      return;
    }
    setError('');
    setSuccess('');
    try {
      await updateCurrencyRate(editingCurrency.id, numericRate);
      setSuccess('Taux de devise mis à jour avec succès.');
      setEditingCurrency(null);
      await fetchTabContent('currency');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError((err as ApiError).error || 'Erreur lors de la mise à jour.');
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Utilisateurs" value={users.length || '—'} icon="👷" accent="indigo" />
        <StatCard label="Chambres" value={rooms.length || '—'} icon="🚪" accent="gold" />
        <StatCard label="Réclamations" value={complaints.length || '—'} icon="📢" accent="red" />
      </div>

      {/* Banners */}
      <ErrorMessage message={error} onRetry={() => fetchTabContent(activeTab)} />
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
      <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-sm">
        {loading ? (
          <LoadingSpinner message="Chargement des données..." />
        ) : (
          <>
            {/* TAB: Users */}
            {activeTab === 'users' && (
              <div className="space-y-4">
                <h2 className="text-sm font-bold">Liste des Utilisateurs et Employés</h2>
                {users.length === 0 ? (
                  <EmptyState
                    message="Aucun utilisateur trouvé"
                    icon="👷"
                    description="Aucun compte utilisateur ou employé n'a été trouvé dans le système."
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse">
                      <thead>
                        <tr className="border-b-2 border-[hsl(var(--border))] bg-[hsl(var(--muted))]/40 text-[hsl(var(--muted-foreground))]">
                          <th className="py-2.5 font-semibold">Nom</th>
                          <th className="py-2.5 font-semibold">Email</th>
                          <th className="py-2.5 font-semibold">Rôle</th>
                          <th className="py-2.5 font-semibold">Département</th>
                          <th className="py-2.5 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[hsl(var(--border))]">
                        {users.map((u) => {
                          const online = isOnline(u.employeeProfile?.lastSeenAt);
                          return (
                            <tr key={u.id} className="hover:bg-[hsl(var(--muted))]/10">
                              <td className="py-3 font-medium flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${online ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`} />
                                {u.name}
                              </td>
                              <td className="py-3 text-[hsl(var(--muted-foreground))]">{u.email}</td>
                              <td className="py-3 font-semibold">{u.role}</td>
                              <td className="py-3">{u.employeeProfile?.department || '—'}</td>
                              <td className="py-3">
                                {u.employeeProfile ? (
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                    u.employeeProfile.isAvailable ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20' : 'bg-red-50 text-red-700 dark:bg-red-950/20'
                                  }`}>
                                    {u.employeeProfile.isAvailable ? 'Disponible' : 'Indisponible'}
                                  </span>
                                ) : (
                                  <span className="text-[hsl(var(--muted-foreground))]">—</span>
                                )}
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

            {/* TAB: Rooms */}
            {activeTab === 'rooms' && (
              <div className="space-y-4">
                <h2 className="text-sm font-bold">Supervision des Chambres</h2>
                {rooms.length === 0 ? (
                  <EmptyState
                    message="Aucune chambre trouvée"
                    icon="🚪"
                    description="La liste des chambres de l'établissement est vide."
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]">
                          <th className="py-2.5 font-semibold">Numéro</th>
                          <th className="py-2.5 font-semibold">Type</th>
                          <th className="py-2.5 font-semibold">Étage</th>
                          <th className="py-2.5 font-semibold">Statut</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[hsl(var(--border))]">
                        {rooms.map((r) => (
                          <tr key={r.id} className="hover:bg-[hsl(var(--muted))]/10">
                            <td className="py-3 font-bold">Chambre {r.roomNumber}</td>
                            <td className="py-3">{r.type}</td>
                            <td className="py-3">Étage {r.floor}</td>
                            <td className="py-3">
                              <StatusBadge status={r.status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB: Complaints */}
            {activeTab === 'complaints' && (
              <div className="space-y-4">
                <h2 className="text-sm font-bold">Suivi Global des Réclamations</h2>
                {complaints.length === 0 ? (
                  <EmptyState
                    message="Aucune réclamation trouvée"
                    icon="📢"
                    description="Aucune réclamation globale signalée pour le moment."
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]">
                          <th className="py-2.5 font-semibold">Date</th>
                          <th className="py-2.5 font-semibold">Chambre</th>
                          <th className="py-2.5 font-semibold">Catégorie</th>
                          <th className="py-2.5 font-semibold">Message</th>
                          <th className="py-2.5 font-semibold">Statut</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[hsl(var(--border))]">
                        {complaints.map((c) => (
                          <tr key={c.id} className="hover:bg-[hsl(var(--muted))]/10">
                            <td className="py-3 whitespace-nowrap text-[hsl(var(--muted-foreground))]">{formatDateTime(c.createdAt)}</td>
                            <td className="py-3 font-semibold">Ch. {c.room?.roomNumber || '—'}</td>
                            <td className="py-3"><CategoryBadge category={c.category} /></td>
                            <td className="py-3 max-w-xs truncate" title={c.staffMessage || c.originalMessage}>
                              {c.staffMessage || c.originalMessage}
                            </td>
                            <td className="py-3">
                              <StatusBadge status={c.status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB: Logs */}
            {activeTab === 'logs' && (
              <div className="space-y-4">
                <h2 className="text-sm font-bold">Logs d'activité système (100 derniers événements)</h2>
                {logs.length === 0 ? (
                  <EmptyState
                    message="Aucun log d'activité"
                    icon="📜"
                    description="Aucune activité système enregistrée."
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]">
                          <th className="py-2.5 font-semibold">Horodatage</th>
                          <th className="py-2.5 font-semibold">Acteur</th>
                          <th className="py-2.5 font-semibold">Action</th>
                          <th className="py-2.5 font-semibold">Entité</th>
                          <th className="py-2.5 font-semibold">Détails/Metadata</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[hsl(var(--border))]">
                        {logs.map((l) => (
                          <tr key={l.id} className="hover:bg-[hsl(var(--muted))]/10 text-[11px]">
                            <td className="py-2.5 whitespace-nowrap text-[hsl(var(--muted-foreground))]">{formatDateTime(l.createdAt)}</td>
                            <td className="py-2.5">
                              {l.actor ? (
                                <div>
                                  <span className="font-semibold">{l.actor.name}</span>
                                  <span className="text-[9px] text-[hsl(var(--muted-foreground))] block">{l.actor.role}</span>
                                </div>
                              ) : (
                                <span className="text-[hsl(var(--muted-foreground))] italic">Système/Client</span>
                              )}
                            </td>
                            <td className="py-2.5"><code className="px-1 py-0.5 rounded bg-[hsl(var(--muted))] font-mono text-[10px]">{l.action}</code></td>
                            <td className="py-2.5 text-[hsl(var(--muted-foreground))]">{l.entity} (id: {l.entityId?.slice(0, 8) || '—'}…)</td>
                            <td className="py-2.5 max-w-sm truncate text-[10px] font-mono text-[hsl(var(--muted-foreground))]" title={JSON.stringify(l.metadata, null, 2)}>
                              {l.metadata ? JSON.stringify(l.metadata) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB: Hotel Info */}
            {activeTab === 'hotel' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold">Configuration des Informations de l'Hôtel</h2>
                </div>

                {editingInfo ? (
                  <form onSubmit={handleEditInfoSubmit} className="rounded-lg border p-4 space-y-4 max-w-lg">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Modifier l'entrée : {editingInfo.title}</h3>
                    <div className="space-y-3">
                      <label className="block space-y-1">
                        <span className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))]">Titre</span>
                        <input
                          type="text"
                          value={editForm.title}
                          onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                          className="w-full h-9 rounded-md border bg-transparent px-3 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          required
                        />
                      </label>
                      <label className="block space-y-1">
                        <span className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))]">Type</span>
                        <input
                          type="text"
                          value={editForm.type}
                          onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                          className="w-full h-9 rounded-md border bg-transparent px-3 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          required
                        />
                      </label>
                      <label className="block space-y-1">
                        <span className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))]">Contenu (Markdown ou Texte)</span>
                        <textarea
                          rows={4}
                          value={editForm.content}
                          onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                          className="w-full rounded-md border bg-transparent p-3 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          required
                        />
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" className="h-9 px-4 rounded-md bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700">Enregistrer</button>
                      <button type="button" onClick={() => setEditingInfo(null)} className="h-9 px-4 rounded-md border text-xs font-medium hover:bg-[hsl(var(--accent))]">Annuler</button>
                    </div>
                  </form>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {hotelInfos.map((info) => (
                      <div key={info.id} className="rounded-xl border bg-[hsl(var(--muted))]/5 p-4 flex flex-col justify-between space-y-3">
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20">{info.type}</span>
                            <span className="text-[9px] text-[hsl(var(--muted-foreground))]">Dernier edit: {formatDateTime(info.updatedAt)}</span>
                          </div>
                          <h3 className="text-xs font-bold mt-2">{info.title}</h3>
                          <p className="text-[11px] text-[hsl(var(--muted-foreground))] leading-relaxed line-clamp-3 mt-1 whitespace-pre-wrap">{info.content}</p>
                        </div>
                        <button
                          onClick={() => handleEditInfoStart(info)}
                          className="h-8 w-full rounded-md border text-xs font-semibold hover:bg-[hsl(var(--accent))] transition-colors"
                        >
                          ✏️ Modifier
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB: Devises */}
            {activeTab === 'currency' && (
              <div className="space-y-6">
                <h2 className="text-sm font-bold">Gestion des Taux de Devises</h2>

                {editingCurrency ? (
                  <form onSubmit={handleEditCurrencySubmit} className="rounded-lg border p-4 space-y-4 max-w-sm">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Taux {editingCurrency.currency} → TND</h3>
                    <div className="space-y-2">
                      <label className="block space-y-1">
                        <span className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))]">Nouveau Taux</span>
                        <input
                          type="number"
                          step="0.0001"
                          value={editRate}
                          onChange={(e) => setEditRate(e.target.value)}
                          className="w-full h-9 rounded-md border bg-transparent px-3 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          required
                        />
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" className="h-9 px-4 rounded-md bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700">Enregistrer</button>
                      <button type="button" onClick={() => setEditingCurrency(null)} className="h-9 px-4 rounded-md border text-xs font-medium hover:bg-[hsl(var(--accent))]">Annuler</button>
                    </div>
                  </form>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {currencyRates.map((rate) => (
                      <div key={rate.id} className="rounded-xl border bg-[hsl(var(--muted))]/5 p-4 flex flex-col justify-between space-y-3">
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-lg font-bold">1 {rate.currency}</span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20">{rate.rateToTnd.toFixed(4)} TND</span>
                          </div>
                          <span className="text-[9px] text-[hsl(var(--muted-foreground))] mt-1 block">Dernière mise à jour: {formatDateTime(rate.updatedAt)}</span>
                        </div>
                        <button
                          onClick={() => handleEditCurrencyStart(rate)}
                          className="h-8 w-full rounded-md border text-xs font-semibold hover:bg-[hsl(var(--accent))] transition-colors"
                        >
                          ✏️ Modifier le taux
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
    </div>
  );
};
