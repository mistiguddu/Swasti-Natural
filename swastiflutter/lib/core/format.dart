import 'i18n.dart';

/// Currency, number and date formatting (Bangla digits and month names when Bangla is active).
class Fmt {
  Fmt._();

  static String currencySymbol = '৳';

  static String _group(num value, {int decimals = 0}) {
    final fixed = value.toStringAsFixed(decimals);
    final parts = fixed.split('.');
    var whole = parts[0];
    final negative = whole.startsWith('-');
    if (negative) whole = whole.substring(1);
    final buffer = StringBuffer();
    for (var i = 0; i < whole.length; i++) {
      if (i > 0 && (whole.length - i) % 3 == 0) buffer.write(',');
      buffer.write(whole[i]);
    }
    final text = '${negative ? '-' : ''}$buffer${parts.length > 1 ? '.${parts[1]}' : ''}';
    return digits(text);
  }

  /// `৳1,250` — decimals only when the amount has them.
  static String money(num? value) {
    final amount = value ?? 0;
    final hasCents = (amount * 100).round() % 100 != 0;
    return '$currencySymbol${_group(amount, decimals: hasCents ? 2 : 0)}';
  }

  static String number(num? value) => _group(value ?? 0);

  static const _monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  static const _monthsBn = ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'];

  static DateTime? parse(Object? value) => value == null ? null : DateTime.tryParse(value.toString())?.toLocal();

  /// `12 Nov 2026`
  static String date(Object? value) {
    final d = parse(value);
    if (d == null) return '';
    final month = (isBangla ? _monthsBn : _monthsEn)[d.month - 1];
    return digits('${d.day} $month ${d.year}');
  }

  /// `12 Nov 2026, 4:05 PM`
  static String dateTime(Object? value) {
    final d = parse(value);
    if (d == null) return '';
    return '${date(d.toIso8601String())}, ${time(d.toIso8601String())}';
  }

  static String time(Object? value) {
    final d = parse(value);
    if (d == null) return '';
    final hour = d.hour % 12 == 0 ? 12 : d.hour % 12;
    final minute = d.minute.toString().padLeft(2, '0');
    final period = d.hour < 12 ? tr('AM') : tr('PM');
    return digits('$hour:$minute $period');
  }

  /// "just now", "5 min ago", otherwise a date.
  static String relative(Object? value) {
    final d = parse(value);
    if (d == null) return '';
    final diff = DateTime.now().difference(d);
    if (diff.inMinutes < 1) return tr('just now');
    if (diff.inHours < 1) return tr('{n} min ago', {'n': diff.inMinutes});
    if (diff.inDays < 1) return tr('{n} h ago', {'n': diff.inHours});
    if (diff.inDays < 7) return tr('{n} d ago', {'n': diff.inDays});
    return date(value);
  }
}

/// Safe JSON readers.
num asNum(Object? value, [num fallback = 0]) => value is num ? value : num.tryParse('${value ?? ''}') ?? fallback;
int asInt(Object? value, [int fallback = 0]) => asNum(value, fallback).toInt();
double asDouble(Object? value, [double fallback = 0]) => asNum(value, fallback).toDouble();
String asStr(Object? value, [String fallback = '']) => value == null ? fallback : value.toString();
bool asBool(Object? value) => value == true || value == 'true' || value == 1;
List<Map<String, dynamic>> asMapList(Object? value) =>
    value is List ? value.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList() : <Map<String, dynamic>>[];
Map<String, dynamic> asMap(Object? value) => value is Map ? Map<String, dynamic>.from(value) : <String, dynamic>{};
List<String> asStrList(Object? value) => value is List ? value.map((e) => e.toString()).toList() : <String>[];
