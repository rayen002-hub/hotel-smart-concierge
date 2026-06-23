import 'package:dio/dio.dart';
import '../../../core/api/api_client.dart';
import '../../../core/constants/api_constants.dart';
import '../../auth/data/auth_service.dart'; // For ApiException mapping
import 'housekeeping_task_model.dart';

/// Provides operations for housekeeping tasks from the backend.
class HousekeepingTaskService {
  HousekeepingTaskService._();

  static final HousekeepingTaskService _instance = HousekeepingTaskService._();
  static HousekeepingTaskService get instance => _instance;

  final Dio _dio = ApiClient.instance.dio;

  /// Fetches housekeeping tasks assigned to the logged-in employee.
  Future<List<HousekeepingTaskModel>> getAssignedTasks() async {
    try {
      final response = await _dio.get(ApiConstants.housekeepingTasks);
      final body = response.data as Map<String, dynamic>;

      if (response.statusCode != 200 || body['success'] != true) {
        final message = body['error'] as String? ?? 'Impossible de récupérer les tâches de ménage.';
        throw ApiException(message, statusCode: response.statusCode);
      }

      final dataList = body['data'] as List<dynamic>? ?? [];
      return dataList
          .map((json) => HousekeepingTaskModel.fromJson(json as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  /// Start a housekeeping task by scanning the room QR.
  Future<void> startTask(String taskId, String workerRoomQrToken) async {
    try {
      final response = await _dio.post(
        ApiConstants.housekeepingTaskStart(taskId),
        data: {'workerRoomQrToken': workerRoomQrToken},
      );

      final body = response.data as Map<String, dynamic>;
      if (response.statusCode != 200 || body['success'] != true) {
        final message = body['error'] as String? ?? 'Impossible de démarrer la tâche.';
        throw ApiException(message, statusCode: response.statusCode);
      }
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  /// Finish a housekeeping task by scanning the room QR with result.
  ///
  /// [result] must be 'DONE' or 'NOT_DONE'.
  Future<void> finishTask(
    String taskId,
    String workerRoomQrToken,
    String result, {
    String? workerComment,
  }) async {
    try {
      final response = await _dio.post(
        ApiConstants.housekeepingTaskFinish(taskId),
        data: {
          'workerRoomQrToken': workerRoomQrToken,
          'result': result,
          if (workerComment != null && workerComment.isNotEmpty)
            'workerComment': workerComment,
        },
      );

      final body = response.data as Map<String, dynamic>;
      if (response.statusCode != 200 || body['success'] != true) {
        final message = body['error'] as String? ?? 'Impossible de terminer la tâche.';
        throw ApiException(message, statusCode: response.statusCode);
      }
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }
}
