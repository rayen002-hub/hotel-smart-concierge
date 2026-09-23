# LoomStay — Project Audit (Source Code as of September 2026)

## 1. Project Structure
- `web-app/` — React + TypeScript + Vite frontend
- `backend/` — Node.js + Express + TypeScript + Prisma
- `ai-service/` — Python + FastAPI (classification + translation)
- `worker-app/` — Flutter + Dart mobile app
- `dataset/` — complaints_dataset.csv (604 rows, 6 categories)
- `docs/` — Markdown documentation

## 2. Prisma Models (schema.prisma — 446 lines)
### Enums
UserRole, Department, RoomStatus, ReservationStatus, ComplaintCategory, ComplaintStatus,
InterventionResult, MessageSenderType, CheckinCompletionStatus, TravelerType,
HousekeepingTaskStatus, HousekeepingTaskResult, WorkerShift, DailyCleaningStatus

### Models (17 total)
1. **User** — id, name, email, passwordHash, role, isActive, timestamps
2. **EmployeeProfile** — userId, department, isAvailable, lastSeenAt, lastLoginAt, lastLogoutAt, createdById
3. **Room** — roomNumber, floor, type, status, workerQrVersion
4. **Reservation** — reservationNumber, guest info, checkIn/Out dates, status, roomId, adults/children, checkinCompletionStatus
5. **GuestForm** — reservationId, travelerIndex, travelerType, fullName, nationality, passportEncrypted, phone, address
6. **Complaint** — reservationId, roomId, originalMessage, detectedLanguage, normalizedMessageEn, staffMessage, category, status, assignedToId, timestamps
7. **InterventionLog** — complaintId, employeeId, roomId, entryTime, exitTime, result, employeeComment
8. **InternalMessage** — complaintId, senderId, receiverId, message, readAt
9. **HotelInfo** — title, content, type
10. **CurrencyRate** — currency, rateToTnd
11. **AuditLog** — actorId, action, entity, entityId, metadata
12. **GuestStaffMessage** — reservationId, roomId, senderType, originalMessage, detectedLanguage, staffMessage, clientMessage, readAt
13. **HotelEvent** — title, description, eventDate, imageUrl, imagePath, isPublished, createdById
14. **HousekeepingTask** — roomId, reservationId, assignedToId, assignedById, note, status, entry/exitTime, result, workerComment
15. **WorkerShiftSchedule** — workerId, businessDay, shift, createdById (unique per worker+day)
16. **DailyCleaningTask** — roomId, workerId, businessDay, status, note, assignedById, startedAt, completedAt
17. **CurrencyRate** — currency conversion model

## 3. Backend Architecture (Layered)
### Routes (20 files)
auth, admin, checkin, checkinQr, complaint, employee, event, eventPublic, guestMessage,
health, hotel, hotelPublic, housekeeping, mobile, reservation, room, shifts,
staffComplaint, staffGuestMessage, index

### Controllers (14 files)
admin, auth, checkin, complaint, dailyCleaning, employee, hotel, housekeeping,
mobile, qr, reservation, room, shifts, staffComplaint

### Services (17 files)
ai, auth, checkin, checkinToken, complaint, currency, dailyCleaning, employee,
event, guestMessage, hotel, housekeeping, qrToken, reservation, room, shifts, storage

### Middlewares (4 files)
auth.middleware (JWT verification), role.middleware (RBAC), validate.middleware, errorHandler

### Utils (5 files)
audit, businessDay (06:00 cutoff), encryption, permissions, supabase

### Socket (3 files)
socket.ts (Socket.IO init), message.socket.ts (real-time messaging), authSocket.middleware.ts

## 4. Web Frontend
### Pages — Staff
- LoginPage.tsx — staff authentication
- ReceptionDashboard.tsx (75KB) — reservations, rooms, check-in, QR, complaints, messages, events, travelers
- ManagerDashboard.tsx (72KB) — complaints, employees, shifts, housekeeping, daily cleaning
- AdminDashboard.tsx (54KB) — users CRUD, rooms, complaints, hotel info, events, audit logs

### Pages — Public/Client
- CheckInPage.tsx — digital check-in with reservation number validation
- RoomHomePage.tsx — room space home
- RoomComplaintPage.tsx — submit complaint
- RoomComplaintsPage.tsx — track complaints (confirm/reopen)
- RoomHotelInfoPage.tsx — hotel information
- RoomCurrencyPage.tsx — currency converter
- RoomMessagesPage.tsx — messaging with reception
- RoomEventsPage.tsx — hotel events with images

