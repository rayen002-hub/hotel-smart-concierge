import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_colors.dart';
import '../../../shared/widgets/widgets.dart';
import '../../auth/data/auth_service.dart';
import '../data/daily_cleaning_task_model.dart';
import '../data/daily_cleaning_task_service.dart';

/// Detail screen for a daily cleaning task (Ménage quotidien).
///
/// Does NOT require QR scan — worker simply taps "Commencer" and then
/// "Terminé" or "Ignoré" to update the status.
class DailyCleaningTaskDetailScreen extends StatefulWidget {
  final String taskId;

  const DailyCleaningTaskDetailScreen({super.key, required this.taskId});

  @override
  State<DailyCleaningTaskDetailScreen> createState() => _DailyCleaningTaskDetailScreenState();
}

class _DailyCleaningTaskDetailScreenState extends State<DailyCleaningTaskDetailScreen> {
  DailyCleaningTaskModel? _task;
  bool _isLoading = true;
  String? _errorMessage;
  bool _isActing = false;
  final TextEditingController _noteController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadTask();
  }

  @override
  void dispose() {
    _noteController.dispose();
    super.dispose();
  }

  Future<void> _loadTask() async {
    setState(() { _isLoading = true; _errorMessage = null; });
    try {
      final all = await DailyCleaningTaskService.instance.getMyDailyTasks();
      final found = all.where((t) => t.id == widget.taskId).toList();
      if (found.isEmpty) {
        setState(() { _errorMessage = 'Tâche introuvable.'; _isLoading = false; });
        return;
      }
      setState(() { _task = found.first; _isLoading = false; });
    } on ApiException catch (e) {
      setState(() { _errorMessage = e.message; _isLoading = false; });
    } catch (_) {
      setState(() { _errorMessage = 'Erreur inattendue.'; _isLoading = false; });
    }
  }

  Future<void> _start() async {
    if (_task == null || _isActing) return;
    setState(() => _isActing = true);
    try {
      await DailyCleaningTaskService.instance.startTask(_task!.id);
      await _loadTask();
      if (mounted) _showSnack('Tâche démarrée !', Colors.blue);
    } on ApiException catch (e) {
      if (mounted) _showSnack(e.message, Colors.red.shade700);
    } finally {
      if (mounted) setState(() => _isActing = false);
    }
  }

  Future<void> _complete({required bool done}) async {
    if (_task == null || _isActing) return;
    final note = _noteController.text.trim();
    setState(() => _isActing = true);
    try {
      await DailyCleaningTaskService.instance.completeTask(
        _task!.id,
        done: done,
        note: note.isNotEmpty ? note : null,
      );
      if (mounted) {
        _showSnack(done ? 'Chambre nettoyée ✅' : 'Tâche ignorée', done ? Colors.green.shade700 : Colors.orange.shade700);
        Future.delayed(const Duration(milliseconds: 600), () {
          if (mounted) context.pop();
        });
      }
    } on ApiException catch (e) {
      if (mounted) _showSnack(e.message, Colors.red.shade700);
    } finally {
      if (mounted) setState(() => _isActing = false);
    }
  }

  void _showSnack(String msg, Color color) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg, style: const TextStyle(fontWeight: FontWeight.w600)),
        backgroundColor: color,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        duration: const Duration(seconds: 3),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Ménage quotidien'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => context.pop(),
        ),
      ),
      body: Container(
        decoration: const BoxDecoration(gradient: AppColors.backgroundGradient),
        child: SafeArea(
          child: _buildBody(),
        ),
      ),
    );
  }

  Widget _buildBody() {
    if (_isLoading) return const LoadingView(message: 'Chargement...');
    if (_errorMessage != null) return ErrorView.network(message: _errorMessage!, onRetry: _loadTask);
    final task = _task!;
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // ── Room card ──────────────────────────────────────────────
          _InfoCard(
            icon: Icons.hotel_rounded,
            iconColor: Colors.teal,
            title: 'Chambre ${task.roomNumber}',
            subtitle: 'Étage ${task.roomFloor}${task.room?.type != null ? ' · ${task.room!.type}' : ''}',
          ),
          const SizedBox(height: 12),

          // ── Status ─────────────────────────────────────────────────
          _StatusChip(status: task.status),
          const SizedBox(height: 12),

          // ── Note from manager ──────────────────────────────────────
          if (task.note != null && task.note!.isNotEmpty) ...[
            _InfoCard(
              icon: Icons.note_rounded,
              iconColor: Colors.amber.shade600,
              title: 'Note du responsable',
              subtitle: task.note!,
              multiline: true,
            ),
            const SizedBox(height: 12),
          ],

          // ── Times ──────────────────────────────────────────────────
          if (task.startedAt != null)
            _TimeRow(label: 'Début', value: task.startedAt!),
          if (task.completedAt != null)
            _TimeRow(label: 'Fin', value: task.completedAt!),
          if (task.startedAt != null || task.completedAt != null)
            const SizedBox(height: 12),

          // ── Worker comment / note input ────────────────────────────
          if (!task.status.isTerminal) ...[
            const Text('Commentaire (optionnel)', style: TextStyle(fontSize: 12, color: AppColors.textSecondary, fontWeight: FontWeight.w600)),
            const SizedBox(height: 6),
            Container(
              decoration: BoxDecoration(
                color: AppColors.cardBg,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.border),
              ),
              child: TextField(
                controller: _noteController,
                maxLines: 3,
                maxLength: 500,
                style: const TextStyle(color: AppColors.textPrimary, fontSize: 13),
                decoration: const InputDecoration(
                  hintText: 'Ex: Rideaux replacés, mobilier nettoyé...',
                  hintStyle: TextStyle(color: AppColors.textSecondary, fontSize: 12),
                  border: InputBorder.none,
                  contentPadding: EdgeInsets.all(12),
                  counterStyle: TextStyle(color: AppColors.textSecondary, fontSize: 10),
                ),
              ),
            ),
            const SizedBox(height: 16),

            // ── Action buttons ────────────────────────────────────
            if (task.status == DailyCleaningStatus.ASSIGNED)
              _ActionButton(
                label: 'Commencer le nettoyage',
                icon: Icons.play_arrow_rounded,
                color: Colors.blue.shade600,
                isLoading: _isActing,
                onPressed: _start,
              ),
            if (task.status == DailyCleaningStatus.IN_PROGRESS || task.status == DailyCleaningStatus.ASSIGNED) ...[
              if (task.status == DailyCleaningStatus.IN_PROGRESS) const SizedBox(height: 10),
              _ActionButton(
                label: 'Marquer comme terminée ✅',
                icon: Icons.check_circle_rounded,
                color: Colors.green.shade600,
                isLoading: _isActing,
                onPressed: () => _complete(done: true),
              ),
              const SizedBox(height: 10),
              _ActionButton(
                label: 'Ignorer / Chambre inaccessible',
                icon: Icons.skip_next_rounded,
                color: Colors.orange.shade600,
                isLoading: _isActing,
                outlined: true,
                onPressed: () => _complete(done: false),
              ),
            ],
          ],

          if (task.status.isTerminal) ...[
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: task.status == DailyCleaningStatus.DONE
                    ? Colors.green.shade900.withValues(alpha: 0.3)
                    : Colors.orange.shade900.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: task.status == DailyCleaningStatus.DONE
                      ? Colors.green.shade700
                      : Colors.orange.shade700,
                ),
              ),
              child: Row(
                children: [
                  Icon(
                    task.status == DailyCleaningStatus.DONE ? Icons.check_circle_rounded : Icons.skip_next_rounded,
                    color: task.status == DailyCleaningStatus.DONE ? Colors.green.shade400 : Colors.orange.shade400,
                    size: 20,
                  ),
                  const SizedBox(width: 10),
                  Text(
                    task.status == DailyCleaningStatus.DONE
                        ? 'Nettoyage terminé avec succès.'
                        : 'Cette tâche a été ignorée.',
                    style: TextStyle(
                      color: task.status == DailyCleaningStatus.DONE ? Colors.green.shade300 : Colors.orange.shade300,
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
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
}

// ── Helper widgets ──────────────────────────────────────────────────────────

class _InfoCard extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String title;
  final String subtitle;
  final bool multiline;

  const _InfoCard({
    required this.icon,
    required this.iconColor,
    required this.title,
    required this.subtitle,
    this.multiline = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.cardBg,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        crossAxisAlignment: multiline ? CrossAxisAlignment.start : CrossAxisAlignment.center,
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: iconColor.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, size: 18, color: iconColor),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.bold, fontSize: 14)),
                const SizedBox(height: 2),
                Text(subtitle, style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  final DailyCleaningStatus status;

  const _StatusChip({required this.status});

  Color get _color {
    switch (status) {
      case DailyCleaningStatus.ASSIGNED:    return Colors.indigo;
      case DailyCleaningStatus.IN_PROGRESS: return Colors.blue;
      case DailyCleaningStatus.DONE:        return Colors.green;
      case DailyCleaningStatus.SKIPPED:     return Colors.orange;
    }
  }

  IconData get _icon {
    switch (status) {
      case DailyCleaningStatus.ASSIGNED:    return Icons.person_rounded;
      case DailyCleaningStatus.IN_PROGRESS: return Icons.refresh_rounded;
      case DailyCleaningStatus.DONE:        return Icons.check_circle_rounded;
      case DailyCleaningStatus.SKIPPED:     return Icons.skip_next_rounded;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: BoxDecoration(
        color: _color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: _color.withValues(alpha: 0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(_icon, size: 14, color: _color),
          const SizedBox(width: 6),
          Text(status.label, style: TextStyle(color: _color, fontWeight: FontWeight.bold, fontSize: 12)),
        ],
      ),
    );
  }
}

class _TimeRow extends StatelessWidget {
  final String label;
  final DateTime value;

  const _TimeRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    final formatted = '${value.day.toString().padLeft(2, '0')}/${value.month.toString().padLeft(2, '0')}/${value.year} ${value.hour.toString().padLeft(2, '0')}:${value.minute.toString().padLeft(2, '0')}';
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        children: [
          Text('$label:', style: const TextStyle(color: AppColors.textSecondary, fontSize: 12, fontWeight: FontWeight.w600)),
          const SizedBox(width: 6),
          Text(formatted, style: const TextStyle(color: AppColors.textPrimary, fontSize: 12)),
        ],
      ),
    );
  }
}

class _ActionButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color color;
  final bool isLoading;
  final bool outlined;
  final VoidCallback? onPressed;

  const _ActionButton({
    required this.label,
    required this.icon,
    required this.color,
    required this.isLoading,
    this.outlined = false,
    this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    if (outlined) {
      return OutlinedButton.icon(
        icon: isLoading ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)) : Icon(icon, size: 18),
        label: Text(label),
        onPressed: isLoading ? null : onPressed,
        style: OutlinedButton.styleFrom(
          foregroundColor: color,
          side: BorderSide(color: color.withValues(alpha: 0.6)),
          minimumSize: const Size(double.infinity, 46),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          textStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
        ),
      );
    }
    return ElevatedButton.icon(
      icon: isLoading ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : Icon(icon, size: 18),
      label: Text(label),
      onPressed: isLoading ? null : onPressed,
      style: ElevatedButton.styleFrom(
        backgroundColor: color,
        foregroundColor: Colors.white,
        minimumSize: const Size(double.infinity, 46),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        textStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
        elevation: 2,
      ),
    );
  }
}
