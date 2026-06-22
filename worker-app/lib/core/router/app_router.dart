import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../features/auth/presentation/login_screen.dart';
import '../../features/home/presentation/home_screen.dart';
import '../../features/splash/presentation/splash_screen.dart';
import '../../features/tasks/presentation/task_list_screen.dart';
import '../../features/tasks/presentation/task_detail_screen.dart';
import '../../features/tasks/presentation/qr_scanner_screen.dart';
import '../../features/tasks/presentation/qr_exit_scanner_screen.dart';
import '../../features/tasks/presentation/messages_screen.dart';
import '../storage/auth_storage.dart';

class AppRouter {
  AppRouter._();

  static final GoRouter router = GoRouter(
    initialLocation: '/splash',
    // Redirect unauthenticated access to /login.
    redirect: (BuildContext context, GoRouterState state) async {
      final protectedRoutes = ['/tasks', '/home'];
      final isProtected = protectedRoutes.any(
        (r) => state.matchedLocation.startsWith(r),
      );
      if (!isProtected) return null; // splash, login — always accessible

      final hasToken = await AuthStorage.hasToken();
      if (!hasToken) return '/login';
      return null;
    },
    routes: <RouteBase>[
      GoRoute(
        path: '/splash',
        builder: (BuildContext context, GoRouterState state) {
          return const SplashScreen();
        },
      ),
      GoRoute(
        path: '/login',
        builder: (BuildContext context, GoRouterState state) {
          return const LoginScreen();
        },
      ),
      GoRoute(
        path: '/tasks',
        builder: (BuildContext context, GoRouterState state) {
          return const TaskListScreen();
        },
      ),
      GoRoute(
        path: '/tasks/:id',
        builder: (BuildContext context, GoRouterState state) {
          final id = state.pathParameters['id']!;
          return TaskDetailScreen(taskId: id);
        },
      ),
      GoRoute(
        path: '/tasks/:id/scan-entry',
        builder: (BuildContext context, GoRouterState state) {
          final id = state.pathParameters['id']!;
          return QrScannerScreen(taskId: id);
        },
      ),
      GoRoute(
        path: '/tasks/:id/scan-exit',
        builder: (BuildContext context, GoRouterState state) {
          final id = state.pathParameters['id']!;
          return QrExitScannerScreen(taskId: id);
        },
      ),
      GoRoute(
        path: '/tasks/:id/messages',
        builder: (BuildContext context, GoRouterState state) {
          final id = state.pathParameters['id']!;
          return MessagesScreen(taskId: id);
        },
      ),
      GoRoute(
        path: '/home',
        builder: (BuildContext context, GoRouterState state) {
          return const HomeScreen();
        },
      ),
    ],
  );
}
