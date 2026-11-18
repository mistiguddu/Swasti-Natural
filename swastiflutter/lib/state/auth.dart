import 'dart:async';

import 'package:material_ui/material_ui.dart';

import '../core/api.dart';
import '../core/format.dart';
import '../core/i18n.dart';
import '../core/secure_store.dart';
import '../models/models.dart';

enum AuthStatus { loading, signedOut, signedIn }

/// Customer session.
///
/// Security measures:
///  * token kept only in Keystore-backed secure storage, never sent once expired;
///  * the session ends automatically when the token expires (timer on the JWT `exp`);
///  * any 401 from an account endpoint signs out immediately;
///  * staff (admin / super admin) accounts are refused — this app is for customers only;
///  * repeated wrong passwords lock the sign-in form for a growing cool-down.
class AuthController extends ChangeNotifier {
  AuthController() {
    Api.instance.onUnauthorized = () {
      if (_status == AuthStatus.signedIn) signOut(expired: true);
    };
  }

  AuthStatus _status = AuthStatus.loading;
  Customer? _user;
  Timer? _expiryTimer;
  int _failedAttempts = 0;
  DateTime? _lockedUntil;
  bool _sessionExpired = false;

  AuthStatus get status => _status;
  Customer? get user => _user;
  bool get isSignedIn => _status == AuthStatus.signedIn;

  /// True once after the session ended because the token expired or was revoked.
  bool consumeExpiredFlag() {
    final value = _sessionExpired;
    _sessionExpired = false;
    return value;
  }

  /// Seconds left before another sign-in attempt is allowed (0 when not locked).
  int get lockSecondsLeft {
    final until = _lockedUntil;
    if (until == null) return 0;
    final left = until.difference(DateTime.now()).inSeconds;
    return left > 0 ? left + 1 : 0;
  }

  /// Restores the session saved on this device.
  Future<void> restore() async {
    final token = SecureStore.token;
    if (token == null) {
      _set(AuthStatus.signedOut, null);
      return;
    }
    try {
      final data = asMap(await Api.instance.get('/auth/me'));
      final user = Customer.fromJson(asMap(data['user']));
      if (user.role != 'user') {
        await signOut();
        return;
      }
      _scheduleExpiry(token);
      _set(AuthStatus.signedIn, user);
    } on ApiException catch (error) {
      if (error.status == 401 || error.status == 403) {
        await signOut();
      } else {
        // Offline: keep the (unexpired) session; screens retry when the network is back.
        _scheduleExpiry(token);
        _set(AuthStatus.signedIn, _user ?? Customer(id: '', name: '', email: ''));
        unawaited(_retryProfileLater());
      }
    }
  }

  Future<void> _retryProfileLater() async {
    await Future<void>.delayed(const Duration(seconds: 8));
    if (isSignedIn && (_user?.id.isEmpty ?? true)) {
      try {
        await refresh();
      } catch (_) {}
    }
  }

  Future<Customer> signIn(String email, String password) async {
    if (lockSecondsLeft > 0) {
      throw ApiException(tr('Too many attempts. Try again in {s} seconds.', {'s': lockSecondsLeft}), 429);
    }
    try {
      final data = asMap(await Api.instance.post('/auth/login', {'email': email.trim().toLowerCase(), 'password': password}));
      _failedAttempts = 0;
      _lockedUntil = null;
      return await _accept(data);
    } on ApiException catch (error) {
      if (error.status == 401) {
        _failedAttempts++;
        if (_failedAttempts >= 5) {
          // 30s, 60s, 120s … up to 10 minutes.
          final seconds = (30 * (1 << (_failedAttempts - 5))).clamp(30, 600);
          _lockedUntil = DateTime.now().add(Duration(seconds: seconds));
        }
      }
      rethrow;
    }
  }

  Future<Customer> register({required String name, required String email, required String password, String phone = ''}) async {
    final data = asMap(
      await Api.instance.post('/auth/register', {'name': name.trim(), 'email': email.trim().toLowerCase(), 'password': password, 'phone': phone.trim()}),
    );
    return _accept(data);
  }

  Future<Customer> _accept(Map<String, dynamic> data) async {
    final user = Customer.fromJson(asMap(data['user']));
    final token = asStr(data['accessToken']);
    if (user.role != 'user') {
      throw ApiException(tr('This is a staff account. Staff sign in through the admin console, not the shopping app.'), 403);
    }
    if (token.isEmpty) throw ApiException(tr('Sign-in failed. Please try again.'));
    await SecureStore.setToken(token);
    _scheduleExpiry(token);
    _set(AuthStatus.signedIn, user);
    return user;
  }

  Future<Customer> refresh() async {
    final data = asMap(await Api.instance.get('/auth/me'));
    final user = Customer.fromJson(asMap(data['user']));
    _set(AuthStatus.signedIn, user);
    return user;
  }

  Future<void> updateProfile({required String name, required String phone}) async {
    final data = asMap(await Api.instance.put('/auth/me', {'name': name.trim(), 'phone': phone.trim()}));
    _set(AuthStatus.signedIn, Customer.fromJson(asMap(data['user'])));
  }

  Future<void> changePassword(String current, String next) async {
    await Api.instance.put('/auth/password', {'currentPassword': current, 'newPassword': next});
  }

  Future<void> signOut({bool expired = false}) async {
    _expiryTimer?.cancel();
    await SecureStore.setToken(null);
    _sessionExpired = expired;
    _set(AuthStatus.signedOut, null);
  }

  void _scheduleExpiry(String token) {
    _expiryTimer?.cancel();
    final expiry = SecureStore.expiryOf(token);
    if (expiry == null) return;
    final wait = expiry.difference(DateTime.now()) - const Duration(seconds: 30);
    if (wait.isNegative) {
      signOut(expired: true);
      return;
    }
    // Timers beyond ~24 days overflow on some platforms; re-check daily instead.
    final capped = wait > const Duration(days: 1) ? const Duration(days: 1) : wait;
    _expiryTimer = Timer(capped, () {
      final current = SecureStore.token;
      if (current == null) return;
      SecureStore.isExpired(current) ? signOut(expired: true) : _scheduleExpiry(current);
    });
  }

  void _set(AuthStatus status, Customer? user) {
    _status = status;
    _user = user;
    notifyListeners();
  }

  @override
  void dispose() {
    _expiryTimer?.cancel();
    super.dispose();
  }
}

/// Password rules shared by register, reset and change-password (server minimum is 8).
class PasswordRules {
  static String? validate(String? value) {
    final v = value ?? '';
    if (v.length < 8) return tr('Use at least 8 characters');
    if (v.length > 128) return tr('Use at most 128 characters');
    if (!RegExp(r'[A-Za-z]').hasMatch(v) || !RegExp(r'\d').hasMatch(v)) return tr('Use letters and numbers');
    return null;
  }

  /// 0 (empty) … 4 (strong).
  static int strength(String v) {
    if (v.isEmpty) return 0;
    var score = 0;
    if (v.length >= 8) score++;
    if (v.length >= 12) score++;
    if (RegExp(r'[a-z]').hasMatch(v) && RegExp(r'[A-Z]').hasMatch(v)) score++;
    if (RegExp(r'\d').hasMatch(v)) score++;
    if (RegExp(r'[^A-Za-z0-9]').hasMatch(v)) score++;
    return score.clamp(1, 4);
  }
}
