import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Sign-in token storage. The token lives only in the Android Keystore-backed secure
/// storage — never in SharedPreferences, logs or backups (allowBackup is off).
class SecureStore {
  SecureStore._();

  static const _storage = FlutterSecureStorage();
  static const _tokenKey = 'swasti_customer_token';
  static const _chatKey = 'swasti_chat_token';

  static String? _token;
  static String? _chatToken;

  /// Loads cached values once at start-up so requests can read them synchronously.
  static Future<void> load() async {
    try {
      _token = await _storage.read(key: _tokenKey);
      _chatToken = await _storage.read(key: _chatKey);
    } catch (_) {
      // Keystore can be reset (e.g. device lock removed): start signed out.
      await _storage.deleteAll();
      _token = null;
      _chatToken = null;
    }
    if (_token != null && isExpired(_token!)) await setToken(null);
  }

  static String? get token => _token;
  static String? get chatToken => _chatToken;

  static Future<void> setToken(String? value) async {
    _token = value;
    value == null ? await _storage.delete(key: _tokenKey) : await _storage.write(key: _tokenKey, value: value);
  }

  static Future<void> setChatToken(String? value) async {
    _chatToken = value;
    value == null ? await _storage.delete(key: _chatKey) : await _storage.write(key: _chatKey, value: value);
  }

  /// Expiry time from the JWT payload (`exp`), or null if it has none / can't be read.
  static DateTime? expiryOf(String token) {
    try {
      final parts = token.split('.');
      if (parts.length != 3) return null;
      final payload = jsonDecode(utf8.decode(base64Url.decode(base64Url.normalize(parts[1])))) as Map<String, dynamic>;
      final exp = payload['exp'];
      return exp is num ? DateTime.fromMillisecondsSinceEpoch(exp.toInt() * 1000) : null;
    } catch (_) {
      return null;
    }
  }

  /// A token that is malformed or within 30 seconds of expiry counts as expired.
  static bool isExpired(String token) {
    if (token.split('.').length != 3) return true;
    final expiry = expiryOf(token);
    return expiry != null && DateTime.now().isAfter(expiry.subtract(const Duration(seconds: 30)));
  }
}
