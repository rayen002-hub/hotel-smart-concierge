import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/api/heartbeat_service.dart';
import '../../../core/constants/app_colors.dart';
import '../data/auth_service.dart';

/// Employee login screen.
///
/// Calls [AuthService.login], validates that the role is [_requiredRole],
/// then navigates to /tasks. Any other role is rejected with an error message.
class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  static const String _requiredRole = 'EMPLOYEE';

  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  bool _obscurePassword = true;
  bool _isLoading = false;
  String? _errorMessage;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  // ── Login logic ────────────────────────────────────────────────────────────

  Future<void> _handleLogin() async {
    // Clear previous error, validate form.
    setState(() => _errorMessage = null);
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    try {
      final result = await AuthService.instance.login(
        _emailController.text.trim(),
        _passwordController.text,
      );

      // Role guard — only EMPLOYEE accounts may use the mobile app.
      if (result.user.role != _requiredRole) {
        // Clean up the session we just stored.
        await AuthService.instance.logout();
        _setError(
          'Accès refusé. Ce compte (${result.user.role}) n\'est pas autorisé sur l\'application mobile.',
        );
        return;
      }

      // Start heartbeat loop (every 60 s).
      HeartbeatService.instance.start();

      // Success — navigate to the tasks list.
      if (mounted) context.go('/tasks');
    } on ApiException catch (e) {
      _setError(e.message);
    } catch (_) {
      _setError('Une erreur inattendue est survenue.');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _setError(String message) {
    if (mounted) setState(() => _errorMessage = message);
  }

  // ── Build ──────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final mq = MediaQuery.of(context);

    return Scaffold(
      body: Container(
        height: mq.size.height,
        width: mq.size.width,
        decoration: const BoxDecoration(gradient: AppColors.backgroundGradient),
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                SizedBox(height: mq.size.height * 0.08),

                // ── Logo / Icon ──
                Center(
                  child: Container(
                    padding: const EdgeInsets.all(18),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.1),
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: AppColors.primary.withValues(alpha: 0.25),
                        width: 1.5,
                      ),
                    ),
                    child: const Icon(
                      Icons.lock_outline_rounded,
                      size: 40,
                      color: AppColors.primary,
                    ),
                  ),
                ),
                const SizedBox(height: 24),

                // ── Heading ──
                Text(
                  'Connexion Employé',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                        color: AppColors.textPrimary,
                        fontWeight: FontWeight.w700,
                      ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Accès réservé au personnel d\'hôtel',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: AppColors.textSecondary,
                      ),
                ),
                SizedBox(height: mq.size.height * 0.05),

                // ── Error banner ──
                if (_errorMessage != null) ...[
                  _ErrorBanner(message: _errorMessage!),
                  const SizedBox(height: 16),
                ],

                // ── Form card ──
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: AppColors.cardBg,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: AppColors.border),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.2),
                        blurRadius: 16,
                        offset: const Offset(0, 8),
                      ),
                    ],
                  ),
                  child: Form(
                    key: _formKey,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        // Email
                        _FieldLabel('Email'),
                        const SizedBox(height: 8),
                        TextFormField(
                          controller: _emailController,
                          keyboardType: TextInputType.emailAddress,
                          textInputAction: TextInputAction.next,
                          autocorrect: false,
                          style: const TextStyle(color: AppColors.textPrimary),
                          decoration: InputDecoration(
                            hintText: 'votre@email.com',
                            prefixIcon: const Icon(Icons.mail_outline, size: 20),
                            fillColor: AppColors.background.withValues(alpha: 0.5),
                          ),
                          validator: (v) {
                            if (v == null || v.trim().isEmpty) {
                              return 'L\'email est requis.';
                            }
                            if (!RegExp(r'^[^@]+@[^@]+\.[^@]+').hasMatch(v.trim())) {
                              return 'Adresse email invalide.';
                            }
                            return null;
                          },
                        ),
                        const SizedBox(height: 20),

                        // Password
                        _FieldLabel('Mot de passe'),
                        const SizedBox(height: 8),
                        TextFormField(
                          controller: _passwordController,
                          obscureText: _obscurePassword,
                          textInputAction: TextInputAction.done,
                          onFieldSubmitted: (_) => _isLoading ? null : _handleLogin(),
                          style: const TextStyle(color: AppColors.textPrimary),
                          decoration: InputDecoration(
                            hintText: '••••••••',
                            prefixIcon: const Icon(Icons.lock_outline, size: 20),
                            suffixIcon: IconButton(
                              icon: Icon(
                                _obscurePassword
                                    ? Icons.visibility_off_outlined
                                    : Icons.visibility_outlined,
                                size: 20,
                                color: AppColors.textSecondary,
                              ),
                              onPressed: () => setState(
                                () => _obscurePassword = !_obscurePassword,
                              ),
                            ),
                            fillColor: AppColors.background.withValues(alpha: 0.5),
                          ),
                          validator: (v) {
                            if (v == null || v.isEmpty) {
                              return 'Le mot de passe est requis.';
                            }
                            if (v.length < 6) {
                              return 'Minimum 6 caractères.';
                            }
                            return null;
                          },
                        ),
                        const SizedBox(height: 28),

                        // Submit button
                        _SubmitButton(
                          isLoading: _isLoading,
                          onPressed: _handleLogin,
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 32),

                // Footer note
                Text(
                  'Accès réservé au personnel autorisé',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: AppColors.textSecondary.withValues(alpha: 0.5),
                    fontSize: 11,
                    letterSpacing: 1.2,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// ── Private helper widgets ────────────────────────────────────────────────────

class _FieldLabel extends StatelessWidget {
  const _FieldLabel(this.text);
  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: Theme.of(context).textTheme.bodySmall?.copyWith(
            color: AppColors.textSecondary,
            fontWeight: FontWeight.w600,
            letterSpacing: 0.3,
          ),
    );
  }
}

class _ErrorBanner extends StatelessWidget {
  const _ErrorBanner({required this.message});
  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: AppColors.error.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: AppColors.error.withValues(alpha: 0.3),
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.error_outline, color: AppColors.error, size: 18),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              message,
              style: const TextStyle(
                color: AppColors.error,
                fontSize: 13,
                height: 1.4,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SubmitButton extends StatelessWidget {
  const _SubmitButton({required this.isLoading, required this.onPressed});
  final bool isLoading;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 52,
      decoration: BoxDecoration(
        gradient: isLoading ? null : AppColors.primaryGradient,
        color: isLoading ? AppColors.cardBg : null,
        borderRadius: BorderRadius.circular(12),
        boxShadow: isLoading
            ? []
            : [
                BoxShadow(
                  color: AppColors.primary.withValues(alpha: 0.35),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
      ),
      child: ElevatedButton(
        onPressed: isLoading ? null : onPressed,
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.transparent,
          shadowColor: Colors.transparent,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
        child: isLoading
            ? const SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  valueColor: AlwaysStoppedAnimation<Color>(AppColors.primary),
                ),
              )
            : const Text(
                'Se connecter',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
      ),
    );
  }
}
