import 'package:flutter_test/flutter_test.dart';
import 'package:worker_app/app.dart';

void main() {
  testWidgets('Splash screen smoke test', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const WorkerApp());
    await tester.pump(); // Let GoRouter resolve initial route

    // Verify that splash screen displays Luxe branding
    expect(find.text('LUXE CONCIERGE'), findsOneWidget);

    // Advance time by 2 seconds to let the splash timer fire
    await tester.pump(const Duration(seconds: 2));
  });
}
