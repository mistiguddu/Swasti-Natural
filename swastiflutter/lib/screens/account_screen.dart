import 'package:local_auth/local_auth.dart';
import 'package:material_ui/material_ui.dart';
import 'package:provider/provider.dart';

import '../core/api.dart';
import '../core/format.dart';
import '../core/i18n.dart';
import '../core/theme.dart';
import '../models/models.dart';
import '../state/auth.dart';
import '../state/prefs.dart';
import '../state/store.dart';
import '../state/wishlist.dart';
import '../widgets/address_form.dart';
import '../widgets/common.dart';
import '../widgets/ui.dart';
import 'auth_screens.dart';
import 'chat_screen.dart';
import 'info_screens.dart';
import 'order_screens.dart';
import 'wishlist_screen.dart';

class AccountScreen extends StatefulWidget {
  const AccountScreen({super.key});

  @override
  State<AccountScreen> createState() => _AccountScreenState();
}

class _AccountScreenState extends State<AccountScreen> {
  Map<String, dynamic>? _summary;
  List<Order> _recent = [];
  bool _wasSignedIn = false;

  Future<void> _loadSummary() async {
    try {
      final data = asMap(await Api.instance.get('/store/account/summary'));
      if (!mounted) return;
      setState(() {
        _summary = data;
        _recent = asMapList(data['recentOrders']).map(Order.fromJson).toList();
      });
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    final signedIn = auth.isSignedIn;
    if (signedIn && !_wasSignedIn) WidgetsBinding.instance.addPostFrameCallback((_) => _loadSummary());
    if (!signedIn && _wasSignedIn) {
      _summary = null;
      _recent = [];
    }
    _wasSignedIn = signedIn;
    final bottom = MediaQuery.paddingOf(context).bottom;

    return Scaffold(
      appBar: AppBar(
        title: Text(context.t('Account')),
        actions: [IconButton(tooltip: context.t('Settings'), onPressed: () => context.push(const SettingsScreen()), icon: const Icon(Icons.settings_outlined))],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          if (!signedIn) return;
          await Future.wait([_loadSummary(), auth.refresh().then((_) {}, onError: (_) {})]);
        },
        child: ListView(
          padding: EdgeInsets.fromLTRB(16, 8, 16, bottom + 24),
          children: [
            if (signedIn) _ProfileHeader(user: auth.user, summary: _summary) else const _GuestCard(),
            const SizedBox(height: 16),
            if (signedIn) ...[
              _MenuGroup(
                children: [
                  _MenuItem(icon: Icons.receipt_long_outlined, label: context.t('My orders'), onTap: () => context.push(const OrdersScreen())),
                  _MenuItem(icon: Icons.local_shipping_outlined, label: context.t('Track an order'), onTap: () => context.push(const TrackOrderScreen())),
                  _MenuItem(
                    icon: Icons.favorite_border_rounded,
                    label: context.t('Wishlist'),
                    trailing: context.select<WishlistController, int>((w) => w.count),
                    onTap: () => context.push(const WishlistScreen()),
                  ),
                  _MenuItem(icon: Icons.location_on_outlined, label: context.t('Saved addresses'), onTap: () => context.push(const AddressesScreen())),
                ],
              ),
              if (_recent.isNotEmpty) ...[
                SectionHeader(
                  title: context.t('Recent orders'),
                  padding: const EdgeInsets.fromLTRB(4, 16, 0, 8),
                  onMore: () => context.push(const OrdersScreen()),
                ),
                for (final order in _recent)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: OrderCard(order: order),
                  ),
              ],
              const SizedBox(height: 8),
              _MenuGroup(
                children: [
                  _MenuItem(icon: Icons.person_outline_rounded, label: context.t('Edit profile'), onTap: () => context.push(const ProfileScreen())),
                  _MenuItem(icon: Icons.password_rounded, label: context.t('Change password'), onTap: () => context.push(const ChangePasswordScreen())),
                ],
              ),
              const SizedBox(height: 16),
            ] else ...[
              _MenuGroup(
                children: [
                  _MenuItem(
                    icon: Icons.favorite_border_rounded,
                    label: context.t('Wishlist'),
                    trailing: context.select<WishlistController, int>((w) => w.count),
                    onTap: () => context.push(const WishlistScreen()),
                  ),
                ],
              ),
              const SizedBox(height: 16),
            ],
            _MenuGroup(
              children: [
                _MenuItem(icon: Icons.chat_bubble_outline_rounded, label: context.t('Live chat'), onTap: () => context.push(const ChatScreen())),
                _MenuItem(icon: Icons.call_outlined, label: context.t('Contact us'), onTap: () => context.push(const ContactScreen())),
                _MenuItem(icon: Icons.info_outline_rounded, label: context.t('About us'), onTap: () => context.push(const AboutScreen())),
                _MenuItem(icon: Icons.privacy_tip_outlined, label: context.t('Privacy policy'), onTap: () => context.push(const PrivacyScreen())),
              ],
            ),
            const SizedBox(height: 16),
            _MenuGroup(
              children: [
                _MenuItem(
                  icon: Icons.translate_rounded,
                  label: context.t('Language'),
                  value: context.watch<PrefsController>().language.label,
                  onTap: () => context.push(const SettingsScreen()),
                ),
                _MenuItem(icon: Icons.palette_outlined, label: context.t('Appearance'), onTap: () => context.push(const SettingsScreen())),
              ],
            ),
            if (signedIn) ...[
              const SizedBox(height: 16),
              OutlinedButton.icon(
                style: OutlinedButton.styleFrom(
                  foregroundColor: kDanger,
                  side: BorderSide(color: kDanger.withValues(alpha: 0.4)),
                ),
                onPressed: () async {
                  if (!await confirmDialog(
                    context,
                    title: tr('Sign out?'),
                    message: tr('You can sign in again any time.'),
                    confirm: tr('Sign out'),
                    danger: true,
                  )) {
                    return;
                  }
                  await auth.signOut();
                  if (context.mounted) context.toast(tr('You have signed out.'));
                },
                icon: const Icon(Icons.logout_rounded),
                label: Text(context.t('Sign out')),
              ),
            ],
            const SizedBox(height: 20),
            Center(
              child: Text('Swasti · v1.0.0', style: Theme.of(context).textTheme.labelSmall?.copyWith(color: Theme.of(context).colorScheme.onSurfaceVariant)),
            ),
          ],
        ),
      ),
    );
  }
}

