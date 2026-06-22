import 'package:flutter/material.dart';
import '../../features/tasks/data/task_model.dart';

/// Centralized helper methods for task category and status display values.
///
/// These are used across multiple screens (task list, task detail, etc.)
/// to avoid code duplication.
class TaskHelpers {
  TaskHelpers._();

  // ── Category ────────────────────────────────────────────────────────────

  static IconData getCategoryIcon(TaskCategory category) {
    switch (category) {
      case TaskCategory.MAINTENANCE:
        return Icons.build_rounded;
      case TaskCategory.HOUSEKEEPING:
        return Icons.cleaning_services_rounded;
      case TaskCategory.RECEPTION:
        return Icons.room_service_rounded;
      case TaskCategory.RESTAURANT:
        return Icons.restaurant_rounded;
      case TaskCategory.COMPLAINT:
        return Icons.report_problem_rounded;
      case TaskCategory.OTHER:
        return Icons.help_outline_rounded;
    }
  }

  static Color getCategoryColor(TaskCategory category) {
    switch (category) {
      case TaskCategory.MAINTENANCE:
        return Colors.orangeAccent;
      case TaskCategory.HOUSEKEEPING:
        return Colors.cyanAccent;
      case TaskCategory.RECEPTION:
        return Colors.purpleAccent;
      case TaskCategory.RESTAURANT:
        return const Color(0xFF10B981);
      case TaskCategory.COMPLAINT:
        return const Color(0xFFFB7185);
      case TaskCategory.OTHER:
        return Colors.grey;
    }
  }

  // ── Status ──────────────────────────────────────────────────────────────

  static Color getStatusColor(TaskStatus status) {
    switch (status) {
      case TaskStatus.PENDING:
        return Colors.grey;
      case TaskStatus.ASSIGNED:
        return Colors.blue;
      case TaskStatus.IN_PROGRESS:
        return Colors.amber;
      case TaskStatus.RESOLVED:
        return Colors.green;
      case TaskStatus.CONFIRMED:
        return Colors.teal;
      case TaskStatus.NEEDS_REVIEW:
        return Colors.indigoAccent;
      case TaskStatus.REOPENED:
        return Colors.redAccent;
    }
  }

  // ── Date formatting ─────────────────────────────────────────────────────

  static String formatDateTime(DateTime? dateTime) {
    if (dateTime == null) return 'Non renseigné';
    final local = dateTime.toLocal();
    final h = local.hour.toString().padLeft(2, '0');
    final m = local.minute.toString().padLeft(2, '0');
    final d = local.day.toString().padLeft(2, '0');
    final mo = local.month.toString().padLeft(2, '0');
    return '$d/$mo/${local.year} à $h:$m';
  }

  static String formatTimeAgo(DateTime dateTime) {
    final diff = DateTime.now().difference(dateTime);
    if (diff.inDays >= 1) {
      return 'Il y a ${diff.inDays} j';
    } else if (diff.inHours >= 1) {
      return 'Il y a ${diff.inHours} h';
    } else if (diff.inMinutes >= 1) {
      return 'Il y a ${diff.inMinutes} min';
    } else {
      return "À l'instant";
    }
  }
}
