import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../../../core/constants/app_colors.dart';
import '../../auth/data/auth_service.dart';
import 'intervention_result_screen.dart';

/// Full-screen QR code scanner screen for exit scans.
///
/// After a successful QR scan, navigates to [InterventionResultScreen]
/// where the employee picks FIXED / NOT_FIXED and optionally adds a comment.
class QrExitScannerScreen extends StatefulWidget {
  final String taskId;

  const QrExitScannerScreen({
    super.key,
    required this.taskId,
  });

  @override
  State<QrExitScannerScreen> createState() => _QrExitScannerScreenState();
}

class _QrExitScannerScreenState extends State<QrExitScannerScreen> {
  final MobileScannerController _controller = MobileScannerController(
    detectionSpeed: DetectionSpeed.noDuplicates,
  );
  bool _isProcessing = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  /// Handles a detected QR code by navigating to the intervention result screen.
  Future<void> _handleQrCode(String token) async {
    setState(() {
      _isProcessing = true;
    });

    try {
      // Pause camera detection while navigating
      await _controller.stop();

      if (!mounted) return;

      // Navigate to the intervention result screen with the scanned token
      final result = await Navigator.of(context).push<bool>(
        MaterialPageRoute(
          builder: (_) => InterventionResultScreen(
            taskId: widget.taskId,
            workerRoomQrToken: token,
          ),
        ),
      );

      if (mounted) {
        if (result == true) {
          // Exit scan succeeded → pop back to detail with success
          Navigator.of(context).pop(true);
        } else {
          // User cancelled from result screen → allow re-scan
          _retryScanning();
        }
      }
    } on ApiException catch (e) {
      if (mounted) {
        _showErrorDialog(e.message);
      }
    } catch (_) {
      if (mounted) {
        _showErrorDialog('Une erreur inattendue est survenue.');
      }
    }
  }

  /// Displays a scanning error and allows retry.
  void _showErrorDialog(String message) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) {
        return AlertDialog(
          backgroundColor: AppColors.cardBg,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: const BorderSide(color: AppColors.border),
          ),
          title: const Row(
            children: [
              Icon(Icons.error_outline_rounded, color: AppColors.error),
              SizedBox(width: 8),
              Text(
                'Erreur de Scan',
                style: TextStyle(color: AppColors.textPrimary),
              ),
            ],
          ),
          content: Text(
            message,
            style: const TextStyle(color: AppColors.textSecondary),
          ),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.of(context).pop(); // Dismiss dialog
                _retryScanning();
              },
              child: const Text(
                'Réessayer',
                style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold),
              ),
            ),
            TextButton(
              onPressed: () {
                Navigator.of(context).pop(); // Dismiss dialog
                Navigator.of(this.context).pop(false); // Go back to details
              },
              child: const Text(
                'Annuler',
                style: TextStyle(color: AppColors.textSecondary),
              ),
            ),
          ],
        );
      },
    );
  }

  /// Resets status and restarts camera.
  Future<void> _retryScanning() async {
    setState(() {
      _isProcessing = false;
    });
    await _controller.start();
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    final scanAreaSize = size.width * 0.7;

    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          // 1. Mobile Scanner View
          MobileScanner(
            controller: _controller,
            onDetect: (BarcodeCapture capture) {
              if (_isProcessing) return;
              final List<Barcode> barcodes = capture.barcodes;
              for (final barcode in barcodes) {
                final String? rawValue = barcode.rawValue;
                if (rawValue != null && rawValue.isNotEmpty) {
                  _handleQrCode(rawValue);
                  break;
                }
              }
            },
          ),

          // 2. Custom Mask Overlay
          ColorFiltered(
            colorFilter: ColorFilter.mode(
              Colors.black.withValues(alpha: 0.7),
              BlendMode.srcOut,
            ),
            child: Stack(
              children: [
                Container(
                  color: Colors.transparent,
                ),
                Center(
                  child: Container(
                    height: scanAreaSize,
                    width: scanAreaSize,
                    decoration: BoxDecoration(
                      color: Colors.black,
                      borderRadius: BorderRadius.circular(24),
                    ),
                  ),
                ),
              ],
            ),
          ),

          // 3. Scan Box Borders / Corners
          Center(
            child: SizedBox(
              height: scanAreaSize,
              width: scanAreaSize,
              child: CustomPaint(
                painter: _ScannerBorderPainter(color: AppColors.accent),
              ),
            ),
          ),

          // 4. Content & Controls
          SafeArea(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                // Top Bar
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      IconButton(
                        icon: const Icon(Icons.arrow_back_rounded, color: Colors.white),
                        onPressed: () => Navigator.of(context).pop(false),
                      ),
                      const Text(
                        'Scanner Sortie',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      // Flash Toggle Button
                      ValueListenableBuilder(
                        valueListenable: _controller,
                        builder: (context, state, child) {
                          final isTorchOn = state.torchState == TorchState.on;
                          return IconButton(
                            icon: Icon(
                              isTorchOn ? Icons.flash_on_rounded : Icons.flash_off_rounded,
                              color: isTorchOn ? AppColors.accent : Colors.white,
                            ),
                            onPressed: () => _controller.toggleTorch(),
                          );
                        },
                      ),
                    ],
                  ),
                ),

                // Center Info Label
                Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.6),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: Colors.white.withValues(alpha: 0.15)),
                      ),
                      child: const Text(
                        'Scannez le QR code pour valider la sortie',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                    SizedBox(height: size.height * 0.15),
                  ],
                ),
              ],
            ),
          ),

          // 5. Loading indicator overlay
          if (_isProcessing)
            Container(
              color: Colors.black.withValues(alpha: 0.6),
              child: const Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    CircularProgressIndicator(
                      valueColor: AlwaysStoppedAnimation<Color>(AppColors.accent),
                    ),
                    SizedBox(height: 16),
                    Text(
                      'Traitement en cours...',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// Custom painter to draw corners on scanner viewport
class _ScannerBorderPainter extends CustomPainter {
  final Color color;

  _ScannerBorderPainter({required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = 4
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    final path = Path();
    const cornerLength = 24.0;
    const radius = 16.0;

    // Top Left Corner
    path.moveTo(0, cornerLength);
    path.lineTo(0, radius);
    path.arcToPoint(const Offset(radius, 0), radius: const Radius.circular(radius));
    path.lineTo(cornerLength, 0);

    // Top Right Corner
    path.moveTo(size.width - cornerLength, 0);
    path.lineTo(size.width - radius, 0);
    path.arcToPoint(Offset(size.width, radius), radius: const Radius.circular(radius));
    path.lineTo(size.width, cornerLength);

    // Bottom Right Corner
    path.moveTo(size.width, size.height - cornerLength);
    path.lineTo(size.width, size.height - radius);
    path.arcToPoint(Offset(size.width - radius, size.height), radius: const Radius.circular(radius));
    path.lineTo(size.width - cornerLength, size.height);

    // Bottom Left Corner
    path.moveTo(cornerLength, size.height);
    path.lineTo(radius, size.height);
    path.arcToPoint(Offset(0, size.height - radius), radius: const Radius.circular(radius));
    path.lineTo(0, size.height - cornerLength);

    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
