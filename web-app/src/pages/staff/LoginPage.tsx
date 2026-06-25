import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../../api/authApi';
import type { ApiError } from '../../api/apiClient';

const STAFF_USER_KEY = 'staff_user';

const roleRedirects: Record<string, string> = {
  ADMIN: '/dashboard/admin',
  RECEPTIONIST: '/dashboard/reception',
  MAINTENANCE_MANAGER: '/dashboard/manager',
  HOUSEKEEPING_MANAGER: '/dashboard/manager',
};

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [employeeBlock, setEmployeeBlock] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setEmployeeBlock(false);

    if (!email.trim() || !password) {
      setError('Veuillez remplir tous les champs.');
      return;
    }

    setLoading(true);
    try {
      const res = await login({ email: email.trim(), password });

      // Block EMPLOYEE role from web dashboard
      if (res.user.role === 'EMPLOYEE') {
        setEmployeeBlock(true);
        setLoading(false);
        return;
      }

      // Store user info in localStorage
      localStorage.setItem(STAFF_USER_KEY, JSON.stringify(res.user));

      // Redirect based on role
      const redirectPath = roleRedirects[res.user.role] || '/login';
      navigate(redirectPath, { replace: true });
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.error || 'Identifiants incorrects.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[hsl(var(--background))]">

      {/* ── Left brand panel (desktop only) ───────────────────────── */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[540px] relative flex-col items-center justify-center p-12 bg-gradient-to-br from-[hsl(224,47%,11%)] via-[hsl(224,47%,14%)] to-[hsl(220,47%,9%)] overflow-hidden shrink-0">

        {/* Background circles */}
        <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-amber-500/8 blur-3xl" />
        <div className="absolute -bottom-20 -right-20 w-64 h-64 rounded-full bg-amber-400/6 blur-3xl" />
        <div className="absolute top-1/2 right-0 w-48 h-48 rounded-full bg-indigo-500/5 blur-3xl" />

        {/* Brand content */}
        <div className="relative z-10 max-w-sm w-full space-y-10">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-2xl shadow-xl shadow-amber-900/40">
              🏨
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">LoomStay</h1>
              <p className="text-amber-400/80 text-sm font-medium">Management Console</p>
            </div>
          </div>

          {/* Tagline */}
          <div className="space-y-3">
            <p className="text-white/90 text-xl font-semibold leading-snug">
              Plateforme intelligente de services hôteliers
            </p>
            <p className="text-slate-400 text-sm leading-relaxed">
              Gérez vos réservations, réclamations et équipes depuis une interface unifiée.
            </p>
          </div>

          {/* Feature list */}
          <div className="space-y-4">
            {[
              { icon: '📋', text: 'Gestion des réservations et check-in numérique' },
              { icon: '📢', text: 'Suivi des réclamations avec IA intégrée' },
              { icon: '💬', text: 'Messagerie bilingue en temps réel' },
              { icon: '📱', text: 'Interface PWA pour les clients' },
              { icon: '🔧', text: 'Coordination des interventions maintenance/ménage' },
            ].map((feat) => (
              <div key={feat.text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-sm shrink-0">
                  {feat.icon}
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">{feat.text}</p>
              </div>
            ))}
          </div>

          {/* Footer */}
          <p className="text-slate-600 text-[10px]">
            © {new Date().getFullYear()} Loomens — LoomStay Platform
          </p>
        </div>
      </div>

      {/* ── Right: Login form ──────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-8">

          {/* Mobile brand header */}
          <div className="text-center space-y-3 lg:hidden">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-white text-3xl shadow-xl shadow-amber-200/50 dark:shadow-amber-900/30">
              🏨
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">LoomStay</h1>
              <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
                Espace personnel — Connectez-vous
              </p>
            </div>
          </div>

          {/* Desktop title */}
          <div className="hidden lg:block">
            <h2 className="text-2xl font-bold tracking-tight text-[hsl(var(--foreground))]">
              Connexion
            </h2>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
              Connectez-vous à votre espace personnel
            </p>
          </div>

          {/* Employee Block Message */}
          {employeeBlock && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-center space-y-3 dark:border-amber-900/40 dark:bg-amber-950/20">
              <div className="text-3xl">📱</div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                Veuillez utiliser l'application mobile employé.
              </p>
              <p className="text-xs text-amber-700/80 dark:text-amber-400/70">
                L'interface web est réservée aux managers, réceptionnistes et administrateurs.
              </p>
            </div>
          )}

          {/* Error Banner */}
          {error && !employeeBlock && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
              <div className="flex items-start gap-3">
                <span className="text-lg leading-none">⚠️</span>
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Login Form */}
          {!employeeBlock && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="rounded-2xl border bg-[hsl(var(--card))] p-6 shadow-sm space-y-4">

                {/* Email */}
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium">Adresse email</span>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]">✉️</span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nom@hotel.test"
                      autoComplete="email"
                      autoFocus
                      className="w-full h-11 rounded-xl border border-[hsl(var(--input))] bg-transparent pl-10 pr-4 text-sm placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/40 focus:border-[hsl(var(--primary))] transition-all"
                    />
                  </div>
                </label>

                {/* Password */}
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium">Mot de passe</span>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]">🔒</span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      className="w-full h-11 rounded-xl border border-[hsl(var(--input))] bg-transparent pl-10 pr-12 text-sm placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/40 focus:border-[hsl(var(--primary))] transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </label>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white text-sm font-bold shadow-lg shadow-amber-200/50 dark:shadow-amber-900/30 hover:from-amber-600 hover:to-amber-700 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Connexion en cours…
                  </span>
                ) : (
                  'Se connecter →'
                )}
              </button>
            </form>
          )}

          {/* Back to employee block */}
          {employeeBlock && (
            <button
              onClick={() => { setEmployeeBlock(false); setError(''); }}
              className="w-full h-10 rounded-xl border border-[hsl(var(--border))] text-sm font-medium hover:bg-[hsl(var(--accent))] transition-colors"
            >
              ← Retour à la connexion
            </button>
          )}

          {/* Footer */}
          <p className="text-center text-[10px] text-[hsl(var(--muted-foreground))]">
            © {new Date().getFullYear()} LoomStay · Loomens
          </p>
        </div>
      </div>
    </div>
  );
};

