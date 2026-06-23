import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../../../core/constants/app_colors.dart';
import '../../auth/data/auth_service.dart';
import '../data/housekeeping_task_model.dart';
import '../data/housekeeping_task_service.dart';

/// Detail screen for a housekeeping task.
///
/// Shows room info, manager note, status, and QR scan buttons
/// to start and finish the task.
class HousekeepingTaskDetailScreen extends StatefulWidget {
  final String taskId;

  const HousekeepingTaskDetailScreen({super.key, required this.taskId});

  @override
  State<HousekeepingTaskDetailScreen> createState() =>
      _HousekeepingTaskDetailScreenState();
}

class _HousekeepingTaskDetailScreenState
    extends State<HousekeepingTaskDetailScreen> {
  HousekeepingTaskModel? _task;
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _loadTask();
  }

  Future<void> _loadTask() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final tasks = await HousekeepingTaskService.instance.getAssignedTasks();
      final found = tasks.where((t) => t.id == widget.taskId).toList();
      if (found.isEmpty) {
        setState(() {
          _errorMessage = 'Tâche introuvable.';
          _isLoading = false;
        });
        return;
      }
      setState(() {
        _task = found.first;
        _isLoading = false;
      });
    } on ApiException catch (e) {
      setState(() {
        _errorMessage = e.message;
        _isLoading = false;
      });
    } catch (_) {
      setState(() {
        _errorMessage = 'Erreur inattendue.';
        _isLoading = false;
      });
    }
  }

  // ── Start task via QR scan ─────────────────────────────────────────

  Future<void> _scanToStart() async {
    final result = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => _HkQrScannerScreen(
          taskId: widget.taskId,
          mode: _HkScanMode.start,
        ),
      ),
    );

    if (result == true && mounted) {
      await _loadTask();
    }
  }

  // ── Finish task via QR scan ────────────────────────────────────────

  Future<void> _scanToFinish() async {
    final result = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => _HkQrScannerScreen(
          taskId: widget.taskId,
          mode: _HkScanMode.finish,
        ),
      ),
    );

    if (result == true && mounted) {
      await _loadTask();
    }
  }

  // ── Date formatting ────────────────────────────────────────────────

  String _formatDate(DateTime dt) {
    return '${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')}/${dt.year} '
        '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
  }

  // ── Build ──────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Tâche Ménage'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: Container(
        decoration: const BoxDecoration(gradient: AppColors.backgroundGradient),
        child: SafeArea(child: _buildBody()),
      ),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(
          valueColor: AlwaysStoppedAnimation<Color>(AppColors.primary),
        ),
      );
    }

    if (_errorMessage != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline_rounded, size: 48, color: AppColors.error),
              const SizedBox(height: 12),
              Text(_errorMessage!, style: const TextStyle(color: AppColors.textSecondary)),
              const SizedBox(height: 16),
              ElevatedButton(onPressed: _loadTask, child: const Text('Réessayer')),
            ],
          ),
        ),
      );
    }

    final task = _task!;
    return RefreshIndicator(
      onRefresh: _loadTask,
      color: AppColors.primary,
      backgroundColor: AppColors.cardBg,
      child: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          // Room info card
          _SectionCard(
            icon: Icons.meeting_room_rounded,
            iconColor: Colors.teal,
            title: 'Chambre ${task.roomNumber}',
            children: [
              _InfoRow(label: 'Étage', value: '${task.roomFloor}'),
              if (task.assignedBy != null)
                _InfoRow(label: 'Assigné par', value: task.assignedBy!.name),
              _InfoRow(label: 'Date', value: _formatDate(task.createdAt)),
            ],
          ),
          const SizedBox(height: 16),

          // Note card
          if (task.note != null && task.note!.isNotEmpty) ...[
            _SectionCard(
              icon: Icons.note_alt_rounded,
              iconColor: AppColors.accent,
              title: 'Note du manager',
              children: [
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text(
                    task.note!,
                    style: const TextStyle(color: AppColors.textSecondary, fontSize: 14, height: 1.5),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
          ],

          // Status card
          _SectionCard(
            icon: Icons.info_outline_rounded,
            iconColor: _statusColor(task.status),
            title: 'Statut : ${task.status.label}',
            children: [
              if (task.entryTime != null)
                _InfoRow(label: '🔑 Entrée', value: _formatDate(task.entryTime!)),
              if (task.exitTime != null)
                _InfoRow(label: '🚪 Sortie', value: _formatDate(task.exitTime!)),
              if (task.result != null)
                _InfoRow(label: '📋 Résultat', value: task.result!.label),
              if (task.workerComment != null && task.workerComment!.isNotEmpty)
                _InfoRow(label: '💬 Commentaire', value: task.workerComment!),
            ],
          ),
          const SizedBox(height: 32),

          // Action buttons
          if (task.status == HousekeepingTaskStatus.ASSIGNED)
            _ActionButton(
              label: '📷 Scanner QR pour démarrer',
              color: AppColors.primary,
              onPressed: _scanToStart,
            ),

          if (task.status == HousekeepingTaskStatus.IN_PROGRESS)
            _ActionButton(
              label: '📷 Scanner QR pour terminer',
              color: Colors.teal,
              onPressed: _scanToFinish,
            ),

          if (task.status == HousekeepingTaskStatus.COMPLETED)
            _StatusBanner(
              icon: Icons.check_circle_rounded,
              color: AppColors.success,
              text: 'Tâche terminée',
            ),

          if (task.status == HousekeepingTaskStatus.NEEDS_REVIEW)
            _StatusBanner(
              icon: Icons.warning_amber_rounded,
              color: Colors.orange,
              text: 'En attente de validation du manager',
            ),

          const SizedBox(height: 32),
        ],
      ),
    );
  }

  Color _statusColor(HousekeepingTaskStatus s) {
    switch (s) {
      case HousekeepingTaskStatus.ASSIGNED:
        return AppColors.primary;
      case HousekeepingTaskStatus.IN_PROGRESS:
        return Colors.blue;
      case HousekeepingTaskStatus.COMPLETED:
        return AppColors.success;
      case HousekeepingTaskStatus.NEEDS_REVIEW:
        return Colors.orange;
      default:
        return Colors.grey;
    }
  }
}

