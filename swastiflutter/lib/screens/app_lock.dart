import 'package:local_auth/local_auth.dart';
import 'package:material_ui/material_ui.dart';
import 'package:provider/provider.dart';

import '../core/config.dart';
import '../core/i18n.dart';
import '../state/auth.dart';
import '../state/prefs.dart';

/// Optional app lock (Settings → App lock): when on and the customer is signed in, the app
/// asks for fingerprint / face / device PIN on start and after [AppConfig.lockAfter] in
/// the background. While in the app switcher the content is hidden behind the logo.
class AppLockGate extends StatefulWidget {
  const AppLockGate({super.key, required this.child});
  final Widget child;

  @override
  State<AppLockGate> createState() => _AppLockGateState();
}

class _AppLockGateState extends State<AppLockGate> with WidgetsBindingObserver {
  bool _locked = true;
  bool _hidden = false;
  bool _authenticating = false;
  DateTime? _backgroundAt;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  bool get _enabled => context.read<PrefsController>().appLock && context.read<AuthController>().isSignedIn;

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (!_enabled || _authenticating) return;
    if (state == AppLifecycleState.paused || state == AppLifecycleState.inactive || state == AppLifecycleState.hidden) {
      _backgroundAt ??= DateTime.now();
      if (!_hidden) setState(() => _hidden = true);
    } else if (state == AppLifecycleState.resumed) {
      final away = _backgroundAt == null ? Duration.zero : DateTime.now().difference(_backgroundAt!);
      _backgroundAt = null;
      setState(() {
        _hidden = false;
        if (away >= AppConfig.lockAfter) _locked = true;
      });
    }
  }

  Future<void> unlock() async {
    if (_authenticating) return;
    setState(() => _authenticating = true);
    try {
      final auth = LocalAuthentication();
      final supported = await auth.isDeviceSupported();
      final ok = !supported || await auth.authenticate(localizedReason: tr('Unlock Swasti'));
      if (ok && mounted) setState(() => _locked = false);
    } catch (_) {
      // Lock stays on; the customer can try again or sign out.
    } finally {
      if (mounted) setState(() => _authenticating = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final lockOn = context.select<PrefsController, bool>((p) => p.appLock);
    final status = context.select<AuthController, AuthStatus>((a) => a.status);
    final signedIn = status == AuthStatus.signedIn;
    final showLock = lockOn && signedIn && _locked;
    // Re-arm for the next sign-in, but not while the session is still being restored.
    if (!lockOn || status == AuthStatus.signedOut) _locked = lockOn;

    return Stack(
      children: [
        widget.child,
        if (showLock) _LockScreen(onUnlock: unlock, busy: _authenticating),
        if (!showLock && _hidden && lockOn && signedIn) const _PrivacyCover(),
      ],
    );
  }
}

class _PrivacyCover extends StatelessWidget {
  const _PrivacyCover();

  @override
  Widget build(BuildContext context) {
    return Positioned.fill(
      child: ColoredBox(
        color: Theme.of(context).colorScheme.surface,
        child: Center(child: Image.asset('assets/images/logo-mark.png', width: 96)),
      ),
    );
  }
}

class _LockScreen extends StatefulWidget {
  const _LockScreen({required this.onUnlock, required this.busy});
  final Future<void> Function() onUnlock;
  final bool busy;

  @override
  State<_LockScreen> createState() => _LockScreenState();
}

class _LockScreenState extends State<_LockScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => widget.onUnlock());
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final user = context.watch<AuthController>().user;
    return Positioned.fill(
      child: Material(
        color: theme.colorScheme.surface,
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(28),
            child: Column(
              children: [
                const Spacer(),
                Container(
                  width: 112,
                  height: 112,
                  padding: const EdgeInsets.all(22),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    shape: BoxShape.circle,
                    border: Border.all(color: theme.colorScheme.outlineVariant),
                  ),
                  child: Image.asset('assets/images/logo-mark.png'),
                ),
                const SizedBox(height: 24),
                Text(context.t('Swasti is locked'), style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800)),
                const SizedBox(height: 6),
                if (user != null && user.name.isNotEmpty)
                  Text(context.t('Signed in as {name}', {'name': user.name}), style: TextStyle(color: theme.colorScheme.onSurfaceVariant)),
                const Spacer(),
                FilledButton.icon(
                  style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(54)),
                  onPressed: widget.busy ? null : widget.onUnlock,
                  icon: const Icon(Icons.fingerprint_rounded),
                  label: Text(context.t('Unlock')),
                ),
                const SizedBox(height: 8),
                TextButton(
                  onPressed: () async {
                    await context.read<AuthController>().signOut();
                  },
                  child: Text(context.t('Sign out instead')),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
