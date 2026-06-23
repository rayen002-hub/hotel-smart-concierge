import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../features/tasks/data/housekeeping_task_model.dart';
import 'status_chip.dart';
import 'task_helpers.dart';

/// Card widget for housekeeping tasks in the task list.
class HousekeepingTaskCard extends StatelessWidget {
  final HousekeepingTaskModel task;
  final VoidCallback onTap;

  const HousekeepingTaskCard({
    super.key,
    required this.task,
    required this.onTap,
  });

  Color _getStatusColor(HousekeepingTaskStatus status) {
    switch (status) {
      case HousekeepingTaskStatus.PENDING:
        return Colors.grey;
      case HousekeepingTaskStatus.ASSIGNED:
        return AppColors.primary;
      case HousekeepingTaskStatus.IN_PROGRESS:
        return Colors.blue;
      case HousekeepingTaskStatus.COMPLETED:
        return AppColors.success;
      case HousekeepingTaskStatus.NEEDS_REVIEW:
        return Colors.orange;
      case HousekeepingTaskStatus.CANCELLED:
        return AppColors.error;
    }
  }

  @override
  Widget build(BuildContext context) {
    final statusColor = _getStatusColor(task.status);

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      decoration: BoxDecoration(
        color: AppColors.cardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border, width: 1),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.08),
            blurRadius: 8,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // ── Header: Room + Status ────────────────────────
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: Colors.teal.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: const Icon(
                            Icons.cleaning_services_rounded,
                            size: 18,
                            color: Colors.teal,
                          ),
                        ),
                        const SizedBox(width: 10),
                        Text(
                          'Chambre ${task.roomNumber}',
                          style: const TextStyle(
                            color: AppColors.textPrimary,
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                          ),
                        ),
                      ],
                    ),
                    StatusChip(
                      label: task.status.label,
                      color: statusColor,
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // ── Category label + Floor ────────────────────────
                Row(
                  children: [
                    const Icon(
                      Icons.cleaning_services_outlined,
                      size: 15,
                      color: Colors.teal,
                    ),
                    const SizedBox(width: 6),
                    const Text(
                      'Ménage',
                      style: TextStyle(
                        color: Colors.teal,
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 8),
                      child: Text(
                        '•',
                        style: TextStyle(
                          color: AppColors.textSecondary.withValues(alpha: 0.5),
                        ),
                      ),
                    ),
                    Text(
                      'Étage ${task.roomFloor}',
                      style: const TextStyle(
                        color: AppColors.textSecondary,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // ── Note snippet ──────────────────────────────────
                Text(
                  task.noteSnippet,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: AppColors.textSecondary,
                    fontSize: 14,
                    height: 1.4,
                  ),
                ),
                const SizedBox(height: 12),

                // ── Footer: Time + Details ───────────────────────
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Icon(
                          Icons.access_time_rounded,
                          size: 13,
                          color: AppColors.textSecondary.withValues(alpha: 0.7),
                        ),
                        const SizedBox(width: 5),
                        Text(
                          TaskHelpers.formatTimeAgo(task.createdAt),
                          style: TextStyle(
                            color: AppColors.textSecondary.withValues(alpha: 0.7),
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                    Row(
                      children: [
                        Text(
                          'Voir détails',
                          style: TextStyle(
                            color: AppColors.primary.withValues(alpha: 0.8),
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(width: 2),
                        Icon(
                          Icons.chevron_right_rounded,
                          size: 16,
                          color: AppColors.primary.withValues(alpha: 0.8),
                        ),
                      ],
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