// ═════════════════════════════════════════════════════════════════════
//  Reusable sub-widgets
// ═════════════════════════════════════════════════════════════════════

class _SectionCard extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String title;
  final List<Widget> children;

  const _SectionCard({
    required this.icon,
    required this.iconColor,
    required this.title,
    required this.children,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.cardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            Icon(icon, size: 20, color: iconColor),
            const SizedBox(width: 8),
            Text(title, style: const TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.bold, fontSize: 15)),
          ]),
          if (children.isNotEmpty) ...[
            const SizedBox(height: 12),
            ...children,
          ],
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;

  const _InfoRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: AppColors.textSecondary, fontSize: 13)),
          Text(value, style: const TextStyle(color: AppColors.textPrimary, fontSize: 13, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}

class _ActionButton extends StatelessWidget {
  final String label;
  final Color color;
  final VoidCallback onPressed;

  const _ActionButton({required this.label, required this.color, required this.onPressed});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      height: 52,
      child: ElevatedButton(
        onPressed: onPressed,
        style: ElevatedButton.styleFrom(
          backgroundColor: color,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        ),
        child: Text(label, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
      ),
    );
  }
}

class _StatusBanner extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String text;

  const _StatusBanner({required this.icon, required this.color, required this.text});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 20),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, color: color, size: 24),
          const SizedBox(width: 10),
          Text(text, style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 15)),
        ],
      ),
    );
  }
}

// ═════════════════════════════════════════════════════════════════════
//  Housekeeping QR Scanner — handles both start and finish
// ═════════════════════════════════════════════════════════════════════

