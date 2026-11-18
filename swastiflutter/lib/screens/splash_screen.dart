import 'dart:async';

import 'package:material_ui/material_ui.dart';
import 'package:provider/provider.dart';

import '../core/i18n.dart';
import '../state/auth.dart';
import '../state/prefs.dart';
import '../state/store.dart';
import 'main_shell.dart';

/// Animated splash: continues from the native launch screen (same white background and
/// logo mark), then reveals the brand name while the store data and session load.
class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> with TickerProviderStateMixin {
  late final AnimationController _intro = AnimationController(vsync: this, duration: const Duration(milliseconds: 1400))..forward();
  late final AnimationController _pulse = AnimationController(vsync: this, duration: const Duration(milliseconds: 1600))..repeat(reverse: true);

  late final Animation<double> _logoScale = Tween(begin: 0.72, end: 1.0).animate(
    CurvedAnimation(
      parent: _intro,
      curve: const Interval(0, 0.55, curve: Curves.easeOutBack),
    ),
  );
  late final Animation<double> _ring = CurvedAnimation(
    parent: _intro,
    curve: const Interval(0.1, 0.7, curve: Curves.easeOutCubic),
  );
  late final Animation<double> _title = CurvedAnimation(
    parent: _intro,
    curve: const Interval(0.4, 0.85, curve: Curves.easeOut),
  );
  late final Animation<double> _footer = CurvedAnimation(
    parent: _intro,
    curve: const Interval(0.7, 1, curve: Curves.easeOut),
  );

  @override
  void initState() {
    super.initState();
    _start();
  }

  Future<void> _start() async {
    final store = context.read<StoreController>();
    final auth = context.read<AuthController>();
    await Future.wait([
      store.load().timeout(const Duration(seconds: 8), onTimeout: () {}),
      auth.restore().timeout(const Duration(seconds: 10), onTimeout: () {}),
      Future<void>.delayed(const Duration(milliseconds: 2000)),
    ]);
    if (!mounted) return;
    // If the session is still restoring (slow network) it finishes in the background.
    final prefs = context.read<PrefsController>();
    final next = prefs.needsLanguageChoice ? const LanguageWelcomeScreen() : const MainShell();
    unawaited(
      Navigator.of(context).pushReplacement(
        PageRouteBuilder(
          transitionDuration: const Duration(milliseconds: 500),
          pageBuilder: (_, _, _) => next,
          transitionsBuilder: (_, animation, _, child) => FadeTransition(opacity: animation, child: child),
        ),
      ),
    );
  }

  @override
  void dispose() {
    _intro.dispose();
    _pulse.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final palette = context.watch<StoreController>().palette;
    final dark = Theme.of(context).brightness == Brightness.dark;
    final background = dark ? const Color(0xFF0B1F17) : Colors.white;

    return Scaffold(
      backgroundColor: background,
      body: Stack(
        children: [
          // Soft brand glow behind the logo.
          Positioned.fill(
            child: AnimatedBuilder(
              animation: _ring,
              builder: (_, _) => DecoratedBox(
                decoration: BoxDecoration(
                  gradient: RadialGradient(
                    radius: 0.9,
                    colors: [
                      palette.light.withValues(alpha: dark ? 0.10 * _ring.value : 0.9 * _ring.value),
                      background,
                    ],
                  ),
                ),
              ),
            ),
          ),
          Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                AnimatedBuilder(
                  animation: Listenable.merge([_intro, _pulse]),
                  builder: (_, _) {
                    final glow = 0.25 + 0.15 * _pulse.value;
                    return Transform.scale(
                      scale: _logoScale.value,
                      child: Container(
                        width: 148,
                        height: 148,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          shape: BoxShape.circle,
                          border: Border.all(color: palette.main.withValues(alpha: 0.35 * _ring.value), width: 2),
                          boxShadow: [BoxShadow(color: palette.main.withValues(alpha: glow * _ring.value), blurRadius: 40, spreadRadius: 4)],
                        ),
                        padding: const EdgeInsets.all(30),
                        child: Image.asset('assets/images/logo-mark.png'),
                      ),
                    );
                  },
                ),
                const SizedBox(height: 28),
                FadeTransition(
                  opacity: _title,
                  child: SlideTransition(
                    position: Tween(begin: const Offset(0, 0.4), end: Offset.zero).animate(_title),
                    child: Column(
                      children: [
                        Text(
                          'Swasti',
                          style: TextStyle(fontSize: 38, fontWeight: FontWeight.w800, letterSpacing: 1.5, color: dark ? Colors.white : palette.dark),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          context.t('NATURAL WELLNESS'),
                          style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, letterSpacing: 4, color: palette.main),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
          Positioned(
            left: 0,
            right: 0,
            bottom: 48 + MediaQuery.paddingOf(context).bottom,
            child: FadeTransition(
              opacity: _footer,
              child: Column(
                children: [
                  SizedBox(
                    width: 120,
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(99),
                      child: LinearProgressIndicator(
                        minHeight: 3,
                        color: palette.main,
                        backgroundColor: palette.light.withValues(alpha: dark ? 0.15 : 1),
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),
                  Text(context.t('Pure care, naturally'), style: TextStyle(fontSize: 12.5, color: dark ? Colors.white60 : Colors.black45, letterSpacing: 0.3)),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// First launch: pick a language (can be changed later in Settings).
class LanguageWelcomeScreen extends StatelessWidget {
  const LanguageWelcomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final prefs = context.watch<PrefsController>();

    Widget option(AppLanguage lang, String subtitle) {
      final selected = prefs.language == lang;
      return Card(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: selected ? theme.colorScheme.primary : theme.colorScheme.outlineVariant, width: selected ? 2 : 1),
        ),
        child: ListTile(
          contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 8),
          onTap: () => prefs.setLanguage(lang),
          leading: CircleAvatar(
            backgroundColor: theme.colorScheme.primaryContainer,
            child: Text(
              lang.short,
              style: TextStyle(color: theme.colorScheme.primary, fontWeight: FontWeight.w800, fontSize: 13),
            ),
          ),
          title: Text(lang.label, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 17)),
          subtitle: Text(subtitle),
          trailing: Icon(selected ? Icons.radio_button_checked_rounded : Icons.radio_button_off_rounded, color: selected ? theme.colorScheme.primary : null),
        ),
      );
    }

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Spacer(),
              Center(child: Image.asset('assets/images/logo.png', height: 150)),
              const SizedBox(height: 28),
              Text(
                context.t('Welcome to Swasti'),
                textAlign: TextAlign.center,
                style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 8),
              Text(
                context.t('Choose your language'),
                textAlign: TextAlign.center,
                style: theme.textTheme.bodyLarge?.copyWith(color: theme.colorScheme.onSurfaceVariant),
              ),
              const SizedBox(height: 28),
              option(AppLanguage.bn, 'Bangla'),
              const SizedBox(height: 12),
              option(AppLanguage.en, 'ইংরেজি'),
              const Spacer(flex: 2),
              FilledButton(
                onPressed: () async {
                  await prefs.setLanguage(prefs.language);
                  if (!context.mounted) return;
                  await Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => const MainShell()));
                },
                child: Text(context.t('Continue')),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
