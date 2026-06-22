import 'package:flutter/material.dart';

class AppColors {
  // Prevent instantiation
  AppColors._();

  static const Color background = Color(0xFF0F172A); // Slate 900
  static const Color cardBg = Color(0xFF1E293B);      // Slate 800
  static const Color primary = Color(0xFF6366F1);     // Indigo 500
  static const Color accent = Color(0xFFF59E0B);      // Amber 500
  static const Color textPrimary = Color(0xFFF8FAFC); // Slate 50
  static const Color textSecondary = Color(0xFF94A3B8); // Slate 400
  static const Color border = Color(0xFF334155);       // Slate 700

  // Status colors
  static const Color success = Color(0xFF10B981);     // Emerald 500
  static const Color warning = Color(0xFFF59E0B);     // Amber 500
  static const Color error = Color(0xFFEF4444);       // Red 500
  static const Color info = Color(0xFF0EA5E9);        // Sky 500

  // Gradients
  static const Gradient primaryGradient = LinearGradient(
    colors: [Color(0xFF6366F1), Color(0xFF4F46E5)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const Gradient backgroundGradient = LinearGradient(
    colors: [Color(0xFF0F172A), Color(0xFF020617)],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
  );
}
