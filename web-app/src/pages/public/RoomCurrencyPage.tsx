import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrencyRates } from '../../api/publicApi';
import type { ApiError } from '../../api/apiClient';

interface CurrencyRate {
  id: string;
  currency: string;
  rateToTnd: number;
  updatedAt: string;
}

export const RoomCurrencyPage: React.FC = () => {
  const navigate = useNavigate();
  const [rates, setRates] = useState<CurrencyRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Converter state
  const [amount, setAmount] = useState<string>('100');
  const [selectedCurrency, setSelectedCurrency] = useState<string>('');
  const [result, setResult] = useState<number | null>(null);

  useEffect(() => {
    const fetchRates = async () => {
      try {
        setLoading(true);
        const res = await getCurrencyRates();
        const data: CurrencyRate[] = res.data || [];
        setRates(data);
        if (data.length > 0) {
          setSelectedCurrency(data[0].currency);
        }
      } catch (err) {
        const apiErr = err as ApiError;
        setError(apiErr.error || 'Impossible de récupérer les taux de change.');
      } finally {
        setLoading(false);
      }
    };
    fetchRates();
  }, []);

  // Update conversion whenever amount or currency changes
  useEffect(() => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0 || !selectedCurrency) {
      setResult(null);
      return;
    }
    const selectedRate = rates.find((r) => r.currency === selectedCurrency);
    if (selectedRate) {
      setResult(numAmount * selectedRate.rateToTnd);
    } else {
      setResult(null);
    }
  }, [amount, selectedCurrency, rates]);

  return (
    <div className="min-h-[80vh] flex items-start justify-center px-4 py-8 md:py-12">
      <div className="w-full max-w-md space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">Convertisseur Devise</h1>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              Consultez les taux et convertissez vos devises en Dinars Tunisiens (TND).
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

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <svg className="animate-spin h-8 w-8 text-[hsl(var(--primary))]" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-xs text-[hsl(var(--muted-foreground))]">Chargement des taux de change...</span>
          </div>
        ) : rates.length === 0 ? (
          <div className="text-center py-12 text-sm text-[hsl(var(--muted-foreground))]">
            Aucun taux de change disponible pour le moment.
          </div>
        ) : (
          <div className="space-y-6">

            {/* Rates Table Card */}
            <div className="rounded-xl border bg-[hsl(var(--card))] p-6 shadow-sm space-y-4">
              <h2 className="text-sm font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Taux du jour (vers TND)</h2>
              <div className="divide-y divide-[hsl(var(--border))]">
                {rates.map((rate) => (
                  <div key={rate.id} className="flex justify-between py-3 text-sm">
                    <span className="font-semibold">1 {rate.currency}</span>
                    <span className="font-mono text-indigo-600 dark:text-indigo-400">
                      {rate.rateToTnd.toFixed(3)} TND
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Converter Form Card */}
            <div className="rounded-xl border bg-[hsl(var(--card))] p-6 shadow-sm space-y-4">
              <h2 className="text-sm font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Simulateur de conversion</h2>
              
              <div className="grid grid-cols-3 gap-3">
                {/* Amount Input */}
                <div className="col-span-2 space-y-1.5">
                  <span className="text-xs font-medium text-[hsl(var(--muted-foreground))]">Montant</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Montant"
                    min="0"
                    step="any"
                    className="w-full h-11 rounded-lg border border-[hsl(var(--input))] bg-transparent px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:border-transparent transition-shadow"
                  />
                </div>

                {/* Currency select */}
                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-[hsl(var(--muted-foreground))]">Devise</span>
                  <select
                    value={selectedCurrency}
                    onChange={(e) => setSelectedCurrency(e.target.value)}
                    className="w-full h-11 rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:border-transparent transition-shadow"
                  >
                    {rates.map((rate) => (
                      <option key={rate.id} value={rate.currency}>
                        {rate.currency}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Conversion result display */}
              {result !== null && (
                <div className="rounded-lg bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/30 p-4 text-center space-y-1">
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">Résultat estimé</p>
                  <p className="text-xl font-bold font-mono text-indigo-700 dark:text-indigo-300">
                    {result.toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} TND
                  </p>
                </div>
              )}
            </div>

            {/* Disclaimer disclaimer info */}
            <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-4 text-xs text-blue-800 dark:border-blue-950/30 dark:bg-blue-950/10 dark:text-blue-300">
              <div className="flex items-start gap-2.5">
                <span className="text-sm">ℹ️</span>
                <p className="leading-relaxed">
                  <strong>Taux indicatifs :</strong> Les taux de change affichés sont fournis uniquement à titre indicatif et peuvent varier. Les transactions réelles seront calculées au comptoir de la réception selon le taux officiel au moment du règlement.
                </p>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
