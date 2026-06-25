import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  listReservations,
  listRooms,
  listComplaints,
  generateClientRoomLink,
  generateWorkerQr,
  getCheckinQrUrl,
  listGuestConversations,
  getGuestConversation,
  replyToGuest,
  listEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  getGuestForms,
} from '../../api/staffApi';
import type { ApiError } from '../../api/apiClient';
import { connectStaffSocket, disconnectSocket, getSocket } from '../../api/socketClient';
import {
  StatusBadge,
  CategoryBadge,
  LoadingSpinner,
  EmptyState,
  ErrorMessage,
  QRCodeCard,
} from '../../components';
import { TabNav } from '../../components/ui/TabNav';
import { StatCard } from '../../components/ui/StatCard';
import { resolveEventImageUrl } from '../../utils/imageUrl';

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
  adultsCount?: number;
  childrenCount?: number;
  totalGuests?: number;
  checkinCompletionStatus?: string;
  _count?: { guestForms: number };
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

interface GuestFormEntry {
  id: string;
  travelerIndex: number;
  travelerType: 'ADULT' | 'CHILD';
  isCompleted: boolean;
  fullName: string;
  nationality: string;
  passportMasked: string | null;
  phone: string | null;
  address: string | null;
  submittedAt: string;
}

interface GuestFormsDetail {
  reservation: {
    id: string;
    reservationNumber: string;
    guestFirstName: string;
    guestLastName: string;
    guestEmail: string | null;
    guestPhone: string | null;
    nationality: string | null;
    checkInDate: string;
    checkOutDate: string;
    status: string;
    adultsCount: number;
    childrenCount: number;
    totalGuests: number;
    checkinCompletionStatus: string;
    room: { id: string; roomNumber: string; type: string } | null;
  };
  guestForms: GuestFormEntry[];
}

// ─── Tabs ────────────────────────────────────────────────────────────

type Tab = 'reservations' | 'rooms' | 'fiches' | 'complaints' | 'qr' | 'messages' | 'events';

const tabs: { key: Tab; label: string; icon: string }[] = [
  { key: 'reservations', label: 'Réservations', icon: '📋' },
  { key: 'rooms', label: 'Chambres', icon: '🚪' },
  { key: 'fiches', label: 'Fiches voyageurs', icon: '🛂' },
  { key: 'complaints', label: 'Réclamations', icon: '📢' },
  { key: 'messages', label: 'Messages', icon: '💬' },
  { key: 'events', label: 'Événements', icon: '🎉' },
  { key: 'qr', label: 'QR Codes', icon: '📱' },
];

// ─── Helpers ─────────────────────────────────────────────────────────

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

// ─── Main Component ──────────────────────────────────────────────────

