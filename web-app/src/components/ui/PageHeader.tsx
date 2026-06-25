import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: string;
  action?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  icon,
  action,
}) => {
  return (
    <div className="flex items-start justify-between gap-4 pb-5 border-b border-[hsl(var(--border))]">
      <div className="flex items-center gap-3">
        {icon && (
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[hsl(var(--primary))] to-amber-600 flex items-center justify-center text-lg shadow-md shadow-amber-200/40 dark:shadow-amber-900/30 shrink-0">
            {icon}
          </div>
        )}
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[hsl(var(--foreground))]">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-[hsl(var(--muted-foreground))] mt-0.5">
              {description}
            </p>
          )}
        </div>
      </div>

      {action && (
        <div className="shrink-0">{action}</div>
      )}
    </div>
  );
};
