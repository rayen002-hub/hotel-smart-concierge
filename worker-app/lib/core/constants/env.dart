/// Environment configuration for the worker app.
///
/// How to switch environments:
///
/// 1. **Local development (Android emulator)**:
///    ```dart
///    static const env = Env.development;
///    ```
///    Uses `http://10.0.2.2:5000` (Android emulator → host localhost).
///
/// 2. **Local development (real device on same Wi-Fi)**:
///    ```dart
///    static const env = Env.localNetwork;
///    ```
///    Set [_localNetworkIp] to your PC's local IP.
///
/// 3. **Production (Render)**:
///    ```dart
///    static const env = Env.production;
///    ```
///    Uses Render backend URL.
///
/// After changing, run:
/// ```bash
/// flutter build apk --release
/// ```
class Env {
  final String apiBaseUrl;
  final String socketUrl;
  final String name;

  const Env._({
    required this.apiBaseUrl,
    required this.socketUrl,
    required this.name,
  });

  // ── Active environment ──────────────────────────────────────────────────
  // Change THIS line to switch environments:
  static const Env current = Env.production;

  // ── Local IP for real device testing ─────────────────────────────────────
  static const String _localNetworkIp = '192.168.0.150';

  // ── Environment definitions ─────────────────────────────────────────────

  /// Android emulator → host machine localhost
  static const Env development = Env._(
    apiBaseUrl: 'http://10.0.2.2:5000/api',
    socketUrl: 'http://10.0.2.2:5000',
    name: 'development',
  );

  /// Real device on same Wi-Fi network
  static const Env localNetwork = Env._(
    apiBaseUrl: 'http://$_localNetworkIp:5000/api',
    socketUrl: 'http://$_localNetworkIp:5000',
    name: 'localNetwork',
  );

  /// Production (Render backend)
  static const Env production = Env._(
    apiBaseUrl: 'https://hotel-backend-4x7b.onrender.com/api',
    socketUrl: 'https://hotel-backend-4x7b.onrender.com',
    name: 'production',
  );
}
