import 'package:dio/dio.dart';
import '../../../core/api/api_client.dart';
import '../../../core/constants/api_constants.dart';
import '../../auth/data/auth_service.dart'; // For ApiException mapping
import 'task_model.dart';

/// Provides operations to fetch and update tasks from the mobile API.
class TaskService {
  TaskService._();

  static final TaskService _instance = TaskService._();
  static TaskService get instance => _instance;

  final Dio _dio = ApiClient.instance.dio;

  /// Fetches the tasks currently assigned to the logged-in employee.
  ///
  /// Throws [ApiException] on API or network errors.
  Future<List<TaskModel>> getAssignedTasks() async {
    try {
      final response = await _dio.get(ApiConstants.tasks);

      final body = response.data as Map<String, dynamic>;

      if (response.statusCode != 200 || body['success'] != true) {
        final message = body['error'] as String? ?? 'Impossible de récupérer la liste des tâches.';
        throw ApiException(message, statusCode: response.statusCode);
      }

      final dataList = body['data'] as List<dynamic>? ?? [];
      return dataList
          .map((json) => TaskModel.fromJson(json as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  /// Fetches a single task by [id].
  ///
  /// Throws [ApiException] on API or network errors.
  Future<TaskModel> getTaskById(String id) async {
    try {
      final response = await _dio.get(ApiConstants.task(id));

      final body = response.data as Map<String, dynamic>;

      if (response.statusCode != 200 || body['success'] != true) {
        final message = body['error'] as String? ?? 'Impossible de récupérer les détails de la tâche.';
        throw ApiException(message, statusCode: response.statusCode);
      }

      final dataMap = body['data'] as Map<String, dynamic>;
      return TaskModel.fromJson(dataMap);
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  /// Submits the scan-entry for a task with the scanned room token.
  ///
  /// Throws [ApiException] on API or network errors.
  Future<void> scanEntry(String taskId, String workerRoomQrToken) async {
    try {
      final response = await _dio.post(
        ApiConstants.scanEntry(taskId),
        data: {
          'workerRoomQrToken': workerRoomQrToken,
        },
      );

      final body = response.data as Map<String, dynamic>;

      if (response.statusCode != 200 || body['success'] != true) {
        final message = body['error'] as String? ?? 'Impossible de valider le scan d\'entrée.';
        throw ApiException(message, statusCode: response.statusCode);
      }
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  /// Submits the scan-exit for a task with QR token, result and optional comment.
  ///
  /// [result] must be either 'FIXED' or 'NOT_FIXED'.
  /// Throws [ApiException] on API or network errors.
  Future<void> scanExit(
    String taskId,
    String workerRoomQrToken,
    String result, {
    String? employeeComment,
  }) async {
    try {
      final response = await _dio.post(
        ApiConstants.scanExit(taskId),
        data: {
          'workerRoomQrToken': workerRoomQrToken,
          'result': result,
          if (employeeComment != null && employeeComment.isNotEmpty)
            'employeeComment': employeeComment,
        },
      );

      final body = response.data as Map<String, dynamic>;

      if (response.statusCode != 200 || body['success'] != true) {
        final message = body['error'] as String? ?? 'Impossible de valider le scan de sortie.';
        throw ApiException(message, statusCode: response.statusCode);
      }
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }
}