class _ProfileHeader extends StatelessWidget {
  const _ProfileHeader({required this.user, required this.summary});
  final Customer? user;
  final Map<String, dynamic>? summary;

  @override
  Widget build(BuildContext context) {
    final palette = context.watch<StoreController>().palette;
    final s = summary;
    Widget stat(String label, Object? value) => Expanded(
      child: Column(
        children: [
          Text(
            value == null ? '–' : digits(value),
            style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w800),
          ),
          Text(label, style: const TextStyle(color: Colors.white70, fontSize: 11.5)),
        ],
      ),
    );
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        gradient: LinearGradient(colors: [palette.dark, palette.main], begin: Alignment.topLeft, end: Alignment.bottomRight),
      ),
      child: Column(
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 28,
                backgroundColor: Colors.white,
                child: Text(
                  user?.initials ?? '?',
                  style: TextStyle(color: palette.dark, fontWeight: FontWeight.w800, fontSize: 19),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      user?.name ?? '',
                      style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w800),
                      overflow: TextOverflow.ellipsis,
                    ),
                    Text(
                      user?.email ?? '',
                      style: const TextStyle(color: Colors.white70),
                      overflow: TextOverflow.ellipsis,
                    ),
                    if ((user?.phone ?? '').isNotEmpty) Text(user!.phone, style: const TextStyle(color: Colors.white70, fontSize: 12.5)),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.symmetric(vertical: 12),
            decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(14)),
            child: Row(
              children: [
                stat(context.t('Orders'), s?['totalOrders']),
                stat(context.t('Active'), s?['activeOrders']),
                stat(context.t('Delivered'), s?['delivered']),
                stat(context.t('Wishlist'), context.select<WishlistController, int>((w) => w.count)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _GuestCard extends StatelessWidget {
  const _GuestCard();

  @override
  Widget build(BuildContext context) {
    final palette = context.watch<StoreController>().palette;
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        gradient: LinearGradient(colors: [palette.dark, palette.main], begin: Alignment.topLeft, end: Alignment.bottomRight),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 52,
                height: 52,
                padding: const EdgeInsets.all(10),
                decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle),
                child: Image.asset('assets/images/logo-mark.png'),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      context.t('Hello, guest!'),
                      style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w800),
                    ),
                    Text(context.t('Sign in to order, track deliveries and save addresses.'), style: const TextStyle(color: Colors.white70, fontSize: 13)),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: FilledButton(
                  style: FilledButton.styleFrom(backgroundColor: Colors.white, foregroundColor: palette.dark, minimumSize: const Size(0, 46)),
                  onPressed: () => context.push(const LoginScreen()),
                  child: Text(context.t('Sign in')),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: OutlinedButton(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.white,
                    side: const BorderSide(color: Colors.white70),
                    minimumSize: const Size(0, 46),
                  ),
                  onPressed: () => context.push(const RegisterScreen()),
                  child: Text(context.t('Register')),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _MenuGroup extends StatelessWidget {
  const _MenuGroup({required this.children});
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: Column(
        children: [
          for (var i = 0; i < children.length; i++) ...[if (i > 0) const Divider(indent: 56, height: 1), children[i]],
        ],
      ),
    );
  }
}

class _MenuItem extends StatelessWidget {
  const _MenuItem({required this.icon, required this.label, required this.onTap, this.trailing, this.value});
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final int? trailing;
  final String? value;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return ListTile(
      onTap: onTap,
      leading: Container(
        padding: const EdgeInsets.all(7),
        decoration: BoxDecoration(color: scheme.primaryContainer, borderRadius: BorderRadius.circular(10)),
        child: Icon(icon, size: 20, color: scheme.primary),
      ),
      title: Text(label, style: const TextStyle(fontWeight: FontWeight.w600)),
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (value != null) Text(value!, style: TextStyle(color: scheme.onSurfaceVariant)),
          if ((trailing ?? 0) > 0) Pill(digits(trailing!)),
          const SizedBox(width: 4),
          Icon(Icons.chevron_right_rounded, color: scheme.onSurfaceVariant),
        ],
      ),
    );
  }
}

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _form = GlobalKey<FormState>();
  late final _name = TextEditingController(text: context.read<AuthController>().user?.name ?? '');
  late final _phone = TextEditingController(text: context.read<AuthController>().user?.phone ?? '');
  bool _busy = false;

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_form.currentState!.validate()) return;
    setState(() => _busy = true);
    try {
      await context.read<AuthController>().updateProfile(name: _name.text, phone: _phone.text);
      if (!mounted) return;
      context.toast(tr('Profile updated'));
      Navigator.pop(context);
    } catch (error) {
      if (mounted) context.errorToast(error);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthController>().user;
    return Scaffold(
      appBar: AppBar(title: Text(context.t('Edit profile'))),
      body: Form(
        key: _form,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            TextFormField(
              controller: _name,
              textCapitalization: TextCapitalization.words,
              decoration: InputDecoration(labelText: context.t('Full name'), prefixIcon: const Icon(Icons.person_outline_rounded)),
              validator: (v) => (v ?? '').trim().length < 2 ? tr('Enter your name') : null,
            ),
            const SizedBox(height: 14),
            TextFormField(
              controller: _phone,
              keyboardType: TextInputType.phone,
              decoration: InputDecoration(labelText: context.t('Mobile number'), prefixIcon: const Icon(Icons.phone_outlined)),
              validator: (v) => (v ?? '').trim().isEmpty ? null : validatePhone(v),
            ),
            const SizedBox(height: 14),
            TextFormField(
              initialValue: user?.email ?? '',
              enabled: false,
              decoration: InputDecoration(
                labelText: context.t('Email'),
                prefixIcon: const Icon(Icons.mail_outline_rounded),
                helperText: context.t('Contact us to change your email address.'),
              ),
            ),
            if (user?.createdAt != null) ...[
              const SizedBox(height: 14),
              Text(
                context.t('Member since {date}', {'date': Fmt.date(user!.createdAt)}),
                style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant),
              ),
            ],
            const SizedBox(height: 28),
            BusyButton(label: context.t('Save changes'), busy: _busy, onPressed: _save),
          ],
        ),
      ),
    );
  }
}

