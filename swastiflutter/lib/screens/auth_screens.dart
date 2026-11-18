import 'dart:async';

import 'package:flutter/services.dart';
import 'package:material_ui/material_ui.dart';
import 'package:provider/provider.dart';

import '../core/api.dart';
import '../core/format.dart';
import '../core/i18n.dart';
import '../core/theme.dart';
import '../state/auth.dart';
import '../widgets/address_form.dart';
import '../widgets/ui.dart';

/// Branded header used on every auth screen.
class _AuthHeader extends StatelessWidget {
  const _AuthHeader({required this.title, required this.subtitle});
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      children: [
        const SizedBox(height: 8),
        Container(
          width: 84,
          height: 84,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            shape: BoxShape.circle,
            border: Border.all(color: theme.colorScheme.outlineVariant),
            boxShadow: [BoxShadow(color: theme.colorScheme.primary.withValues(alpha: 0.15), blurRadius: 24, offset: const Offset(0, 8))],
          ),
          child: Image.asset('assets/images/logo-mark.png'),
        ),
        const SizedBox(height: 18),
        Text(
          title,
          textAlign: TextAlign.center,
          style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 6),
        Text(
          subtitle,
          textAlign: TextAlign.center,
          style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant),
        ),
        const SizedBox(height: 28),
      ],
    );
  }
}

class _ErrorBox extends StatelessWidget {
  const _ErrorBox(this.message);
  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: kDanger.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: kDanger.withValues(alpha: 0.3)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.error_outline_rounded, color: kDanger, size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              message,
              style: const TextStyle(color: kDanger, fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );
  }
}

class PasswordField extends StatefulWidget {
  const PasswordField({
    super.key,
    required this.controller,
    required this.label,
    this.validator,
    this.textInputAction,
    this.onSubmitted,
    this.autofillHints,
    this.onChanged,
  });
  final TextEditingController controller;
  final String label;
  final FormFieldValidator<String>? validator;
  final TextInputAction? textInputAction;
  final ValueChanged<String>? onSubmitted;
  final ValueChanged<String>? onChanged;
  final Iterable<String>? autofillHints;

  @override
  State<PasswordField> createState() => _PasswordFieldState();
}

class _PasswordFieldState extends State<PasswordField> {
  bool _visible = false;

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      controller: widget.controller,
      obscureText: !_visible,
      enableSuggestions: false,
      autocorrect: false,
      autofillHints: widget.autofillHints,
      textInputAction: widget.textInputAction,
      onFieldSubmitted: widget.onSubmitted,
      onChanged: widget.onChanged,
      validator: widget.validator,
      inputFormatters: [LengthLimitingTextInputFormatter(128)],
      decoration: InputDecoration(
        labelText: widget.label,
        prefixIcon: const Icon(Icons.lock_outline_rounded),
        suffixIcon: IconButton(
          tooltip: _visible ? context.t('Hide password') : context.t('Show password'),
          icon: Icon(_visible ? Icons.visibility_off_outlined : Icons.visibility_outlined),
          onPressed: () => setState(() => _visible = !_visible),
        ),
      ),
    );
  }
}

class PasswordStrengthBar extends StatelessWidget {
  const PasswordStrengthBar({super.key, required this.password});
  final String password;

