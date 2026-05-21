import { useState, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  listReservations,
  listRooms,
  listComplaints,
  generateClientRoomLink,
  generateWorkerQr,
} from '../../api/staffApi';
import type { ApiError } from '../../api/apiClient';

// ─── Types ───────────────────────────────────────────────────────────

interface Room {
  id: string;
  roomNumber: string;
  floor: number;
  type: string;
  status: string;
}

interface Reservation {
  id: string;
  reservationNumber: string;
  guestFirstName: string;
  guestLastName: string;
  guestEmail?: string;
  guestPhone?: string;
  nationality?: string;
  checkInDate: string;
  checkOutDate: string;
  status: string;
  roomId?: string;
  room?: { id: string; roomNumber: string; type: string } | null;
}

interface Complaint {
  id: string;
  originalMessage: string;
  staffMessage?: string;
  category: string;
  status: string;
  createdAt: string;
  room?: { id: string; roomNumber: string } | null;
  reservation?: { id: string; reservationNumber: string; guestFirstName: string; guestLastName: string } | null;
  assignedTo?: { id: string; name: string } | null;
}

// ─── Tabs ────────────────────────────────────────────────────────────

type Tab = 'reservations' | 'rooms' | 'fiches' | 'complaints' | 'qr';

const tabs: { key: Tab; label: string; icon: string }[] = [
  { key: 'reservations', label: 'Réservations', icon: '📋' },
  { key: 'rooms', label: 'Chambres', icon: '🚪' },
  { key: 'fiches', label: 'Fiches voyageurs', icon: '🛂' },
  { key: 'complaints', label: 'Réclamations', icon: '📢' },
  { key: 'qr', label: 'QR Codes', icon: '📱' },
];

// ─── Helpers ─────────────────────────────────────────────────────────

const statusColors: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
  CONFIRMED: 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300',
  CHECKED_IN: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
  CHECKED_OUT: 'bg-gray-100 text-gray-700 dark:bg-gray-800/40 dark:text-gray-300',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300',
  AVAILABLE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
  OCCUPIED: 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300',
  MAINTENANCE: 'bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300',
  ASSIGNED: 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300',
  IN_PROGRESS: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300',
  NEEDS_REVIEW: 'bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300',
  RESOLVED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
  REOPENED: 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300',
};

