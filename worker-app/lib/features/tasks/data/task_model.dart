// ignore_for_file: constant_identifier_names

/// Categories matching the ComplaintCategory enum on the backend.
enum TaskCategory {
  MAINTENANCE,
  HOUSEKEEPING,
  RECEPTION,
  RESTAURANT,
  COMPLAINT,
  OTHER;

  /// French display label for each category.
  String get label {
    switch (this) {
      case TaskCategory.MAINTENANCE:
        return 'Maintenance';
      case TaskCategory.HOUSEKEEPING:
        return 'Ménage';
      case TaskCategory.RECEPTION:
        return 'Réception';
      case TaskCategory.RESTAURANT:
        return 'Restauration';
      case TaskCategory.COMPLAINT:
        return 'Plainte';
      case TaskCategory.OTHER:
        return 'Autre';
    }
  }
}

/// Statuses matching the ComplaintStatus enum on the backend.
enum TaskStatus {
  PENDING,
  ASSIGNED,
  IN_PROGRESS,
  RESOLVED,
  CONFIRMED,
  NEEDS_REVIEW,
  REOPENED;

  /// French display label for each status.
  String get label {
    switch (this) {
      case TaskStatus.PENDING:
        return 'En attente';
      case TaskStatus.ASSIGNED:
        return 'Assigné';
      case TaskStatus.IN_PROGRESS:
        return 'En cours';
      case TaskStatus.RESOLVED:
        return 'Résolu';
      case TaskStatus.CONFIRMED:
        return 'Confirmé';
      case TaskStatus.NEEDS_REVIEW:
        return 'À valider';
      case TaskStatus.REOPENED:
        return 'Réouvert';
    }
  }
}

/// Room metadata nested inside the Task.
class RoomModel {
  final String id;
  final String roomNumber;
  final String type;
  final int floor;

  const RoomModel({
    required this.id,
    required this.roomNumber,
    required this.type,
    required this.floor,
  });

  factory RoomModel.fromJson(Map<String, dynamic> json) {
    return RoomModel(
      id: json['id'] as String? ?? '',
      roomNumber: json['roomNumber'] as String? ?? '',
      type: json['type'] as String? ?? '',
      floor: json['floor'] is int
          ? json['floor'] as int
          : int.tryParse(json['floor'].toString()) ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'roomNumber': roomNumber,
      'type': type,
      'floor': floor,
    };
  }
}

/// Main Task model representing a complaint/intervention.
class TaskModel {
  final String id;
  final String reservationId;
  final String roomId;
  final String originalMessage;
  final String? staffMessage;
  final TaskCategory category;
  final TaskStatus status;
  final DateTime createdAt;
  final RoomModel room;
  final List<InterventionLogModel> interventionLogs;

  const TaskModel({
    required this.id,
    required this.reservationId,
    required this.roomId,
    required this.originalMessage,
    this.staffMessage,
    required this.category,
    required this.status,
    required this.createdAt,
    required this.room,
    required this.interventionLogs,
  });

  factory TaskModel.fromJson(Map<String, dynamic> json) {
    return TaskModel(
      id: json['id'] as String? ?? '',
      reservationId: json['reservationId'] as String? ?? '',
      roomId: json['roomId'] as String? ?? '',
      originalMessage: json['originalMessage'] as String? ?? '',
      staffMessage: json['staffMessage'] as String?,
      category: _parseCategory(json['category'] as String?),
      status: _parseStatus(json['status'] as String?),
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : DateTime.now(),
      room: RoomModel.fromJson(json['room'] as Map<String, dynamic>? ?? {}),
      interventionLogs: (json['interventionLogs'] as List<dynamic>?)
              ?.map((item) => InterventionLogModel.fromJson(item as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'reservationId': reservationId,
      'roomId': roomId,
      'originalMessage': originalMessage,
      'staffMessage': staffMessage,
      'category': category.name,
      'status': status.name,
      'createdAt': createdAt.toIso8601String(),
      'room': room.toJson(),
      'interventionLogs': interventionLogs.map((item) => item.toJson()).toList(),
    };
  }

  /// Truncates the message to a reasonable length for list display.
  String get messageSnippet {
    final msg = staffMessage ?? originalMessage;
    if (msg.length <= 60) return msg;
    return '${msg.substring(0, 57)}...';
  }

  static TaskCategory _parseCategory(String? value) {
    switch (value) {
      case 'MAINTENANCE':
        return TaskCategory.MAINTENANCE;
      case 'HOUSEKEEPING':
        return TaskCategory.HOUSEKEEPING;
      case 'RECEPTION':
        return TaskCategory.RECEPTION;
      case 'RESTAURANT':
        return TaskCategory.RESTAURANT;
      case 'COMPLAINT':
        return TaskCategory.COMPLAINT;
      default:
        return TaskCategory.OTHER;
    }
  }

  static TaskStatus _parseStatus(String? value) {
    switch (value) {
      case 'PENDING':
        return TaskStatus.PENDING;
      case 'ASSIGNED':
        return TaskStatus.ASSIGNED;
      case 'IN_PROGRESS':
        return TaskStatus.IN_PROGRESS;
      case 'RESOLVED':
        return TaskStatus.RESOLVED;
      case 'CONFIRMED':
        return TaskStatus.CONFIRMED;
      case 'NEEDS_REVIEW':
        return TaskStatus.NEEDS_REVIEW;
      case 'REOPENED':
        return TaskStatus.REOPENED;
      default:
        return TaskStatus.PENDING;
    }
  }
}

enum InterventionResult {
  FIXED,
  NOT_FIXED;

  String get label {
    switch (this) {
      case InterventionResult.FIXED:
        return 'Résolu';
      case InterventionResult.NOT_FIXED:
        return 'Non résolu';
    }
  }
}

class InterventionLogModel {
  final String id;
  final DateTime? entryTime;
  final DateTime? exitTime;
  final InterventionResult? result;
  final String? employeeComment;

  const InterventionLogModel({
    required this.id,
    this.entryTime,
    this.exitTime,
    this.result,
    this.employeeComment,
  });

  factory InterventionLogModel.fromJson(Map<String, dynamic> json) {
    return InterventionLogModel(
      id: json['id'] as String? ?? '',
      entryTime: json['entryTime'] != null ? DateTime.parse(json['entryTime'] as String) : null,
      exitTime: json['exitTime'] != null ? DateTime.parse(json['exitTime'] as String) : null,
      result: _parseResult(json['result'] as String?),
      employeeComment: json['employeeComment'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'entryTime': entryTime?.toIso8601String(),
      'exitTime': exitTime?.toIso8601String(),
      'result': result?.name,
      'employeeComment': employeeComment,
    };
  }

  static InterventionResult? _parseResult(String? value) {
    if (value == null) return null;
    switch (value) {
      case 'FIXED':
        return InterventionResult.FIXED;
      case 'NOT_FIXED':
        return InterventionResult.NOT_FIXED;
      default:
        return null;
    }
  }
}
