import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_colors.dart';
import '../../../shared/widgets/widgets.dart';
import '../../auth/data/auth_service.dart';
import '../data/task_model.dart';
import '../data/task_service.dart';
import '../data/housekeeping_task_model.dart';
import '../data/housekeeping_task_service.dart';

/// Screen displaying both reclamation and housekeeping tasks.
class TaskListScreen extends StatefulWidget {
  const TaskListScreen({super.key});

  @override
  State<TaskListScreen> createState() => _TaskListScreenState();
}

class _TaskListScreenState extends State<TaskListScreen> {
  List<TaskModel> _reclamationTasks = [];
  List<HousekeepingTaskModel> _housekeepingTasks = [];
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _fetchTasks();
  }

  /// Fetches both task types in parallel.
  Future<void> _fetchTasks({bool isRefresh = false}) async {
    if (!isRefresh) {
      setState(() {
        _isLoading = true;
        _errorMessage = null;
      });
    }

    try {
      final results = await Future.wait([
        TaskService.instance.getAssignedTasks(),
        HousekeepingTaskService.instance.getAssignedTasks().catchError((_) => <HousekeepingTaskModel>[]),
      ]);

      if (mounted) {
        setState(() {
          _reclamationTasks = results[0] as List<TaskModel>;
          _housekeepingTasks = results[1] as List<HousekeepingTaskModel>;
          _isLoading = false;
          _errorMessage = null;
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
          _errorMessage = 'Une erreur inattendue est survenue.';
          _isLoading = false;
        });
      }
    }
  }

  bool get _isEmpty => _reclamationTasks.isEmpty && _housekeepingTasks.isEmpty;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Mes Tâches'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: AppColors.textSecondary),
            tooltip: 'Actualiser',
            onPressed: _isLoading ? null : () => _fetchTasks(),
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
      return const LoadingView(message: 'Chargement de vos tâches...');
    }

    if (_errorMessage != null) {
      return ErrorView.network(
        message: _errorMessage!,
        onRetry: () => _fetchTasks(),
      );
    }

    if (_isEmpty) {
      return RefreshIndicator(
        onRefresh: () => _fetchTasks(isRefresh: true),
        color: AppColors.primary,
        backgroundColor: AppColors.cardBg,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          children: [
            SizedBox(height: MediaQuery.of(context).size.height * 0.25),
            const EmptyState(
              icon: Icons.assignment_turned_in_outlined,
              title: 'Aucune tâche en cours',
              subtitle: 'Faites glisser vers le bas pour actualiser.',
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () => _fetchTasks(isRefresh: true),
      color: AppColors.primary,
      backgroundColor: AppColors.cardBg,
      child: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        children: [
          // ── Housekeeping tasks ──────────────────────────────
          if (_housekeepingTasks.isNotEmpty) ...[
            _SectionHeader(
              icon: Icons.cleaning_services_rounded,
              iconColor: Colors.teal,
              label: 'Ménage',
              count: _housekeepingTasks.length,
            ),
            const SizedBox(height: 10),
            ..._housekeepingTasks.map(
              (task) => HousekeepingTaskCard(
                task: task,
                onTap: () => context.go('/housekeeping-tasks/${task.id}'),
              ),
            ),
            if (_reclamationTasks.isNotEmpty) const SizedBox(height: 20),
          ],

          // ── Reclamation tasks ──────────────────────────────
          if (_reclamationTasks.isNotEmpty) ...[
            _SectionHeader(
              icon: Icons.report_problem_outlined,
              iconColor: AppColors.primary,
              label: 'Réclamations',
              count: _reclamationTasks.length,
            ),
            const SizedBox(height: 10),
            ..._reclamationTasks.map(
              (task) => TaskCard(
                task: task,
                onTap: () => context.go('/tasks/${task.id}'),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

/// Section header with icon, label, and count badge.
class _SectionHeader extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String label;
  final int count;

  const _SectionHeader({
    required this.icon,
    required this.iconColor,
    required this.label,
    required this.count,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(6),
          decoration: BoxDecoration(
            color: iconColor.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(icon, size: 16, color: iconColor),
        ),
        const SizedBox(width: 8),
        Text(
          label,
          style: const TextStyle(
            color: AppColors.textPrimary,
            fontWeight: FontWeight.bold,
            fontSize: 15,
          ),
        ),
        const SizedBox(width: 6),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
          decoration: BoxDecoration(
            color: iconColor.withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Text(
            '$count',
            style: TextStyle(
              color: iconColor,
              fontWeight: FontWeight.bold,
              fontSize: 12,
            ),
          ),
        ),
      ],
    );
  }
}
