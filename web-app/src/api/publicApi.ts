import { publicClient } from './apiClient';

// ─── Check-in API ────────────────────────────────────────────────────

export interface LookupPayload {
  reservationNumber: string;
}

export interface CheckinPayload {
  reservationNumber: string;
  travelerIndex: number;
  travelerType: 'ADULT' | 'CHILD';
  fullName: string;
  nationality: string;
  passportNumber?: string;
  phone?: string;
  address?: string;
}

export async function lookupReservation(payload: LookupPayload, checkinToken?: string) {
  const headers: Record<string, string> = {};
  if (checkinToken) headers['X-Checkin-Token'] = checkinToken;
  const { data } = await publicClient.post('/public/checkin/lookup', payload, { headers });
  return data;
}

export async function submitCheckin(payload: CheckinPayload, checkinToken?: string) {
  const headers: Record<string, string> = {};
  if (checkinToken) headers['X-Checkin-Token'] = checkinToken;
  const { data } = await publicClient.post('/public/checkin/submit', payload, { headers });
  return data;
}

// ─── Hotel Info & Currency (public, no token needed) ─────────────────

export async function getHotelInfo() {
  const { data } = await publicClient.get('/public/hotel-info');
  return data;
}

export async function getCurrencyRates() {
  const { data } = await publicClient.get('/public/currency-rates');
  return data;
}

export async function convertCurrency(from: string, to: string, amount: number) {
  const { data } = await publicClient.get('/public/currency-convert', {
    params: { from, to, amount },
  });
  return data;
}

// ─── Events (public) ─────────────────────────────────────────────────

export async function listPublicEvents() {
  const { data } = await publicClient.get('/public/events');
  return data;
}
