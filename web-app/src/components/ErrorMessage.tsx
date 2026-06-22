import React from 'react';

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, onRetry }) => {
  if (!message) return null;

  return (
    <div className="rounded-xl border border-red-200/50 bg-red-50/50 p-4 text-xs dark:border-red-950/25 dark:bg-red-950/15 text-red-800 dark:text-red-300 shadow-sm transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span className="text-sm select-none" role="img" aria-label="error">⚠️</span>
          <div className="space-y-0.5">
            <span className="font-bold text-[10px] uppercase tracking-wider block text-red-900 dark:text-red-200">Erreur</span>
            <p className="leading-relaxed text-[11px] text-red-700 dark:text-red-400/90">{message}</p>
          </div>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="shrink-0 px-2.5 py-1 rounded-md bg-red-100/80 dark:bg-red-950/40 text-[10px] font-bold text-red-900 dark:text-red-200 hover:bg-red-200/80 dark:hover:bg-red-950/60 transition-colors cursor-pointer border border-red-200/30 dark:border-red-900/20"
          >
            Réessayer
          </button>
        )}
      </div>
    </div>
  );
};