export const ReceptionDashboard: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Read initial tab from URL ?tab= param
  const urlTab = searchParams.get('tab') as Tab | null;
  const [activeTab, setActiveTab] = useState<Tab>(
    urlTab && tabs.find(t => t.key === urlTab) ? urlTab : 'reservations'
  );

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

  // Check-in QR
  const [checkinUrl, setCheckinUrl] = useState('');

  // Guest messages
  interface Conversation {
    reservationId: string;
    reservationNumber: string;
    guestName: string;
    roomNumber: string;
    lastMessage: { senderType: string; staffMessage: string; createdAt: string; readAt: string | null } | null;
    unreadCount: number;
  }
  interface GuestMsg {
    id: string;
    senderType: 'CLIENT' | 'STAFF';
    staffMessage: string;
    clientMessage: string;
    originalMessage: string;
    detectedLanguage: string | null;
    createdAt: string;
    senderUser?: { name: string } | null;
  }
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [conversationMessages, setConversationMessages] = useState<GuestMsg[]>([]);
  const [replyText, setReplyText] = useState('');
  const [replySending, setReplySending] = useState(false);

  // Events
  interface HotelEvent {
    id: string;
    title: string;
    description: string;
    eventDate: string;
    imageUrl: string | null;
    isPublished: boolean;
    createdAt: string;
    createdBy?: { name: string } | null;
  }
  const [events, setEvents] = useState<HotelEvent[]>([]);
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<HotelEvent | null>(null);
  const [eventForm, setEventForm] = useState({ title: '', description: '', eventDate: '', isPublished: false });
  const [eventImage, setEventImage] = useState<File | null>(null);
  const [eventSaving, setEventSaving] = useState(false);

  // Fiches voyageurs — search / filter / modal
  const [ficheSearch, setFicheSearch] = useState('');
  const [ficheRoomFilter, setFicheRoomFilter] = useState('');
  const [ficheStatusFilter, setFicheStatusFilter] = useState('');
  const [ficheDetail, setFicheDetail] = useState<GuestFormsDetail | null>(null);
  const [ficheDetailLoading, setFicheDetailLoading] = useState(false);
  const [ficheDetailError, setFicheDetailError] = useState('');
  const [ficheRefreshing, setFicheRefreshing] = useState(false);

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
        case 'messages': {
          const res = await listGuestConversations();
          setConversations(res.data || []);
          break;
        }
        case 'events': {
          const res = await listEvents();
          setEvents(res.data || []);
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

  // Refresh only fiches section without full reload
  const handleFicheRefresh = async () => {
    setFicheRefreshing(true);
    setError('');
    try {
      const res = await listReservations();
      setReservations(res.data || []);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.error || 'Erreur lors du rafraîchissement.');
    } finally {
      setFicheRefreshing(false);
    }
  };

  // Open fiche detail modal
  const handleOpenFicheDetail = async (reservationId: string) => {
    setFicheDetail(null);
    setFicheDetailError('');
    setFicheDetailLoading(true);
    try {
      const res = await getGuestForms(reservationId);
      setFicheDetail(res.data);
    } catch (err) {
      const apiErr = err as ApiError;
      setFicheDetailError(apiErr.error || 'Impossible de charger les fiches.');
    } finally {
      setFicheDetailLoading(false);
    }
  };

  useEffect(() => {
    // Sync local tab when sidebar changes URL param
    const t = searchParams.get('tab') as Tab | null;
    if (t && tabs.find(tab => tab.key === t) && t !== activeTab) {
      setActiveTab(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    fetchData(activeTab);
  }, [activeTab, fetchData]);

  // Sync URL when tab changes via TabNav click
  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setSearchParams({ tab }, { replace: true });
  };

  // ── Socket.IO real-time ──────────────────────────────────────────

  const [socketConnected, setSocketConnected] = useState(false);
  const activeConvRef = useRef(activeConversation);
  activeConvRef.current = activeConversation;

  useEffect(() => {
    try {
      const socket = connectStaffSocket();

      socket.on('connect', () => setSocketConnected(true));
      socket.on('disconnect', () => setSocketConnected(false));

      // New guest message arrives in an open conversation
      socket.on('guest:new_message', (msg: any) => {
        setConversationMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, {
            id: msg.id,
            senderType: msg.senderType,
            staffMessage: msg.staffMessage,
            clientMessage: msg.clientMessage,
            originalMessage: msg.staffMessage,
            detectedLanguage: null,
            createdAt: msg.createdAt,
          }];
        });
      });

      // A conversation was updated (refresh list)
      socket.on('guest:conversation_updated', () => {
        // Refresh conversations list
        listGuestConversations().then((res) => {
          setConversations(res.data || []);
        }).catch(() => {});
      });

      return () => {
        disconnectSocket();
      };
    } catch {
      console.warn('[Socket] Could not connect, using REST fallback');
    }
  }, []);

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

  const handleGetCheckinUrl = async () => {
    setQrLoading(true);
    setError('');
    try {
      const res = await getCheckinQrUrl();
      setCheckinUrl(res.data.url);
      setQrValue(res.data.url);
      setQrTitle('QR Check-in Public');
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.error || 'Erreur lors de la récupération du lien check-in.');
    } finally {
      setQrLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  //  TAB: Réservations
  // ═══════════════════════════════════════════════════════════════════

  const renderReservations = () => {
    if (loading) return <LoadingSpinner message="Chargement des réservations..." />;
    if (reservations.length === 0) {
      return (
        <EmptyState
          message="Aucune réservation trouvée"
          icon="📋"
          description="Il n'y a actuellement aucune réservation enregistrée dans le système."
        />
      );
    }

    return (
      <div className="overflow-x-auto rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30 text-[hsl(var(--muted-foreground))]">
              <th className="px-4 py-3 text-left font-semibold">N° Réservation</th>
              <th className="px-4 py-3 text-left font-semibold">Client</th>
              <th className="px-4 py-3 text-left font-semibold">Chambre</th>
              <th className="px-4 py-3 text-left font-semibold">Voyageurs</th>
              <th className="px-4 py-3 text-left font-semibold">Fiches</th>
              <th className="px-4 py-3 text-left font-semibold">Arrivée</th>
              <th className="px-4 py-3 text-left font-semibold">Départ</th>
              <th className="px-4 py-3 text-left font-semibold">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[hsl(var(--border))] text-[hsl(var(--foreground))]">
            {reservations.map((r) => {
              const total = r.totalGuests ?? 1;
              const filled = r._count?.guestForms ?? 0;
              const cStatus = r.checkinCompletionStatus ?? 'NOT_STARTED';
              return (
              <tr key={r.id} className="hover:bg-[hsl(var(--accent))]/50 transition-colors">
                <td className="px-4 py-3 font-mono font-semibold">{r.reservationNumber}</td>
                <td className="px-4 py-3 font-medium">{r.guestFirstName} {r.guestLastName}</td>
                <td className="px-4 py-3 font-semibold">{r.room?.roomNumber || '—'}</td>
                <td className="px-4 py-3">
                  <span className="text-[10px]">
                    {r.adultsCount ?? 1}A{(r.childrenCount ?? 0) > 0 ? ` + ${r.childrenCount}E` : ''}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    cStatus === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' :
                    cStatus === 'PARTIAL' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' :
                    'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                  }`}>
                    {filled}/{total}
                  </span>
                </td>
                <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]">{formatDate(r.checkInDate)}</td>
                <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]">{formatDate(r.checkOutDate)}</td>
                <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════
  //  TAB: Chambres
  // ═══════════════════════════════════════════════════════════════════

  const renderRooms = () => {
    if (loading) return <LoadingSpinner message="Chargement des chambres..." />;
    if (rooms.length === 0) {
      return (
        <EmptyState
          message="Aucune chambre trouvée"
          icon="🚪"
          description="La liste des chambres de l'établissement est vide."
        />
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {rooms.map((room) => (
          <div key={room.id} className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-sm space-y-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[hsl(var(--foreground))]">Chambre {room.roomNumber}</h3>
                <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">Étage {room.floor} · {room.type}</p>
              </div>
              <StatusBadge status={room.status} />
            </div>
            <button
              onClick={() => handleGenerateWorkerQr(room.id, room.roomNumber)}
              className="w-full h-8 rounded-lg border border-[hsl(var(--border))] text-[10px] font-semibold text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))] transition-colors cursor-pointer"
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
    if (loading) return <LoadingSpinner message="Chargement des fiches voyageurs..." />;

    // All reservations regardless of status (filter below)
    const allRes = reservations;

    // --- Search & filter ---
    const filtered = allRes.filter((r) => {
      const fullName = `${r.guestFirstName} ${r.guestLastName}`.toLowerCase();
      const resNum = r.reservationNumber.toLowerCase();
      const q = ficheSearch.toLowerCase().trim();

      const matchSearch = !q || fullName.includes(q) || resNum.includes(q);
      const matchRoom = !ficheRoomFilter || (r.room?.roomNumber || '') === ficheRoomFilter;
      const matchStatus = !ficheStatusFilter || r.checkinCompletionStatus === ficheStatusFilter;
      return matchSearch && matchRoom && matchStatus;
    });

    // Unique room numbers for filter dropdown
    const roomNumbers = Array.from(
      new Set(reservations.map((r) => r.room?.roomNumber).filter(Boolean) as string[])
    ).sort();

    const completionStatusLabel = (s?: string) => {
      if (s === 'COMPLETED') return { label: 'Complète', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', icon: '✅' };
      if (s === 'PARTIAL')   return { label: 'Partielle', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300', icon: '🟡' };
      return { label: 'Non commencée', cls: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400', icon: '⬜' };
    };

    return (
      <div className="space-y-4">
        {/* ── Toolbar ───────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] text-xs select-none">🔍</span>
            <input
              type="text"
              value={ficheSearch}
              onChange={(e) => setFicheSearch(e.target.value)}
              placeholder="Rechercher par nom ou N° réservation..."
              className="w-full h-9 pl-8 pr-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-xs placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
            />
          </div>

          {/* Room filter */}
          <select
            value={ficheRoomFilter}
            onChange={(e) => setFicheRoomFilter(e.target.value)}
            className="h-9 px-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-xs text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
          >
            <option value="">Toutes les chambres</option>
            {roomNumbers.map((rn) => (
              <option key={rn} value={rn}>Ch. {rn}</option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={ficheStatusFilter}
            onChange={(e) => setFicheStatusFilter(e.target.value)}
            className="h-9 px-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-xs text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
          >
            <option value="">Tous les statuts</option>
            <option value="COMPLETED">Complète</option>
            <option value="PARTIAL">Partielle</option>
            <option value="NOT_STARTED">Non commencée</option>
          </select>

          {/* Refresh */}
          <button
            onClick={handleFicheRefresh}
            disabled={ficheRefreshing}
            className="h-9 px-4 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-xs font-semibold hover:bg-[hsl(var(--accent))] disabled:opacity-50 transition-colors cursor-pointer shrink-0 flex items-center gap-1.5"
          >
            <span className={ficheRefreshing ? 'animate-spin inline-block' : ''}>🔄</span>
            {ficheRefreshing ? 'Chargement...' : 'Rafraîchir'}
          </button>
        </div>

        {/* Result count */}
        <p className="text-[10px] text-[hsl(var(--muted-foreground))]"
        >{filtered.length} résultat{filtered.length !== 1 ? 's' : ''} sur {allRes.length} réservations</p>

        {/* ── List ──────────────────────────────────────────────── */}
        {filtered.length === 0 ? (
          <EmptyState
            message="Aucune fiche trouvée"
            icon="🛂"
            description="Aucune réservation ne correspond aux filtres sélectionnés."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((r) => {
              const total = r.totalGuests ?? 1;
              const filled = r._count?.guestForms ?? 0;
              const cStatus = r.checkinCompletionStatus ?? 'NOT_STARTED';
              const { label: csLabel, cls: csCls, icon: csIcon } = completionStatusLabel(cStatus);
              return (
                <div
                  key={r.id}
                  className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-sm space-y-4 hover:shadow-md transition-shadow"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 border-b border-[hsl(var(--border))] pb-3">
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-[hsl(var(--foreground))] truncate">
                        {r.guestFirstName} {r.guestLastName}
                      </h3>
                      <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5 font-mono">
                        {r.reservationNumber} · Chambre {r.room?.roomNumber || '—'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${csCls}`}>
                        {csIcon} {filled}/{total} {csLabel}
                      </span>
                      <StatusBadge status={r.status} />
                    </div>
                  </div>

                  {/* Info grid */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Voyageurs</span>
                      <p className="font-medium text-[hsl(var(--foreground))] mt-0.5">
                        {r.adultsCount ?? 1} adulte{(r.adultsCount ?? 1) > 1 ? 's' : ''}
                        {(r.childrenCount ?? 0) > 0 ? ` + ${r.childrenCount} enfant${(r.childrenCount ?? 0) > 1 ? 's' : ''}` : ''}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Nationalité</span>
                      <p className="font-medium text-[hsl(var(--foreground))] mt-0.5">{r.nationality || '—'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Arrivée</span>
                      <p className="font-medium text-[hsl(var(--foreground))] mt-0.5">{formatDate(r.checkInDate)}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Départ</span>
                      <p className="font-medium text-[hsl(var(--foreground))] mt-0.5">{formatDate(r.checkOutDate)}</p>
                    </div>
                  </div>

                  {/* Voir fiches button */}
                  <button
                    onClick={() => handleOpenFicheDetail(r.id)}
                    className="w-full h-9 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 text-white text-xs font-bold shadow-sm hover:from-amber-600 hover:to-amber-700 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    🛂 Voir les fiches voyageurs ({filled}/{total})
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Fiche detail modal ─────────────────────────────────── */}
        {(ficheDetail !== null || ficheDetailLoading) && (
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={(e) => { if (e.target === e.currentTarget) { setFicheDetail(null); setFicheDetailError(''); } }}
          >
            <div className="bg-[hsl(var(--card))] rounded-2xl shadow-2xl border border-[hsl(var(--border))] w-full max-w-2xl max-h-[90vh] flex flex-col">
              {/* Modal header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))] shrink-0">
                <div>
                  <h2 className="text-base font-bold text-[hsl(var(--foreground))]">Fiches voyageurs</h2>
                  {ficheDetail && (
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5 font-mono">
                      {ficheDetail.reservation.reservationNumber} · {ficheDetail.reservation.guestFirstName} {ficheDetail.reservation.guestLastName}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => { setFicheDetail(null); setFicheDetailError(''); }}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Modal body */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
                {ficheDetailLoading && <LoadingSpinner message="Chargement des fiches..." />}

                {ficheDetailError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-900/30 dark:bg-red-950/20 p-4 text-xs text-red-700 dark:text-red-300">
                    {ficheDetailError}
                  </div>
                )}

                {ficheDetail && (
                  <>
                    {/* Reservation summary */}
                    <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/20 p-4 space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Réservation</h3>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
                        <div>
                          <span className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))] uppercase">N° Réservation</span>
                          <p className="font-mono font-bold">{ficheDetail.reservation.reservationNumber}</p>
                        </div>
                        <div>
                          <span className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))] uppercase">Chambre</span>
                          <p className="font-bold">{ficheDetail.reservation.room?.roomNumber || '—'} {ficheDetail.reservation.room?.type ? `(${ficheDetail.reservation.room.type})` : ''}</p>
                        </div>
                        <div>
                          <span className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))] uppercase">Arrivée</span>
                          <p className="font-medium">{formatDate(ficheDetail.reservation.checkInDate)}</p>
                        </div>
                        <div>
                          <span className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))] uppercase">Départ</span>
                          <p className="font-medium">{formatDate(ficheDetail.reservation.checkOutDate)}</p>
                        </div>
                        <div>
                          <span className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))] uppercase">Statut check-in</span>
                          <p className="font-medium">{ficheDetail.reservation.checkinCompletionStatus}</p>
                        </div>
                        <div>
                          <span className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))] uppercase">Voyageurs</span>
                          <p className="font-medium">{ficheDetail.reservation.adultsCount}A + {ficheDetail.reservation.childrenCount}E = {ficheDetail.reservation.totalGuests}</p>
                        </div>
                        {ficheDetail.reservation.guestEmail && (
                          <div className="col-span-2">
                            <span className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))] uppercase">Email</span>
                            <p className="font-medium">{ficheDetail.reservation.guestEmail}</p>
                          </div>
                        )}
                        {ficheDetail.reservation.guestPhone && (
                          <div>
                            <span className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))] uppercase">Téléphone</span>
                            <p className="font-medium">{ficheDetail.reservation.guestPhone}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Guest forms */}
                    {ficheDetail.guestForms.length === 0 ? (
                      <EmptyState
                        message="Aucune fiche soumise"
                        icon="🛂"
                        description="Aucun voyageur n'a encore rempli sa fiche pour cette réservation."
                      />
                    ) : (
                      <div className="space-y-4">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]"
                        >Fiches soumises ({ficheDetail.guestForms.length}/{ficheDetail.reservation.totalGuests})</h3>

                        {ficheDetail.guestForms.map((form) => (
                          <div
                            key={form.id}
                            className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 shadow-sm space-y-3"
                          >
                            {/* Form header */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-white text-xs font-bold flex items-center justify-center shadow-sm shrink-0">
                                  {form.travelerIndex}
                                </span>
                                <div>
                                  <p className="text-sm font-bold text-[hsl(var(--foreground))]">{form.fullName}</p>
                                  <p className="text-[10px] text-[hsl(var(--muted-foreground))]">
                                    {form.travelerType === 'ADULT' ? '👤 Adulte' : '👶 Enfant'}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5">
                                {form.isCompleted ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                                    ✅ Soumise
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                                    ⏳ En attente
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Form fields */}
                            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs pt-2 border-t border-[hsl(var(--border))]/60">
                              <div>
                                <span className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Nationalité</span>
                                <p className="font-medium mt-0.5">{form.nationality || '—'}</p>
                              </div>
                              <div>
                                <span className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Passeport</span>
                                <p className="font-mono font-medium mt-0.5">
                                  {form.passportMasked
                                    ? <span className="inline-flex items-center gap-1">
                                        <span className="text-[hsl(var(--foreground))]">{form.passportMasked}</span>
                                        <span className="text-[9px] text-[hsl(var(--muted-foreground))]">(masqué)</span>
                                      </span>
                                    : <span className="text-[hsl(var(--muted-foreground))]">Non fourni</span>
                                  }
                                </p>
                              </div>
                              {form.phone && (
                                <div>
                                  <span className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Téléphone</span>
                                  <p className="font-medium mt-0.5">{form.phone}</p>
                                </div>
                              )}
                              {form.address && (
                                <div className="col-span-2">
                                  <span className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Adresse</span>
                                  <p className="font-medium mt-0.5">{form.address}</p>
                                </div>
                              )}
                              <div className="col-span-2">
                                <span className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Soumis le</span>
                                <p className="font-medium mt-0.5">{formatDateTime(form.submittedAt)}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Modal footer */}
              <div className="px-6 py-4 border-t border-[hsl(var(--border))] shrink-0 flex justify-end">
                <button
                  onClick={() => { setFicheDetail(null); setFicheDetailError(''); }}
                  className="h-9 px-6 rounded-lg bg-[hsl(var(--muted))] text-xs font-bold hover:bg-[hsl(var(--accent))] transition-colors cursor-pointer"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════
  //  TAB: Réclamations
  // ═══════════════════════════════════════════════════════════════════

  const renderComplaints = () => {
    if (loading) return <LoadingSpinner message="Chargement des réclamations..." />;
    if (complaints.length === 0) {
      return (
        <EmptyState
          message="Aucune réclamation"
          icon="📢"
          description="Aucune réclamation signalée pour le moment."
        />
      );
    }

    return (
      <div className="overflow-x-auto rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30 text-[hsl(var(--muted-foreground))]">
              <th className="px-4 py-3 text-left font-semibold">Date</th>
              <th className="px-4 py-3 text-left font-semibold">Chambre</th>
              <th className="px-4 py-3 text-left font-semibold">Client</th>
              <th className="px-4 py-3 text-left font-semibold">Catégorie</th>
              <th className="px-4 py-3 text-left font-semibold">Message (staff)</th>
              <th className="px-4 py-3 text-left font-semibold">Assigné à</th>
              <th className="px-4 py-3 text-left font-semibold">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[hsl(var(--border))] text-[hsl(var(--foreground))]">
            {complaints.map((c) => (
              <tr key={c.id} className="hover:bg-[hsl(var(--accent))]/50 transition-colors">
                <td className="px-4 py-3 whitespace-nowrap text-[hsl(var(--muted-foreground))]">{formatDateTime(c.createdAt)}</td>
                <td className="px-4 py-3 font-semibold">Ch. {c.room?.roomNumber || '—'}</td>
                <td className="px-4 py-3 font-medium">
                  {c.reservation
                    ? `${c.reservation.guestFirstName} ${c.reservation.guestLastName}`
                    : '—'}
                </td>
                <td className="px-4 py-3"><CategoryBadge category={c.category} /></td>
                <td className="px-4 py-3 max-w-[200px] truncate font-medium" title={c.staffMessage || c.originalMessage}>
                  {c.staffMessage || c.originalMessage}
                </td>
                <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]">{c.assignedTo?.name || '—'}</td>
                <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
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
    if (loading) return <LoadingSpinner message="Chargement des QR codes..." />;

    const checkedInReservations = reservations.filter((r) => r.status === 'CHECKED_IN');

    return (
      <div className="space-y-6">
        {/* Check-in QR */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
            🏨 QR Check-in Public
          </h3>
          <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 shadow-sm space-y-4">
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              Ce QR code ouvre la page de check-in pour les clients. Le lien est sécurisé par un token valable <strong>24h</strong>. Cliquez pour générer un nouveau QR.
            </p>
            {!checkinUrl ? (
              <button
                onClick={handleGetCheckinUrl}
                disabled={qrLoading}
                className="h-9 px-4 rounded-lg bg-emerald-600 text-white text-xs font-bold shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {qrLoading ? 'Chargement…' : '🏨 Afficher QR check-in'}
              </button>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-2 rounded-lg bg-[hsl(var(--muted))]/40">
                  <span className="text-xs font-mono text-[hsl(var(--foreground))] truncate flex-1">{checkinUrl}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(checkinUrl);
                    }}
                    className="shrink-0 h-7 px-3 rounded-md bg-[hsl(var(--card))] border border-[hsl(var(--border))] text-[10px] font-bold text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))] transition-colors cursor-pointer"
                  >
                    📋 Copier le lien
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setQrValue(checkinUrl);
                      setQrTitle('QR Check-in Public');
                    }}
                    className="h-8 px-3 rounded-lg bg-indigo-600 text-white text-[10px] font-bold shadow-sm hover:bg-indigo-700 transition-colors cursor-pointer"
                  >
                    📱 Afficher le QR code
                  </button>
                  <button
                    onClick={() => {
                      setCheckinUrl('');
                      handleGetCheckinUrl();
                    }}
                    disabled={qrLoading}
                    className="h-8 px-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[10px] font-bold hover:bg-[hsl(var(--accent))] disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    🔄 Regénérer (nouveau token)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Client room links */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
            🔗 Liens Client Chambre (CHECKED_IN)
          </h3>
          {checkedInReservations.length === 0 ? (
            <EmptyState
              message="Aucune réservation en cours"
              icon="📱"
              description="Aucune réservation avec le statut Arrivé (In) pour générer des QR codes clients."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {checkedInReservations.map((r) => (
                <div key={r.id} className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 shadow-sm space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-[hsl(var(--border))]">
                    <div>
                      <p className="text-xs font-bold text-[hsl(var(--foreground))]">{r.guestFirstName} {r.guestLastName}</p>
                      <p className="text-[10px] text-[hsl(var(--muted-foreground))] font-mono mt-0.5">{r.reservationNumber}</p>
                    </div>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]">Ch. {r.room?.roomNumber || '—'}</span>
                  </div>
                  <button
                    onClick={() => handleGenerateClientQr(r.id, r.reservationNumber)}
                    disabled={qrLoading}
                    className="w-full h-8 rounded-lg bg-indigo-600 text-white text-[10px] font-bold shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors cursor-pointer"
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
  //  TAB: Messages Clients
  // ═══════════════════════════════════════════════════════════════════

  const handleOpenConversation = async (reservationId: string) => {
    setActiveConversation(reservationId);
    setConversationMessages([]);
    setReplyText('');

    // Optimistically clear unread badge — no mark-as-read API exists,
    // but staff clearly reads when they open the conversation.
    setConversations(prev =>
      prev.map(c =>
        c.reservationId === reservationId ? { ...c, unreadCount: 0 } : c
      )
    );

    // Join socket room for this conversation
    const socket = getSocket();
    if (socket?.connected) {
      socket.emit('staff:join_conversation', { reservationId });
    }

    try {
      const res = await getGuestConversation(reservationId);
      setConversationMessages(res.data || []);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.error || 'Erreur lors du chargement de la conversation.');
    }
  };

  const handleRefreshConversation = async () => {
    if (!activeConversation) return;
    try {
      const res = await getGuestConversation(activeConversation);
      setConversationMessages(res.data || []);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.error || 'Erreur lors du rafraîchissement.');
    }
  };

  const handleSendReply = async () => {
    if (!activeConversation || !replyText.trim()) return;
    setReplySending(true);
    setError('');

    const socket = getSocket();
    if (socket?.connected) {
      // Send via WebSocket
      socket.emit('staff:reply_guest', {
        reservationId: activeConversation,
        message: replyText.trim(),
      }, (res: any) => {
        if (res?.success) {
          setReplyText('');
          // Keep unread at 0 after reply (staff is clearly reading)
          setConversations(prev =>
            prev.map(c =>
              c.reservationId === activeConversation ? { ...c, unreadCount: 0 } : c
            )
          );
        } else {
          setError(res?.error || "Erreur lors de l'envoi.");
        }
        setReplySending(false);
      });
    } else {
      // REST fallback
      try {
        await replyToGuest(activeConversation, replyText.trim());
        setReplyText('');
        // Keep unread at 0 after reply
        setConversations(prev =>
          prev.map(c =>
            c.reservationId === activeConversation ? { ...c, unreadCount: 0 } : c
          )
        );
        await handleRefreshConversation();
      } catch (err) {
        const apiErr = err as ApiError;
        setError(apiErr.error || "Erreur lors de l'envoi.");
      } finally {
        setReplySending(false);
      }
    }
  };

  const renderMessages = () => {
    if (loading) return <LoadingSpinner message="Chargement des messages..." />;

    // Conversation detail view
    if (activeConversation) {
      const conv = conversations.find((c) => c.reservationId === activeConversation);
      return (
        <div className="space-y-4">
          {/* Back + header */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveConversation(null)}
              className="h-8 px-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-xs font-semibold hover:bg-[hsl(var(--accent))] transition-colors cursor-pointer"
            >
              ← Retour
            </button>
            <div className="flex-1">
              <p className="text-xs font-bold">{conv?.guestName || '—'}</p>
              <p className="text-[10px] text-[hsl(var(--muted-foreground))] font-mono">
                {conv?.reservationNumber} — Ch. {conv?.roomNumber}
              </p>
            </div>
            <button
              onClick={handleRefreshConversation}
              className="h-8 px-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-xs font-semibold hover:bg-[hsl(var(--accent))] transition-colors cursor-pointer"
            >
              🔄 Rafraîchir
            </button>
          </div>

          {/* Messages */}
          <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm overflow-hidden">
            <div className="h-[350px] overflow-y-auto p-4 space-y-2">
              {conversationMessages.length === 0 ? (
                <EmptyState message="Aucun message" icon="💬" />
              ) : (
                conversationMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.senderType === 'STAFF' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                        msg.senderType === 'STAFF'
                          ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-br-sm'
                          : 'bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] rounded-bl-sm'
                      }`}
                    >
                      {msg.senderType === 'CLIENT' && (
                        <p className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))] mb-1">
                          👤 Client {msg.detectedLanguage ? `(${msg.detectedLanguage})` : ''}
                        </p>
                      )}
                      {msg.senderType === 'STAFF' && msg.senderUser && (
                        <p className="text-[10px] font-semibold text-white/80 mb-1">
                          🏨 {msg.senderUser.name}
                        </p>
                      )}
                      <p className="whitespace-pre-wrap font-medium">{msg.staffMessage}</p>
                      {msg.senderType === 'CLIENT' && msg.originalMessage !== msg.staffMessage && (
                        <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-1 italic border-t border-[hsl(var(--border))]/50 pt-1">
                          Original : {msg.originalMessage}
                        </p>
                      )}
                      <p className={`text-[9px] mt-1 text-right ${
                        msg.senderType === 'STAFF' ? 'text-white/70' : 'text-[hsl(var(--muted-foreground))]'
                      }`}>
                        {formatDateTime(msg.createdAt)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Reply input */}
            <div className="border-t border-[hsl(var(--border))] p-3 bg-[hsl(var(--muted))]/20">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendReply(); } }}
                  placeholder="Répondre en français..."
                  maxLength={2000}
                  className="flex-1 h-9 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 text-xs placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                />
                <button
                  onClick={handleSendReply}
                  disabled={replySending || !replyText.trim()}
                  className="shrink-0 h-9 px-4 rounded-lg bg-gradient-to-r from-indigo-500 to-indigo-600 text-white text-xs font-bold shadow-sm hover:from-indigo-600 hover:to-indigo-700 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {replySending ? '…' : '➤ Envoyer'}
                </button>
              </div>
              <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-1">
                💡 Votre réponse sera automatiquement traduite dans la langue du client.
              </p>
            </div>
          </div>
        </div>
      );
    }

    // Conversations list view
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider flex items-center gap-2">
            💬 Conversations avec les clients
            {socketConnected && (
              <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 normal-case tracking-normal">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                en direct
              </span>
            )}
          </h3>
          <button
            onClick={() => fetchData('messages')}
            className="h-7 px-3 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[10px] font-bold hover:bg-[hsl(var(--accent))] transition-colors cursor-pointer"
          >
            🔄 Rafraîchir
          </button>
        </div>

        {conversations.length === 0 ? (
          <EmptyState
            message="Aucune conversation"
            icon="💬"
            description="Les clients n'ont pas encore envoyé de messages."
          />
        ) : (
          <div className="space-y-2">
            {conversations.map((conv) => (
              <button
                key={conv.reservationId}
                onClick={() => handleOpenConversation(conv.reservationId)}
                className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 shadow-sm hover:shadow-md hover:border-[hsl(var(--primary))]/30 transition-all text-left cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold">{conv.guestName}</span>
                    {conv.unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[9px] font-bold">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]">
                    Ch. {conv.roomNumber}
                  </span>
                </div>
                <p className="text-[10px] text-[hsl(var(--muted-foreground))] font-mono mb-1">
                  {conv.reservationNumber}
                </p>
                {conv.lastMessage && (
                  <p className="text-[10px] text-[hsl(var(--muted-foreground))] truncate">
                    {conv.lastMessage.senderType === 'CLIENT' ? '👤 ' : '🏨 '}
                    {conv.lastMessage.staffMessage}
                  </p>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════
  //  TAB: Événements
  // ═══════════════════════════════════════════════════════════════════

  // ── Event image helper (per-card error state handled inline via React) ──

  const handleOpenEventForm = (event?: HotelEvent) => {
    if (event) {
      setEditingEvent(event);
      setEventForm({
        title: event.title,
        description: event.description,
        eventDate: event.eventDate.slice(0, 16),
        isPublished: event.isPublished,
      });
    } else {
      setEditingEvent(null);
      setEventForm({ title: '', description: '', eventDate: '', isPublished: false });
    }
    setEventImage(null);
    setShowEventForm(true);
  };

  const handleSaveEvent = async () => {
    if (!eventForm.title || !eventForm.description || !eventForm.eventDate) {
      setError('Veuillez remplir tous les champs obligatoires.');
      return;
    }
    setEventSaving(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('title', eventForm.title);
      fd.append('description', eventForm.description);
      fd.append('eventDate', new Date(eventForm.eventDate).toISOString());
      fd.append('isPublished', String(eventForm.isPublished));
      if (eventImage) fd.append('image', eventImage);

      if (editingEvent) {
        await updateEvent(editingEvent.id, fd);
      } else {
        await createEvent(fd);
      }

      setShowEventForm(false);
      setEditingEvent(null);
      await fetchData('events');
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.error || 'Erreur lors de la sauvegarde.');
    } finally {
      setEventSaving(false);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm('Supprimer cet événement ?')) return;
    setError('');
    try {
      await deleteEvent(id);
      await fetchData('events');
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.error || 'Erreur lors de la suppression.');
    }
  };

  const handleTogglePublish = async (event: HotelEvent) => {
    setError('');
    try {
      const fd = new FormData();
      fd.append('isPublished', String(!event.isPublished));
      await updateEvent(event.id, fd);
      await fetchData('events');
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.error || 'Erreur lors de la mise à jour.');
    }
  };

  const renderEvents = () => {
    if (loading) return <LoadingSpinner message="Chargement des événements..." />;

    // Event form modal
    if (showEventForm) {
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowEventForm(false)}
              className="h-8 px-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-xs font-semibold hover:bg-[hsl(var(--accent))] transition-colors cursor-pointer"
            >
              ← Retour
            </button>
            <h3 className="text-sm font-bold">
              {editingEvent ? '✏️ Modifier l\'événement' : '➕ Nouvel événement'}
            </h3>
          </div>

          <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 shadow-sm space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                Titre *
              </label>
              <input
                type="text"
                value={eventForm.title}
                onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                className="w-full h-9 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 text-xs focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                placeholder="Soirée Jazz au bord de la piscine"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                Description *
              </label>
              <textarea
                value={eventForm.description}
                onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                rows={3}
                className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                placeholder="Description de l'événement..."
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                Date et heure *
              </label>
              <input
                type="datetime-local"
                value={eventForm.eventDate}
                onChange={(e) => setEventForm({ ...eventForm, eventDate: e.target.value })}
                className="w-full h-9 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 text-xs focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                Image (jpg, png, webp — max 3MB)
              </label>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                onChange={(e) => setEventImage(e.target.files?.[0] || null)}
                className="w-full text-xs file:mr-3 file:h-8 file:rounded-lg file:border-0 file:bg-[hsl(var(--muted))] file:px-3 file:text-xs file:font-bold file:cursor-pointer"
              />
              {/* Preview of newly selected file */}
              {eventImage && (
                <p className="text-[10px] text-[hsl(var(--muted-foreground))]">
                  📷 {eventImage.name} ({(eventImage.size / 1024).toFixed(0)} KB)
                </p>
              )}
              {/* Preview of existing image (edit mode, no new file selected) */}
              {!eventImage && editingEvent?.imageUrl && resolveEventImageUrl(editingEvent.imageUrl) && (
                <div className="mt-2 h-24 w-full rounded-lg overflow-hidden border border-[hsl(var(--border))]">
                  <img
                    src={resolveEventImageUrl(editingEvent.imageUrl)!}
                    alt="Image actuelle"
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.currentTarget.parentElement as HTMLElement).style.display = 'none'; }}
                  />
                </div>
              )}

            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="event-published"
                checked={eventForm.isPublished}
                onChange={(e) => setEventForm({ ...eventForm, isPublished: e.target.checked })}
                className="rounded"
              />
              <label htmlFor="event-published" className="text-xs font-medium cursor-pointer">
                Publier immédiatement
              </label>
            </div>

            <button
              onClick={handleSaveEvent}
              disabled={eventSaving}
              className="w-full h-9 rounded-lg bg-gradient-to-r from-indigo-500 to-indigo-600 text-white text-xs font-bold shadow-sm hover:from-indigo-600 hover:to-indigo-700 disabled:opacity-50 transition-all cursor-pointer"
            >
              {eventSaving ? 'Sauvegarde…' : editingEvent ? '✏️ Modifier' : '➕ Créer l\'événement'}
            </button>
          </div>
        </div>
      );
    }

    // Event list
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
            🎉 Événements de l'hôtel
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() => fetchData('events')}
              className="h-7 px-3 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[10px] font-bold hover:bg-[hsl(var(--accent))] transition-colors cursor-pointer"
            >
              🔄
            </button>
            <button
              onClick={() => handleOpenEventForm()}
              className="h-7 px-3 rounded-md bg-indigo-600 text-white text-[10px] font-bold shadow-sm hover:bg-indigo-700 transition-colors cursor-pointer"
            >
              ➕ Créer
            </button>
          </div>
        </div>

        {events.length === 0 ? (
          <EmptyState
            message="Aucun événement"
            icon="🎉"
            description="Créez votre premier événement !"
          />
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <div
                key={event.id}
                className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm overflow-hidden"
              >
                {/* Event image with fallback placeholder */}
                {resolveEventImageUrl(event.imageUrl) ? (
                  <div className="h-32 overflow-hidden relative">
                    <img
                      src={resolveEventImageUrl(event.imageUrl)!}
                      alt={event.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const el = e.currentTarget;
                        el.style.display = 'none';
                        const parent = el.parentElement;
                        if (parent) {
                          parent.innerHTML = '<div class="h-32 bg-gradient-to-br from-indigo-900/30 to-purple-900/30 flex items-center justify-center"><span class="text-3xl opacity-30">&#127881;</span></div>';
                        }
                      }}
                    />
                  </div>
                ) : (
                  <div className="h-32 bg-gradient-to-br from-indigo-900/30 to-purple-900/30 flex items-center justify-center">
                    <span className="text-3xl opacity-30 select-none">🎉</span>
                  </div>
                )}
                <div className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold truncate">{event.title}</h4>
                      <p className="text-[10px] text-[hsl(var(--muted-foreground))]">
                        📅 {formatDateTime(event.eventDate)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleTogglePublish(event)}
                      className={`shrink-0 px-2 py-0.5 rounded-full text-[9px] font-bold transition-colors cursor-pointer ${
                        event.isPublished
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                      }`}
                    >
                      {event.isPublished ? '✅ Publié' : '⏸️ Brouillon'}
                    </button>
                  </div>

                  <p className="text-[10px] text-[hsl(var(--muted-foreground))] line-clamp-2">
                    {event.description}
                  </p>

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => handleOpenEventForm(event)}
                      className="h-7 px-3 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[10px] font-bold hover:bg-[hsl(var(--accent))] transition-colors cursor-pointer"
                    >
                      ✏️ Modifier
                    </button>
                    <button
                      onClick={() => handleDeleteEvent(event.id)}
                      className="h-7 px-3 rounded-md border border-red-200 bg-red-50 text-[10px] font-bold text-red-600 hover:bg-red-100 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 transition-colors cursor-pointer"
                    >
                      🗑️ Supprimer
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
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
        <QRCodeCard
          value={qrValue}
          title={qrTitle}
          onClose={() => {
            setQrValue('');
            setQrTitle('');
          }}
        />
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
      case 'messages': return renderMessages();
      case 'events': return renderEvents();
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Réservations" value={reservations.length || '—'} icon="📋" accent="blue" />
        <StatCard label="Chambres disponibles" value={rooms.filter(r => r.status === 'AVAILABLE').length || '—'} icon="🚪" accent="emerald" />
        <StatCard label="Réclamations" value={complaints.filter(c => c.status !== 'RESOLVED').length || '—'} icon="📢" accent="red" />
        <StatCard
          label="Messages"
          value={conversations.filter(c => c.unreadCount > 0).length || '—'}
          icon="💬"
          accent="gold"
          sub="non lus"
        />
      </div>

      {/* Error banner */}
      <ErrorMessage message={error} onRetry={() => fetchData(activeTab)} />

      {/* Tab Navigation */}
      <TabNav
        tabs={tabs}
        active={activeTab}
        onChange={handleTabChange}
      />

      {/* Tab Content */}
      {renderTabContent()}

      {/* QR Modal */}
      {renderQrModal()}
    </div>
  );
};
