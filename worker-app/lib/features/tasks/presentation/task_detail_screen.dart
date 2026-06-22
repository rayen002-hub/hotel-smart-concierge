import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_colors.dart';
import '../../../shared/widgets/widgets.dart';
import '../../auth/data/auth_service.dart';
import '../data/task_model.dart';
import '../data/task_service.dart';

/// Premium screen displaying detailed information for an assigned task.
class TaskDetailScreen extends StatefulWidget {
  final String taskId;

  const TaskDetailScreen({
    super.key,
    required this.taskId,
  });

  @override
  State<TaskDetailScreen> createState() => _TaskDetailScreenState();
}

class _TaskDetailScreenState extends State<TaskDetailScreen> {
  TaskModel? _task;
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _fetchTaskDetail();
  }

  /// Fetches specific task detail by ID.
  Future<void> _fetchTaskDetail() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final task = await TaskService.instance.getTaskById(widget.taskId);
      if (mounted) {
        setState(() {
          _task = task;
          _isLoading = false;
        });
      }
    } on ApiException catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.message;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _errorMessage = 'Impossible de charger les détails de la tâche.';
          _isLoading = false;
        });
      }
    }
  }

  // ── Build methods ──────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Détails de la Tâche'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => context.go('/tasks'),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: AppColors.textSecondary),
            tooltip: 'Actualiser',
            onPressed: _isLoading ? null : _fetchTaskDetail,
          ),
          IconButton(
            icon: const Icon(Icons.logout_rounded, color: AppColors.textSecondary),
            tooltip: 'Déconnexion',
            onPressed: () async {
              await AuthService.instance.logout();
              if (context.mounted) {
                context.go('/login');
              }
            },
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: Container(
        decoration: const BoxDecoration(
          gradient: AppColors.backgroundGradient,
        ),
        child: SafeArea(
          child: _buildBody(),
        ),
      ),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const LoadingView(message: 'Chargement des détails...');
    }

    if (_errorMessage != null) {
      return ErrorView(
        message: _errorMessage!,
        onRetry: _fetchTaskDetail,
      );
    }

    if (_task == null) {
      return const EmptyState(
        icon: Icons.search_off_rounded,
        title: 'Tâche introuvable',
        subtitle: 'Cette tâche n\'existe pas ou a été supprimée.',
      );
    }

    return Column(
      children: [
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _buildHeaderCard(),
                const SizedBox(height: 16),
                _buildStatusSection(),
                const SizedBox(height: 16),
                _buildMessagesSection(),
                const SizedBox(height: 16),
                _buildInterventionsSection(),
                const SizedBox(height: 8),
              ],
            ),
          ),
        ),
        _buildBottomActionsBar(),
      ],
    );
  }

  Widget _buildHeaderCard() {
    final catColor = TaskHelpers.getCategoryColor(_task!.category);

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.cardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border, width: 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(
                        Icons.meeting_room_rounded,
                        color: AppColors.primary,
                        size: 24,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Chambre ${_task!.room.roomNumber}',
                            style: const TextStyle(
                              color: AppColors.textPrimary,
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'Étage ${_task!.room.floor}  •  ${_task!.room.type}',
                            style: const TextStyle(
                              color: AppColors.textSecondary,
                              fontSize: 13,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              StatusChip(
                label: _task!.category.label,
                color: catColor,
                icon: TaskHelpers.getCategoryIcon(_task!.category),
                fontSize: 11,
              ),
            ],
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: AppColors.background.withValues(alpha: 0.5),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Row(
              children: [
                Icon(
                  Icons.calendar_today_rounded,
                  color: AppColors.textSecondary.withValues(alpha: 0.7),
                  size: 14,
                ),
                const SizedBox(width: 8),
                Text(
                  'Assignée le ${TaskHelpers.formatDateTime(_task!.createdAt)}',
                  style: TextStyle(
                    color: AppColors.textSecondary.withValues(alpha: 0.8),
                    fontSize: 13,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusSection() {
    final statusColor = TaskHelpers.getStatusColor(_task!.status);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      decoration: BoxDecoration(
        color: AppColors.cardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border, width: 1),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          const Row(
            children: [
              Icon(Icons.flag_rounded, color: AppColors.textSecondary, size: 18),
              SizedBox(width: 8),
              Text(
                'Statut actuel',
                style: TextStyle(
                  color: AppColors.textPrimary,
                  fontWeight: FontWeight.w600,
                  fontSize: 15,
                ),
              ),
            ],
          ),
          StatusChip(
            label: _task!.status.label,
            color: statusColor,
            fontSize: 12,
          ),
        ],
      ),
    );
  }

  Widget _buildMessagesSection() {
    final translatedMsg = _task!.staffMessage ?? _task!.originalMessage;
    final showOriginal = _task!.staffMessage != null &&
        _task!.staffMessage!.isNotEmpty &&
        _task!.staffMessage != _task!.originalMessage;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.cardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border, width: 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _SectionHeader(
            icon: Icons.g_translate_rounded,
            label: 'Message client (Traduit)',
          ),
          const SizedBox(height: 12),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.background.withValues(alpha: 0.5),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.border.withValues(alpha: 0.5)),
            ),
            child: Text(
              translatedMsg,
              style: const TextStyle(
                color: AppColors.textPrimary,
                fontSize: 15,
                height: 1.5,
              ),
            ),
          ),
          if (showOriginal) ...[
            const SizedBox(height: 16),
            Row(
              children: [
                Icon(
                  Icons.chat_bubble_outline_rounded,
                  color: AppColors.textSecondary.withValues(alpha: 0.7),
                  size: 16,
                ),
                const SizedBox(width: 6),
                Text(
                  'Message original',
                  style: TextStyle(
                    color: AppColors.textSecondary.withValues(alpha: 0.8),
                    fontWeight: FontWeight.w600,
                    fontSize: 13,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppColors.background.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.border.withValues(alpha: 0.3)),
              ),
              child: Text(
                _task!.originalMessage,
                style: const TextStyle(
                  color: AppColors.textSecondary,
                  fontStyle: FontStyle.italic,
                  fontSize: 14,
                  height: 1.5,
                ),
              ),
            ),
          ]
        ],
      ),
    );
  }

  Widget _buildInterventionsSection() {
    final hasLogs = _task!.interventionLogs.isNotEmpty;
    final InterventionLogModel? latestLog = hasLogs ? _task!.interventionLogs.first : null;

    final entryTimeText = latestLog?.entryTime != null
        ? TaskHelpers.formatDateTime(latestLog!.entryTime)
        : 'Non commencée';
    final exitTimeText = latestLog?.exitTime != null
        ? TaskHelpers.formatDateTime(latestLog!.exitTime)
        : 'Non terminée';
    final resultText = latestLog?.result != null ? latestLog!.result!.label : 'En attente';
    final resultColor = latestLog?.result != null
        ? (latestLog!.result == InterventionResult.FIXED ? AppColors.success : AppColors.error)
        : AppColors.textSecondary;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.cardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border, width: 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _SectionHeader(
            icon: Icons.assignment_rounded,
            label: 'Suivi d\'intervention',
          ),
          const SizedBox(height: 16),
          _InfoRow(label: 'Heure d\'entrée', value: entryTimeText),
          const SizedBox(height: 10),
          _InfoRow(label: 'Heure de sortie', value: exitTimeText),
          const SizedBox(height: 10),
          _InfoRow(label: 'Résultat', value: resultText, valueColor: resultColor),
          if (latestLog?.employeeComment != null && latestLog!.employeeComment!.isNotEmpty) ...[
            const SizedBox(height: 16),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.background.withValues(alpha: 0.3),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppColors.border.withValues(alpha: 0.4)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Commentaire :',
                    style: TextStyle(
                      color: AppColors.textSecondary.withValues(alpha: 0.8),
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    latestLog.employeeComment!,
                    style: const TextStyle(
                      color: AppColors.textPrimary,
                      fontSize: 13,
                      height: 1.4,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildBottomActionsBar() {
    final status = _task!.status;
    final showScanEntry = status == TaskStatus.ASSIGNED ||
        status == TaskStatus.REOPENED ||
        status == TaskStatus.NEEDS_REVIEW;
    final showScanExit = status == TaskStatus.IN_PROGRESS;

    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
      decoration: const BoxDecoration(
        color: AppColors.cardBg,
        border: Border(
          top: BorderSide(color: AppColors.border, width: 1),
        ),
      ),
      child: Row(
        children: [
          if (showScanEntry)
            Expanded(
              child: AppButton.primary(
                label: 'Scanner Entrée',
                icon: Icons.qr_code_scanner_rounded,
                onPressed: () async {
                  final result = await context.push<bool>('/tasks/${_task!.id}/scan-entry');
                  if (result == true && mounted) {
                    _fetchTaskDetail();
                  }
                },
              ),
            ),
          if (showScanExit)
            Expanded(
              child: AppButton.warning(
                label: 'Scanner Sortie',
                icon: Icons.qr_code_scanner_rounded,
                onPressed: () async {
                  final result = await context.push<bool>('/tasks/${_task!.id}/scan-exit');
                  if (result == true && mounted) {
                    _fetchTaskDetail();
                  }
                },
              ),
            ),
          if (showScanEntry || showScanExit) const SizedBox(width: 10),
          Expanded(
            child: AppButton.outlined(
              label: 'Messages',
              icon: Icons.chat_bubble_rounded,
              onPressed: () {
                context.push('/tasks/${_task!.id}/messages');
              },
            ),
          ),
        ],
      ),
    );
  }
}

// ── Private helper widgets ────────────────────────────────────────────────────

class _SectionHeader extends StatelessWidget {
  final IconData icon;
  final String label;

  const _SectionHeader({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, color: AppColors.primary, size: 20),
        const SizedBox(width: 8),
        Text(
          label,
          style: const TextStyle(
            color: AppColors.textPrimary,
            fontWeight: FontWeight.bold,
            fontSize: 15,
          ),
        ),
      ],
    );
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;
  final Color? valueColor;

  const _InfoRow({
    required this.label,
    required this.value,
    this.valueColor,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: const TextStyle(
            color: AppColors.textSecondary,
            fontSize: 14,
          ),
        ),
        Text(
          value,
          style: TextStyle(
            color: valueColor ?? AppColors.textPrimary,
            fontWeight: FontWeight.w500,
            fontSize: 14,
          ),
        ),
      ],
    );
  }
}
