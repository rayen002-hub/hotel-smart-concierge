// ignore_for_file: constant_identifier_names

/// Represents a user summary embedded in a message (sender / receiver).
class MessageUserModel {
  final String id;
  final String name;
  final String role;

  const MessageUserModel({
    required this.id,
    required this.name,
    required this.role,
  });

  factory MessageUserModel.fromJson(Map<String, dynamic> json) {
    return MessageUserModel(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      role: json['role'] as String? ?? '',
    );
  }
}

/// Represents an internal message within a task conversation.
class MessageModel {
  final String id;
  final String complaintId;
  final String senderId;
  final String receiverId;
  final String message;
  final DateTime createdAt;
  final DateTime? readAt;
  final MessageUserModel sender;
  final MessageUserModel? receiver;

  const MessageModel({
    required this.id,
    required this.complaintId,
    required this.senderId,
    required this.receiverId,
    required this.message,
    required this.createdAt,
    this.readAt,
    required this.sender,
    this.receiver,
  });

  factory MessageModel.fromJson(Map<String, dynamic> json) {
    return MessageModel(
      id: json['id'] as String? ?? '',
      complaintId: json['complaintId'] as String? ?? '',
      senderId: json['senderId'] as String? ?? '',
      receiverId: json['receiverId'] as String? ?? '',
      message: json['message'] as String? ?? '',
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : DateTime.now(),
      readAt: json['readAt'] != null
          ? DateTime.parse(json['readAt'] as String)
          : null,
      sender: MessageUserModel.fromJson(
        json['sender'] as Map<String, dynamic>? ?? {},
      ),
      receiver: json['receiver'] != null
          ? MessageUserModel.fromJson(
              json['receiver'] as Map<String, dynamic>,
            )
          : null,
    );
  }
}
