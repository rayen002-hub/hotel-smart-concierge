// ignore_for_file: constant_identifier_names

/// Status of a daily cleaning task (mirrors backend DailyCleaningStatus enum).
enum DailyCleaningStatus {
  ASSIGNED,
  IN_PROGRESS,
  DONE,
  SKIPPED;

  String get label {
    switch (this) {
      case DailyCleaningStatus.ASSIGNED:    return 'Assignée';
      case DailyCleaningStatus.IN_PROGRESS: return 'En cours';
      case DailyCleaningStatus.DONE:        return 'Terminée';
      case DailyCleaningStatus.SKIPPED:     return 'Ignorée';
    }
  }

  bool get isTerminal => this == DailyCleaningStatus.DONE || this == DailyCleaningStatus.SKIPPED;
}

/// Model for a single daily cleaning task returned by the backend.
class DailyCleaningTaskModel {
  final String id;
  final String roomId;
  final String workerId;
  final String businessDay;
  final DailyCleaningStatus status;
  final String? note;
  final DateTime? startedAt;
  final DateTime? completedAt;
  final DateTime createdAt;

  // Nested objects from include
  final DcRoom? room;
  final DcUser? worker;
  final DcUser? assignedBy;

  const DailyCleaningTaskModel({
    required this.id,
    required this.roomId,
    required this.workerId,
    required this.businessDay,
    required this.status,
    this.note,
    this.startedAt,
    this.completedAt,
    required this.createdAt,
    this.room,
    this.worker,
    this.assignedBy,
  });

  factory DailyCleaningTaskModel.fromJson(Map<String, dynamic> json) {
    return DailyCleaningTaskModel(
      id: json['id'] as String? ?? '',
      roomId: json['roomId'] as String? ?? '',
      workerId: json['workerId'] as String? ?? '',
      businessDay: json['businessDay'] as String? ?? '',
      status: _parseStatus(json['status'] as String?),
      note: json['note'] as String?,
      startedAt: json['startedAt'] != null ? DateTime.parse(json['startedAt'] as String) : null,
      completedAt: json['completedAt'] != null ? DateTime.parse(json['completedAt'] as String) : null,
      createdAt: json['createdAt'] != null ? DateTime.parse(json['createdAt'] as String) : DateTime.now(),
      room: json['room'] != null ? DcRoom.fromJson(json['room'] as Map<String, dynamic>) : null,
      worker: json['worker'] != null ? DcUser.fromJson(json['worker'] as Map<String, dynamic>) : null,
      assignedBy: json['assignedBy'] != null ? DcUser.fromJson(json['assignedBy'] as Map<String, dynamic>) : null,
    );
  }

  String get roomNumber => room?.roomNumber ?? '—';
  int get roomFloor => room?.floor ?? 0;
  String get noteSnippet {
    if (note == null || note!.isEmpty) return 'Aucune note';
    if (note!.length <= 60) return note!;
    return '${note!.substring(0, 57)}...';
  }

  static DailyCleaningStatus _parseStatus(String? value) {
    switch (value) {
      case 'ASSIGNED':    return DailyCleaningStatus.ASSIGNED;
      case 'IN_PROGRESS': return DailyCleaningStatus.IN_PROGRESS;
      case 'DONE':        return DailyCleaningStatus.DONE;
      case 'SKIPPED':     return DailyCleaningStatus.SKIPPED;
      default:            return DailyCleaningStatus.ASSIGNED;
    }
  }
}

class DcRoom {
  final String id;
  final String roomNumber;
  final int floor;
  final String? type;

  const DcRoom({required this.id, required this.roomNumber, required this.floor, this.type});

  factory DcRoom.fromJson(Map<String, dynamic> json) => DcRoom(
    id: json['id'] as String? ?? '',
    roomNumber: json['roomNumber'] as String? ?? '',
    floor: json['floor'] is int ? json['floor'] as int : int.tryParse(json['floor'].toString()) ?? 0,
    type: json['type'] as String?,
  );
}

class DcUser {
  final String id;
  final String name;

  const DcUser({required this.id, required this.name});

  factory DcUser.fromJson(Map<String, dynamic> json) => DcUser(
    id: json['id'] as String? ?? '',
    name: json['name'] as String? ?? '',
  );
}