class ChangePasswordScreen extends StatefulWidget {
  const ChangePasswordScreen({super.key});

  @override
  State<ChangePasswordScreen> createState() => _ChangePasswordScreenState();
}

class _ChangePasswordScreenState extends State<ChangePasswordScreen> {
  final _form = GlobalKey<FormState>();
  final _current = TextEditingController();
  final _next = TextEditingController();
  final _confirm = TextEditingController();
  bool _busy = false;

  @override
  void dispose() {
    for (final c in [_current, _next, _confirm]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _save() async {
    if (!_form.currentState!.validate()) return;
    setState(() => _busy = true);
    try {
      await context.read<AuthController>().changePassword(_current.text, _next.text);
      if (!mounted) return;
      context.toast(tr('Password updated'));
      Navigator.pop(context);
    } catch (error) {
      if (mounted) context.errorToast(error);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(context.t('Change password'))),
      body: Form(
        key: _form,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            PasswordField(
              controller: _current,
              label: context.t('Current password'),
              validator: (v) => (v ?? '').isEmpty ? tr('Enter your current password') : null,
            ),
            const SizedBox(height: 14),
            PasswordField(
              controller: _next,
              label: context.t('New password'),
              onChanged: (_) => setState(() {}),
              validator: (v) => PasswordRules.validate(v) ?? (v == _current.text ? tr('Choose a password different from the current one') : null),
            ),
            PasswordStrengthBar(password: _next.text),
            const SizedBox(height: 14),
            PasswordField(
              controller: _confirm,
              label: context.t('Confirm new password'),
              validator: (v) => v != _next.text ? tr('Passwords don’t match') : null,
            ),
            const SizedBox(height: 28),
            BusyButton(label: context.t('Update password'), busy: _busy, onPressed: _save),
          ],
        ),
      ),
    );
  }
}

