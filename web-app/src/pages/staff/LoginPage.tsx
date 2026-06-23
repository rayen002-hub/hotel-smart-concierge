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
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/30">
      <div className="w-full max-w-sm space-y-8">

        {/* Logo / Brand */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white text-3xl shadow-xl shadow-indigo-200/50 dark:shadow-indigo-900/30">
            🏨
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">LoomStay</h1>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
              Espace personnel — Connectez-vous pour continuer
            </p>
          </div>
        </div>

        {/* Employee Block Message */}
        {employeeBlock && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-center space-y-3 dark:border-amber-900/40 dark:bg-amber-950/20">
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
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
            <div className="flex items-start gap-3">
              <span className="text-lg leading-none">⚠️</span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Login Form */}
        {!employeeBlock && (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="rounded-xl border bg-[hsl(var(--card))] p-6 shadow-sm space-y-4">

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
                    className="w-full h-11 rounded-lg border border-[hsl(var(--input))] bg-transparent pl-10 pr-4 text-sm placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all"
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
                    className="w-full h-11 rounded-lg border border-[hsl(var(--input))] bg-transparent pl-10 pr-12 text-sm placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all"
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
              className="w-full h-12 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-sm font-semibold shadow-lg shadow-indigo-200/50 dark:shadow-indigo-900/30 hover:shadow-xl hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
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
                'Se connecter'
              )}
            </button>
          </form>
        )}

        {/* Back to employee block */}
        {employeeBlock && (
          <button
            onClick={() => { setEmployeeBlock(false); setError(''); }}
            className="w-full h-10 rounded-lg border border-[hsl(var(--border))] text-sm font-medium hover:bg-[hsl(var(--accent))] transition-colors"
          >
            ← Retour à la connexion
          </button>
        )}

        {/* Footer */}
        <p className="text-center text-[10px] text-[hsl(var(--muted-foreground))]">
          © {new Date().getFullYear()} LoomStay
        </p>
      </div>
    </div>
  );
};
