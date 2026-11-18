import 'dart:async';

import 'package:material_ui/material_ui.dart';
import 'package:provider/provider.dart';

import '../core/api.dart';
import '../core/format.dart';
import '../core/i18n.dart';
import '../core/secure_store.dart';
import '../models/models.dart';
import '../state/auth.dart';
import '../state/store.dart';
import '../widgets/address_form.dart';
import '../widgets/common.dart';
import '../widgets/ui.dart';

/// Live chat with the store team. Works for guests (identified by a private chat token
/// kept in secure storage) and signed-in customers. New messages arrive by polling.
class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> with WidgetsBindingObserver {
  final _input = TextEditingController();
  final _scroll = ScrollController();
  final List<ChatMessage> _messages = [];
  bool _hasConversation = false;
  bool _teamOnline = false;
  bool _loading = true;
  bool _sending = false;
  ApiException? _error;
  Timer? _poll;
  String? _lastAt;
  DateTime _lastTyping = DateTime(2000);

  // Guest details for the first message.
  final _guestForm = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _contact = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _load(full: true);
    _poll = Timer.periodic(const Duration(seconds: 4), (_) => _load());
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _poll?.cancel();
    for (final c in [_input, _name, _contact]) {
      c.dispose();
    }
    _scroll.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _poll ??= Timer.periodic(const Duration(seconds: 4), (_) => _load());
      _load();
    } else if (state == AppLifecycleState.paused) {
      _poll?.cancel();
      _poll = null;
    }
  }

  Future<void> _load({bool full = false}) async {
    try {
      final data = asMap(await Api.instance.get('/store/chat', full || _lastAt == null ? null : {'after': _lastAt}));
      if (!mounted) return;
      final incoming = asMapList(data['messages']).map(ChatMessage.fromJson).toList();
      final hadNew = incoming.any((m) => !_messages.any((x) => x.id == m.id));
      setState(() {
        _hasConversation = data['conversation'] != null;
        _teamOnline = asBool(data['teamOnline']);
        if (full) _messages.clear();
        for (final m in incoming) {
          if (!_messages.any((x) => x.id == m.id)) _messages.add(m);
        }
        if (_messages.isNotEmpty) _lastAt = _messages.last.createdAt;
        _error = null;
      });
      if (hadNew) {
        _scrollToEnd();
        if (_hasConversation) Api.instance.post('/store/chat/read').catchError((_) => null);
      }
    } on ApiException catch (error) {
      if (mounted && _messages.isEmpty) setState(() => _error = error);
    } finally {
      if (mounted && _loading) setState(() => _loading = false);
    }
  }

  void _scrollToEnd() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scroll.hasClients) _scroll.animateTo(_scroll.position.maxScrollExtent, duration: const Duration(milliseconds: 250), curve: Curves.easeOut);
    });
  }

  void _typing() {
    if (!_hasConversation) return;
    final now = DateTime.now();
    if (now.difference(_lastTyping) < const Duration(seconds: 3)) return;
    _lastTyping = now;
    Api.instance.post('/store/chat/typing').catchError((_) => null);
  }

  Future<void> _send() async {
    final text = _input.text.trim();
    if (text.isEmpty || _sending) return;
    final signedIn = context.read<AuthController>().isSignedIn;
    final needsGuestDetails = !signedIn && !_hasConversation;
    if (needsGuestDetails && !(_guestForm.currentState?.validate() ?? false)) return;

    setState(() => _sending = true);
    try {
      final contact = _contact.text.trim();
      final data = asMap(
        await Api.instance.post('/store/chat/messages', {
          'body': text,
          if (needsGuestDetails) 'name': _name.text.trim(),
          if (needsGuestDetails && contact.contains('@')) 'email': contact,
          if (needsGuestDetails && !contact.contains('@')) 'phone': contact,
          'pageUrl': 'android-app',
        }),
      );
      final token = data['token']?.toString();
      if (token != null && token.isNotEmpty) await SecureStore.setChatToken(token);
      if (!mounted) return;
      _input.clear();
      final message = ChatMessage.fromJson(asMap(data['message']));
      setState(() {
        _hasConversation = true;
        if (!_messages.any((m) => m.id == message.id)) _messages.add(message);
        _lastAt = message.createdAt;
      });
      _scrollToEnd();
    } catch (error) {
      if (mounted) context.errorToast(error);
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final signedIn = context.watch<AuthController>().isSignedIn;
    final storeName = context.watch<StoreController>().info.storeName;
    final needsGuestDetails = !signedIn && !_hasConversation;

    return Scaffold(
      appBar: AppBar(
        titleSpacing: 0,
        title: Row(
          children: [
            const LogoMark(size: 36),
            const SizedBox(width: 10),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(storeName, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
                Row(
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(color: _teamOnline ? const Color(0xFF22C55E) : Colors.grey, shape: BoxShape.circle),
                    ),
                    const SizedBox(width: 5),
                    Text(_teamOnline ? context.t('Online now') : context.t('We’ll reply soon'), style: theme.textTheme.labelSmall),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
      body: Column(
        children: [
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _error != null
                ? ErrorView(message: _error!.message, onRetry: () => _load(full: true))
                : _messages.isEmpty
                ? ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      const SizedBox(height: 24),
                      EmptyState(
                        icon: Icons.waving_hand_outlined,
                        title: context.t('Hi! How can we help?'),
                        message: context.t('Ask about products, orders or delivery. Our team usually replies within minutes.'),
                      ),
                      if (needsGuestDetails)
                        Form(
                          key: _guestForm,
                          child: Panel(
                            child: Column(
                              children: [
                                Text(context.t('So we can reply, tell us:'), style: const TextStyle(fontWeight: FontWeight.w700)),
                                const SizedBox(height: 10),
                                TextFormField(
                                  controller: _name,
                                  decoration: InputDecoration(labelText: context.t('Your name')),
                                  validator: (v) => (v ?? '').trim().length < 2 ? tr('Enter your name') : null,
                                ),
                                const SizedBox(height: 10),
                                TextFormField(
                                  controller: _contact,
                                  keyboardType: TextInputType.emailAddress,
                                  decoration: InputDecoration(labelText: context.t('Email or mobile number')),
                                  validator: (v) {
                                    final value = (v ?? '').trim();
                                    if (value.isEmpty) return tr('Enter an email or mobile number');
                                    return value.contains('@') ? validateEmail(value) : validatePhone(value);
                                  },
                                ),
                              ],
                            ),
                          ),
                        ),
                    ],
                  )
                : ListView.builder(
                    controller: _scroll,
                    padding: const EdgeInsets.fromLTRB(12, 12, 12, 12),
                    itemCount: _messages.length,
                    itemBuilder: (context, i) {
                      final m = _messages[i];
                      final showDate = i == 0 || Fmt.date(_messages[i - 1].createdAt) != Fmt.date(m.createdAt);
                      return Column(
                        children: [
                          if (showDate)
                            Padding(
                              padding: const EdgeInsets.symmetric(vertical: 10),
                              child: Text(Fmt.date(m.createdAt), style: theme.textTheme.labelSmall?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
                            ),
                          _Bubble(message: m, isLast: i == _messages.length - 1),
                        ],
                      );
                    },
                  ),
          ),
          SafeArea(
            top: false,
            child: Container(
              padding: const EdgeInsets.fromLTRB(12, 8, 8, 8),
              decoration: BoxDecoration(
                color: theme.colorScheme.surface,
                border: Border(top: BorderSide(color: theme.colorScheme.outlineVariant)),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _input,
                      minLines: 1,
                      maxLines: 4,
                      maxLength: 2000,
                      textCapitalization: TextCapitalization.sentences,
                      onChanged: (_) => _typing(),
                      decoration: InputDecoration(
                        hintText: context.t('Type a message…'),
                        counterText: '',
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton.filled(
                    tooltip: context.t('Send'),
                    onPressed: _sending ? null : _send,
                    icon: _sending ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.send_rounded),
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

class _Bubble extends StatelessWidget {
  const _Bubble({required this.message, required this.isLast});
  final ChatMessage message;
  final bool isLast;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final mine = message.mine;
    return Align(
      alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        constraints: BoxConstraints(maxWidth: MediaQuery.sizeOf(context).width * 0.78),
        margin: const EdgeInsets.symmetric(vertical: 3),
        padding: const EdgeInsets.fromLTRB(12, 8, 12, 6),
        decoration: BoxDecoration(
          color: mine ? scheme.primary : scheme.surfaceContainer,
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(16),
            topRight: const Radius.circular(16),
            bottomLeft: Radius.circular(mine ? 16 : 4),
            bottomRight: Radius.circular(mine ? 4 : 16),
          ),
        ),
        child: Column(
          crossAxisAlignment: mine ? CrossAxisAlignment.end : CrossAxisAlignment.start,
          children: [
            if (!mine && message.senderName.isNotEmpty)
              Text(
                message.senderName,
                style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: scheme.primary),
              ),
            SelectableText(message.body, style: TextStyle(color: mine ? scheme.onPrimary : scheme.onSurface, height: 1.35)),
            const SizedBox(height: 2),
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  Fmt.time(message.createdAt),
                  style: TextStyle(fontSize: 10.5, color: mine ? scheme.onPrimary.withValues(alpha: 0.75) : scheme.onSurfaceVariant),
                ),
                if (mine && isLast) ...[
                  const SizedBox(width: 4),
                  Icon(message.readAt != null ? Icons.done_all_rounded : Icons.done_rounded, size: 13, color: scheme.onPrimary.withValues(alpha: 0.85)),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }
}
