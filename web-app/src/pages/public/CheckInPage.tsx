import React, { useState } from 'react';
import { lookupReservation, submitCheckin } from '../../api/publicApi';
import type { ApiError } from '../../api/apiClient';

// ─── Types ───────────────────────────────────────────────────────────

interface ReservationSummary {
  reservationId: string;
  guestFirstName: string;
  guestLastName: string;
  checkInDate: string;
  checkOutDate: string;
  status: string;
}

interface CheckinResult {
  message: string;
  reservationNumber: string;
  status: string;
  room: { roomNumber: string; type: string } | null;
}

type Step = 'lookup' | 'form' | 'success';

// ─── Component ───────────────────────────────────────────────────────

export const CheckInPage: React.FC = () => {
  const [step, setStep] = useState<Step>('lookup');

  // Lookup state
  const [reservationNumber, setReservationNumber] = useState('');
  const [reservation, setReservation] = useState<ReservationSummary | null>(null);

  // Form state
  const [fullName, setFullName] = useState('');
  const [nationality, setNationality] = useState('');
  const [passportNumber, setPassportNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  // Result state
  const [result, setResult] = useState<CheckinResult | null>(null);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ── Lookup handler ─────────────────────────────────────────────────

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!reservationNumber.trim()) {
      setError('Veuillez saisir votre numéro de réservation.');
      return;
    }

    setLoading(true);
    try {
      const res = await lookupReservation({ reservationNumber: reservationNumber.trim() });
      const data: ReservationSummary = res.data;

      if (data.status === 'CHECKED_IN') {
        setError('Cette réservation est déjà enregistrée (CHECKED_IN).');
        setLoading(false);
        return;
      }
      if (data.status === 'CHECKED_OUT') {
        setError('Cette réservation est terminée (CHECKED_OUT).');
        setLoading(false);
        return;
      }
      if (data.status === 'CANCELLED') {
        setError('Cette réservation a été annulée.');
        setLoading(false);
        return;
      }

      setReservation(data);
      setFullName(`${data.guestFirstName} ${data.guestLastName}`);
      setStep('form');
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.error || 'Réservation introuvable. Vérifiez votre numéro.');
    } finally {
      setLoading(false);
    }
  };

  // ── Submit handler ─────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!fullName.trim() || fullName.trim().length < 2) {
      setError('Le nom complet est requis (2 caractères minimum).');
      return;
    }
    if (!nationality.trim()) {
      setError('La nationalité est requise.');
      return;
    }

    setLoading(true);
    try {
      const res = await submitCheckin({
        reservationNumber: reservationNumber.trim(),
        fullName: fullName.trim(),
        nationality: nationality.trim(),
        passportNumber: passportNumber.trim() || undefined,
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
      });
      setResult(res.data);
      setStep('success');
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.error || 'Une erreur est survenue lors du check-in.');
    } finally {
      setLoading(false);
    }
  };

  // ── Helpers ────────────────────────────────────────────────────────

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div className="min-h-[80vh] flex items-start justify-center px-4 py-8 md:py-16">
      <div className="w-full max-w-md space-y-6">

        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-2xl shadow-lg mb-2">
            🏨
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            {step === 'lookup' && 'Pré-enregistrement'}
            {step === 'form' && 'Fiche voyageur'}
            {step === 'success' && 'Check-in confirmé'}
          </h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            {step === 'lookup' && 'Saisissez votre numéro de réservation pour commencer.'}
            {step === 'form' && 'Complétez vos informations pour finaliser le check-in.'}
            {step === 'success' && 'Bienvenue ! Votre séjour commence maintenant.'}
          </p>
        </div>

        {/* ── Error banner ────────────────────────────────────────── */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400 animate-in fade-in">
            <div className="flex items-start gap-3">
              <span className="text-lg leading-none">⚠️</span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/*  Step 1 — Lookup                                          */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {step === 'lookup' && (
          <form onSubmit={handleLookup} className="space-y-4">
            <div className="rounded-xl border bg-[hsl(var(--card))] p-6 shadow-sm space-y-4">
              <label className="block space-y-1.5">
                <span className="text-sm font-medium">Numéro de réservation</span>
                <input
                  type="text"
                  value={reservationNumber}
                  onChange={(e) => setReservationNumber(e.target.value)}
                  placeholder="Ex: RES-20260101-ABC"
                  autoFocus
                  className="w-full h-11 rounded-lg border border-[hsl(var(--input))] bg-transparent px-4 text-sm placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:border-transparent transition-shadow"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-semibold shadow-md hover:shadow-lg hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  Recherche…
                </span>
              ) : 'Rechercher ma réservation'}
            </button>
          </form>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/*  Step 2 — Reservation summary + traveler form             */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {step === 'form' && reservation && (
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Reservation summary card */}
            <div className="rounded-xl border bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 p-5 space-y-3">
              <h2 className="text-sm font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Votre réservation</h2>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-[hsl(var(--muted-foreground))] text-xs">Client</span>
                  <p className="font-medium">{reservation.guestFirstName} {reservation.guestLastName}</p>
                </div>
                <div>
                  <span className="text-[hsl(var(--muted-foreground))] text-xs">Statut</span>
                  <p className="font-medium">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                      {reservation.status}
                    </span>
                  </p>
                </div>
                <div>
                  <span className="text-[hsl(var(--muted-foreground))] text-xs">Arrivée</span>
                  <p className="font-medium">{formatDate(reservation.checkInDate)}</p>
                </div>
                <div>
                  <span className="text-[hsl(var(--muted-foreground))] text-xs">Départ</span>
                  <p className="font-medium">{formatDate(reservation.checkOutDate)}</p>
                </div>
              </div>
            </div>

            {/* Traveler form */}
            <div className="rounded-xl border bg-[hsl(var(--card))] p-6 space-y-4">
              <h2 className="text-sm font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Informations voyageur</h2>

              <label className="block space-y-1.5">
                <span className="text-sm font-medium">Nom complet <span className="text-red-500">*</span></span>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="w-full h-11 rounded-lg border border-[hsl(var(--input))] bg-transparent px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:border-transparent transition-shadow"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-sm font-medium">Nationalité <span className="text-red-500">*</span></span>
                <input
                  type="text"
                  value={nationality}
                  onChange={(e) => setNationality(e.target.value)}
                  placeholder="Ex: Française"
                  required
                  className="w-full h-11 rounded-lg border border-[hsl(var(--input))] bg-transparent px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:border-transparent transition-shadow"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-sm font-medium">Numéro de passeport</span>
                <input
                  type="text"
                  value={passportNumber}
                  onChange={(e) => setPassportNumber(e.target.value)}
                  placeholder="Optionnel"
                  className="w-full h-11 rounded-lg border border-[hsl(var(--input))] bg-transparent px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:border-transparent transition-shadow"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-sm font-medium">Téléphone</span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Optionnel"
                  className="w-full h-11 rounded-lg border border-[hsl(var(--input))] bg-transparent px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:border-transparent transition-shadow"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-sm font-medium">Adresse</span>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Optionnel"
                  className="w-full h-11 rounded-lg border border-[hsl(var(--input))] bg-transparent px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:border-transparent transition-shadow"
                />
              </label>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setStep('lookup'); setError(''); }}
                className="flex-1 h-11 rounded-lg border border-[hsl(var(--border))] bg-transparent text-sm font-medium hover:bg-[hsl(var(--accent))] transition-colors"
              >
                ← Retour
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-[2] h-11 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-semibold shadow-md hover:shadow-lg hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    Enregistrement…
                  </span>
                ) : 'Confirmer le check-in'}
              </button>
            </div>
          </form>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/*  Step 3 — Success                                         */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {step === 'success' && result && (
          <div className="space-y-4 animate-in fade-in">
            <div className="rounded-xl border bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 p-6 text-center space-y-4">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-3xl">
                ✅
              </div>
              <h2 className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
                {result.message}
              </h2>
              <div className="text-sm space-y-2 text-[hsl(var(--foreground))]">
                <p>
                  <span className="text-[hsl(var(--muted-foreground))]">Réservation :</span>{' '}
                  <span className="font-semibold">{result.reservationNumber}</span>
                </p>
                {result.room && (
                  <p>
                    <span className="text-[hsl(var(--muted-foreground))]">Chambre :</span>{' '}
                    <span className="font-semibold">{result.room.roomNumber}</span>
                    <span className="text-[hsl(var(--muted-foreground))]"> ({result.room.type})</span>
                  </p>
                )}
              </div>
            </div>
            <p className="text-center text-xs text-[hsl(var(--muted-foreground))]">
              Vous pouvez maintenant vous rendre à la réception pour récupérer votre clé.
            </p>
          </div>
        )}

      </div>
    </div>
  );
};
