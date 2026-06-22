/// API configuration constants.
///
/// Change [baseUrl] to match your deployment environment.
/// - Local development:  http://10.0.2.2:3000/api  (Android emulator)
/// - Local development:  http://localhost:3000/api   (iOS sim / desktop)
/// - Production:         https://your-hotel-api.example.com/api
class ApiConstants {
  ApiConstants._();

  // ── Base URL ─────────────────────────────────────────────────────────────
  // Backend runs on port 5000 (see backend/.env).
  // Use 10.0.2.2 on Android emulator (maps to host localhost).
  // Use localhost for Windows/Linux desktop or iOS simulator.
  static const String baseUrl = 'http://192.168.0.150:5000/api';

  // ── Auth ─────────────────────────────────────────────────────────────────
  static const String login = '/auth/login';
  static const String me = '/auth/me';
  static const String logout = '/auth/logout';

  // ── Mobile (EMPLOYEE only) ───────────────────────────────────────────────
  static const String heartbeat = '/mobile/heartbeat';
  static const String tasks = '/mobile/tasks';

  /// Returns the path for a single task by [id].
  static String task(String id) => '/mobile/tasks/$id';

  /// Returns the scan-entry path for task [id].
  static String scanEntry(String id) => '/mobile/tasks/$id/scan-entry';

  /// Returns the scan-exit path for task [id].
  static String scanExit(String id) => '/mobile/tasks/$id/scan-exit';

  /// Returns the messages path for task [id].
  static String taskMessages(String id) => '/mobile/tasks/$id/messages';

  // ── Timeouts ─────────────────────────────────────────────────────────────
  static const Duration connectTimeout = Duration(seconds: 10);
  static const Duration receiveTimeout = Duration(seconds: 15);

  // ── Secure storage keys ───────────────────────────────────────────────────
  static const String tokenKey = 'auth_token';
  static const String userIdKey = 'user_id';
  static const String userRoleKey = 'user_role';
}
