import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_colors.dart';
import '../../../shared/widgets/widgets.dart';
import '../../auth/data/auth_service.dart';
import '../data/task_model.dart';
import '../data/task_service.dart';

/// Screen displaying the list of tasks assigned to the connected employee.
class TaskListScreen extends StatefulWidget {
  const TaskListScreen({super.key});

  @override
  State<TaskListScreen> createState() => _TaskListScreenState();
}

class _TaskListScreenState extends State<TaskListScreen> {
  List<TaskModel> _tasks = [];
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _fetchTasks();
  }

  /// Fetches assigned tasks from backend.
  Future<void> _fetchTasks({bool isRefresh = false}) async {
    if (!isRefresh) {
      setState(() {
        _isLoading = true;
        _errorMessage = null;
      });
    }

    try {
      final tasks = await TaskService.instance.getAssignedTasks();
      if (mounted) {
        setState(() {
          _tasks = tasks;
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

    if (_tasks.isEmpty) {
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
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        itemCount: _tasks.length,
        itemBuilder: (context, index) {
          final task = _tasks[index];
          return TaskCard(
            task: task,
            onTap: () => context.go('/tasks/${task.id}'),
          );
        },
      ),
    );
  }
}
