import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

// ─── Base Axios instances ────────────────────────────────────────────

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ── Keys ─────────────────────────────────────────────────────────────
const STAFF_TOKEN_KEY  = 'staff_token';
const CLIENT_TOKEN_KEY = 'client_room_token';

// ─── Staff API client (Authorization: Bearer) ───────────────────────

export const staffClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

staffClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem(STAFF_TOKEN_KEY);
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Public / Client‑Room API client (X-Client-Room-Token) ──────────

export const publicClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

publicClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = sessionStorage.getItem(CLIENT_TOKEN_KEY);
  if (token && config.headers) {
    config.headers['X-Client-Room-Token'] = token;
  }
  return config;
});

// ─── Centralised error handling ──────────────────────────────────────

export interface ApiError {
  success: false;
  error: string;
  statusCode: number;
}

function handleApiError(error: AxiosError<{ error?: string }>): never {
  if (error.response) {
    const msg = error.response.data?.error || 'An unexpected error occurred.';
    const status = error.response.status;

    // Auto‑logout on 401 for staff
    if (status === 401) {
      localStorage.removeItem(STAFF_TOKEN_KEY);
    }

    throw { success: false, error: msg, statusCode: status } as ApiError;
  }

  if (error.request) {
    throw {
      success: false,
      error: 'Network error. Please check your connection.',
      statusCode: 0,
    } as ApiError;
  }

  throw {
    success: false,
    error: error.message || 'Unknown error.',
    statusCode: 0,
  } as ApiError;
}

staffClient.interceptors.response.use((r) => r, handleApiError);
publicClient.interceptors.response.use((r) => r, handleApiError);

// ─── Token helpers ───────────────────────────────────────────────────

export function setStaffToken(token: string) {
  localStorage.setItem(STAFF_TOKEN_KEY, token);
}

export function getStaffToken(): string | null {
  return localStorage.getItem(STAFF_TOKEN_KEY);
}

export function clearStaffToken() {
  localStorage.removeItem(STAFF_TOKEN_KEY);
}

export function setClientRoomToken(token: string) {
  sessionStorage.setItem(CLIENT_TOKEN_KEY, token);
}

export function getClientRoomToken(): string | null {
  return sessionStorage.getItem(CLIENT_TOKEN_KEY);
}

export function clearClientRoomToken() {
  sessionStorage.removeItem(CLIENT_TOKEN_KEY);
}