enum _HkScanMode { start, finish }

class _HkQrScannerScreen extends StatefulWidget {
  final String taskId;
  final _HkScanMode mode;

  const _HkQrScannerScreen({required this.taskId, required this.mode});

  @override
  State<_HkQrScannerScreen> createState() => _HkQrScannerScreenState();
}

class _HkQrScannerScreenState extends State<_HkQrScannerScreen> {
  final MobileScannerController _controller = MobileScannerController(
    detectionSpeed: DetectionSpeed.noDuplicates,
  );
  bool _isProcessing = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _handleQrCode(String token) async {
    setState(() => _isProcessing = true);

    try {
      await _controller.stop();

      if (widget.mode == _HkScanMode.start) {
        await HousekeepingTaskService.instance.startTask(widget.taskId, token);
        if (mounted) {
          _showSnackBar('Tâche démarrée !', Icons.play_circle_rounded);
          Navigator.of(context).pop(true);
        }
      } else {
        // Finish mode — ask for result
        if (mounted) {
          final resultData = await _showFinishDialog();
          if (resultData != null) {
            await HousekeepingTaskService.instance.finishTask(
              widget.taskId,
              token,
              resultData['result']!,
              workerComment: resultData['comment'],
            );
            if (mounted) {
              _showSnackBar('Tâche terminée !', Icons.check_circle_rounded);
              Navigator.of(context).pop(true);
            }
          } else {
            // User cancelled — restart scanning
            _retryScanning();
          }
        }
      }
    } on ApiException catch (e) {
      if (mounted) _showErrorDialog(e.message);
    } catch (_) {
      if (mounted) _showErrorDialog('Erreur inattendue.');
    }
  }

