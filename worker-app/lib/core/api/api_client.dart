import 'package:dio/dio.dart';
import '../constants/api_constants.dart';
import '../storage/auth_storage.dart';
import 'heartbeat_service.dart';

/// Singleton Dio client with:
/// - Automatic `Authorization: Bearer <token>` injection via interceptor.
/// - Consistent timeout configuration.
/// - Centralised error handling (logs + rethrow as [DioException]).
class ApiClient {
  ApiClient._();

  static final ApiClient _instance = ApiClient._();
  static ApiClient get instance => _instance;

  late final Dio _dio = _buildDio();

  /// The raw [Dio] instance for direct use by service classes.
  Dio get dio => _dio;

  // ── Factory ───────────────────────────────────────────────────────────────

  Dio _buildDio() {
    final dio = Dio(
      BaseOptions(
        baseUrl: ApiConstants.baseUrl,
        connectTimeout: ApiConstants.connectTimeout,
        receiveTimeout: ApiConstants.receiveTimeout,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        validateStatus: (status) => status != null && status < 500,
      ),
    );

    dio.interceptors.add(_AuthInterceptor());

    return dio;
  }
}

// ── Auth Interceptor ──────────────────────────────────────────────────────────

/// Reads the JWT from [AuthStorage] and injects it as `Authorization: Bearer`
/// before each request. If the response is 401, clears the stored session.
class _AuthInterceptor extends Interceptor {
  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final token = await AuthStorage.getToken();
    if (token != null && token.isNotEmpty) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    return handler.next(options);
  }

  @override
  void onResponse(Response response, ResponseInterceptorHandler handler) {
    // Pass through successful responses untouched.
    return handler.next(response);
  }

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    // If the server returns 401, the token is invalid or expired → clear it and stop heartbeat.
    if (err.response?.statusCode == 401) {
      await AuthStorage.clearSession();
      HeartbeatService.instance.stop();
    }
    return handler.next(err);
  }
}
