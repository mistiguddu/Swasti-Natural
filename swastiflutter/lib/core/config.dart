/// App configuration.
///
/// The API address is set at build time:
///   flutter run --dart-define=API_BASE_URL=https://api.example.com/api/v1
/// The default (10.0.2.2) is the host machine as seen from the Android emulator,
/// matching the API server's default port 3000.
class AppConfig {
  AppConfig._();

  static const appName = 'Swasti';

  static const apiBaseUrl = String.fromEnvironment('API_BASE_URL', defaultValue: 'http://10.0.2.2:3000/api/v1');

  /// Server origin (scheme + host + port), used for uploaded images such as `/uploads/...`.
  static final String origin = () {
    final uri = Uri.parse(apiBaseUrl);
    return '${uri.scheme}://${uri.host}${uri.hasPort ? ':${uri.port}' : ''}';
  }();

  /// Turns a stored image path into a full URL. Empty for missing images.
  static String imageUrl(String? path) {
    if (path == null || path.isEmpty) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return '$origin${path.startsWith('/') ? '' : '/'}$path';
  }

  /// Lock the app again after it has been in the background this long (when app lock is on).
  static const lockAfter = Duration(seconds: 60);
}