### Components
- AuthGuard.tsx — RBAC route protection
- PwaInstallBanner.tsx — PWA install prompt
- QRCodeCard.tsx — QR code display
- StatusBadge.tsx, CategoryBadge.tsx, EmptyState.tsx, ErrorMessage.tsx, LoadingSpinner.tsx
- Layout: AppSidebar.tsx, DashboardTopbar.tsx, RoomNavBar.tsx

### Layouts
- RootLayout, StaffLayout, RoomLayout (token gate for client)

### Routing
- React Router v6 with nested routes
- /login, /checkin, /room/*, /dashboard/reception, /dashboard/manager, /dashboard/admin

## 5. AI Service (FastAPI)
### Endpoints
- GET /health — service status
- POST /classify — complaint classification (TF-IDF + LogisticRegression)
- POST /detect-language — language detection (langdetect)
- POST /translate — NLLB-200-distilled-600M translation
- POST /analyze — full pipeline (detect + translate + classify)
- GET /supported-languages
- POST /translation/reset

### Services
- classifier_service.py — loads joblib model, predict with confidence
- language_service.py — langdetect + language mapping
- translation_service.py — NLLB-200-distilled-600M, lazy loading, caching, hotel glossary

### Model Metrics (LR_combined)
- Accuracy: 0.8595
- F1 macro: 0.8605
- F1 weighted: 0.8604
- CV F1 macro: 0.7702 ±0.0450
- 6 categories: COMPLAINT, HOUSEKEEPING, MAINTENANCE, OTHER, RECEPTION, RESTAURANT
- Dataset: 604 examples (603 after cleaning)
- Train/Test split: 482/121

### Tests
- test_app.py — FastAPI endpoint tests
- test_language_detection.py — language detection tests

## 6. Flutter Worker App
### Architecture: Feature-based directory structure (NOT BLoC/MVVM)
### Features
- auth/ — login_screen.dart, auth_service.dart (JWT + flutter_secure_storage), user_model.dart
- home/ — home_screen.dart (dashboard with quick actions)
- tasks/ — task_list_screen.dart (2 tabs: Réclamations + Ménage quotidien)
  - task_detail_screen.dart, qr_scanner_screen.dart, qr_exit_scanner_screen.dart
  - intervention_result_screen.dart, messages_screen.dart
  - housekeeping_task_detail_screen.dart, daily_cleaning_task_detail_screen.dart
  - Models: task_model.dart, housekeeping_task_model.dart, daily_cleaning_task_model.dart, message_model.dart
  - Services: task_service.dart, housekeeping_task_service.dart, daily_cleaning_task_service.dart, message_service.dart
- splash/ — splash_screen.dart
- scanner/ — (gitkeep placeholder)
- messages/ — (gitkeep placeholder)
### Core
- api_client.dart (Dio + JWT interceptor), heartbeat_service.dart
- auth_storage.dart (flutter_secure_storage)
- app_router.dart (GoRouter)
### Shared Widgets
- app_button, empty_state, error_view, loading_view, status_chip, task_card, housekeeping_task_card, task_helpers

## 7. Backend Tests (7 files)
- auth.test.ts — authentication tests
- checkin.test.ts — check-in flow tests
- clientComplaints.test.ts — complaint creation/tracking
- employeeScan.test.ts — QR entry/exit scan validation
- health.test.ts — health endpoint
- testSupabase.test.ts — Supabase integration
- websocket.test.ts — Socket.IO tests

## 8. Shift System (CONFIRMED IMPLEMENTED)
- WorkerShift enum: MORNING (07-15), EVENING (15-23), NIGHT (23-07), DAY_OFF
- WorkerShiftSchedule model: unique per worker+businessDay
- businessDay.ts utility: 06:00 cutoff for hotel business day
- shifts.service.ts, shifts.controller.ts, shifts.routes.ts
- Manager can assign shifts for current day
- Worker availability validation before task assignment

## 9. Daily Cleaning System (CONFIRMED IMPLEMENTED)
- DailyCleaningTask model: per room, per worker, per businessDay
- DailyCleaningStatus: ASSIGNED, IN_PROGRESS, DONE, SKIPPED
- dailyCleaning.service.ts, dailyCleaning.controller.ts
- Multiple rooms assignable to same worker
- Separate from complaint-based HousekeepingTask
- Flutter: daily_cleaning_task_model.dart, daily_cleaning_task_service.dart, daily_cleaning_task_detail_screen.dart

## 10. Deployment
### Demo (Temporary)
- Frontend: Vercel
- Backend: Render
- AI: Hugging Face Spaces
- Database + Storage: Supabase

### Target Production
- Private hotel server/infrastructure
- All services on internal network
