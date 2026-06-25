import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_colors.dart';
import '../../../shared/widgets/widgets.dart';
import '../../auth/data/auth_service.dart';
import '../data/task_model.dart';
import '../data/task_service.dart';
import '../data/housekeeping_task_model.dart';
import '../data/housekeeping_task_service.dart';
import '../data/daily_cleaning_task_model.dart';
import '../data/daily_cleaning_task_service.dart';

/// Main task list screen with two tabs:
/// 1. Réclamations — complaint-based intervention tasks
/// 2. Ménage quotidien — daily room cleaning assignments (HOUSEKEEPING only)
class TaskListScreen extends StatefulWidget {
  const TaskListScreen({super.key});

  @override
  State<TaskListScreen> createState() => _TaskListScreenState();
}

class _TaskListScreenState extends State<TaskListScreen>
    with SingleTickerProviderStateMixin {
  // ── Tab controller ─────────────────────────────────────────────────
  late final TabController _tabController;

  // ── Reclamation tasks ──────────────────────────────────────────────
  List<TaskModel> _reclamationTasks = [];
  bool _reclLoading = true;
  String? _reclError;

  // ── Housekeeping (complaint) tasks ────────────────────────────────
  List<HousekeepingTaskModel> _hkTasks = [];

  // ── Daily cleaning tasks ──────────────────────────────────────────
  List<DailyCleaningTaskModel> _dailyTasks = [];
  bool _dailyLoading = false;
  String? _dailyError;

  // ── User role ─────────────────────────────────────────────────────────────
  bool _isHousekeeping = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _detectRole();
    _fetchReclamations();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _detectRole() async {
    try {
      final user = await AuthService.instance.getMe();
      final dept = user.department;
      if (mounted) {
        setState(() {
          _isHousekeeping = dept == 'HOUSEKEEPING';
        });
        if (_isHousekeeping) { _fetchDailyTasks(); }
      }
    } catch (_) {}
  }


  // ── Fetch reclamations + HK complaint tasks ───────────────────────

  Future<void> _fetchReclamations({bool isRefresh = false}) async {
    if (!isRefresh) setState(() { _reclLoading = true; _reclError = null; });
    try {
      final results = await Future.wait([
        TaskService.instance.getAssignedTasks(),
        HousekeepingTaskService.instance.getAssignedTasks().catchError((_) => <HousekeepingTaskModel>[]),
      ]);
      if (mounted) {
        setState(() {
          _reclamationTasks = results[0] as List<TaskModel>;
          _hkTasks = results[1] as List<HousekeepingTaskModel>;
          _reclLoading = false;
          _reclError = null;
        });
      }
    } on ApiException catch (e) {
      if (mounted) setState(() { _reclError = e.message; _reclLoading = false; });
    } catch (_) {
      if (mounted) setState(() { _reclError = 'Erreur inattendue.'; _reclLoading = false; });
    }
  }

  // ── Fetch daily cleaning tasks ─────────────────────────────────────

  Future<void> _fetchDailyTasks({bool isRefresh = false}) async {
    if (!isRefresh) setState(() { _dailyLoading = true; _dailyError = null; });
    try {
      final tasks = await DailyCleaningTaskService.instance.getMyDailyTasks();
      if (mounted) setState(() { _dailyTasks = tasks; _dailyLoading = false; _dailyError = null; });
    } on ApiException catch (e) {
      if (mounted) setState(() { _dailyError = e.message; _dailyLoading = false; });
    } catch (_) {
      if (mounted) setState(() { _dailyError = 'Erreur inattendue.'; _dailyLoading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Mes Tâches'),
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: AppColors.primary,
          labelColor: AppColors.primary,
          unselectedLabelColor: AppColors.textSecondary,
          labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
          unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.w500, fontSize: 12),
          tabs: [
            Tab(
              icon: const Icon(Icons.report_problem_outlined, size: 18),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text('Réclamations'),
                  if (_reclamationTasks.isNotEmpty || _hkTasks.isNotEmpty)
                    _Badge(_reclamationTasks.length + _hkTasks.length),
                ],
              ),
            ),
            Tab(
              icon: const Icon(Icons.cleaning_services_rounded, size: 18),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text('Ménage quotidien'),
                  if (_dailyTasks.where((t) => t.status != DailyCleaningStatus.DONE && t.status != DailyCleaningStatus.SKIPPED).isNotEmpty)
                    _Badge(_dailyTasks.where((t) => t.status != DailyCleaningStatus.DONE && t.status != DailyCleaningStatus.SKIPPED).length),
                ],
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: AppColors.textSecondary),
            tooltip: 'Actualiser',
            onPressed: () {
              if (_tabController.index == 0) {
                _fetchReclamations();
              } else {
                _fetchDailyTasks();
              }
            },

          ),
          IconButton(
            icon: const Icon(Icons.logout_rounded, color: AppColors.textSecondary),
            tooltip: 'Déconnexion',
            onPressed: () async {
              await AuthService.instance.logout();
              if (context.mounted) context.go('/login');
            },
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: Container(
        decoration: const BoxDecoration(gradient: AppColors.backgroundGradient),
        child: SafeArea(
          child: TabBarView(
            controller: _tabController,
            children: [
              _buildReclamationsTab(),
              _buildDailyCleaningTab(),
            ],
          ),
        ),
      ),
    );
  }

  // ── Tab 1: Réclamations ────────────────────────────────────────────

  Widget _buildReclamationsTab() {
    if (_reclLoading) return const LoadingView(message: 'Chargement des réclamations...');
    if (_reclError != null) {
      return ErrorView.network(message: _reclError!, onRetry: () => _fetchReclamations());
    }

    final isEmpty = _reclamationTasks.isEmpty && _hkTasks.isEmpty;

    return RefreshIndicator(
      onRefresh: () => _fetchReclamations(isRefresh: true),
      color: AppColors.primary,
      backgroundColor: AppColors.cardBg,
      child: isEmpty
          ? ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              children: [
                SizedBox(height: MediaQuery.of(context).size.height * 0.2),
                const EmptyState(
                  icon: Icons.assignment_turned_in_outlined,
                  title: 'Aucune réclamation',
                  subtitle: 'Faites glisser vers le bas pour actualiser.',
                ),
              ],
            )
          : ListView(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
              children: [
                // Housekeeping complaint tasks
                if (_hkTasks.isNotEmpty) ...[
                  _SectionHeader(
                    icon: Icons.cleaning_services_rounded,
                    iconColor: Colors.teal,
                    label: 'Ménage (réclamation)',
                    count: _hkTasks.length,
                  ),
                  const SizedBox(height: 10),
                  ..._hkTasks.map(
                    (task) => HousekeepingTaskCard(
                      task: task,
                      onTap: () => context.go('/housekeeping-tasks/${task.id}'),
                    ),
                  ),
                  if (_reclamationTasks.isNotEmpty) const SizedBox(height: 20),
                ],

                // Intervention reclamation tasks
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

  // ── Tab 2: Ménage quotidien ────────────────────────────────────────

  Widget _buildDailyCleaningTab() {
    if (!_isHousekeeping) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(32),
          child: EmptyState(
            icon: Icons.cleaning_services_rounded,
            title: 'Ménage quotidien',
            subtitle: 'Cette section est réservée aux agents de ménage.',
          ),
        ),
      );
    }

    if (_dailyLoading) return const LoadingView(message: 'Chargement du ménage quotidien...');
    if (_dailyError != null) {
      return ErrorView.network(message: _dailyError!, onRetry: () => _fetchDailyTasks());
    }

    return RefreshIndicator(
      onRefresh: () => _fetchDailyTasks(isRefresh: true),
      color: Colors.teal,
      backgroundColor: AppColors.cardBg,
      child: _dailyTasks.isEmpty
          ? ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              children: [
                SizedBox(height: MediaQuery.of(context).size.height * 0.2),
                const EmptyState(
                  icon: Icons.cleaning_services_rounded,
                  title: 'Aucune tâche aujourd\'hui',
                  subtitle: 'Votre responsable n\'a pas encore assigné de chambres.',
                ),
              ],
            )
          : ListView(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
              children: [
                _SectionHeader(
                  icon: Icons.cleaning_services_rounded,
                  iconColor: Colors.teal,
                  label: 'Chambres à nettoyer',
                  count: _dailyTasks.length,
                ),
                const SizedBox(height: 10),
                ..._dailyTasks.map(
                  (task) => _DailyCleaningCard(
                    task: task,
                    onTap: () => context.go('/daily-cleaning/${task.id}'),
                  ),
                ),
              ],
            ),
    );
  }
}

