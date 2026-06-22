import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../auth/data/auth_service.dart';
import '../data/task_service.dart';

/// Screen displayed after a successful exit QR scan.
///
/// Allows the employee to select the intervention result (FIXED / NOT_FIXED),
/// write an optional comment, and submit the exit scan.
class InterventionResultScreen extends StatefulWidget {
  final String taskId;
  final String workerRoomQrToken;

  const InterventionResultScreen({
    super.key,
    required this.taskId,
    required this.workerRoomQrToken,
  });

  @override
  State<InterventionResultScreen> createState() => _InterventionResultScreenState();
}

class _InterventionResultScreenState extends State<InterventionResultScreen>
    with SingleTickerProviderStateMixin {
  String? _selectedResult; // 'FIXED' or 'NOT_FIXED'
  final TextEditingController _commentController = TextEditingController();
  bool _isSubmitting = false;
  late final AnimationController _animController;
  late final Animation<double> _fadeAnim;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 500),
    );
    _fadeAnim = CurvedAnimation(
      parent: _animController,
      curve: Curves.easeOut,
    );
    _animController.forward();
  }

  @override
  void dispose() {
    _commentController.dispose();
    _animController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_selectedResult == null) return;

    setState(() {
      _isSubmitting = true;
    });

    try {
      await TaskService.instance.scanExit(
        widget.taskId,
        widget.workerRoomQrToken,
        _selectedResult!,
        employeeComment: _commentController.text.trim(),
      );

      if (mounted) {
        // Show success feedback
        final resultLabel = _selectedResult == 'FIXED'
            ? 'Problème résolu'
            : 'Signalé pour revue';
        final resultIcon = _selectedResult == 'FIXED'
            ? Icons.check_circle_rounded
            : Icons.info_rounded;
        final resultColor = _selectedResult == 'FIXED'
            ? AppColors.success
            : AppColors.warning;

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                Icon(resultIcon, color: resultColor),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Sortie validée — $resultLabel',
                    style: const TextStyle(fontWeight: FontWeight.w500),
                  ),
                ),
              ],
            ),
            backgroundColor: AppColors.cardBg,
            duration: const Duration(seconds: 3),
          ),
        );

        Navigator.of(context).pop(true); // Signal success back to scanner
      }
    } on ApiException catch (e) {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
        });
        _showErrorSnackBar(e.message);
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
        });
        _showErrorSnackBar('Une erreur inattendue est survenue.');
      }
    }
  }

  void _showErrorSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.error_outline_rounded, color: AppColors.error),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                message,
                style: const TextStyle(color: AppColors.textPrimary),
              ),
            ),
          ],
        ),
        backgroundColor: AppColors.cardBg,
        duration: const Duration(seconds: 4),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Résultat de l\'intervention'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: _isSubmitting ? null : () => Navigator.of(context).pop(false),
        ),
      ),
      body: Container(
        decoration: const BoxDecoration(
          gradient: AppColors.backgroundGradient,
        ),
        child: SafeArea(
          child: FadeTransition(
            opacity: _fadeAnim,
            child: Column(
              children: [
                Expanded(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        // ── Header ────────────────────────────────────────
                        _buildHeader(),
                        const SizedBox(height: 28),

                        // ── Result Buttons ───────────────────────────────
                        _buildResultSelector(),
                        const SizedBox(height: 24),

                        // ── Comment Field ────────────────────────────────
                        _buildCommentField(),
                      ],
                    ),
                  ),
                ),

                // ── Submit Button ──────────────────────────────────────
                _buildSubmitBar(),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.cardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border, width: 1),
      ),
      child: Column(
        children: [
          Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              color: AppColors.accent.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.accent.withValues(alpha: 0.3)),
            ),
            child: const Icon(
              Icons.assignment_turned_in_rounded,
              color: AppColors.accent,
              size: 32,
            ),
          ),
          const SizedBox(height: 16),
          const Text(
            'Fin de l\'intervention',
            style: TextStyle(
              color: AppColors.textPrimary,
              fontSize: 20,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'QR code validé. Veuillez indiquer le résultat de votre intervention.',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: AppColors.textSecondary,
              fontSize: 14,
              height: 1.4,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildResultSelector() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Padding(
          padding: EdgeInsets.only(left: 4, bottom: 12),
          child: Text(
            'Résultat de l\'intervention',
            style: TextStyle(
              color: AppColors.textPrimary,
              fontWeight: FontWeight.bold,
              fontSize: 16,
            ),
          ),
        ),
        Row(
          children: [
            // ── FIXED Button ──────────────────────────────
            Expanded(
              child: _ResultOptionCard(
                isSelected: _selectedResult == 'FIXED',
                icon: Icons.check_circle_rounded,
                label: 'Problème\nrésolu',
                selectedColor: AppColors.success,
                onTap: _isSubmitting
                    ? null
                    : () => setState(() => _selectedResult = 'FIXED'),
              ),
            ),
            const SizedBox(width: 14),
            // ── NOT_FIXED Button ──────────────────────────
            Expanded(
              child: _ResultOptionCard(
                isSelected: _selectedResult == 'NOT_FIXED',
                icon: Icons.cancel_rounded,
                label: 'Problème\nnon résolu',
                selectedColor: AppColors.error,
                onTap: _isSubmitting
                    ? null
                    : () => setState(() => _selectedResult = 'NOT_FIXED'),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildCommentField() {
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
          const Row(
            children: [
              Icon(Icons.edit_note_rounded, color: AppColors.textSecondary, size: 20),
              SizedBox(width: 8),
              Text(
                'Commentaire (optionnel)',
                style: TextStyle(
                  color: AppColors.textSecondary,
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _commentController,
            enabled: !_isSubmitting,
            maxLines: 4,
            minLines: 3,
            textCapitalization: TextCapitalization.sentences,
            style: const TextStyle(
              color: AppColors.textPrimary,
              fontSize: 15,
            ),
            decoration: InputDecoration(
              hintText: 'Décrivez les actions effectuées...',
              hintStyle: TextStyle(
                color: AppColors.textSecondary.withValues(alpha: 0.6),
              ),
              filled: true,
              fillColor: AppColors.background.withValues(alpha: 0.5),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: AppColors.border),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: AppColors.border),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
              ),
              contentPadding: const EdgeInsets.all(14),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSubmitBar() {
    final canSubmit = _selectedResult != null && !_isSubmitting;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: const BoxDecoration(
        color: AppColors.cardBg,
        border: Border(
          top: BorderSide(color: AppColors.border, width: 1),
        ),
      ),
      child: AnimatedOpacity(
        duration: const Duration(milliseconds: 200),
        opacity: canSubmit ? 1.0 : 0.5,
        child: Container(
          width: double.infinity,
          decoration: BoxDecoration(
            gradient: _selectedResult == 'FIXED'
                ? const LinearGradient(
                    colors: [Color(0xFF10B981), Color(0xFF059669)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  )
                : _selectedResult == 'NOT_FIXED'
                    ? const LinearGradient(
                        colors: [Color(0xFFF59E0B), Color(0xFFD97706)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      )
                    : AppColors.primaryGradient,
            borderRadius: BorderRadius.circular(12),
          ),
          child: ElevatedButton.icon(
            onPressed: canSubmit ? _submit : null,
            icon: _isSubmitting
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                    ),
                  )
                : const Icon(Icons.send_rounded),
            label: Text(_isSubmitting ? 'Envoi en cours...' : 'Valider la sortie'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.transparent,
              shadowColor: Colors.transparent,
              disabledBackgroundColor: Colors.transparent,
              disabledForegroundColor: Colors.white54,
              padding: const EdgeInsets.symmetric(vertical: 16),
              textStyle: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// A selectable card for picking the intervention result.
class _ResultOptionCard extends StatelessWidget {
  final bool isSelected;
  final IconData icon;
  final String label;
  final Color selectedColor;
  final VoidCallback? onTap;

  const _ResultOptionCard({
    required this.isSelected,
    required this.icon,
    required this.label,
    required this.selectedColor,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final bgColor = isSelected
        ? selectedColor.withValues(alpha: 0.15)
        : AppColors.cardBg;
    final borderColor = isSelected
        ? selectedColor.withValues(alpha: 0.6)
        : AppColors.border;
    final iconColor = isSelected ? selectedColor : AppColors.textSecondary;
    final textColor = isSelected ? AppColors.textPrimary : AppColors.textSecondary;

    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 250),
        curve: Curves.easeInOut,
        padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: borderColor, width: isSelected ? 2 : 1),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: selectedColor.withValues(alpha: 0.2),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ]
              : null,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            AnimatedScale(
              scale: isSelected ? 1.15 : 1.0,
              duration: const Duration(milliseconds: 250),
              child: Icon(icon, color: iconColor, size: 40),
            ),
            const SizedBox(height: 12),
            Text(
              label,
              textAlign: TextAlign.center,
              style: TextStyle(
                color: textColor,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                fontSize: 15,
                height: 1.3,
              ),
            ),
            if (isSelected) ...[
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: selectedColor.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  'Sélectionné',
                  style: TextStyle(
                    color: selectedColor,
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
