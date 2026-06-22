import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../constants/api_constants.dart';

/// Wrapper around [FlutterSecureStorage] that manages the JWT token
/// and basic user metadata (id, role).
class AuthStorage {
  AuthStorage._();

  static const _storage = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
  );

  // ── Token ────────────────────────────────────────────────────────────────

  /// Persists the JWT [token] to secure storage.
  static Future<void> saveToken(String token) =>
      _storage.write(key: ApiConstants.tokenKey, value: token);

  /// Returns the stored JWT token, or `null` if none exists.
  static Future<String?> getToken() =>
      _storage.read(key: ApiConstants.tokenKey);

  /// Removes the stored JWT token.
  static Future<void> clearToken() =>
      _storage.delete(key: ApiConstants.tokenKey);

  // ── User metadata ────────────────────────────────────────────────────────

  /// Persists the authenticated user's [userId].
  static Future<void> saveUserId(String userId) =>
      _storage.write(key: ApiConstants.userIdKey, value: userId);

  /// Returns the stored user id, or `null`.
  static Future<String?> getUserId() =>
      _storage.read(key: ApiConstants.userIdKey);

  /// Persists the authenticated user's [role] string.
  static Future<void> saveUserRole(String role) =>
      _storage.write(key: ApiConstants.userRoleKey, value: role);

  /// Returns the stored user role string, or `null`.
  static Future<String?> getUserRole() =>
      _storage.read(key: ApiConstants.userRoleKey);

  // ── Session ──────────────────────────────────────────────────────────────

  /// Saves all session data atomically.
  static Future<void> saveSession({
    required String token,
    required String userId,
    required String role,
  }) async {
    await Future.wait([
      saveToken(token),
      saveUserId(userId),
      saveUserRole(role),
    ]);
  }

  /// Clears the entire session (token + user metadata).
  static Future<void> clearSession() async {
    await Future.wait([
      _storage.delete(key: ApiConstants.tokenKey),
      _storage.delete(key: ApiConstants.userIdKey),
      _storage.delete(key: ApiConstants.userRoleKey),
    ]);
  }

  /// Returns `true` if a token is currently stored.
  static Future<bool> hasToken() async {
    final token = await getToken();
    return token != null && token.isNotEmpty;
  }
}
