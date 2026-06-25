// API configuration constants.
//
// The base URL comes from Env.current in env.dart.
// To change environments, edit env.dart (not this file).
import 'env.dart';

class ApiConstants {
  ApiConstants._();

  // ── Base URL ─────────────────────────────────────────────────────────────
  // Pulled from Env.current (see lib/core/constants/env.dart)
  static String get baseUrl => Env.current.apiBaseUrl;

  // ── Socket URL ───────────────────────────────────────────────────────────
  static String get socketUrl => Env.current.socketUrl;

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

  // ── Housekeeping Tasks (EMPLOYEE) ─────────────────────────────────────
  static const String housekeepingTasks = '/housekeeping/tasks';

  /// Returns the start path for housekeeping task [id].
  static String housekeepingTaskStart(String id) => '/housekeeping/tasks/$id/start';

  /// Returns the finish path for housekeeping task [id].
  static String housekeepingTaskFinish(String id) => '/housekeeping/tasks/$id/finish';

  // ── Timeouts ─────────────────────────────────────────────────────────────
  static const Duration connectTimeout = Duration(seconds: 10);
  static const Duration receiveTimeout = Duration(seconds: 15);

  // ── Secure storage keys ───────────────────────────────────────────────────
  static const String tokenKey = 'auth_token';
  static const String userIdKey = 'user_id';
  static const String userRoleKey = 'user_role';
}
