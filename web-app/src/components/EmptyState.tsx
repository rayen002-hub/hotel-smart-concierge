import React from 'react';

interface EmptyStateProps {
  message: string;
  icon?: string;
  description?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ 
  message, 
  icon = '🔍', 
  description 
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-4 rounded-xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--card))] space-y-3 shadow-sm">
      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[hsl(var(--muted))]/60 text-xl select-none">
        {icon}
      </div>
      <div className="space-y-1">
        <h3 className="text-xs font-bold text-[hsl(var(--foreground))]">{message}</h3>
        {description && (
          <p className="text-[11px] text-[hsl(var(--muted-foreground))] max-w-[280px] leading-normal mx-auto">
            {description}
          </p>
        )}
      </div>
    </div>
  );
};
