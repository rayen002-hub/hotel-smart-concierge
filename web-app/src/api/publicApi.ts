import { publicClient } from './apiClient';

// ─── Check-in API ────────────────────────────────────────────────────

export interface LookupPayload {
  reservationNumber: string;
}

export interface CheckinPayload {
  reservationNumber: string;
  fullName: string;
  nationality: string;
  passportNumber?: string;
  phone?: string;
  address?: string;
}

export async function lookupReservation(payload: LookupPayload) {
  const { data } = await publicClient.post('/public/checkin/lookup', payload);
  return data;
}

export async function submitCheckin(payload: CheckinPayload) {
  const { data } = await publicClient.post('/public/checkin/submit', payload);
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
