import 'package:material_ui/material_ui.dart';

import 'strings_bn.dart';

/// Lightweight i18n, same approach as the web client: the English text is the key and
/// Bangla comes from [bnStrings]; anything untranslated falls back to English.
///
/// In `build` methods use `context.t('Text')` so the widget rebuilds when the language
/// changes. In callbacks (snack bars, dialogs) the plain [tr] function is fine.
enum AppLanguage {
  en('English', 'EN'),
  bn('বাংলা', 'বাং');

  const AppLanguage(this.label, this.short);
  final String label;
  final String short;
}

AppLanguage _current = AppLanguage.en;
AppLanguage get currentLanguage => _current;
set currentLanguage(AppLanguage value) => _current = value;

bool get isBangla => _current == AppLanguage.bn;

const _bnDigits = '০১২৩৪৫৬৭৮৯';

/// Converts 0-9 to Bangla digits when Bangla is active.
String digits(Object value) {
  final text = value.toString();
  if (!isBangla) return text;
  return text.replaceAllMapped(RegExp(r'\d'), (m) => _bnDigits[int.parse(m[0]!)]);
}

/// Translate, with optional `{name}` variables: `tr('{count} items', {'count': 3})`.
String tr(String text, [Map<String, Object?>? vars]) {
  var result = isBangla ? (bnStrings[text] ?? text) : text;
  if (vars != null) {
    vars.forEach((key, value) {
      result = result.replaceAll('{$key}', value is num ? digits(value) : '${value ?? ''}');
    });
  }
  return result;
}

/// Rebuilds dependants when the language changes.
class LanguageScope extends InheritedWidget {
  const LanguageScope({super.key, required this.language, required super.child});
  final AppLanguage language;

  @override
  bool updateShouldNotify(LanguageScope oldWidget) => oldWidget.language != language;
}

extension Translate on BuildContext {
  String t(String text, [Map<String, Object?>? vars]) {
    dependOnInheritedWidgetOfExactType<LanguageScope>();
    return tr(text, vars);
  }
}
