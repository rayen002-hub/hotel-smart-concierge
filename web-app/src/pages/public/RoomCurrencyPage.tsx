import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrencyRates, convertCurrency } from '../../api/publicApi';
import type { ApiError } from '../../api/apiClient';

// Popular currencies to display
const POPULAR = ['EUR', 'USD', 'GBP', 'CHF', 'CAD', 'AED', 'SAR', 'MAD', 'DZD', 'LYD', 'JPY', 'CNY'];

export const RoomCurrencyPage: React.FC = () => {
  const navigate = useNavigate();

  // Rates data
  const [allRates, setAllRates] = useState<Record<string, number>>({});
  const [source, setSource] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Converter state
  const [amount, setAmount] = useState('100');
  const [fromCurrency, setFromCurrency] = useState('EUR');
  const [toCurrency, setToCurrency] = useState('TND');
  const [converting, setConverting] = useState(false);
  const [convResult, setConvResult] = useState<{
    result: number;
    rate: number;
    from: string;
    to: string;
    amount: number;
  } | null>(null);

  // Available currencies (sorted)
  const currencies = Object.keys(allRates).sort();

  useEffect(() => {
    const fetchRates = async () => {
      try {
        setLoading(true);
        const res = await getCurrencyRates();
        const data = res.data;
        setAllRates(data.rates || {});
        setSource(data.source || '');
      } catch (err) {
        const apiErr = err as ApiError;
        setError(apiErr.error || 'Impossible de récupérer les taux de change.');
      } finally {
        setLoading(false);
      }
    };
    fetchRates();
  }, []);

  // ── Convert handler ────────────────────────────────────────────────

  const handleConvert = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Veuillez saisir un montant valide.');
      return;
    }

    setConverting(true);
    setError('');
    setConvResult(null);

    try {
      const res = await convertCurrency(fromCurrency, toCurrency, numAmount);
      setConvResult(res.data);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.error || 'Erreur lors de la conversion.');
    } finally {
      setConverting(false);
    }
  };

  // ── Swap currencies ────────────────────────────────────────────────

  const handleSwap = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
    setConvResult(null);
  };

  // ── Display rates for popular currencies ───────────────────────────

  const popularRates = POPULAR.filter((c) => allRates[c] !== undefined).map((c) => ({
    currency: c,
    rate: allRates[c],
  }));

  return (
    <div className="min-h-[80vh] flex items-start justify-center px-4 py-8 md:py-12">
      <div className="w-full max-w-md space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">💱 Convertisseur</h1>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              Taux de change en temps réel — base TND
              {source && (
                <span className="ml-1.5 inline-flex items-center gap-1 text-[9px]">
                  {source.includes('external') ? (
                    <><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> API live</>
                  ) : (
                    <><span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> fallback</>
                  )}
                </span>
              )}
            </p>
          </div>
          <button
            onClick={() => navigate('/room')}
            className="h-9 px-3 rounded-lg border border-[hsl(var(--border))] text-xs font-medium hover:bg-[hsl(var(--accent))] transition-colors cursor-pointer"
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

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <svg className="animate-spin h-8 w-8 text-[hsl(var(--primary))]" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-xs text-[hsl(var(--muted-foreground))]">Chargement des taux…</span>
          </div>
        ) : (
          <div className="space-y-6">

            {/* ═══ Converter Card ═══ */}
            <div className="rounded-xl border bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/30 p-6 shadow-sm space-y-4">
              <h2 className="text-sm font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                Convertir
              </h2>

              {/* Amount input */}
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-[hsl(var(--muted-foreground))]">Montant</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => { setAmount(e.target.value); setConvResult(null); }}
                  placeholder="100"
                  min="0"
                  step="any"
                  className="w-full h-12 rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-4 text-lg font-mono focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:border-transparent transition-shadow"
                />
              </div>

              {/* From / Swap / To */}
              <div className="flex items-end gap-2">
                {/* FROM */}
                <div className="flex-1 space-y-1.5">
                  <span className="text-xs font-medium text-[hsl(var(--muted-foreground))]">De</span>
                  <select
                    value={fromCurrency}
                    onChange={(e) => { setFromCurrency(e.target.value); setConvResult(null); }}
                    className="w-full h-11 rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] transition-shadow"
                  >
                    {currencies.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* SWAP button */}
                <button
                  onClick={handleSwap}
                  className="shrink-0 h-11 w-11 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] flex items-center justify-center text-lg hover:bg-[hsl(var(--accent))] transition-colors cursor-pointer"
                  title="Inverser les devises"
                >
                  ⇄
                </button>

                {/* TO */}
                <div className="flex-1 space-y-1.5">
                  <span className="text-xs font-medium text-[hsl(var(--muted-foreground))]">Vers</span>
                  <select
                    value={toCurrency}
                    onChange={(e) => { setToCurrency(e.target.value); setConvResult(null); }}
                    className="w-full h-11 rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] transition-shadow"
                  >
                    {currencies.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Convert button */}
              <button
                onClick={handleConvert}
                disabled={converting || !amount || parseFloat(amount) <= 0}
                className="w-full h-11 rounded-lg bg-gradient-to-r from-indigo-500 to-blue-600 text-white text-sm font-semibold shadow-md hover:shadow-lg hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer"
              >
                {converting ? (
                  <span className="inline-flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    Conversion…
                  </span>
                ) : 'Convertir'}
              </button>

              {/* Result */}
              {convResult && (
                <div className="rounded-lg bg-[hsl(var(--card))] border border-[hsl(var(--border))] p-4 text-center space-y-2 animate-in fade-in">
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">
                    {convResult.amount.toLocaleString('fr-FR')} {convResult.from} =
                  </p>
                  <p className="text-2xl font-bold font-mono text-indigo-700 dark:text-indigo-300">
                    {convResult.result.toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} {convResult.to}
                  </p>
                  <p className="text-[10px] text-[hsl(var(--muted-foreground))]">
                    1 {convResult.from} = {convResult.rate.toFixed(6)} {convResult.to}
                  </p>
                </div>
              )}
            </div>

            {/* ═══ Popular Rates Table ═══ */}
            {popularRates.length > 0 && (
              <div className="rounded-xl border bg-[hsl(var(--card))] p-6 shadow-sm space-y-4">
                <h2 className="text-sm font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                  Taux populaires (base TND)
                </h2>
                <div className="divide-y divide-[hsl(var(--border))]">
                  {popularRates.map((r) => (
                    <div key={r.currency} className="flex justify-between py-2.5 text-sm">
                      <span className="font-semibold">{r.currency}</span>
                      <span className="font-mono text-indigo-600 dark:text-indigo-400">
                        {r.rate.toFixed(4)}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-[hsl(var(--muted-foreground))]">
                  1 TND = X {'{devise}'} — {currencies.length} devises disponibles au total
                </p>
              </div>
            )}

            {/* Disclaimer */}
            <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-4 text-xs text-blue-800 dark:border-blue-950/30 dark:bg-blue-950/10 dark:text-blue-300">
              <div className="flex items-start gap-2.5">
                <span className="text-sm">ℹ️</span>
                <p className="leading-relaxed">
                  <strong>Taux indicatifs :</strong> Les taux de change sont mis à jour toutes les 6 heures via l'API ExchangeRate-API. Les transactions réelles seront calculées au taux officiel de la réception.
                </p>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
