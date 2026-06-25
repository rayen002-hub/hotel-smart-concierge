import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listPublicEvents } from '../../api/publicApi';
import type { ApiError } from '../../api/apiClient';
import { ErrorMessage } from '../../components';
import { resolveEventImageUrl } from '../../utils/imageUrl';

interface HotelEvent {
  id: string;
  title: string;
  description: string;
  eventDate: string;
  imageUrl: string | null;
}

// ─── Image with fallback placeholder ─────────────────────────────────

const EventImage: React.FC<{ imageUrl: string | null; title: string }> = ({ imageUrl, title }) => {
  const [errored, setErrored] = useState(false);
  const resolved = resolveEventImageUrl(imageUrl);

  if (!resolved || errored) {
    return (
      <div className="h-48 bg-gradient-to-br from-indigo-900/40 to-purple-900/40 flex items-center justify-center">
        <span className="text-4xl opacity-40 select-none">🎉</span>
      </div>
    );
  }

  return (
    <div className="h-48 overflow-hidden">
      <img
        src={resolved}
        alt={title}
        className="w-full h-full object-cover"
        onError={() => setErrored(true)}
      />
    </div>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────

export const RoomEventsPage: React.FC = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<HotelEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await listPublicEvents();
        setEvents(res.data || []);
      } catch (err) {
        const apiErr = err as ApiError;
        setError(apiErr.error || 'Erreur lors du chargement des événements.');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="min-h-[80vh] flex items-start justify-center px-4 py-6">
      <div className="w-full max-w-lg space-y-4">

        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/room')}
            className="h-8 px-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-xs font-semibold hover:bg-[hsl(var(--accent))] transition-colors cursor-pointer"
          >
            ← Retour
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold tracking-tight">🎉 Événements</h1>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              Découvrez les événements à venir
            </p>
          </div>
        </div>

        {/* Error */}
        <ErrorMessage message={error} />

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin w-6 h-6 border-2 border-[hsl(var(--primary))] border-t-transparent rounded-full" />
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-2">
            <span className="text-4xl">🎉</span>
            <p className="text-sm font-semibold">Aucun événement à venir</p>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              Revenez bientôt pour découvrir nos prochains événements !
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((event) => (
              <div
                key={event.id}
                className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm overflow-hidden"
              >
                {/* Image with graceful fallback */}
                <EventImage imageUrl={event.imageUrl} title={event.title} />

                {/* Content */}
                <div className="p-4 space-y-2">
                  <h2 className="text-sm font-bold">{event.title}</h2>

                  <div className="flex items-center gap-2 text-[10px] text-[hsl(var(--muted-foreground))]">
                    <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold">
                      📅 {formatDate(event.eventDate)}
                    </span>
                    <span className="font-bold">
                      🕐 {formatTime(event.eventDate)}
                    </span>
                  </div>

                  <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed whitespace-pre-wrap">
                    {event.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
};