class AddressesScreen extends StatefulWidget {
  const AddressesScreen({super.key});

  @override
  State<AddressesScreen> createState() => _AddressesScreenState();
}

class _AddressesScreenState extends State<AddressesScreen> {
  List<Address>? _items;
  ApiException? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final list = asMapList(await Api.instance.get('/store/account/addresses')).map(Address.fromJson).toList();
      if (mounted) setState(() => _items = list);
    } on ApiException catch (error) {
      if (mounted) setState(() => _error = error);
    }
  }

  Future<void> _edit([Address? address]) async {
    final list = await context.push<List<Address>>(AddressFormScreen(address: address));
    if (list != null && mounted) setState(() => _items = list);
  }

  Future<void> _setDefault(Address a) async {
    try {
      final list = asMapList(await Api.instance.put('/store/account/addresses/${a.id}', {...a.toJson(), 'isDefault': true})).map(Address.fromJson).toList();
      if (mounted) setState(() => _items = list);
    } catch (error) {
      if (mounted) context.errorToast(error);
    }
  }

  Future<void> _delete(Address a) async {
    if (!await confirmDialog(context, title: tr('Delete this address?'), message: a.oneLine, confirm: tr('Delete'), danger: true)) return;
    try {
      final list = asMapList(await Api.instance.delete('/store/account/addresses/${a.id}')).map(Address.fromJson).toList();
      if (mounted) setState(() => _items = list);
    } catch (error) {
      if (mounted) context.errorToast(error);
    }
  }

  @override
  Widget build(BuildContext context) {
    final items = _items;
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(context.t('Saved addresses'))),
      floatingActionButton: (items?.length ?? 0) < 10
          ? FloatingActionButton.extended(onPressed: () => _edit(), icon: const Icon(Icons.add_location_alt_outlined), label: Text(context.t('Add address')))
          : null,
      body: items == null
          ? (_error != null ? ErrorView(message: _error!.message, onRetry: _load) : const Center(child: CircularProgressIndicator()))
          : items.isEmpty
          ? EmptyState(icon: Icons.location_off_outlined, title: context.t('No saved addresses'), message: context.t('Add an address to check out faster.'))
          : ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 100),
              itemCount: items.length,
              separatorBuilder: (_, _) => const SizedBox(height: 10),
              itemBuilder: (context, i) {
                final a = items[i];
                return Panel(
                  padding: const EdgeInsets.fromLTRB(16, 12, 4, 12),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(a.label == 'Office' ? Icons.work_outline_rounded : Icons.home_outlined, color: theme.colorScheme.primary),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Text(context.t(a.label), style: const TextStyle(fontWeight: FontWeight.w800)),
                                if (a.isDefault) ...[const SizedBox(width: 6), Pill(context.t('Default'))],
                              ],
                            ),
                            const SizedBox(height: 2),
                            Text('${a.name} · ${a.phone}'),
                            Text(a.oneLine, style: TextStyle(color: theme.colorScheme.onSurfaceVariant)),
                          ],
                        ),
                      ),
                      PopupMenuButton<String>(
                        onSelected: (v) => switch (v) {
                          'edit' => _edit(a),
                          'default' => _setDefault(a),
                          _ => _delete(a),
                        },
                        itemBuilder: (ctx) => [
                          PopupMenuItem(value: 'edit', child: Text(ctx.t('Edit'))),
                          if (!a.isDefault) PopupMenuItem(value: 'default', child: Text(ctx.t('Set as default'))),
                          PopupMenuItem(
                            value: 'delete',
                            child: Text(ctx.t('Delete'), style: const TextStyle(color: kDanger)),
                          ),
                        ],
                      ),
                    ],
                  ),
                );
              },
            ),
    );
  }
}

