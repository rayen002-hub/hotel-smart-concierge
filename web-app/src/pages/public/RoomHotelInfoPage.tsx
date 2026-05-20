import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getHotelInfo } from '../../api/publicApi';
import type { ApiError } from '../../api/apiClient';

interface HotelInfo {
  id: string;
  title: string;
  content: string;
  type: string;
}

const typeIcons: Record<string, string> = {
  service: '🏊‍♂️',
  restaurant: '🍽️',
  transport: '🚌',
  general: '🛎️',
};

const typeLabels: Record<string, string> = {
  service: 'Services & Loisirs',
  restaurant: 'Restauration',
  transport: 'Transports',
  general: 'Général',
};

export const RoomHotelInfoPage: React.FC = () => {
  const navigate = useNavigate();
  const [infos, setInfos] = useState<HotelInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        setLoading(true);
        const res = await getHotelInfo();
        setInfos(res.data || []);
      } catch (err) {
        const apiErr = err as ApiError;
        setError(apiErr.error || 'Impossible de charger les informations de l\'hôtel.');
      } finally {
        setLoading(false);
      }
    };
    fetchInfo();
  }, []);

  // Group by type
  const groupedInfo = infos.reduce<Record<string, HotelInfo[]>>((acc, item) => {
    const key = item.type || 'general';
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(item);
    return acc;
  }, {});

  return (
    <div className="min-h-[80vh] flex items-start justify-center px-4 py-8 md:py-12">
      <div className="w-full max-w-lg space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">Informations Hôtel</h1>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              Tout savoir sur nos services, horaires et contacts.
            </p>
          </div>
          <button
            onClick={() => navigate('/room')}
            className="h-9 px-3 rounded-lg border border-[hsl(var(--border))] text-xs font-medium hover:bg-[hsl(var(--accent))] transition-colors"
          >
            ← Accueil
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
            <div className="flex items-start gap-3">
              <span className="text-lg leading-none">⚠️</span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Info Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <svg className="animate-spin h-8 w-8 text-[hsl(var(--primary))]" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-xs text-[hsl(var(--muted-foreground))]">Chargement des informations...</span>
          </div>
        ) : Object.keys(groupedInfo).length === 0 ? (
          <div className="text-center py-12 text-sm text-[hsl(var(--muted-foreground))]">
            Aucune information disponible pour le moment.
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedInfo).map(([type, items]) => (
              <div key={type} className="space-y-3">
                <h2 className="text-sm font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider flex items-center gap-2">
                  <span>{typeIcons[type] || '📌'}</span>
                  <span>{typeLabels[type] || type}</span>
                </h2>
                <div className="grid gap-3">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border bg-[hsl(var(--card))] p-5 shadow-sm space-y-2"
                    >
                      <h3 className="text-sm font-semibold">{item.title}</h3>
                      <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed whitespace-pre-wrap">
                        {item.content}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
};
