import 'package:timezone/data/latest.dart' as timezone_data;
import 'package:timezone/timezone.dart' as timezone;

/// IANA-based hotel time helpers shared by employee-facing date displays.
class HotelTime {
  HotelTime._();

  static const String timeZoneName = 'Africa/Tunis';
  static bool _initialized = false;
  static timezone.Location? _location;

  static void initialize() {
    if (_initialized) return;
    timezone_data.initializeTimeZones();
    _location = timezone.getLocation(timeZoneName);
    _initialized = true;
  }

  static timezone.TZDateTime from(DateTime value) {
    initialize();
    return timezone.TZDateTime.from(value.toUtc(), _location!);
  }

  static timezone.TZDateTime now() {
    initialize();
    return timezone.TZDateTime.now(_location!);
  }
}
