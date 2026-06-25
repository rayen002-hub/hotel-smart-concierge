import React from 'react';

interface EmptyStateProps {
  message: string;
  icon?: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  message,
  icon = '🔍',
  description,
  action,
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-4 rounded-2xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--card))] space-y-4">
      {/* Icon with gradient background */}
      <div className="relative">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[hsl(var(--muted))] to-[hsl(var(--border))] flex items-center justify-center text-3xl shadow-inner">
          {icon}
        </div>
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[hsl(var(--primary))/5] to-transparent" />
      </div>

      <div className="space-y-1.5 max-w-xs">
        <h3 className="text-sm font-bold text-[hsl(var(--foreground))]">{message}</h3>
        {description && (
          <p className="text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {action && <div className="mt-2">{action}</div>}
    </div>
  );
};
