import { publicClient } from './apiClient';

// ─── Client‑Room Complaint API (uses X-Client-Room-Token) ────────────

export interface CreateComplaintPayload {
  message: string;
}

export interface ReopenComplaintPayload {
  comment?: string;
}

/**
 * GET /api/public/complaints
 * List complaints for the current guest session.
 */
export async function listMyComplaints() {
  const { data } = await publicClient.get('/public/complaints');
  return data;
}

/**
 * POST /api/public/complaints
 * Submit a new complaint from the room interface.
 */
export async function createComplaint(payload: CreateComplaintPayload) {
  const { data } = await publicClient.post('/public/complaints', payload);
  return data;
}

/**
 * POST /api/public/complaints/:id/confirm
 * Client confirms a resolved complaint.
 */
export async function confirmComplaint(id: string) {
  const { data } = await publicClient.post(`/public/complaints/${id}/confirm`);
  return data;
}

/**
 * POST /api/public/complaints/:id/reopen
 * Client reopens a resolved complaint with an optional comment.
 */
export async function reopenComplaint(id: string, payload?: ReopenComplaintPayload) {
  const { data } = await publicClient.post(`/public/complaints/${id}/reopen`, payload);
  return data;
}
