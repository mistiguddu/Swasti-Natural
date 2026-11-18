import 'package:material_ui/material_ui.dart';

/// Store colour themes — the same keys as the web storefront (STORE_THEMES). The admin picks
/// one in Settings → Branding and every customer's app follows it.
class StorePalette {
  const StorePalette(this.key, this.label, this.dark, this.main, this.light);
  final String key;
  final String label;
  final Color dark;
  final Color main;
  final Color light;

  static const all = [
    StorePalette('forest', 'Forest Green', Color(0xFF065F46), Color(0xFF10B981), Color(0xFFD1FAE5)),
    StorePalette('lagoon', 'Lagoon Teal', Color(0xFF115E59), Color(0xFF14B8A6), Color(0xFFCCFBF1)),
    StorePalette('ocean', 'Ocean Blue', Color(0xFF1E40AF), Color(0xFF3B82F6), Color(0xFFDBEAFE)),
    StorePalette('royal', 'Royal Indigo', Color(0xFF3730A3), Color(0xFF6366F1), Color(0xFFE0E7FF)),
    StorePalette('plum', 'Plum Violet', Color(0xFF5B21B6), Color(0xFF8B5CF6), Color(0xFFEDE9FE)),
    StorePalette('berry', 'Berry Pink', Color(0xFF9D174D), Color(0xFFEC4899), Color(0xFFFCE7F3)),
    StorePalette('sunset', 'Sunset Orange', Color(0xFF9A3412), Color(0xFFF97316), Color(0xFFFFEDD5)),
    StorePalette('charcoal', 'Charcoal', Color(0xFF1E293B), Color(0xFF64748B), Color(0xFFE2E8F0)),
  ];

  static StorePalette of(String? key) => all.firstWhere((p) => p.key == key, orElse: () => all.first);
}

/// Accent for badges, the active-tab dot and ratings (amber, as on the website).
const kAccent = Color(0xFFFBBF24);
const kStar = Color(0xFFF59E0B);
const kDanger = Color(0xFFDC2626);
const kSuccess = Color(0xFF059669);

class AppTheme {
  AppTheme._();

  static ThemeData build(StorePalette palette, Brightness brightness) {
    final dark = brightness == Brightness.dark;
    final scheme =
        ColorScheme.fromSeed(
          seedColor: palette.main,
          brightness: brightness,
          primary: dark ? palette.main : palette.dark,
          secondary: palette.main,
          surface: dark ? const Color(0xFF0F1A16) : Colors.white,
        ).copyWith(
          primaryContainer: dark ? Color.lerp(palette.dark, Colors.black, 0.35) : palette.light,
          onPrimaryContainer: dark ? palette.light : palette.dark,
          surfaceContainerLowest: dark ? const Color(0xFF0B1410) : const Color(0xFFF6F8F7),
          surfaceContainerLow: dark ? const Color(0xFF14211C) : const Color(0xFFF3F6F5),
          surfaceContainer: dark ? const Color(0xFF182822) : const Color(0xFFEDF2F0),
          outlineVariant: dark ? const Color(0xFF26372F) : const Color(0xFFE3E9E6),
        );

    final radius = BorderRadius.circular(14);
    final base = ThemeData(useMaterial3: true, colorScheme: scheme, brightness: brightness);
    return base.copyWith(
      scaffoldBackgroundColor: scheme.surfaceContainerLowest,
      appBarTheme: AppBarTheme(
        backgroundColor: scheme.surface,
        foregroundColor: scheme.onSurface,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0.5,
        centerTitle: false,
        titleTextStyle: base.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700, color: scheme.onSurface, fontSize: 19),
      ),
      cardTheme: CardThemeData(
        color: scheme.surface,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: radius,
          side: BorderSide(color: scheme.outlineVariant),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: dark ? const Color(0xFF14211C) : const Color(0xFFF7F9F8),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: radius,
          borderSide: BorderSide(color: scheme.outlineVariant),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: radius,
          borderSide: BorderSide(color: scheme.outlineVariant),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: radius,
          borderSide: BorderSide(color: scheme.primary, width: 1.6),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: radius,
          borderSide: const BorderSide(color: kDanger),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: radius,
          borderSide: const BorderSide(color: kDanger, width: 1.6),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          minimumSize: const Size(64, 52),
          shape: RoundedRectangleBorder(borderRadius: radius),
          textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15.5),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          minimumSize: const Size(64, 52),
          shape: RoundedRectangleBorder(borderRadius: radius),
          side: BorderSide(color: scheme.outlineVariant),
          textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
        ),
      ),
      chipTheme: base.chipTheme.copyWith(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
        side: BorderSide(color: scheme.outlineVariant),
      ),
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        backgroundColor: dark ? const Color(0xFF243A31) : const Color(0xFF14231D),
        contentTextStyle: const TextStyle(color: Colors.white),
        actionTextColor: kAccent,
      ),
      dividerTheme: DividerThemeData(color: scheme.outlineVariant, space: 1, thickness: 1),
      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: scheme.surface,
        surfaceTintColor: Colors.transparent,
        showDragHandle: true,
        shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      ),
      dialogTheme: DialogThemeData(backgroundColor: scheme.surface, surfaceTintColor: Colors.transparent),
      pageTransitionsTheme: const PageTransitionsTheme(builders: {TargetPlatform.android: FadeForwardsPageTransitionsBuilder()}),
    );
  }
}
