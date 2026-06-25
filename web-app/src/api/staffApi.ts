import { staffClient } from './apiClient';

// ═══════════════════════════════════════════════════════════════════════
//  Staff API — all requests carry Authorization: Bearer via staffClient
// ═══════════════════════════════════════════════════════════════════════

// ─── Rooms ───────────────────────────────────────────────────────────

export interface RoomPayload {
  roomNumber: string;
  floor: number;
  type: string;
  status?: string;
}

export async function listRooms() {
  const { data } = await staffClient.get('/rooms');
  return data;
}

export async function createRoom(payload: RoomPayload) {
  const { data } = await staffClient.post('/rooms', payload);
  return data;
}

export async function updateRoom(id: string, payload: Partial<RoomPayload>) {
  const { data } = await staffClient.patch(`/rooms/${id}`, payload);
  return data;
}

export async function deleteRoom(id: string) {
  const { data } = await staffClient.delete(`/rooms/${id}`);
  return data;
}

export async function generateWorkerQr(roomId: string) {
  const { data } = await staffClient.post(`/rooms/${roomId}/worker-qr`);
  return data;
}

export async function regenerateWorkerQr(roomId: string) {
  const { data } = await staffClient.post(`/rooms/${roomId}/regenerate-worker-qr`);
  return data;
}

// ─── Reservations ────────────────────────────────────────────────────

export interface ReservationPayload {
  reservationNumber: string;
  guestFirstName: string;
  guestLastName: string;
  guestEmail?: string;
  guestPhone?: string;
  nationality?: string;
  checkInDate: string;
  checkOutDate: string;
  roomId?: string;
}

export async function listReservations() {
  const { data } = await staffClient.get('/reservations');
  return data;
}

export async function createReservation(payload: ReservationPayload) {
  const { data } = await staffClient.post('/reservations', payload);
  return data;
}

export async function updateReservation(id: string, payload: Partial<ReservationPayload & { status: string }>) {
  const { data } = await staffClient.patch(`/reservations/${id}`, payload);
  return data;
}

export async function deleteReservation(id: string) {
  const { data } = await staffClient.delete(`/reservations/${id}`);
  return data;
}

export async function generateClientRoomLink(reservationId: string) {
  const { data } = await staffClient.post(`/reservations/${reservationId}/client-room-link`);
  return data;
}

export async function getGuestForms(reservationId: string) {
  const { data } = await staffClient.get(`/reservations/${reservationId}/guest-forms`);
  return data;
}

// ─── Complaints (staff view) ─────────────────────────────────────────

export interface ComplaintFilters {
  status?: string;
  category?: string;
  roomId?: string;
}

export async function listComplaints(filters?: ComplaintFilters) {
  const { data } = await staffClient.get('/complaints', { params: filters });
  return data;
}

export async function getComplaint(id: string) {
  const { data } = await staffClient.get(`/complaints/${id}`);
  return data;
}

export async function updateComplaintCategory(id: string, category: string) {
  const { data } = await staffClient.patch(`/complaints/${id}/category`, { category });
  return data;
}

export async function assignComplaint(id: string, employeeId: string) {
  const { data } = await staffClient.patch(`/complaints/${id}/assign`, { employeeId });
  return data;
}

export async function getComplaintMessages(id: string) {
  const { data } = await staffClient.get(`/complaints/${id}/messages`);
  return data;
}

export async function sendComplaintMessage(id: string, message: string) {
  const { data } = await staffClient.post(`/complaints/${id}/messages`, { message });
  return data;
}

// ─── Employees ───────────────────────────────────────────────────────

export interface EmployeePayload {
  name: string;
  email: string;
  password: string;
  department: string;
}

export async function listEmployees() {
  const { data } = await staffClient.get('/employees');
  return data;
}

export async function createEmployee(payload: EmployeePayload) {
  const { data } = await staffClient.post('/employees', payload);
  return data;
}

export async function updateEmployee(id: string, payload: Partial<{ isAvailable: boolean; department: string }>) {
  const { data } = await staffClient.patch(`/employees/${id}`, payload);
  return data;
}

