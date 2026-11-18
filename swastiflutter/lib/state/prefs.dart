import 'package:material_ui/material_ui.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../core/i18n.dart';

/// Device preferences: theme mode, language, app lock and first-run state.
/// Stored in SharedPreferences (no secrets here — the token is in [SecureStore]).
class PrefsController extends ChangeNotifier {
  PrefsController(this._prefs) {
    _themeMode = ThemeMode.values.firstWhere((m) => m.name == _prefs.getString(_kTheme), orElse: () => ThemeMode.system);
    _language = AppLanguage.values.firstWhere((l) => l.name == _prefs.getString(_kLang), orElse: () => AppLanguage.en);
    currentLanguage = _language;
    _appLock = _prefs.getBool(_kLock) ?? false;
  }

  final SharedPreferences _prefs;
  SharedPreferences get raw => _prefs;

  static const _kTheme = 'swasti_theme_mode';
  static const _kLang = 'swasti_lang';
  static const _kLock = 'swasti_app_lock';
  static const _kLangChosen = 'swasti_lang_chosen';

  late ThemeMode _themeMode;
  late AppLanguage _language;
  late bool _appLock;

  ThemeMode get themeMode => _themeMode;
  AppLanguage get language => _language;
  bool get appLock => _appLock;

  /// True until the customer picks a language on first launch.
  bool get needsLanguageChoice => !(_prefs.getBool(_kLangChosen) ?? false);

  Future<void> setThemeMode(ThemeMode mode) async {
    _themeMode = mode;
    notifyListeners();
    await _prefs.setString(_kTheme, mode.name);
  }

  Future<void> setLanguage(AppLanguage language) async {
    _language = language;
    currentLanguage = language;
    notifyListeners();
    await _prefs.setString(_kLang, language.name);
    await _prefs.setBool(_kLangChosen, true);
  }

  Future<void> setAppLock(bool value) async {
    _appLock = value;
    notifyListeners();
    await _prefs.setBool(_kLock, value);
  }
}
