import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listMyComplaints, confirmComplaint, reopenComplaint } from '../../api/complaintApi';
import type { ApiError } from '../../api/apiClient';

interface Complaint {
  id: string;
  originalMessage: string;
  category: string;
  status: string;
  createdAt: string;
  resolvedAt?: string | null;
  confirmedAt?: string | null;
  reopenedAt?: string | null;
}

const statusLabels: Record<string, string> = {
  PENDING: 'En attente',
  ASSIGNED: 'Assignée',
  IN_PROGRESS: 'En cours',
  NEEDS_REVIEW: 'En révision',
  RESOLVED: 'Résolue',
  CONFIRMED: 'Confirmée',
  REOPENED: 'Réouverte',
};

const statusStyles: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/30',
  ASSIGNED: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/30',
  IN_PROGRESS: 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900/30',
  NEEDS_REVIEW: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900/30',
  RESOLVED: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/30',
  CONFIRMED: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800/40 dark:text-gray-300 dark:border-gray-700/30',
  REOPENED: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/30',
};

const categoryLabels: Record<string, string> = {
  MAINTENANCE: '🔧 Service technique',
  HOUSEKEEPING: '🧹 Service d\'étage',
  RECEPTION: '🛎️ Réception',
  RESTAURANT: '🍽️ Restaurant',
  COMPLAINT: '📢 Réclamation générale',
  OTHER: '📌 Autre',
};

export const RoomComplaintsPage: React.FC = () => {
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  
  // Reopen modal/dialog state
  const [reopenId, setReopenId] = useState<string | null>(null);
  const [reopenComment, setReopenComment] = useState('');

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const res = await listMyComplaints();
      setComplaints(res.data || []);
      setError('');
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.error || 'Impossible de récupérer vos réclamations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const handleConfirm = async (id: string) => {
    if (!window.confirm('Voulez-vous confirmer la résolution de ce problème ?')) {
      return;
    }
    setActionLoadingId(id);
    setError('');
    try {
      await confirmComplaint(id);
      await fetchComplaints();
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.error || 'Erreur lors de la confirmation.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReopenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reopenId) return;

    setActionLoadingId(reopenId);
    setError('');
    try {
      await reopenComplaint(reopenId, { comment: reopenComment.trim() || undefined });
      setReopenId(null);
      setReopenComment('');
      await fetchComplaints();
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.error || 'Erreur lors de la réouverture.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const formatDate = (isoStr: string) => {
    return new Date(isoStr).toLocaleDateString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      day: 'numeric',
      month: 'short',
    });
  };

  return (
    <div className="min-h-[80vh] flex items-start justify-center px-4 py-8 md:py-12">
      <div className="w-full max-w-lg space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">Mes réclamations</h1>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              Suivi en temps réel de vos demandes.
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

        {/* Complaints list */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <svg className="animate-spin h-8 w-8 text-[hsl(var(--primary))]" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-xs text-[hsl(var(--muted-foreground))]">Chargement de vos demandes...</span>
          </div>
        ) : complaints.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center space-y-4">
            <div className="text-4xl">📭</div>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              Vous n'avez envoyé aucune demande ou réclamation pour le moment.
            </p>
            <button
              onClick={() => navigate('/room/complaint')}
              className="h-10 px-4 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-semibold shadow-md hover:brightness-110 transition-all duration-200"
            >
              Déposer une réclamation
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {complaints.map((complaint) => (
              <div
                key={complaint.id}
                className="rounded-xl border bg-[hsl(var(--card))] p-5 shadow-sm space-y-4 hover:shadow-md transition-shadow duration-200"
              >
                {/* Meta details */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[hsl(var(--muted-foreground))]">
                    {formatDate(complaint.createdAt)}
                  </span>
                  <span className="font-semibold text-[hsl(var(--muted-foreground))]">
                    {categoryLabels[complaint.category] || complaint.category}
                  </span>
                </div>

                {/* Main text */}
                <p className="text-sm text-[hsl(var(--foreground))] whitespace-pre-wrap leading-relaxed">
                  {complaint.originalMessage}
                </p>

                {/* Status Badge */}
                <div className="flex items-center justify-between pt-2 border-t border-[hsl(var(--border))]">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">Statut :</span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusStyles[complaint.status] || ''}`}>
                      {statusLabels[complaint.status] || complaint.status}
                    </span>
                  </div>
                </div>

                {/* Resolve actions */}
                {complaint.status === 'RESOLVED' && (
                  <div className="flex gap-2 pt-2 animate-in fade-in slide-in-from-top-2">
                    <button
                      onClick={() => handleConfirm(complaint.id)}
                      disabled={actionLoadingId !== null}
                      className="flex-1 h-9 rounded-lg bg-emerald-600 text-white text-xs font-semibold shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                    >
                      {actionLoadingId === complaint.id ? 'Traitement...' : 'Confirmer la résolution'}
                    </button>
                    <button
                      onClick={() => setReopenId(complaint.id)}
                      disabled={actionLoadingId !== null}
                      className="flex-1 h-9 rounded-lg border border-red-200 bg-red-50 text-red-700 text-xs font-semibold hover:bg-red-100 disabled:opacity-50 transition-colors dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-400 dark:hover:bg-red-950/30"
                    >
                      Le problème persiste
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Reopen comment input panel */}
        {reopenId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
            <form
              onSubmit={handleReopenSubmit}
              className="w-full max-w-md rounded-xl border bg-[hsl(var(--card))] p-6 shadow-xl space-y-4 animate-in zoom-in-95"
            >
              <h3 className="text-base font-bold">Signaler que le problème persiste</h3>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Veuillez expliquer brièvement pourquoi le problème n'est pas encore résolu (optionnel).
              </p>
              
              <textarea
                value={reopenComment}
                onChange={(e) => setReopenComment(e.target.value)}
                placeholder="Ex: La fuite d'eau persiste malgré le passage du technicien..."
                rows={3}
                className="w-full rounded-lg border border-[hsl(var(--input))] bg-transparent px-3 py-2 text-sm placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:border-transparent transition-shadow resize-none"
              />

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => { setReopenId(null); setReopenComment(''); }}
                  className="h-9 px-4 rounded-lg border text-xs font-medium hover:bg-[hsl(var(--accent))] transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={actionLoadingId !== null}
                  className="h-9 px-4 rounded-lg bg-red-600 text-white text-xs font-semibold shadow-md hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {actionLoadingId !== null ? 'Envoi...' : 'Réouvrir la réclamation'}
                </button>
              </div>
            </form>
          </div>
        )}

      </div>
    </div>
  );
};
