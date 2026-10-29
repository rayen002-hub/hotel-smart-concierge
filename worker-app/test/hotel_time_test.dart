import 'package:flutter_test/flutter_test.dart';
import 'package:worker_app/shared/widgets/task_helpers.dart';

void main() {
  test('formats UTC API timestamps in Tunisia time with a 24-hour clock', () {
    final timestamp = DateTime.parse('2026-10-30T22:30:00.000Z');

    expect(TaskHelpers.formatDateTime(timestamp), '30/10/2026 à 23:30');
    expect(TaskHelpers.formatTime(timestamp), '23:30');
  });

  test('groups worker messages by Tunisia calendar day', () {
    final beforeLocalMidnight = DateTime.parse('2026-10-30T22:59:00.000Z');
    final afterLocalMidnight = DateTime.parse('2026-10-30T23:01:00.000Z');

    expect(TaskHelpers.isSameHotelDay(beforeLocalMidnight, afterLocalMidnight), isFalse);
  });
}
