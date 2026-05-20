import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createComplaint } from '../../api/complaintApi';
import type { ApiError } from '../../api/apiClient';

// ─── Human-readable category labels ─────────────────────────────────

const categoryLabels: Record<string, string> = {
  MAINTENANCE: 'Service technique',
  HOUSEKEEPING: 'Service d\'étage',
  RECEPTION: 'Réception',
  RESTAURANT: 'Restaurant',
  COMPLAINT: 'Réclamation générale',
  OTHER: 'Autre',
};

const categoryIcons: Record<string, string> = {
  MAINTENANCE: '🔧',
  HOUSEKEEPING: '🧹',
  RECEPTION: '🛎️',
  RESTAURANT: '🍽️',
  COMPLAINT: '📢',
  OTHER: '📌',
};

// ─── Component ───────────────────────────────────────────────────────

type Step = 'write' | 'sent';

interface ComplaintResult {
  id: string;
  category: string;
  status: string;
}

export const RoomComplaintPage: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('write');

  const [message, setMessage] = useState('');
  const [result, setResult] = useState<ComplaintResult | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmed = message.trim();
    if (!trimmed || trimmed.length < 2) {
      setError('Veuillez décrire votre problème (2 caractères minimum).');
      return;
    }
    if (trimmed.length > 1000) {
      setError('Le message ne doit pas dépasser 1000 caractères.');
      return;
    }

    setLoading(true);
    try {
      const res = await createComplaint({ message: trimmed });
      setResult(res.data);
      setStep('sent');
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.error || 'Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-start justify-center px-4 py-8 md:py-12">
      <div className="w-full max-w-md space-y-6">

        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 text-white text-2xl shadow-lg mb-1">
            📝
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            {step === 'write' ? 'Envoyer une réclamation' : 'Réclamation envoyée'}
          </h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            {step === 'write'
              ? 'Décrivez votre problème et nous nous en occupons.'
              : 'Votre demande a été transmise au service concerné.'}
          </p>
        </div>

        {/* ── Error banner ────────────────────────────────────────── */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
            <div className="flex items-start gap-3">
              <span className="text-lg leading-none">⚠️</span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/*  Step 1 — Write complaint                                 */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {step === 'write' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-xl border bg-[hsl(var(--card))] p-6 space-y-4">
              <label className="block space-y-1.5">
                <span className="text-sm font-medium">Décrivez votre problème</span>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Ex: La climatisation ne fonctionne pas dans ma chambre..."
                  rows={5}
                  autoFocus
                  className="w-full rounded-lg border border-[hsl(var(--input))] bg-transparent px-4 py-3 text-sm placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:border-transparent transition-shadow resize-none"
                />
                <span className="text-xs text-[hsl(var(--muted-foreground))]">
                  {message.length} / 1000 caractères
                </span>
              </label>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => navigate('/room')}
                className="flex-1 h-11 rounded-lg border border-[hsl(var(--border))] bg-transparent text-sm font-medium hover:bg-[hsl(var(--accent))] transition-colors"
              >
                ← Retour
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-[2] h-11 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm font-semibold shadow-md hover:shadow-lg hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    Envoi en cours…
                  </span>
                ) : 'Envoyer'}
              </button>
            </div>
          </form>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/*  Step 2 — Success                                         */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {step === 'sent' && result && (
          <div className="space-y-4">

            {/* Success card */}
            <div className="rounded-xl border bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 p-6 text-center space-y-4">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-3xl">
                ✅
              </div>
              <h2 className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
                Votre demande a été envoyée au service concerné.
              </h2>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                Notre équipe va traiter votre demande dans les plus brefs délais.
              </p>
            </div>

            {/* Category badge */}
            <div className="rounded-xl border bg-[hsl(var(--card))] p-5 space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">
                  {categoryIcons[result.category] || '📌'}
                </span>
                <div>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">Service responsable</p>
                  <p className="text-sm font-semibold">
                    {categoryLabels[result.category] || result.category}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-2xl">📊</span>
                <div>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">Statut</p>
                  <p className="text-sm font-semibold">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                      En attente de traitement
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/room/complaints')}
                className="flex-1 h-11 rounded-lg border border-[hsl(var(--border))] bg-transparent text-sm font-medium hover:bg-[hsl(var(--accent))] transition-colors"
              >
                Suivre mes demandes
              </button>
              <button
                onClick={() => navigate('/room')}
                className="flex-1 h-11 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-semibold shadow-md hover:shadow-lg hover:brightness-110 transition-all duration-200"
              >
                Retour à l'accueil
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
