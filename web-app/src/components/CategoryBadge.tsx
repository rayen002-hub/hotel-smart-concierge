import React from 'react';
import { STATUS_TONE_CLASSES } from '../utils/statusPresentation';

interface CategoryBadgeProps {
  category: string;
}

const categoryConfig: Record<string, { label: string; tone: keyof typeof STATUS_TONE_CLASSES }> = {
  MAINTENANCE: { label: '🔧 Maintenance', tone: 'warning' },
  HOUSEKEEPING: { label: '🧹 Ménage', tone: 'success' },
  RECEPTION: { label: '🛎️ Réception', tone: 'info' },
  RESTAURANT: { label: '🍽️ Restaurant', tone: 'warning' },
  COMPLAINT: { label: '📢 Général', tone: 'neutral' },
  OTHER: { label: '📌 Autre', tone: 'neutral' },
};

export const CategoryBadge: React.FC<CategoryBadgeProps> = ({ category }) => {
  const config = categoryConfig[category];
  const label = config?.label ?? category;
  const classes = STATUS_TONE_CLASSES[config?.tone ?? 'neutral'];

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border select-none whitespace-nowrap ${classes}`}>
      {label}
    </span>
  );
};
