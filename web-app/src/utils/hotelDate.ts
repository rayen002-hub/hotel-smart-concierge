export const HOTEL_TIME_ZONE = 'Africa/Tunis';

export function getCurrentHotelShift(at: Date = new Date()): 'MORNING' | 'EVENING' | 'NIGHT' {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: HOTEL_TIME_ZONE,
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(at);
  const hour = Number(parts.find((part) => part.type === 'hour')?.value);
  if (hour >= 7 && hour < 15) return 'MORNING';
  if (hour >= 15 && hour < 23) return 'EVENING';
  return 'NIGHT';
}

const parseInstant = (iso: string): Date | null => {
  const value = new Date(iso);
  return Number.isFinite(value.getTime()) ? value : null;
};

export function formatHotelDate(iso: string, options: Intl.DateTimeFormatOptions = {}): string {
  const value = parseInstant(iso);
  if (!value) return '—';
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: HOTEL_TIME_ZONE,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...options,
  }).format(value);
}

export function formatHotelDateTime(iso: string, options: Intl.DateTimeFormatOptions = {}): string {
  const value = parseInstant(iso);
  if (!value) return '—';
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: HOTEL_TIME_ZONE,
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    ...options,
  }).format(value);
}

export function formatHotelTime(iso: string): string {
  const value = parseInstant(iso);
  if (!value) return '—';
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: HOTEL_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(value);
}