export async function listOnlineEmployees() {
  const { data } = await staffClient.get('/employees/online');
  return data;
}

// ─── Hotel Info & Currency (staff edit) ──────────────────────────────

export async function updateHotelInfo(id: string, payload: { title?: string; content?: string; type?: string }) {
  const { data } = await staffClient.patch(`/hotel-info/${id}`, payload);
  return data;
}

export async function updateCurrencyRate(id: string, rateToTnd: number) {
  const { data } = await staffClient.patch(`/currency-rates/${id}`, { rateToTnd });
  return data;
}

export async function listAuditLogs() {
  const { data } = await staffClient.get('/audit-logs');
  return data;
}

// ─── Check-in QR ─────────────────────────────────────────────────────

export async function getCheckinQrUrl() {
  const { data } = await staffClient.post('/checkin-qr');
  return data;
}

// ─── Guest Messages (staff) ──────────────────────────────────────────

export async function listGuestConversations() {
  const { data } = await staffClient.get('/guest-messages');
  return data;
}

export async function getGuestConversation(reservationId: string) {
  const { data } = await staffClient.get(`/guest-messages/${reservationId}`);
  return data;
}

export async function replyToGuest(reservationId: string, message: string) {
  const { data } = await staffClient.post(`/guest-messages/${reservationId}/reply`, { message });
  return data;
}

// ─── Events (staff) ──────────────────────────────────────────────────

export async function listEvents() {
  const { data } = await staffClient.get('/events');
  return data;
}

export async function createEvent(formData: FormData) {
  const { data } = await staffClient.post('/events', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function updateEvent(id: string, formData: FormData) {
  const { data } = await staffClient.patch(`/events/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function deleteEvent(id: string) {
  const { data } = await staffClient.delete(`/events/${id}`);
  return data;
}

// ─── Housekeeping Tasks ──────────────────────────────────────────────

export async function listOccupiedRooms() {
  const { data } = await staffClient.get('/housekeeping/occupied-rooms');
  return data;
}

export async function createHousekeepingTask(payload: {
  roomId: string;
  reservationId?: string;
  assignedToId: string;
  note?: string;
}) {
  const { data } = await staffClient.post('/housekeeping/tasks', payload);
  return data;
}

export async function listHousekeepingTasks(filters?: { status?: string; page?: number; limit?: number }) {
  const { data } = await staffClient.get('/housekeeping/tasks', { params: filters });
  return data;
}

// ─── Shift Scheduling ────────────────────────────────────────────────

export type WorkerShift = 'MORNING' | 'EVENING' | 'NIGHT' | 'DAY_OFF';

export const SHIFT_LABELS: Record<WorkerShift, string> = {
  MORNING: '07:00–15:00 (Matin)',
  EVENING: '15:00–23:00 (Soir)',
  NIGHT:   '23:00–07:00 (Nuit)',
  DAY_OFF: 'Repos',
};

export async function getShifts(businessDay?: string) {
  const { data } = await staffClient.get('/shifts', { params: businessDay ? { businessDay } : {} });
  return data;
}

export async function upsertShift(payload: { workerId: string; shift: WorkerShift; businessDay?: string }) {
  const { data } = await staffClient.put('/shifts', payload);
  return data;
}

// ─── Daily Cleaning Tasks ─────────────────────────────────────────────

export type DailyCleaningStatus = 'ASSIGNED' | 'IN_PROGRESS' | 'DONE' | 'SKIPPED';

export async function listDailyCleaningTasks(filters?: {
  businessDay?: string;
  workerId?: string;
  status?: string;
  roomId?: string;
}) {
  const { data } = await staffClient.get('/housekeeping/daily-tasks', { params: filters });
  return data;
}

export async function createDailyCleaningTask(payload: {
  roomId: string;
  workerId: string;
  note?: string;
  businessDay?: string;
}) {
  const { data } = await staffClient.post('/housekeeping/daily-tasks', payload);
  return data;
}

export async function deleteDailyCleaningTask(id: string) {
  const { data } = await staffClient.delete(`/housekeeping/daily-tasks/${id}`);
  return data;
}

