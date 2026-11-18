import 'package:flutter_test/flutter_test.dart';
import 'package:swastiflutter/core/format.dart';
import 'package:swastiflutter/core/i18n.dart';
import 'package:swastiflutter/core/secure_store.dart';

void main() {
  test('money formatting groups thousands', () {
    currentLanguage = AppLanguage.en;
    Fmt.currencySymbol = '৳';
    expect(Fmt.money(1250), '৳1,250');
    expect(Fmt.money(99.5), '৳99.50');
  });

  test('Bangla digits', () {
    currentLanguage = AppLanguage.bn;
    expect(digits(2026), '২০২৬');
    currentLanguage = AppLanguage.en;
  });

  test('malformed tokens count as expired', () {
    expect(SecureStore.isExpired('not-a-jwt'), isTrue);
  });
}
