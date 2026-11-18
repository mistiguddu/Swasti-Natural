import 'dart:convert';

import 'package:dio/dio.dart';

import 'config.dart';
import 'i18n.dart';
import 'secure_store.dart';

/// Error from the API, with a message safe to show to the customer.
class ApiException implements Exception {
  ApiException(this.message, [this.status = 0, this.details]);
  final String message;
  final int status;
  final Object? details;

  /// Field errors from the server's validation (`details: [{ path, message }]`), keyed by field.
  Map<String, String> get fieldErrors {
    final result = <String, String>{};
    final list = details;
    if (list is List) {
      for (final item in list) {
        if (item is Map && item['path'] != null) {
          final path = item['path'].toString().split('.').last;
          result.putIfAbsent(path, () => item['message']?.toString() ?? '');
        }
      }
    }
    return result;
  }

  @override
  String toString() => message;
}

/// HTTP client for the storefront API. Every response is `{ data }` or `{ error: { message, details } }`.
class Api {
  Api._() {
    _dio = Dio(
      BaseOptions(
        baseUrl: AppConfig.apiBaseUrl,
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 30),
        headers: {'Accept': 'application/json', 'X-Client': 'swasti-android'},
      ),
    );
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          final token = SecureStore.token;
          if (token != null) {
            if (SecureStore.isExpired(token)) {
              // Never send an expired token; let the app sign out cleanly.
              onUnauthorized?.call();
            } else {
              options.headers['Authorization'] = 'Bearer $token';
            }
          }
          final chat = SecureStore.chatToken;
          if (chat != null && options.path.startsWith('/store/chat')) options.headers['X-Chat-Token'] = chat;
          handler.next(options);
        },
      ),
    );
  }

  static final Api instance = Api._();
  late final Dio _dio;

  /// Called when the server rejects the customer's token (401 on account endpoints).
  void Function()? onUnauthorized;

  Future<T> get<T>(String path, [Map<String, dynamic>? query]) => _send(() => _dio.get(path, queryParameters: _clean(query)));
  Future<T> post<T>(String path, [Object? body]) => _send(() => _dio.post(path, data: body));
  Future<T> put<T>(String path, [Object? body]) => _send(() => _dio.put(path, data: body));
  Future<T> delete<T>(String path) => _send(() => _dio.delete(path));

  static Map<String, dynamic>? _clean(Map<String, dynamic>? query) {
    if (query == null) return null;
    return Map.fromEntries(query.entries.where((e) => e.value != null && e.value != ''));
  }

  Future<T> _send<T>(Future<Response> Function() request) async {
    try {
      final response = await request();
      final body = response.data;
      return (body is Map ? body['data'] : null) as T;
    } on DioException catch (error) {
      throw _toException(error);
    }
  }

  ApiException _toException(DioException error) {
    final response = error.response;
    if (response == null) {
      return ApiException(tr('Can’t reach the server. Please check your connection and try again.'));
    }
    final status = response.statusCode ?? 0;
    final path = error.requestOptions.path;
    if (status == 401 && (path.startsWith('/store/account') || path.startsWith('/auth/me') || path.startsWith('/reviews'))) {
      onUnauthorized?.call();
    }
    final data = response.data;
    final err = data is Map ? data['error'] : null;
    final message = err is Map && err['message'] != null
        ? err['message'].toString()
        : status == 429
        ? tr('Too many requests. Please wait a moment and try again.')
        : status >= 500
        ? tr('Something went wrong on our side. Please try again.')
        : tr('Request failed ({status}).', {'status': status});
    return ApiException(message, status, err is Map ? err['details'] : null);
  }

  /// Multipart request (review photos): JSON fields go in `data`, files under [fileField].
  Future<T> multipart<T>(String method, String path, Map<String, dynamic> data, List<String> filePaths, {String fileField = 'images'}) async {
    final form = FormData();
    form.fields.add(MapEntry('data', jsonEncode(data)));
    for (final file in filePaths) {
      form.files.add(MapEntry(fileField, await MultipartFile.fromFile(file, filename: file.split(RegExp(r'[\\/]')).last)));
    }
    return _send(
      () => _dio.request(
        path,
        data: form,
        options: Options(method: method),
      ),
    );
  }
}