// ── Section Header ──────────────────────────────────────────────────────────

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
          style: const TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.bold, fontSize: 15),
        ),
        const SizedBox(width: 6),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
          decoration: BoxDecoration(
            color: iconColor.withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Text('$count', style: TextStyle(color: iconColor, fontWeight: FontWeight.bold, fontSize: 12)),
        ),
      ],
    );
  }
}

// ── Badge ───────────────────────────────────────────────────────────────────

class _Badge extends StatelessWidget {
  final int count;

  const _Badge(this.count);

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(left: 4),
      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
      decoration: BoxDecoration(
        color: AppColors.primary,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Text('$count', style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
    );
  }
}

// ── Daily Cleaning Card ─────────────────────────────────────────────────────

class _DailyCleaningCard extends StatelessWidget {
  final DailyCleaningTaskModel task;
  final VoidCallback onTap;

  const _DailyCleaningCard({required this.task, required this.onTap});

  Color get _statusColor {
    switch (task.status) {
      case DailyCleaningStatus.ASSIGNED:    return Colors.indigo;
      case DailyCleaningStatus.IN_PROGRESS: return Colors.blue;
      case DailyCleaningStatus.DONE:        return Colors.green;
      case DailyCleaningStatus.SKIPPED:     return Colors.orange;
    }
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.cardBg,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.border),
          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 8, offset: const Offset(0, 2))],
        ),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: Colors.teal.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(Icons.hotel_rounded, size: 22, color: Colors.teal),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Chambre ${task.roomNumber}',
                    style: const TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.bold, fontSize: 14),
                  ),
                  Text(
                    'Étage ${task.roomFloor}${task.room?.type != null ? ' · ${task.room!.type}' : ''}',
                    style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
                  ),
                  if (task.note != null && task.note!.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Text(
                        task.noteSnippet,
                        style: const TextStyle(color: AppColors.textSecondary, fontSize: 11, fontStyle: FontStyle.italic),
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: _statusColor.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                task.status.label,
                style: TextStyle(color: _statusColor, fontSize: 10, fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