  @override
  Widget build(BuildContext context) {
    if (password.isEmpty) return const SizedBox(height: 4);
    final score = PasswordRules.strength(password);
    const colors = [kDanger, kDanger, Color(0xFFF59E0B), Color(0xFF65A30D), kSuccess];
    const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: Row(
        children: [
          for (var i = 1; i <= 4; i++)
            Expanded(
              child: Container(
                height: 4,
                margin: const EdgeInsets.only(right: 4),
                decoration: BoxDecoration(
                  color: i <= score ? colors[score] : Theme.of(context).colorScheme.outlineVariant,
                  borderRadius: BorderRadius.circular(99),
                ),
              ),
            ),
          const SizedBox(width: 6),
          Text(
            context.t(labels[score]),
            style: TextStyle(fontSize: 12, color: colors[score], fontWeight: FontWeight.w700),
          ),
        ],
      ),
    );
  }
}

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key, this.returnAfter = false});

  /// Pop with `true` after signing in (used when sign-in was required for an action).
  final bool returnAfter;

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _form = GlobalKey<FormState>();
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _busy = false;
  String? _error;
  Timer? _lockTimer;

  @override
  void dispose() {
    _lockTimer?.cancel();
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  void _watchLock() {
    _lockTimer?.cancel();
    _lockTimer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted) return t.cancel();
      final left = context.read<AuthController>().lockSecondsLeft;
      setState(() {});
      if (left <= 0) t.cancel();
    });
  }

  Future<void> _submit() async {
    if (!_form.currentState!.validate()) return;
    FocusScope.of(context).unfocus();
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final user = await context.read<AuthController>().signIn(_email.text, _password.text);
      if (!mounted) return;
      TextInput.finishAutofillContext();
      context.toast(tr('Welcome back, {name}!', {'name': user.name.split(' ').first}));
      Navigator.pop(context, true);
    } on ApiException catch (error) {
      if (!mounted) return;
      _password.clear();
      setState(() => _error = error.message);
      if (context.read<AuthController>().lockSecondsLeft > 0) _watchLock();
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final locked = context.read<AuthController>().lockSecondsLeft;
    return Scaffold(
      appBar: AppBar(),
      body: SafeArea(
        child: Form(
          key: _form,
          child: AutofillGroup(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
              children: [
                _AuthHeader(title: context.t('Welcome back'), subtitle: context.t('Sign in to track orders, save addresses and check out faster.')),
                if (_error != null) _ErrorBox(_error!),
                TextFormField(
                  controller: _email,
                  keyboardType: TextInputType.emailAddress,
                  textInputAction: TextInputAction.next,
                  autofillHints: const [AutofillHints.email],
                  autocorrect: false,
                  decoration: InputDecoration(labelText: context.t('Email'), prefixIcon: const Icon(Icons.mail_outline_rounded)),
                  validator: validateEmail,
                ),
                const SizedBox(height: 14),
                PasswordField(
                  controller: _password,
                  label: context.t('Password'),
                  textInputAction: TextInputAction.done,
                  autofillHints: const [AutofillHints.password],
                  onSubmitted: (_) => _submit(),
                  validator: (v) => (v ?? '').isEmpty ? tr('Enter your password') : null,
                ),
                Align(
                  alignment: Alignment.centerRight,
                  child: TextButton(onPressed: () => context.push(const ForgotPasswordScreen()), child: Text(context.t('Forgot password?'))),
                ),
                const SizedBox(height: 8),
                BusyButton(
                  label: locked > 0 ? context.t('Try again in {s}s', {'s': locked}) : context.t('Sign in'),
                  busy: _busy,
                  onPressed: locked > 0 ? null : _submit,
                ),
                const SizedBox(height: 20),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(context.t('New to Swasti?')),
                    TextButton(
                      onPressed: () async {
                        final ok = await Navigator.of(context).push<bool>(MaterialPageRoute(builder: (_) => const RegisterScreen()));
                        if (ok == true && context.mounted) Navigator.pop(context, true);
                      },
                      child: Text(context.t('Create an account')),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                const _SecurityNote(),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _SecurityNote extends StatelessWidget {
  const _SecurityNote();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Icon(Icons.verified_user_outlined, size: 16, color: theme.colorScheme.onSurfaceVariant),
        const SizedBox(width: 6),
        Flexible(
          child: Text(
            context.t('Your sign-in is encrypted and stored securely on this device.'),
            textAlign: TextAlign.center,
            style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
          ),
        ),
      ],
    );
  }
}

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _form = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _phone = TextEditingController();
  final _password = TextEditingController();
  final _confirm = TextEditingController();
  bool _agree = false;
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    for (final c in [_name, _email, _phone, _password, _confirm]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_form.currentState!.validate()) return;
    if (!_agree) {
      setState(() => _error = tr('Please accept the terms and privacy policy.'));
      return;
    }
    FocusScope.of(context).unfocus();
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final user = await context.read<AuthController>().register(name: _name.text, email: _email.text, password: _password.text, phone: _phone.text);
      if (!mounted) return;
      TextInput.finishAutofillContext();
      context.toast(tr('Welcome to Swasti, {name}!', {'name': user.name.split(' ').first}));
      Navigator.pop(context, true);
    } on ApiException catch (error) {
      if (mounted) setState(() => _error = error.status == 409 ? tr('This email is already registered. Try signing in instead.') : error.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(),
      body: SafeArea(
        child: Form(
          key: _form,
          child: AutofillGroup(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
              children: [
                _AuthHeader(title: context.t('Create your account'), subtitle: context.t('It only takes a minute.')),
                if (_error != null) _ErrorBox(_error!),
                TextFormField(
                  controller: _name,
                  textCapitalization: TextCapitalization.words,
                  textInputAction: TextInputAction.next,
                  autofillHints: const [AutofillHints.name],
                  decoration: InputDecoration(labelText: context.t('Full name'), prefixIcon: const Icon(Icons.person_outline_rounded)),
                  validator: (v) => (v ?? '').trim().length < 2 ? tr('Enter your name') : null,
                ),
                const SizedBox(height: 14),
                TextFormField(
                  controller: _email,
                  keyboardType: TextInputType.emailAddress,
                  textInputAction: TextInputAction.next,
                  autofillHints: const [AutofillHints.email],
                  autocorrect: false,
                  decoration: InputDecoration(labelText: context.t('Email'), prefixIcon: const Icon(Icons.mail_outline_rounded)),
                  validator: validateEmail,
                ),
                const SizedBox(height: 14),
                TextFormField(
                  controller: _phone,
                  keyboardType: TextInputType.phone,
                  textInputAction: TextInputAction.next,
                  autofillHints: const [AutofillHints.telephoneNumber],
                  inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9+\s-]')), LengthLimitingTextInputFormatter(20)],
                  decoration: InputDecoration(
                    labelText: context.t('Mobile number (optional)'),
                    hintText: '01XXXXXXXXX',
                    prefixIcon: const Icon(Icons.phone_outlined),
                  ),
                  validator: (v) => (v ?? '').trim().isEmpty ? null : validatePhone(v),
                ),
                const SizedBox(height: 14),
                PasswordField(
                  controller: _password,
                  label: context.t('Password'),
                  textInputAction: TextInputAction.next,
                  autofillHints: const [AutofillHints.newPassword],
                  onChanged: (_) => setState(() {}),
                  validator: PasswordRules.validate,
                ),
                PasswordStrengthBar(password: _password.text),
                const SizedBox(height: 14),
                PasswordField(
                  controller: _confirm,
                  label: context.t('Confirm password'),
                  textInputAction: TextInputAction.done,
                  onSubmitted: (_) => _submit(),
                  validator: (v) => v != _password.text ? tr('Passwords don’t match') : null,
                ),
                const SizedBox(height: 8),
                CheckboxListTile(
                  contentPadding: EdgeInsets.zero,
                  controlAffinity: ListTileControlAffinity.leading,
                  value: _agree,
                  onChanged: (v) => setState(() => _agree = v ?? false),
                  title: Text(context.t('I agree to the terms of service and privacy policy.'), style: const TextStyle(fontSize: 13.5)),
                ),
                const SizedBox(height: 8),
                BusyButton(label: context.t('Create account'), busy: _busy, onPressed: _submit),
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(context.t('Already have an account?')),
                    TextButton(onPressed: () => Navigator.pop(context), child: Text(context.t('Sign in'))),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _form = GlobalKey<FormState>();
  final _email = TextEditingController();
  bool _busy = false;
  bool _sent = false;
  String? _devLink;
  String? _error;

  @override
  void dispose() {
    _email.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_form.currentState!.validate()) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final data = asMap(await Api.instance.post('/auth/forgot-password', {'email': _email.text.trim().toLowerCase()}));
      if (!mounted) return;
      setState(() {
        _sent = true;
        _devLink = data['devResetUrl']?.toString();
      });
    } on ApiException catch (error) {
      if (mounted) setState(() => _error = error.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(),
      body: SafeArea(
        child: Form(
          key: _form,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
            children: [
              _AuthHeader(title: context.t('Forgot your password?'), subtitle: context.t('Enter your email and we’ll send you a link to reset it.')),
              if (_error != null) _ErrorBox(_error!),
              if (_sent) ...[
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(color: kSuccess.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12)),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(Icons.mark_email_read_outlined, color: kSuccess),
                      const SizedBox(width: 10),
                      Expanded(child: Text(context.t('If an account exists for that email, a reset link has been sent. It is valid for 30 minutes.'))),
                    ],
                  ),
                ),
                if (_devLink != null) ...[
                  const SizedBox(height: 12),
                  SelectableText(context.t('Development reset link: {link}', {'link': _devLink}), style: theme.textTheme.bodySmall),
                ],
                const SizedBox(height: 20),
                FilledButton(
                  onPressed: () => Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => ResetPasswordScreen(initialLink: _devLink))),
                  child: Text(context.t('I have the reset link')),
                ),
              ] else ...[
                TextFormField(
                  controller: _email,
                  keyboardType: TextInputType.emailAddress,
                  autocorrect: false,
                  textInputAction: TextInputAction.done,
                  onFieldSubmitted: (_) => _submit(),
                  decoration: InputDecoration(labelText: context.t('Email'), prefixIcon: const Icon(Icons.mail_outline_rounded)),
                  validator: validateEmail,
                ),
                const SizedBox(height: 20),
                BusyButton(label: context.t('Send reset link'), busy: _busy, onPressed: _submit),
                TextButton(
                  onPressed: () => Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => const ResetPasswordScreen())),
                  child: Text(context.t('I already have a reset link')),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

/// Set a new password with the link from the reset email (paste the whole link or just the code).
class ResetPasswordScreen extends StatefulWidget {
  const ResetPasswordScreen({super.key, this.initialLink});
  final String? initialLink;

  @override
  State<ResetPasswordScreen> createState() => _ResetPasswordScreenState();
}

class _ResetPasswordScreenState extends State<ResetPasswordScreen> {
  final _form = GlobalKey<FormState>();
  late final _link = TextEditingController(text: widget.initialLink ?? '');
  final _password = TextEditingController();
  final _confirm = TextEditingController();
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    for (final c in [_link, _password, _confirm]) {
      c.dispose();
    }
    super.dispose();
  }

  static String? tokenFrom(String value) => RegExp(r'[a-f0-9]{64}').firstMatch(value.trim().toLowerCase())?.group(0);

  Future<void> _submit() async {
    if (!_form.currentState!.validate()) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await Api.instance.post('/auth/reset-password', {'token': tokenFrom(_link.text), 'password': _password.text});
      if (!mounted) return;
      context.toast(tr('Password updated. You can now sign in.'));
      Navigator.pop(context);
    } on ApiException catch (error) {
      if (mounted) setState(() => _error = error.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(),
      body: SafeArea(
        child: Form(
          key: _form,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
            children: [
              _AuthHeader(title: context.t('Set a new password'), subtitle: context.t('Paste the reset link from your email, then choose a new password.')),
              if (_error != null) _ErrorBox(_error!),
              TextFormField(
                controller: _link,
                minLines: 1,
                maxLines: 3,
                autocorrect: false,
                decoration: InputDecoration(
                  labelText: context.t('Reset link or code'),
                  prefixIcon: const Icon(Icons.link_rounded),
                  suffixIcon: IconButton(
                    tooltip: context.t('Paste'),
                    icon: const Icon(Icons.content_paste_rounded),
                    onPressed: () async {
                      final data = await Clipboard.getData(Clipboard.kTextPlain);
                      if (data?.text != null) _link.text = data!.text!;
                    },
                  ),
                ),
                validator: (v) => tokenFrom(v ?? '') == null ? tr('This reset link is not valid') : null,
              ),
              const SizedBox(height: 14),
              PasswordField(controller: _password, label: context.t('New password'), onChanged: (_) => setState(() {}), validator: PasswordRules.validate),
              PasswordStrengthBar(password: _password.text),
              const SizedBox(height: 14),
              PasswordField(
                controller: _confirm,
                label: context.t('Confirm new password'),
                validator: (v) => v != _password.text ? tr('Passwords don’t match') : null,
              ),
              const SizedBox(height: 24),
              BusyButton(label: context.t('Update password'), busy: _busy, onPressed: _submit),
            ],
          ),
        ),
      ),
    );
  }
}
