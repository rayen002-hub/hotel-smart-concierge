import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
  fullPage?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  message = 'Chargement…', 
  fullPage = false 
}) => {
  const containerClasses = fullPage 
    ? 'fixed inset-0 z-50 flex flex-col items-center justify-center bg-[hsl(var(--background))]/80 backdrop-blur-sm' 
    : 'flex flex-col items-center justify-center py-16 space-y-3';

  return (
    <div className={containerClasses}>
      <div className="relative flex items-center justify-center">
        {/* Subtle glow background */}
        <div className="absolute w-12 h-12 rounded-full bg-indigo-500/20 blur-xl animate-pulse"></div>
        {/* Animated spinner */}
        <svg className="animate-spin h-9 w-9 text-indigo-600 dark:text-indigo-400" viewBox="0 0 24 24" fill="none">
          <circle 
            className="opacity-20" 
            cx="12" 
            cy="12" 
            r="10" 
            stroke="currentColor" 
            strokeWidth="3.5" 
          />
          <path 
            className="opacity-80" 
            fill="currentColor" 
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" 
          />
        </svg>
      </div>
      {message && (
        <span className="text-xs font-medium text-[hsl(var(--muted-foreground))] select-none">
          {message}
        </span>
      )}
    </div>
  );
};
