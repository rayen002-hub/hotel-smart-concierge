import 'dart:async';
import 'package:dio/dio.dart';
import '../api/api_client.dart';
import '../constants/api_constants.dart';

/// Periodic heartbeat that tells the backend the employee is online.
///
/// Usage:
///   HeartbeatService.instance.start();   // after successful login
///   HeartbeatService.instance.stop();    // on logout or app termination
///
/// The heartbeat fires immediately, then every [_interval] seconds.
/// Network errors are silently swallowed — they must never block the UI.
class HeartbeatService {
  HeartbeatService._();

  static final HeartbeatService _instance = HeartbeatService._();
  static HeartbeatService get instance => _instance;

  static const Duration _interval = Duration(seconds: 60);

  final Dio _dio = ApiClient.instance.dio;
  Timer? _timer;
  bool _running = false;

  /// Whether the heartbeat loop is currently active.
  bool get isRunning => _running;

  /// Starts the heartbeat loop.
  ///
  /// Sends an immediate ping, then schedules a periodic call every 60 s.
  /// Calling [start] while already running is a no-op.
  void start() {
    if (_running) return;
    _running = true;

    // Fire immediately.
    _ping();

    // Then repeat every _interval.
    _timer = Timer.periodic(_interval, (_) => _ping());
  }

  /// Stops the heartbeat loop and cancels the periodic timer.
  void stop() {
    _running = false;
    _timer?.cancel();
    _timer = null;
  }

  /// Single heartbeat POST — errors are silently ignored.
  Future<void> _ping() async {
    try {
      await _dio.post(ApiConstants.heartbeat);
    } on DioException {
      // Silently swallow — heartbeat failure must never disrupt the app.
    } catch (_) {
      // Catch-all safety net.
    }
  }
}
