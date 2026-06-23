// ignore_for_file: constant_identifier_names

/// Statuses matching the HousekeepingTaskStatus enum on the backend.
enum HousekeepingTaskStatus {
  PENDING,
  ASSIGNED,
  IN_PROGRESS,
  COMPLETED,
  NEEDS_REVIEW,
  CANCELLED;

  /// French display label for each status.
  String get label {
    switch (this) {
      case HousekeepingTaskStatus.PENDING:
        return 'En attente';
      case HousekeepingTaskStatus.ASSIGNED:
        return 'Assigné';
      case HousekeepingTaskStatus.IN_PROGRESS:
        return 'En cours';
      case HousekeepingTaskStatus.COMPLETED:
        return 'Terminé';
      case HousekeepingTaskStatus.NEEDS_REVIEW:
        return 'À revoir';
      case HousekeepingTaskStatus.CANCELLED:
        return 'Annulé';
    }
  }
}

/// Results matching HousekeepingTaskResult on the backend.
enum HousekeepingTaskResult {
  DONE,
  NOT_DONE;

  String get label {
    switch (this) {
      case HousekeepingTaskResult.DONE:
        return 'Fait';
      case HousekeepingTaskResult.NOT_DONE:
        return 'Non fait';
    }
  }
}

/// Housekeeping task model.
class HousekeepingTaskModel {
  final String id;
  final String roomId;
  final String? note;
  final HousekeepingTaskStatus status;
  final DateTime? entryTime;
  final DateTime? exitTime;
  final HousekeepingTaskResult? result;
  final String? workerComment;
  final DateTime createdAt;

  // Nested objects
  final HkRoom? room;
  final HkUser? assignedTo;
  final HkUser? assignedBy;

  const HousekeepingTaskModel({
    required this.id,
    required this.roomId,
    this.note,
    required this.status,
    this.entryTime,
    this.exitTime,
    this.result,
    this.workerComment,
    required this.createdAt,
    this.room,
    this.assignedTo,
    this.assignedBy,
  });

  factory HousekeepingTaskModel.fromJson(Map<String, dynamic> json) {
    return HousekeepingTaskModel(
      id: json['id'] as String? ?? '',
      roomId: json['roomId'] as String? ?? '',
      note: json['note'] as String?,
      status: _parseStatus(json['status'] as String?),
      entryTime: json['entryTime'] != null ? DateTime.parse(json['entryTime'] as String) : null,
      exitTime: json['exitTime'] != null ? DateTime.parse(json['exitTime'] as String) : null,
      result: _parseResult(json['result'] as String?),
      workerComment: json['workerComment'] as String?,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : DateTime.now(),
      room: json['room'] != null ? HkRoom.fromJson(json['room'] as Map<String, dynamic>) : null,
      assignedTo: json['assignedTo'] != null ? HkUser.fromJson(json['assignedTo'] as Map<String, dynamic>) : null,
      assignedBy: json['assignedBy'] != null ? HkUser.fromJson(json['assignedBy'] as Map<String, dynamic>) : null,
    );
  }

  /// Room number display.
  String get roomNumber => room?.roomNumber ?? '—';

  /// Room floor display.
  int get roomFloor => room?.floor ?? 0;

  /// Manager note snippet for list display.
  String get noteSnippet {
    if (note == null || note!.isEmpty) return 'Aucune note';
    if (note!.length <= 60) return note!;
    return '${note!.substring(0, 57)}...';
  }

  static HousekeepingTaskStatus _parseStatus(String? value) {
    switch (value) {
      case 'PENDING':
        return HousekeepingTaskStatus.PENDING;
      case 'ASSIGNED':
        return HousekeepingTaskStatus.ASSIGNED;
      case 'IN_PROGRESS':
        return HousekeepingTaskStatus.IN_PROGRESS;
      case 'COMPLETED':
        return HousekeepingTaskStatus.COMPLETED;
      case 'NEEDS_REVIEW':
        return HousekeepingTaskStatus.NEEDS_REVIEW;
      case 'CANCELLED':
        return HousekeepingTaskStatus.CANCELLED;
      default:
        return HousekeepingTaskStatus.ASSIGNED;
    }
  }

  static HousekeepingTaskResult? _parseResult(String? value) {
    if (value == null) return null;
    switch (value) {
      case 'DONE':
        return HousekeepingTaskResult.DONE;
      case 'NOT_DONE':
        return HousekeepingTaskResult.NOT_DONE;
      default:
        return null;
    }
  }
}

class HkRoom {
  final String id;
  final String roomNumber;
  final int floor;
  final String? type;

  const HkRoom({required this.id, required this.roomNumber, required this.floor, this.type});

  factory HkRoom.fromJson(Map<String, dynamic> json) {
    return HkRoom(
      id: json['id'] as String? ?? '',
      roomNumber: json['roomNumber'] as String? ?? '',
      floor: json['floor'] is int ? json['floor'] as int : int.tryParse(json['floor'].toString()) ?? 0,
      type: json['type'] as String?,
    );
  }
}

class HkUser {
  final String id;
  final String name;

  const HkUser({required this.id, required this.name});

  factory HkUser.fromJson(Map<String, dynamic> json) {
    return HkUser(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
    );
  }
}
