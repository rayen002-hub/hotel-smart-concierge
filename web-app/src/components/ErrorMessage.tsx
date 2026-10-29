import React from 'react';

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, onRetry }) => {
  if (!message) return null;
  const safeMessage = /(prisma|\bsql\b|database|undefined|null|econn|typeerror|error:|\bat\s+.+\(|p\d{4}|constraint|stack trace|request failed|\bfailed\b)/i.test(message)
    ? 'Une erreur est survenue. Veuillez réessayer.'
    : /\bnot found\b/i.test(message)
      ? 'Élément introuvable.'
      : /\b(unauthorized|forbidden)\b/i.test(message)
        ? 'Vous n’êtes pas autorisé à effectuer cette action.'
        : /\b(invalid|required)\b/i.test(message)
          ? 'Certaines informations sont invalides. Vérifiez les champs puis réessayez.'
          : /\b(conflict|already exists)\b/i.test(message)
            ? 'Cette action entre en conflit avec des données existantes.'
            : message;

  return (
    <div role="alert" aria-live="assertive" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 dark:border-red-800 dark:bg-red-950/50 dark:text-red-100 shadow-sm transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span className="text-sm select-none" aria-hidden="true">⚠️</span>
          <div className="space-y-0.5">
            <span className="font-bold text-xs block">Une erreur est survenue</span>
            <p className="leading-relaxed text-xs">{safeMessage}</p>
          </div>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="shrink-0 px-3 py-1.5 rounded-md bg-red-100 dark:bg-red-900/70 text-xs font-bold text-red-950 dark:text-red-50 hover:bg-red-200 dark:hover:bg-red-900 transition-colors cursor-pointer border border-red-300 dark:border-red-700"
          >
            Réessayer
          </button>
        )}
      </div>
    </div>
  );
};

export const SuccessMessage: React.FC<{ message: string }> = ({ message }) => {
  if (!message) return null;
  return (
    <div role="status" aria-live="polite" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-100 shadow-sm">
      <div className="flex items-center gap-2.5">
        <span aria-hidden="true">✅</span>
        <p className="font-medium">{message}</p>
      </div>
    </div>
  );
};
