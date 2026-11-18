import 'package:material_ui/material_ui.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../core/api.dart';
import '../core/i18n.dart';
import '../state/auth.dart';
import '../state/store.dart';
import '../widgets/address_form.dart';
import '../widgets/common.dart';
import '../widgets/ui.dart';
import 'chat_screen.dart';

Future<void> _open(BuildContext context, Uri uri) async {
  try {
    if (!await launchUrl(uri, mode: LaunchMode.externalApplication) && context.mounted) {
      context.toast(tr('Couldn’t open this link.'), error: true);
    }
  } catch (_) {
    if (context.mounted) context.toast(tr('Couldn’t open this link.'), error: true);
  }
}

class AboutScreen extends StatelessWidget {
  const AboutScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final store = context.watch<StoreController>();
    final theme = Theme.of(context);
    final values = [
      (Icons.eco_outlined, context.t('Natural ingredients'), context.t('We choose products made with care and gentle, natural ingredients.')),
      (Icons.verified_outlined, context.t('Honest and genuine'), context.t('Every product is genuine and described truthfully.')),
      (Icons.local_shipping_outlined, context.t('Delivered to your door'), context.t('Delivery across Bangladesh with cash on delivery.')),
      (Icons.support_agent_outlined, context.t('Here to help'), context.t('Questions before or after you order? Our team is a message away.')),
    ];
    return Scaffold(
      appBar: AppBar(title: Text(context.t('About us'))),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Center(child: Image.asset('assets/images/logo.png', height: 160)),
          const SizedBox(height: 20),
          Text(
            store.info.storeName,
            textAlign: TextAlign.center,
            style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 6),
          Text(
            store.info.tagline.isNotEmpty ? store.info.tagline : context.t('Natural care, delivered with honesty'),
            textAlign: TextAlign.center,
            style: theme.textTheme.bodyLarge?.copyWith(color: theme.colorScheme.onSurfaceVariant),
          ),
          const SizedBox(height: 24),
          for (final (icon, title, text) in values)
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Panel(
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(icon, color: theme.colorScheme.primary),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
                          const SizedBox(height: 2),
                          Text(text, style: TextStyle(color: theme.colorScheme.onSurfaceVariant)),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class ContactScreen extends StatefulWidget {
  const ContactScreen({super.key});

  @override
  State<ContactScreen> createState() => _ContactScreenState();
}

class _ContactScreenState extends State<ContactScreen> {
  final _form = GlobalKey<FormState>();
  late final _name = TextEditingController(text: context.read<AuthController>().user?.name ?? '');
  late final _email = TextEditingController(text: context.read<AuthController>().user?.email ?? '');
  late final _phone = TextEditingController(text: context.read<AuthController>().user?.phone ?? '');
  final _subject = TextEditingController();
  final _message = TextEditingController();
  bool _busy = false;
  bool _sent = false;

  @override
  void dispose() {
    for (final c in [_name, _email, _phone, _subject, _message]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _send() async {
    if (!_form.currentState!.validate()) return;
    setState(() => _busy = true);
    try {
      await Api.instance.post('/store/contact', {
        'name': _name.text.trim(),
        'email': _email.text.trim(),
        if (_phone.text.trim().isNotEmpty) 'phone': _phone.text.trim(),
        if (_subject.text.trim().isNotEmpty) 'subject': _subject.text.trim(),
        'message': _message.text.trim(),
      });
      if (mounted) setState(() => _sent = true);
    } catch (error) {
      if (mounted) context.errorToast(error);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final info = context.watch<StoreController>().info;
    final theme = Theme.of(context);
    final whatsapp = info.whatsapp.replaceAll(RegExp(r'[^0-9]'), '');

    Widget channel(IconData icon, String label, String value, Uri uri) => ListTile(
      leading: CircleAvatar(
        backgroundColor: theme.colorScheme.primaryContainer,
        child: Icon(icon, color: theme.colorScheme.primary, size: 20),
      ),
      title: Text(label, style: const TextStyle(fontWeight: FontWeight.w600)),
      subtitle: Text(value),
      trailing: const Icon(Icons.open_in_new_rounded, size: 18),
      onTap: () => _open(context, uri),
    );

    return Scaffold(
      appBar: AppBar(title: Text(context.t('Contact us'))),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: Column(
              children: [
                ListTile(
                  leading: CircleAvatar(
                    backgroundColor: theme.colorScheme.primary,
                    child: Icon(Icons.chat_rounded, color: theme.colorScheme.onPrimary, size: 20),
                  ),
                  title: Text(context.t('Live chat'), style: const TextStyle(fontWeight: FontWeight.w700)),
                  subtitle: Text(context.t('Message our team live — no account needed.')),
                  trailing: const Icon(Icons.chevron_right_rounded),
                  onTap: () => context.push(const ChatScreen()),
                ),
                if (info.phone.isNotEmpty) channel(Icons.call_outlined, context.t('Call us'), info.phone, Uri(scheme: 'tel', path: info.phone)),
                if (whatsapp.isNotEmpty) channel(Icons.forum_outlined, 'WhatsApp', info.whatsapp, Uri.parse('https://wa.me/$whatsapp')),
                if (info.email.isNotEmpty) channel(Icons.mail_outline_rounded, context.t('Email'), info.email, Uri(scheme: 'mailto', path: info.email)),
                if (info.facebook.isNotEmpty)
                  channel(Icons.facebook_rounded, 'Facebook', info.facebook.replaceFirst(RegExp(r'^https?://(www\.)?'), ''), Uri.parse(info.facebook)),
                if (info.instagram.isNotEmpty)
                  channel(Icons.camera_alt_outlined, 'Instagram', info.instagram.replaceFirst(RegExp(r'^https?://(www\.)?'), ''), Uri.parse(info.instagram)),
                if (info.youtube.isNotEmpty)
                  channel(Icons.smart_display_outlined, 'YouTube', info.youtube.replaceFirst(RegExp(r'^https?://(www\.)?'), ''), Uri.parse(info.youtube)),
                if (info.address.isNotEmpty)
                  ListTile(
                    leading: CircleAvatar(
                      backgroundColor: theme.colorScheme.primaryContainer,
                      child: Icon(Icons.location_on_outlined, color: theme.colorScheme.primary, size: 20),
                    ),
                    title: Text(context.t('Address'), style: const TextStyle(fontWeight: FontWeight.w600)),
                    subtitle: Text(info.address),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          Text(context.t('Send us a message'), style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800)),
          const SizedBox(height: 12),
          if (_sent)
            EmptyState(
              icon: Icons.mark_email_read_outlined,
              title: context.t('Message sent'),
              message: context.t('Thank you for reaching out. We’ll reply as soon as we can.'),
            )
          else
            Form(
              key: _form,
              child: Column(
                children: [
                  TextFormField(
                    controller: _name,
                    decoration: InputDecoration(labelText: context.t('Your name')),
                    validator: (v) => (v ?? '').trim().length < 2 ? tr('Enter your name') : null,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _email,
                    keyboardType: TextInputType.emailAddress,
                    decoration: InputDecoration(labelText: context.t('Email')),
                    validator: validateEmail,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _phone,
                    keyboardType: TextInputType.phone,
                    decoration: InputDecoration(labelText: context.t('Mobile number (optional)')),
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _subject,
                    maxLength: 150,
                    decoration: InputDecoration(labelText: context.t('Subject (optional)')),
                  ),
                  const SizedBox(height: 4),
                  TextFormField(
                    controller: _message,
                    minLines: 4,
                    maxLines: 8,
                    maxLength: 3000,
                    decoration: InputDecoration(labelText: context.t('Message'), alignLabelWithHint: true),
                    validator: (v) => (v ?? '').trim().length < 10 ? tr('Please write at least 10 characters') : null,
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: BusyButton(label: context.t('Send message'), icon: Icons.send_rounded, busy: _busy, onPressed: _send),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class PrivacyScreen extends StatelessWidget {
  const PrivacyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final store = context.watch<StoreController>().info.storeName;
    final highlights = [
      context.t('Your personal information is not sold or rented to anyone.'),
      context.t('We collect what is needed to deliver your orders and run your account.'),
      context.t('We offer cash on delivery, so we never collect or store bank or card details.'),
      context.t('You can view, correct or delete your data, or delete your account at any time.'),
    ];
    final sections = [
      (
        context.t('What we collect'),
        [
          context.t('Account: name, email, phone number and password (stored only as a secure, one-way hash).'),
          context.t('Delivery: recipient name, phone number and the address you type in. We do not use your GPS location.'),
          context.t('Orders: products, quantities, prices, coupons, order status and history.'),
          context.t('Reviews: rating, text, optional photos, shown with your first name and last initial.'),
          context.t('Support: live chat and contact messages.'),
        ],
      ),
      (
        context.t('How we use it'),
        [
          context.t('To create and secure your account.'),
          context.t('To process, deliver and track your orders, and handle returns.'),
          context.t('To contact you about your orders and answer your questions.'),
          context.t('To prevent fraud and abuse, and to improve our app.'),
        ],
      ),
      (
        context.t('On this device'),
        [
          context.t('Your sign-in token is kept in encrypted secure storage and removed when you sign out or it expires.'),
          context.t('Your cart, wishlist (when signed out), theme and language are stored on this phone.'),
          context.t('App data is excluded from phone backups.'),
        ],
      ),
    ];

    return Scaffold(
      appBar: AppBar(title: Text(context.t('Privacy policy'))),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(context.t('This policy explains how {name} handles your personal information.', {'name': store}), style: theme.textTheme.bodyLarge),
          const SizedBox(height: 16),
          Panel(
            child: Column(
              children: [
                for (final h in highlights)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 5),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(Icons.check_circle_rounded, size: 18, color: theme.colorScheme.primary),
                        const SizedBox(width: 10),
                        Expanded(child: Text(h)),
                      ],
                    ),
                  ),
              ],
            ),
          ),
          for (final (title, points) in sections) ...[
            const SizedBox(height: 20),
            Text(title, style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800)),
            const SizedBox(height: 8),
            for (final p in points)
              Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('•  '),
                    Expanded(child: Text(p, style: const TextStyle(height: 1.4))),
                  ],
                ),
              ),
          ],
          const SizedBox(height: 20),
          Text(context.t('Questions about your data? Contact us any time.'), style: TextStyle(color: theme.colorScheme.onSurfaceVariant)),
        ],
      ),
    );
  }
}
