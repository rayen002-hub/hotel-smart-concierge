import 'package:dio/dio.dart';
import '../../../core/api/api_client.dart';
import '../../../core/constants/api_constants.dart';
import '../../auth/data/auth_service.dart'; // For ApiException
import 'daily_cleaning_task_model.dart';

/// Service for daily cleaning tasks (Ménage quotidien) in the worker app.
class DailyCleaningTaskService {
  DailyCleaningTaskService._();

  static final DailyCleaningTaskService _instance = DailyCleaningTaskService._();
  static DailyCleaningTaskService get instance => _instance;

  final Dio _dio = ApiClient.instance.dio;

  /// Fetches all daily cleaning tasks assigned to the logged-in worker for today.
  Future<List<DailyCleaningTaskModel>> getMyDailyTasks() async {
    try {
      final response = await _dio.get(ApiConstants.dailyCleaningTasks);
      final body = response.data as Map<String, dynamic>;

      if (response.statusCode != 200 || body['success'] != true) {
        final message = body['error'] as String? ?? 'Impossible de récupérer les tâches de ménage.';
        throw ApiException(message, statusCode: response.statusCode);
      }

      final dataList = body['data'] as List<dynamic>? ?? [];
      return dataList
          .map((json) => DailyCleaningTaskModel.fromJson(json as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  /// Marks a daily cleaning task as IN_PROGRESS.
  Future<void> startTask(String taskId) async {
    try {
      final response = await _dio.patch(ApiConstants.dailyCleaningTaskStart(taskId));
      final body = response.data as Map<String, dynamic>;
      if (response.statusCode != 200 || body['success'] != true) {
        final message = body['error'] as String? ?? 'Impossible de démarrer la tâche.';
        throw ApiException(message, statusCode: response.statusCode);
      }
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  /// Completes or skips a daily cleaning task.
  /// [done] true → DONE, false → SKIPPED
  Future<void> completeTask(String taskId, {required bool done, String? note}) async {
    try {
      final response = await _dio.patch(
        ApiConstants.dailyCleaningTaskComplete(taskId),
        data: {
          'done': done,
          if (note != null && note.isNotEmpty) 'note': note,
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