  /// Shows DONE / NOT_DONE picker + optional comment.
  Future<Map<String, String>?> _showFinishDialog() async {
    String selectedResult = 'DONE';
    final commentController = TextEditingController();

    return showDialog<Map<String, String>>(
      context: context,
      barrierDismissible: false,
      builder: (dialogCtx) {
        return StatefulBuilder(
          builder: (ctx, setDialogState) {
            return AlertDialog(
              backgroundColor: AppColors.cardBg,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
                side: const BorderSide(color: AppColors.border),
              ),
              title: const Text('Résultat du ménage', style: TextStyle(color: AppColors.textPrimary)),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Result toggles
                  Row(
                    children: [
                      Expanded(
                        child: _ResultChip(
                          label: '✅ Fait',
                          isSelected: selectedResult == 'DONE',
                          onTap: () => setDialogState(() => selectedResult = 'DONE'),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: _ResultChip(
                          label: '❌ Non fait',
                          isSelected: selectedResult == 'NOT_DONE',
                          onTap: () => setDialogState(() => selectedResult = 'NOT_DONE'),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: commentController,
                    maxLines: 3,
                    style: const TextStyle(color: AppColors.textPrimary, fontSize: 14),
                    decoration: InputDecoration(
                      hintText: 'Commentaire optionnel…',
                      hintStyle: const TextStyle(color: AppColors.textSecondary),
                      filled: true,
                      fillColor: AppColors.cardBg,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: AppColors.border),
                      ),
                    ),
                  ),
                ],
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(dialogCtx).pop(null),
                  child: const Text('Annuler', style: TextStyle(color: AppColors.textSecondary)),
                ),
                ElevatedButton(
                  onPressed: () {
                    Navigator.of(dialogCtx).pop({
                      'result': selectedResult,
                      'comment': commentController.text.trim(),
                    });
                  },
                  child: const Text('Valider'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  void _showSnackBar(String text, IconData icon) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(children: [Icon(icon, color: Colors.greenAccent), const SizedBox(width: 8), Text(text)]),
        backgroundColor: AppColors.cardBg,
        duration: const Duration(seconds: 2),
      ),
    );
  }

  void _showErrorDialog(String message) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.cardBg,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: AppColors.border),
        ),
        title: const Row(children: [
          Icon(Icons.error_outline_rounded, color: AppColors.error),
          SizedBox(width: 8),
          Text('Erreur', style: TextStyle(color: AppColors.textPrimary)),
        ]),
        content: Text(message, style: const TextStyle(color: AppColors.textSecondary)),
        actions: [
          TextButton(
            onPressed: () { Navigator.of(ctx).pop(); _retryScanning(); },
            child: const Text('Réessayer', style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold)),
          ),
          TextButton(
            onPressed: () { Navigator.of(ctx).pop(); Navigator.of(context).pop(false); },
            child: const Text('Annuler', style: TextStyle(color: AppColors.textSecondary)),
          ),
        ],
      ),
    );
  }

  Future<void> _retryScanning() async {
    setState(() => _isProcessing = false);
    await _controller.start();
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    final scanAreaSize = size.width * 0.7;
    final isStart = widget.mode == _HkScanMode.start;
    final title = isStart ? 'Scanner Entrée' : 'Scanner Sortie';
    final loadingLabel = isStart ? 'Validation de l\'entrée...' : 'Validation de la sortie...';

    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          MobileScanner(
            controller: _controller,
            onDetect: (capture) {
              if (_isProcessing) return;
              for (final barcode in capture.barcodes) {
                final raw = barcode.rawValue;
                if (raw != null && raw.isNotEmpty) {
                  _handleQrCode(raw);
                  break;
                }
              }
            },
          ),

          // Mask overlay
          ColorFiltered(
            colorFilter: ColorFilter.mode(Colors.black.withValues(alpha: 0.7), BlendMode.srcOut),
            child: Stack(children: [
              Container(color: Colors.transparent),
              Center(child: Container(
                height: scanAreaSize, width: scanAreaSize,
                decoration: BoxDecoration(color: Colors.black, borderRadius: BorderRadius.circular(24)),
              )),
            ]),
          ),

          // Controls
          SafeArea(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      IconButton(icon: const Icon(Icons.arrow_back_rounded, color: Colors.white), onPressed: () => Navigator.of(context).pop(false)),
                      Text(title, style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                      ValueListenableBuilder(
                        valueListenable: _controller,
                        builder: (_, state, child) {
                          final on = state.torchState == TorchState.on;
                          return IconButton(
                            icon: Icon(on ? Icons.flash_on_rounded : Icons.flash_off_rounded, color: on ? AppColors.accent : Colors.white),
                            onPressed: () => _controller.toggleTorch(),
                          );
                        },
                      ),
                    ],
                  ),
                ),
                Column(mainAxisSize: MainAxisSize.min, children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(alpha: 0.6),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: Colors.white.withValues(alpha: 0.15)),
                    ),
                    child: const Text('Scannez le QR code de la chambre', style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w500)),
                  ),
                  SizedBox(height: size.height * 0.15),
                ]),
              ],
            ),
          ),

          // Loading overlay
          if (_isProcessing)
            Container(
              color: Colors.black.withValues(alpha: 0.6),
              child: Center(
                child: Column(mainAxisSize: MainAxisSize.min, children: [
                  const CircularProgressIndicator(valueColor: AlwaysStoppedAnimation<Color>(AppColors.primary)),
                  const SizedBox(height: 16),
                  Text(loadingLabel, style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                ]),
              ),
            ),
        ],
      ),
    );
  }
}

/// Toggle chip for result selection.
class _ResultChip extends StatelessWidget {
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  const _ResultChip({required this.label, required this.isSelected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primary.withValues(alpha: 0.15) : Colors.transparent,
          border: Border.all(color: isSelected ? AppColors.primary : AppColors.border),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Center(
          child: Text(
            label,
            style: TextStyle(
              color: isSelected ? AppColors.primary : AppColors.textSecondary,
              fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
              fontSize: 14,
            ),
          ),
        ),
      ),
    );
  }
}
