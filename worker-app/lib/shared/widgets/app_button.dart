import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';

/// A premium gradient or outlined button used across the app.
///
/// Supports two variants:
/// - **gradient** (default): filled with a gradient background.
/// - **outlined**: transparent with a colored border.
class AppButton extends StatelessWidget {
  final String label;
  final IconData? icon;
  final VoidCallback? onPressed;
  final bool isLoading;
  final Gradient? gradient;
  final bool outlined;
  final Color? outlineColor;
  final double verticalPadding;

  const AppButton({
    super.key,
    required this.label,
    this.icon,
    this.onPressed,
    this.isLoading = false,
    this.gradient,
    this.outlined = false,
    this.outlineColor,
    this.verticalPadding = 16,
  });

  /// Primary gradient button (indigo).
  const AppButton.primary({
    super.key,
    required this.label,
    this.icon,
    this.onPressed,
    this.isLoading = false,
    this.verticalPadding = 16,
  })  : gradient = AppColors.primaryGradient,
        outlined = false,
        outlineColor = null;

  /// Amber/warning gradient button.
  const AppButton.warning({
    super.key,
    required this.label,
    this.icon,
    this.onPressed,
    this.isLoading = false,
    this.verticalPadding = 16,
  })  : gradient = const LinearGradient(
          colors: [Color(0xFFF59E0B), Color(0xFFD97706)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        outlined = false,
        outlineColor = null;

  /// Success/green gradient button.
  const AppButton.success({
    super.key,
    required this.label,
    this.icon,
    this.onPressed,
    this.isLoading = false,
    this.verticalPadding = 16,
  })  : gradient = const LinearGradient(
          colors: [Color(0xFF10B981), Color(0xFF059669)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        outlined = false,
        outlineColor = null;

  /// Outlined button with a colored border.
  const AppButton.outlined({
    super.key,
    required this.label,
    this.icon,
    this.onPressed,
    this.isLoading = false,
    this.outlineColor = AppColors.primary,
    this.verticalPadding = 16,
  })  : gradient = null,
        outlined = true;

  @override
  Widget build(BuildContext context) {
    if (outlined) {
      return OutlinedButton.icon(
        onPressed: isLoading ? null : onPressed,
        icon: _buildIcon(),
        label: Text(label),
        style: OutlinedButton.styleFrom(
          side: BorderSide(color: outlineColor ?? AppColors.primary),
          foregroundColor: outlineColor ?? AppColors.primary,
          padding: EdgeInsets.symmetric(vertical: verticalPadding),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      );
    }

    return Container(
      decoration: BoxDecoration(
        gradient: onPressed != null && !isLoading
            ? (gradient ?? AppColors.primaryGradient)
            : null,
        color: onPressed == null || isLoading
            ? AppColors.textSecondary.withValues(alpha: 0.3)
            : null,
        borderRadius: BorderRadius.circular(12),
      ),
      child: ElevatedButton.icon(
        onPressed: isLoading ? null : onPressed,
        icon: _buildIcon(),
        label: Text(isLoading ? 'Chargement...' : label),
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.transparent,
          shadowColor: Colors.transparent,
          disabledBackgroundColor: Colors.transparent,
          disabledForegroundColor: Colors.white54,
          padding: EdgeInsets.symmetric(vertical: verticalPadding),
          textStyle: const TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
    );
  }

  Widget _buildIcon() {
    if (isLoading) {
      return const SizedBox(
        width: 20,
        height: 20,
        child: CircularProgressIndicator(
          strokeWidth: 2,
          valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
        ),
      );
    }
    if (icon != null) {
      return Icon(icon);
    }
    return const SizedBox.shrink();
  }
}
