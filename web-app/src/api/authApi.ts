import { staffClient, setStaffToken, clearStaffToken } from './apiClient';

// ─── Auth API (staff login / logout) ─────────────────────────────────

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const { data } = await staffClient.post<LoginResponse>('/auth/login', payload);
  setStaffToken(data.token);
  return data;
}

export async function logout(): Promise<void> {
  try {
    await staffClient.post('/auth/logout');
  } finally {
    clearStaffToken();
  }
}

export async function getMe() {
  const { data } = await staffClient.get('/auth/me');
  return data;
}
