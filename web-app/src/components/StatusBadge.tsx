import React from 'react';
import {
  getStatusLabel,
  getStatusTone,
  STATUS_TONE_CLASSES,
  type StatusContext,
} from '../utils/statusPresentation';

interface StatusBadgeProps {
  status: string;
  context?: StatusContext;
  className?: string;
}

const dotClasses = {
  success: 'bg-emerald-700 dark:bg-emerald-300',
  warning: 'bg-amber-700 dark:bg-amber-300',
  error: 'bg-red-700 dark:bg-red-300',
  info: 'bg-blue-700 dark:bg-blue-300',
  neutral: 'bg-slate-600 dark:bg-slate-300',
} as const;

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, context, className = '' }) => {
  const tone = getStatusTone(status);

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border select-none whitespace-nowrap ${STATUS_TONE_CLASSES[tone]} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotClasses[tone]}`} aria-hidden="true" />
      {getStatusLabel(status, context)}
    </span>
  );
};
