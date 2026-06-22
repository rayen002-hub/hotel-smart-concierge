import 'package:dio/dio.dart';
import '../../../core/api/api_client.dart';
import '../../../core/constants/api_constants.dart';
import '../../auth/data/auth_service.dart';
import 'message_model.dart';

/// Provides operations to fetch and send messages for a task.
class MessageService {
  MessageService._();

  static final MessageService _instance = MessageService._();
  static MessageService get instance => _instance;

  final Dio _dio = ApiClient.instance.dio;

  /// Fetches all messages for a given task, ordered oldest first.
  ///
  /// Throws [ApiException] on API or network errors.
  Future<List<MessageModel>> getMessages(String taskId) async {
    try {
      final response = await _dio.get(ApiConstants.taskMessages(taskId));

      final body = response.data as Map<String, dynamic>;

      if (response.statusCode != 200 || body['success'] != true) {
        final message = body['error'] as String? ?? 'Impossible de récupérer les messages.';
        throw ApiException(message, statusCode: response.statusCode);
      }

      final dataList = body['data'] as List<dynamic>? ?? [];
      return dataList
          .map((json) => MessageModel.fromJson(json as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  /// Sends a new message for a task.
  ///
  /// Returns the created [MessageModel].
  /// Throws [ApiException] on API or network errors.
  Future<MessageModel> sendMessage(String taskId, String message) async {
    try {
      final response = await _dio.post(
        ApiConstants.taskMessages(taskId),
        data: {'message': message},
      );

      final body = response.data as Map<String, dynamic>;

      if ((response.statusCode != 200 && response.statusCode != 201) ||
          body['success'] != true) {
        final msg = body['error'] as String? ?? 'Impossible d\'envoyer le message.';
        throw ApiException(msg, statusCode: response.statusCode);
      }

      final dataMap = body['data'] as Map<String, dynamic>;
      return MessageModel.fromJson(dataMap);
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }
}
