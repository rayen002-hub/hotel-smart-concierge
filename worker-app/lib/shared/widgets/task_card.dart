import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../features/tasks/data/task_model.dart';
import 'status_chip.dart';
import 'task_helpers.dart';

/// Premium task card widget used in the task list.
///
/// Displays room number, category, status badge, message snippet,
/// and time since assignment with a navigation chevron.
class TaskCard extends StatelessWidget {
  final TaskModel task;
  final VoidCallback onTap;

  const TaskCard({
    super.key,
    required this.task,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final catColor = TaskHelpers.getCategoryColor(task.category);
    final statusColor = TaskHelpers.getStatusColor(task.status);

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
                            color: AppColors.primary.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: const Icon(
                            Icons.meeting_room_outlined,
                            size: 18,
                            color: AppColors.primary,
                          ),
                        ),
                        const SizedBox(width: 10),
                        Text(
                          'Chambre ${task.room.roomNumber}',
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

                // ── Category + Floor ─────────────────────────────
                Row(
                  children: [
                    Icon(
                      TaskHelpers.getCategoryIcon(task.category),
                      size: 15,
                      color: catColor,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      task.category.label,
                      style: TextStyle(
                        color: catColor,
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
                      'Étage ${task.room.floor}',
                      style: const TextStyle(
                        color: AppColors.textSecondary,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // ── Message snippet ──────────────────────────────
                Text(
                  task.messageSnippet,
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