class AddressFormScreen extends StatefulWidget {
  const AddressFormScreen({super.key, this.address});
  final Address? address;

  @override
  State<AddressFormScreen> createState() => _AddressFormScreenState();
}

class _AddressFormScreenState extends State<AddressFormScreen> {
  final _form = GlobalKey<FormState>();
  late final _c = AddressFormController(widget.address);
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    if (widget.address == null) {
      final user = context.read<AuthController>().user;
      _c.name.text = user?.name ?? '';
      _c.phone.text = user?.phone ?? '';
    }
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_form.currentState!.validate()) return;
    setState(() => _busy = true);
    try {
      final body = _c.toAddress().toJson();
      final id = widget.address?.id;
      final data = id == null ? await Api.instance.post('/store/account/addresses', body) : await Api.instance.put('/store/account/addresses/$id', body);
      if (!mounted) return;
      context.toast(tr('Address saved'));
      Navigator.pop(context, asMapList(data).map(Address.fromJson).toList());
    } catch (error) {
      if (mounted) context.errorToast(error);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.address == null ? context.t('Add address') : context.t('Edit address'))),
      body: Form(
        key: _form,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            AddressFields(controller: _c),
            StatefulBuilder(
              builder: (context, setLocal) => SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: Text(context.t('Use as my default address')),
                value: _c.isDefault,
                onChanged: (v) => setLocal(() => _c.isDefault = v),
              ),
            ),
            const SizedBox(height: 16),
            BusyButton(label: context.t('Save address'), busy: _busy, onPressed: _save),
          ],
        ),
      ),
    );
  }
}

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  Future<void> _toggleLock(BuildContext context, bool value) async {
    final prefs = context.read<PrefsController>();
    if (!value) {
      await prefs.setAppLock(false);
      return;
    }
    final auth = LocalAuthentication();
    try {
      if (!await auth.isDeviceSupported()) {
        if (context.mounted) context.toast(tr('Set up a screen lock or fingerprint on your phone first.'), error: true);
        return;
      }
      final ok = await auth.authenticate(localizedReason: tr('Confirm it’s you to turn on app lock'));
      if (ok) {
        await prefs.setAppLock(true);
        if (context.mounted) context.toast(tr('App lock is on'));
      }
    } catch (_) {
      if (context.mounted) context.toast(tr('Couldn’t turn on app lock on this device.'), error: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final prefs = context.watch<PrefsController>();
    final signedIn = context.select<AuthController, bool>((a) => a.isSignedIn);
    final theme = Theme.of(context);

    Widget heading(String text) => Padding(
      padding: const EdgeInsets.fromLTRB(4, 20, 4, 8),
      child: Text(
        text.toUpperCase(),
        style: theme.textTheme.labelSmall?.copyWith(color: theme.colorScheme.primary, fontWeight: FontWeight.w800, letterSpacing: 1.1),
      ),
    );

    return Scaffold(
      appBar: AppBar(title: Text(context.t('Settings'))),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
        children: [
          heading(context.t('Language')),
          Card(
            child: RadioGroup<AppLanguage>(
              groupValue: prefs.language,
              onChanged: (v) => v == null ? null : prefs.setLanguage(v),
              child: Column(
                children: [
                  for (final lang in AppLanguage.values)
                    RadioListTile<AppLanguage>(value: lang, title: Text(lang.label), subtitle: Text(lang == AppLanguage.bn ? 'Bangla' : 'ইংরেজি')),
                ],
              ),
            ),
          ),
          heading(context.t('Appearance')),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: SegmentedButton<ThemeMode>(
                showSelectedIcon: false,
                segments: [
                  ButtonSegment(value: ThemeMode.light, icon: const Icon(Icons.light_mode_outlined), label: Text(context.t('Light'))),
                  ButtonSegment(value: ThemeMode.dark, icon: const Icon(Icons.dark_mode_outlined), label: Text(context.t('Dark'))),
                  ButtonSegment(value: ThemeMode.system, icon: const Icon(Icons.brightness_auto_outlined), label: Text(context.t('System'))),
                ],
                selected: {prefs.themeMode},
                onSelectionChanged: (s) => prefs.setThemeMode(s.first),
              ),
            ),
          ),
          heading(context.t('Security')),
          Card(
            child: Column(
              children: [
                SwitchListTile(
                  secondary: const Icon(Icons.fingerprint_rounded),
                  title: Text(context.t('App lock')),
                  subtitle: Text(signedIn ? context.t('Ask for fingerprint, face or PIN when opening the app.') : context.t('Sign in to use app lock.')),
                  value: prefs.appLock,
                  onChanged: signedIn ? (v) => _toggleLock(context, v) : null,
                ),
                const Divider(indent: 56, height: 1),
                ListTile(
                  leading: const Icon(Icons.shield_outlined),
                  title: Text(context.t('Secure sign-in')),
                  subtitle: Text(context.t('Your session is encrypted on this device and ends automatically when it expires.')),
                ),
              ],
            ),
          ),
          heading(context.t('About')),
          Card(
            child: Column(
              children: [
                ListTile(leading: const Icon(Icons.info_outline_rounded), title: Text(context.t('About us')), onTap: () => context.push(const AboutScreen())),
                const Divider(indent: 56, height: 1),
                ListTile(
                  leading: const Icon(Icons.privacy_tip_outlined),
                  title: Text(context.t('Privacy policy')),
                  onTap: () => context.push(const PrivacyScreen()),
                ),
                const Divider(indent: 56, height: 1),
                ListTile(leading: const Icon(Icons.new_releases_outlined), title: Text(context.t('Version')), trailing: Text(digits('1.0.0'))),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
