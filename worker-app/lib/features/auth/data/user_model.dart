/// Lightweight model for the authenticated staff user returned by the backend.
///
/// Backend response shape (auth/login + auth/me):
/// {
///   "id": "...",
///   "name": "Maintenance Worker 1",
///   "email": "...",
///   "role": "EMPLOYEE",
///   "department": "MAINTENANCE"
/// }
class UserModel {
  final String id;
  final String email;
  final String role;
  final String? name;
  final String? department;

  const UserModel({
    required this.id,
    required this.email,
    required this.role,
    this.name,
    this.department,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] as String,
      email: json['email'] as String,
      role: json['role'] as String,
      // Backend returns a single 'name' field.
      name: json['name'] as String?,
      department: json['department'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'email': email,
        'role': role,
        'name': name,
        'department': department,
      };

  /// Display name — falls back to email if name is absent.
  String get displayName => name ?? email;
}

/// Returned by [AuthService.login].
class LoginResult {
  final String token;
  final UserModel user;

  const LoginResult({required this.token, required this.user});
}
