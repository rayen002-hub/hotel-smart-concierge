import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { lookupReservation, submitCheckin } from '../../api/publicApi';
import type { ApiError } from '../../api/apiClient';

// ─── Types ───────────────────────────────────────────────────────────

interface TravelerSlot {
  travelerIndex: number;
  travelerType: 'ADULT' | 'CHILD';
  isCompleted: boolean;
  fullName: string | null;
}

interface ReservationSummary {
  reservationId: string;
  guestFirstName: string;
  guestLastName: string;
  checkInDate: string;
  checkOutDate: string;
  status: string;
  adultsCount: number;
  childrenCount: number;
  totalGuests: number;
  checkinCompletionStatus: string;
  travelers: TravelerSlot[];
}



type Step = 'lookup' | 'travelers' | 'form' | 'complete';

// ─── Component ───────────────────────────────────────────────────────

export const CheckInPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const checkinToken = searchParams.get('token') || '';

  const [step, setStep] = useState<Step>('lookup');

  // Lookup state
  const [reservationNumber, setReservationNumber] = useState('');
  const [reservation, setReservation] = useState<ReservationSummary | null>(null);

  // Traveler selection
  const [selectedTraveler, setSelectedTraveler] = useState<TravelerSlot | null>(null);

  // Form state
  const [fullName, setFullName] = useState('');
  const [nationality, setNationality] = useState('');
  const [passportNumber, setPassportNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');



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
      const res = await lookupReservation({ reservationNumber: reservationNumber.trim() }, checkinToken);
      const data: ReservationSummary = res.data;

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

      // Si check-in déjà COMPLETED, afficher directement
      if (data.checkinCompletionStatus === 'COMPLETED') {
        setStep('complete');
      } else {
        setStep('travelers');
      }
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.error || 'Réservation introuvable. Vérifiez votre numéro.');
    } finally {
      setLoading(false);
    }
  };

  // ── Select traveler ────────────────────────────────────────────────

  const handleSelectTraveler = (slot: TravelerSlot) => {
    setSelectedTraveler(slot);
    // Pre-fill if first adult and is the main guest
    if (slot.travelerIndex === 1 && reservation && !slot.isCompleted) {
      setFullName(`${reservation.guestFirstName} ${reservation.guestLastName}`);
    } else if (slot.isCompleted && slot.fullName) {
      setFullName(slot.fullName);
    } else {
      setFullName('');
    }
    setNationality('');
    setPassportNumber('');
    setPhone('');
    setAddress('');
    setError('');
    setStep('form');
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
    if (!selectedTraveler) return;

    setLoading(true);
    try {
      await submitCheckin({
        reservationNumber: reservationNumber.trim(),
        travelerIndex: selectedTraveler.travelerIndex,
        travelerType: selectedTraveler.travelerType,
        fullName: fullName.trim(),
        nationality: nationality.trim(),
        passportNumber: passportNumber.trim() || undefined,
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
      }, checkinToken);



      // Refresh the reservation data
      const lookupRes = await lookupReservation(
        { reservationNumber: reservationNumber.trim() },
        checkinToken
      );
      const updated: ReservationSummary = lookupRes.data;
      setReservation(updated);

      if (updated.checkinCompletionStatus === 'COMPLETED') {
        setStep('complete');
      } else {
        setStep('travelers');
      }
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.error || 'Une erreur est survenue lors de l\'enregistrement.');
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

  const completedCount = reservation?.travelers.filter(t => t.isCompleted).length ?? 0;
  const totalCount = reservation?.totalGuests ?? 0;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div className="min-h-[80vh] flex items-start justify-center px-4 py-8 md:py-16">
      <div className="w-full max-w-md space-y-6">

        {/* ── No token guard ─────────────────────────────────────── */}
        {!checkinToken && step !== 'complete' && (
          <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30 p-6 text-center space-y-3">
            <div className="text-3xl">🔒</div>
            <h2 className="text-sm font-bold text-red-700 dark:text-red-400">
              Accès non autorisé
            </h2>
            <p className="text-xs text-red-600 dark:text-red-400">
              Veuillez scanner le QR code de check-in à la réception pour accéder à ce formulaire.
            </p>
          </div>
        )}

        {/* ── Header ──────────────────────────────────────────────── */}
        {checkinToken && (
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-2xl shadow-lg mb-2">
            🏨
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            {step === 'lookup' && 'Pré-enregistrement'}
            {step === 'travelers' && 'Fiches voyageurs'}
            {step === 'form' && `Voyageur ${selectedTraveler?.travelerIndex ?? ''}`}
            {step === 'complete' && 'Check-in complet'}
          </h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            {step === 'lookup' && 'Saisissez votre numéro de réservation pour commencer.'}
            {step === 'travelers' && 'Sélectionnez un voyageur pour remplir sa fiche.'}
            {step === 'form' && 'Complétez les informations de ce voyageur.'}
            {step === 'complete' && 'Toutes les fiches sont enregistrées. Bienvenue !'}
          </p>
        </div>
        )}

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
        {checkinToken && step === 'lookup' && (
          <form onSubmit={handleLookup} className="space-y-4">
            <div className="rounded-xl border bg-[hsl(var(--card))] p-6 shadow-sm space-y-4">
              <label className="block space-y-1.5">
                <span className="text-sm font-medium">Numéro de réservation</span>
                <input
                  type="text"
                  value={reservationNumber}
                  onChange={(e) => setReservationNumber(e.target.value)}
                  placeholder="Ex: RES-2026-003"
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
        {/*  Step 2 — Traveler list                                   */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {step === 'travelers' && reservation && (
          <div className="space-y-4">

            {/* Reservation summary card */}
            <div className="rounded-xl border bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 p-5 space-y-3">
              <h2 className="text-sm font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Votre réservation</h2>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-[hsl(var(--muted-foreground))] text-xs">Client</span>
                  <p className="font-medium">{reservation.guestFirstName} {reservation.guestLastName}</p>
                </div>
                <div>
                  <span className="text-[hsl(var(--muted-foreground))] text-xs">Voyageurs</span>
                  <p className="font-medium">{reservation.adultsCount} adulte{reservation.adultsCount > 1 ? 's' : ''}{reservation.childrenCount > 0 ? ` + ${reservation.childrenCount} enfant${reservation.childrenCount > 1 ? 's' : ''}` : ''}</p>
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

            {/* Progress bar */}
            <div className="rounded-xl border bg-[hsl(var(--card))] p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Progression</span>
                <span className="text-[hsl(var(--muted-foreground))]">{completedCount}/{totalCount} fiches</span>
              </div>
              <div className="h-2 rounded-full bg-[hsl(var(--muted))]/30 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Traveler slots */}
            <div className="space-y-2">
              {reservation.travelers.map((slot) => (
                <button
                  key={slot.travelerIndex}
                  onClick={() => handleSelectTraveler(slot)}
                  className={`w-full rounded-xl border p-4 text-left transition-all duration-200 hover:shadow-md ${
                    slot.isCompleted
                      ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20'
                      : 'border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:border-blue-300 dark:hover:border-blue-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                        slot.isCompleted
                          ? 'bg-emerald-100 dark:bg-emerald-900/50'
                          : 'bg-[hsl(var(--muted))]/20'
                      }`}>
                        {slot.isCompleted ? '✅' : slot.travelerType === 'CHILD' ? '👧' : '👤'}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">
                          Voyageur {slot.travelerIndex}{' '}
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                            slot.travelerType === 'CHILD'
                              ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                          }`}>
                            {slot.travelerType === 'CHILD' ? 'Enfant' : 'Adulte'}
                          </span>
                        </p>
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">
                          {slot.isCompleted ? slot.fullName : 'Fiche à remplir'}
                        </p>
                      </div>
                    </div>
                    <div className="text-xs font-medium">
                      {slot.isCompleted ? (
                        <span className="text-emerald-600 dark:text-emerald-400">✓ Rempli</span>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400">→ Remplir</span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Back button */}
            <button
              type="button"
              onClick={() => { setStep('lookup'); setReservation(null); setError(''); }}
              className="w-full h-10 rounded-lg border border-[hsl(var(--border))] bg-transparent text-sm font-medium hover:bg-[hsl(var(--accent))] transition-colors"
            >
              ← Changer de réservation
            </button>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/*  Step 3 — Traveler form                                   */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {step === 'form' && selectedTraveler && (
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Traveler header */}
            <div className="rounded-xl border bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-lg">
                {selectedTraveler.travelerType === 'CHILD' ? '👧' : '👤'}
              </div>
              <div>
                <p className="text-sm font-bold">
                  Voyageur {selectedTraveler.travelerIndex} — {selectedTraveler.travelerType === 'CHILD' ? 'Enfant' : 'Adulte'}
                </p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  {completedCount}/{totalCount} fiches remplies
                </p>
              </div>
            </div>

            {/* Form fields */}
            <div className="rounded-xl border bg-[hsl(var(--card))] p-6 space-y-4">
              <h2 className="text-sm font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Informations voyageur</h2>

              <label className="block space-y-1.5">
                <span className="text-sm font-medium">Nom complet <span className="text-red-500">*</span></span>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  autoFocus
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
                onClick={() => { setStep('travelers'); setError(''); }}
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
                ) : selectedTraveler.isCompleted ? 'Mettre à jour' : 'Enregistrer cette fiche'}
              </button>
            </div>
          </form>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/*  Step 4 — Complete                                        */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {step === 'complete' && reservation && (
          <div className="space-y-4 animate-in fade-in">
            <div className="rounded-xl border bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 p-6 text-center space-y-4">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-3xl">
                ✅
              </div>
              <h2 className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
                Check-in complet !
              </h2>
              <p className="text-sm text-[hsl(var(--foreground))]">
                {reservation.totalGuests === 1
                  ? 'La fiche voyageur a été enregistrée.'
                  : `Les ${reservation.totalGuests} fiches voyageurs sont enregistrées.`}
              </p>
              <div className="text-sm space-y-2 text-[hsl(var(--foreground))]">
                <p>
                  <span className="text-[hsl(var(--muted-foreground))]">Réservation :</span>{' '}
                  <span className="font-semibold">{reservationNumber}</span>
                </p>
              </div>
            </div>

            {/* Traveler summary */}
            <div className="rounded-xl border bg-[hsl(var(--card))] p-4 space-y-2">
              <h3 className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Voyageurs enregistrés</h3>
              {reservation.travelers.map((t) => (
                <div key={t.travelerIndex} className="flex items-center gap-2 text-sm py-1">
                  <span className="text-emerald-500">✓</span>
                  <span className="font-medium">{t.fullName}</span>
                  <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                    t.travelerType === 'CHILD'
                      ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                      : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                  }`}>
                    {t.travelerType === 'CHILD' ? 'Enfant' : 'Adulte'}
                  </span>
                </div>
              ))}
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
