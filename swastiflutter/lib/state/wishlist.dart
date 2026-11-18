import 'dart:convert';

import 'package:material_ui/material_ui.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../core/api.dart';
import '../core/format.dart';
import '../models/models.dart';
import 'auth.dart';

/// Wishlist: guests keep it on the device; signed-in customers keep it on the server.
/// When a guest signs in, their device wishlist is merged into their account.
class WishlistController extends ChangeNotifier {
  WishlistController(this._prefs);

  final SharedPreferences _prefs;
  static const _kGuest = 'swasti_wishlist';

  List<String> _ids = [];
  bool _signedIn = false;
  bool _merged = false;

  List<String> get ids => List.unmodifiable(_ids);
  int get count => _ids.length;
  bool has(String id) => _ids.contains(id);

  List<String> _readGuest() {
    try {
      return asStrList(jsonDecode(_prefs.getString(_kGuest) ?? '[]'));
    } catch (_) {
      return [];
    }
  }

  /// Called whenever the auth state changes.
  Future<void> syncWith(AuthController auth) async {
    if (auth.status == AuthStatus.loading) return;
    if (!auth.isSignedIn) {
      _signedIn = false;
      _merged = false;
      _ids = _readGuest();
      notifyListeners();
      return;
    }
    if (_signedIn) return;
    _signedIn = true;
    final guest = _readGuest();
    try {
      final data = asMap(
        guest.isNotEmpty && !_merged
            ? await Api.instance.post('/store/account/wishlist', {'productIds': guest})
            : await Api.instance.get('/store/account/wishlist'),
      );
      _merged = true;
      await _prefs.remove(_kGuest);
      _ids = asStrList(data['ids']);
      notifyListeners();
    } catch (_) {
      _signedIn = false; // retry on the next change
    }
  }

  /// Adds or removes; returns true when the product is now saved.
  Future<bool> toggle(Product product) async {
    final inList = _ids.contains(product.id);
    final previous = List<String>.from(_ids);
    _ids = inList ? (_ids..remove(product.id)) : [product.id, ..._ids];
    notifyListeners();
    if (!_signedIn) {
      if (_ids.length > 200) _ids = _ids.sublist(0, 200);
      await _prefs.setString(_kGuest, jsonEncode(_ids));
      return !inList;
    }
    try {
      final data = asMap(
        inList
            ? await Api.instance.delete('/store/account/wishlist/${product.id}')
            : await Api.instance.post('/store/account/wishlist', {
                'productIds': [product.id],
              }),
      );
      _ids = asStrList(data['ids']);
      notifyListeners();
      return !inList;
    } catch (error) {
      _ids = previous;
      notifyListeners();
      rethrow;
    }
  }
}
