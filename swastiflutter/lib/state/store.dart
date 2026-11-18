import 'dart:convert';

import 'package:material_ui/material_ui.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../core/api.dart';
import '../core/format.dart';
import '../core/theme.dart';
import '../models/models.dart';

/// Public store data: info (contact, currency, shipping), categories and branding
/// (store colour theme). Cached so the app opens instantly and works on a slow network.
class StoreController extends ChangeNotifier {
  StoreController(this._prefs) {
    _palette = StorePalette.of(_prefs.getString(_kTheme));
    final cached = _prefs.getString(_kInfo);
    if (cached != null) {
      try {
        _apply(StoreInfo.fromJson(asMap(jsonDecode(cached))));
      } catch (_) {}
    }
  }

  final SharedPreferences _prefs;
  static const _kTheme = 'swasti_store_theme';
  static const _kInfo = 'swasti_store_info';

  StoreInfo? _info;
  List<Category> _categories = [];
  late StorePalette _palette;
  bool _loaded = false;

  StoreInfo get info => _info ?? StoreInfo(storeName: 'Swasti Natural');
  List<Category> get categories => _categories;
  List<Category> get topCategories => _categories.where((c) => c.parent == null).toList();
  List<Category> childrenOf(String id) => _categories.where((c) => c.parent == id).toList();
  StorePalette get palette => _palette;
  bool get loaded => _loaded;

  void _apply(StoreInfo info) {
    _info = info;
    Fmt.currencySymbol = info.currencySymbol;
  }

  /// Loads everything; failures keep the cached values.
  Future<void> load() async {
    await Future.wait([_loadInfo(), _loadCategories(), _loadBranding()]);
    _loaded = true;
    notifyListeners();
  }

  Future<void> _loadInfo() async {
    try {
      final data = asMap(await Api.instance.get('/store/info'));
      _apply(StoreInfo.fromJson(data));
      await _prefs.setString(_kInfo, jsonEncode(data));
    } catch (_) {}
  }

  Future<void> _loadCategories() async {
    try {
      final data = await Api.instance.get('/store/categories');
      _categories = asMapList(data).map(Category.fromJson).toList();
    } catch (_) {}
  }

  Future<void> _loadBranding() async {
    try {
      final data = asMap(await Api.instance.get('/settings/public'));
      final key = asStr(data['storeTheme'], 'forest');
      _palette = StorePalette.of(key);
      await _prefs.setString(_kTheme, key);
    } catch (_) {}
  }
}