const categoryLabels: Record<string, string> = {
  MAINTENANCE: '🔧 Maintenance',
  HOUSEKEEPING: '🧹 Ménage',
  RECEPTION: '🛎️ Réception',
  RESTAURANT: '🍽️ Restaurant',
  COMPLAINT: '📢 Général',
  OTHER: '📌 Autre',
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

const Badge: React.FC<{ status: string }> = ({ status }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${statusColors[status] || 'bg-gray-100 text-gray-700'}`}>
    {status}
  </span>
);

// ─── Main Component ──────────────────────────────────────────────────

export const ReceptionDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('reservations');

  // Data
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);

  // Loading
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // QR modal
  const [qrValue, setQrValue] = useState('');
  const [qrTitle, setQrTitle] = useState('');
  const [qrLoading, setQrLoading] = useState(false);

  // ── Data fetching ──────────────────────────────────────────────────

  const fetchData = useCallback(async (tab: Tab) => {
    setLoading(true);
    setError('');
    try {
      switch (tab) {
        case 'reservations':
        case 'fiches':
        case 'qr': {
          const res = await listReservations();
          setReservations(res.data || []);
          break;
        }
        case 'rooms': {
          const [roomsRes, resvRes] = await Promise.all([listRooms(), listReservations()]);
          setRooms(roomsRes.data || []);
          setReservations(resvRes.data || []);
          break;
        }
        case 'complaints': {
          const res = await listComplaints();
          setComplaints(res.data || []);
          break;
        }
      }
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.error || 'Erreur lors du chargement des données.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(activeTab);
  }, [activeTab, fetchData]);

  // ── QR actions ─────────────────────────────────────────────────────

  const handleGenerateClientQr = async (reservationId: string, reservationNumber: string) => {
    setQrLoading(true);
    setError('');
    try {
      const res = await generateClientRoomLink(reservationId);
      setQrValue(res.data.url);
      setQrTitle(`Lien chambre — ${reservationNumber}`);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.error || 'Erreur lors de la génération du lien client.');
    } finally {
      setQrLoading(false);
    }
  };

  const handleGenerateWorkerQr = async (roomId: string, roomNumber: string) => {
    setQrLoading(true);
    setError('');
    try {
      const res = await generateWorkerQr(roomId);
      setQrValue(res.data.qrPayload);
      setQrTitle(`QR Employé — Chambre ${roomNumber}`);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.error || 'Erreur lors de la génération du QR employé.');
    } finally {
      setQrLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('Copié dans le presse-papier !');
    } catch {
      // fallback
      prompt('Copiez ce lien :', text);
    }
  };

  // ── Render helpers ─────────────────────────────────────────────────

  const renderLoading = () => (
    <div className="flex flex-col items-center justify-center py-16 space-y-3">
      <svg className="animate-spin h-8 w-8 text-indigo-500" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      <span className="text-xs text-[hsl(var(--muted-foreground))]">Chargement…</span>
    </div>
  );

  const renderEmpty = (msg: string) => (
    <div className="text-center py-16 text-sm text-[hsl(var(--muted-foreground))]">{msg}</div>
  );

  // ═══════════════════════════════════════════════════════════════════
  //  TAB: Réservations
  // ═══════════════════════════════════════════════════════════════════

  const renderReservations = () => {
    if (loading) return renderLoading();
    if (reservations.length === 0) return renderEmpty('Aucune réservation trouvée.');

    return (
      <div className="overflow-x-auto rounded-xl border bg-[hsl(var(--card))]">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b bg-[hsl(var(--muted))]/30">
              <th className="px-4 py-3 text-left font-semibold">N° Réservation</th>
              <th className="px-4 py-3 text-left font-semibold">Client</th>
              <th className="px-4 py-3 text-left font-semibold">Chambre</th>
              <th className="px-4 py-3 text-left font-semibold">Arrivée</th>
              <th className="px-4 py-3 text-left font-semibold">Départ</th>
              <th className="px-4 py-3 text-left font-semibold">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[hsl(var(--border))]">
            {reservations.map((r) => (
              <tr key={r.id} className="hover:bg-[hsl(var(--accent))]/50 transition-colors">
                <td className="px-4 py-3 font-mono font-semibold">{r.reservationNumber}</td>
                <td className="px-4 py-3">{r.guestFirstName} {r.guestLastName}</td>
                <td className="px-4 py-3">{r.room?.roomNumber || '—'}</td>
                <td className="px-4 py-3">{formatDate(r.checkInDate)}</td>
                <td className="px-4 py-3">{formatDate(r.checkOutDate)}</td>
                <td className="px-4 py-3"><Badge status={r.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════
  //  TAB: Chambres
  // ═══════════════════════════════════════════════════════════════════

  const renderRooms = () => {
    if (loading) return renderLoading();
    if (rooms.length === 0) return renderEmpty('Aucune chambre trouvée.');

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {rooms.map((room) => (
          <div key={room.id} className="rounded-xl border bg-[hsl(var(--card))] p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">Chambre {room.roomNumber}</h3>
                <p className="text-[10px] text-[hsl(var(--muted-foreground))]">Étage {room.floor} · {room.type}</p>
              </div>
              <Badge status={room.status} />
            </div>
            <button
              onClick={() => handleGenerateWorkerQr(room.id, room.roomNumber)}
              className="w-full h-8 rounded-md border text-[10px] font-medium hover:bg-[hsl(var(--accent))] transition-colors"
            >
              📱 Générer QR Employé
            </button>
          </div>
        ))}
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════
  //  TAB: Fiches voyageurs
  // ═══════════════════════════════════════════════════════════════════

  const renderFiches = () => {
    if (loading) return renderLoading();
    const checkedIn = reservations.filter((r) => r.status === 'CHECKED_IN' || r.status === 'CHECKED_OUT');
    if (checkedIn.length === 0) return renderEmpty('Aucune fiche voyageur disponible.');

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {checkedIn.map((r) => (
          <div key={r.id} className="rounded-xl border bg-[hsl(var(--card))] p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">{r.guestFirstName} {r.guestLastName}</h3>
              <Badge status={r.status} />
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[hsl(var(--muted-foreground))]">N° Réservation</span>
                <p className="font-mono font-semibold">{r.reservationNumber}</p>
              </div>
              <div>
                <span className="text-[hsl(var(--muted-foreground))]">Chambre</span>
                <p className="font-semibold">{r.room?.roomNumber || '—'}</p>
              </div>
              <div>
                <span className="text-[hsl(var(--muted-foreground))]">Nationalité</span>
                <p className="font-semibold">{r.nationality || '—'}</p>
              </div>
              <div>
                <span className="text-[hsl(var(--muted-foreground))]">Téléphone</span>
                <p className="font-semibold">{r.guestPhone || '—'}</p>
              </div>
              <div className="col-span-2">
                <span className="text-[hsl(var(--muted-foreground))]">Email</span>
                <p className="font-semibold">{r.guestEmail || '—'}</p>
              </div>
              <div>
                <span className="text-[hsl(var(--muted-foreground))]">Arrivée</span>
                <p className="font-semibold">{formatDate(r.checkInDate)}</p>
              </div>
              <div>
                <span className="text-[hsl(var(--muted-foreground))]">Départ</span>
                <p className="font-semibold">{formatDate(r.checkOutDate)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════
  //  TAB: Réclamations
  // ═══════════════════════════════════════════════════════════════════

  const renderComplaints = () => {
    if (loading) return renderLoading();
    if (complaints.length === 0) return renderEmpty('Aucune réclamation trouvée.');

    return (
      <div className="overflow-x-auto rounded-xl border bg-[hsl(var(--card))]">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b bg-[hsl(var(--muted))]/30">
              <th className="px-4 py-3 text-left font-semibold">Date</th>
              <th className="px-4 py-3 text-left font-semibold">Chambre</th>
              <th className="px-4 py-3 text-left font-semibold">Client</th>
              <th className="px-4 py-3 text-left font-semibold">Catégorie</th>
              <th className="px-4 py-3 text-left font-semibold">Message (staff)</th>
              <th className="px-4 py-3 text-left font-semibold">Assigné à</th>
              <th className="px-4 py-3 text-left font-semibold">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[hsl(var(--border))]">
            {complaints.map((c) => (
              <tr key={c.id} className="hover:bg-[hsl(var(--accent))]/50 transition-colors">
                <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(c.createdAt)}</td>
                <td className="px-4 py-3 font-semibold">{c.room?.roomNumber || '—'}</td>
                <td className="px-4 py-3">
                  {c.reservation
                    ? `${c.reservation.guestFirstName} ${c.reservation.guestLastName}`
                    : '—'}
                </td>
                <td className="px-4 py-3">{categoryLabels[c.category] || c.category}</td>
                <td className="px-4 py-3 max-w-[200px] truncate" title={c.staffMessage || c.originalMessage}>
                  {c.staffMessage || c.originalMessage}
                </td>
                <td className="px-4 py-3">{c.assignedTo?.name || '—'}</td>
                <td className="px-4 py-3"><Badge status={c.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════
  //  TAB: QR Codes
  // ═══════════════════════════════════════════════════════════════════

  const renderQrTab = () => {
    if (loading) return renderLoading();

    const checkedInReservations = reservations.filter((r) => r.status === 'CHECKED_IN');

    return (
      <div className="space-y-6">
        {/* Client room links */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
            🔗 Liens Client Chambre (CHECKED_IN)
          </h3>
          {checkedInReservations.length === 0 ? (
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              Aucune réservation en CHECKED_IN actuellement.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {checkedInReservations.map((r) => (
                <div key={r.id} className="rounded-xl border bg-[hsl(var(--card))] p-4 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold">{r.guestFirstName} {r.guestLastName}</p>
                      <p className="text-[10px] text-[hsl(var(--muted-foreground))] font-mono">{r.reservationNumber}</p>
                    </div>
                    <span className="text-[10px] font-semibold">Ch. {r.room?.roomNumber || '—'}</span>
                  </div>
                  <button
                    onClick={() => handleGenerateClientQr(r.id, r.reservationNumber)}
                    disabled={qrLoading}
                    className="w-full h-8 rounded-md bg-indigo-600 text-white text-[10px] font-semibold shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    {qrLoading ? 'Génération…' : '📱 Générer QR Client'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════
  //  QR Modal
  // ═══════════════════════════════════════════════════════════════════

  const renderQrModal = () => {
    if (!qrValue) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
        <div className="w-full max-w-sm rounded-2xl border bg-[hsl(var(--card))] p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
          <div className="text-center space-y-1">
            <h3 className="text-base font-bold">{qrTitle}</h3>
            <p className="text-[10px] text-[hsl(var(--muted-foreground))]">Scannez ce code ou copiez le lien</p>
          </div>

          <div className="flex justify-center p-4 bg-white rounded-xl">
            <QRCodeSVG value={qrValue} size={200} level="H" includeMargin />
          </div>

          <div className="rounded-lg border bg-[hsl(var(--muted))]/20 p-3">
            <p className="text-[10px] font-mono break-all text-[hsl(var(--muted-foreground))]">{qrValue}</p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => copyToClipboard(qrValue)}
              className="flex-1 h-9 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors"
            >
              📋 Copier
            </button>
            <button
              onClick={() => { setQrValue(''); setQrTitle(''); }}
              className="flex-1 h-9 rounded-lg border text-xs font-medium hover:bg-[hsl(var(--accent))] transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════
  //  Main render
  // ═══════════════════════════════════════════════════════════════════

  const renderTabContent = () => {
    switch (activeTab) {
      case 'reservations': return renderReservations();
      case 'rooms': return renderRooms();
      case 'fiches': return renderFiches();
      case 'complaints': return renderComplaints();
      case 'qr': return renderQrTab();
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight">Dashboard Réception</h1>
        <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
          Vue d'ensemble des réservations, chambres, réclamations et QR codes.
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
          <div className="flex items-start gap-2">
            <span className="text-sm">⚠️</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-1 rounded-xl border bg-[hsl(var(--muted))]/20 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 min-w-[100px] h-9 rounded-lg text-xs font-medium transition-all duration-200 ${
              activeTab === tab.key
                ? 'bg-[hsl(var(--card))] shadow-sm text-[hsl(var(--foreground))] font-semibold'
                : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
            }`}
          >
            <span className="mr-1">{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {renderTabContent()}

      {/* QR Modal */}
      {renderQrModal()}
    </div>
  );
};
