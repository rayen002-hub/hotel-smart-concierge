import 'package:dio/dio.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/heartbeat_service.dart';
import '../../../core/constants/api_constants.dart';
import '../../../core/storage/auth_storage.dart';
import '../data/user_model.dart';

/// Provides authentication operations backed by the real API.
///
/// All methods:
/// - Use [ApiClient.instance.dio] for HTTP calls.
/// - Persist / clear session data via [AuthStorage].
/// - Throw a descriptive [ApiException] on failure.
class AuthService {
  AuthService._();

  static final AuthService _instance = AuthService._();
  static AuthService get instance => _instance;

  final Dio _dio = ApiClient.instance.dio;

  // ── login ─────────────────────────────────────────────────────────────────

  /// Authenticates the employee with [email] and [password].
  ///
  /// On success, saves the token + user metadata to secure storage and
  /// returns a [LoginResult].
  ///
  /// Throws [ApiException] on HTTP or network errors.
  Future<LoginResult> login(String email, String password) async {
    try {
      final response = await _dio.post(
        ApiConstants.login,
        data: {'email': email, 'password': password},
      );

      final body = response.data as Map<String, dynamic>;

      if (response.statusCode != 200 || body['success'] != true) {
        final message = body['error'] as String? ??
            body['message'] as String? ??
            'Identifiants invalides.';
        throw ApiException(message, statusCode: response.statusCode);
      }

      final token = body['token'] as String;
      final userJson = body['user'] as Map<String, dynamic>;
      final user = UserModel.fromJson(userJson);

      // Persist session
      await AuthStorage.saveSession(
        token: token,
        userId: user.id,
        role: user.role,
      );

      return LoginResult(token: token, user: user);
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  // ── logout ────────────────────────────────────────────────────────────────

  /// Informs the backend of the logout and clears the local session.
  ///
  /// The session is cleared even if the network call fails, so the app
  /// always returns to the unauthenticated state.
  Future<void> logout() async {
    // Stop heartbeat immediately so no more pings are sent.
    HeartbeatService.instance.stop();

    try {
      await _dio.post(ApiConstants.logout);
    } on DioException {
      // Ignore network errors — we always clear locally.
    } finally {
      await AuthStorage.clearSession();
    }
  }

  // ── getMe ─────────────────────────────────────────────────────────────────

  /// Returns the currently authenticated user's profile from the backend.
  ///
  /// The token is injected automatically by [ApiClient]'s interceptor.
  /// Throws [ApiException] on failure.
  Future<UserModel> getMe() async {
    try {
      final response = await _dio.get(ApiConstants.me);

      final body = response.data as Map<String, dynamic>;

      if (response.statusCode != 200 || body['success'] != true) {
        final message = body['error'] as String? ?? 'Impossible de récupérer le profil.';
        throw ApiException(message, statusCode: response.statusCode);
      }

      return UserModel.fromJson(body['user'] as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  // ── Token helpers (delegates to AuthStorage) ──────────────────────────────

  /// Saves [token] to secure storage.
  Future<void> saveToken(String token) => AuthStorage.saveToken(token);

  /// Returns the stored JWT token, or `null`.
  Future<String?> getToken() => AuthStorage.getToken();

  /// Removes the stored JWT token.
  Future<void> clearToken() => AuthStorage.clearToken();

  /// Returns `true` if a token is currently stored.
  Future<bool> isLoggedIn() => AuthStorage.hasToken();
}

// ── ApiException ──────────────────────────────────────────────────────────────

/// Structured exception thrown by all service classes.
class ApiException implements Exception {
  final String message;
  final int? statusCode;

  const ApiException(this.message, {this.statusCode});

  factory ApiException.fromDioException(DioException e) {
    if (e.type == DioExceptionType.connectionTimeout ||
        e.type == DioExceptionType.receiveTimeout ||
        e.type == DioExceptionType.sendTimeout) {
      return const ApiException(
        'La connexion a expiré. Vérifiez votre réseau.',
        statusCode: null,
      );
    }

    if (e.type == DioExceptionType.connectionError) {
      return const ApiException(
        'Impossible de contacter le serveur. Vérifiez votre connexion.',
        statusCode: null,
      );
    }

    final statusCode = e.response?.statusCode;
    final body = e.response?.data;
    final message = (body is Map<String, dynamic>)
        ? (body['error'] as String? ??
            body['message'] as String? ??
            'Erreur serveur.')
        : 'Erreur serveur.';

    return ApiException(message, statusCode: statusCode);
  }

  @override
  String toString() =>
      statusCode != null ? 'ApiException($statusCode): $message' : 'ApiException: $message';
}
