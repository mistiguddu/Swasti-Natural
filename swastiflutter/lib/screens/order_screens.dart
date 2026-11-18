import 'package:flutter/services.dart';
import 'package:material_ui/material_ui.dart';

import '../core/api.dart';
import '../core/bd_data.dart';
import '../core/format.dart';
import '../core/i18n.dart';
import '../core/theme.dart';
import '../models/models.dart';
import '../widgets/common.dart';
import '../widgets/ui.dart';
import 'chat_screen.dart';
import 'main_shell.dart';
import 'product_screen.dart';

/// Shown after a successful checkout.
class OrderPlacedScreen extends StatefulWidget {
  const OrderPlacedScreen({super.key, required this.orderNumber, required this.total});
  final String orderNumber;
  final num total;

  @override
  State<OrderPlacedScreen> createState() => _OrderPlacedScreenState();
}

class _OrderPlacedScreenState extends State<OrderPlacedScreen> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 900))..forward();

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) goToTab(context, AppTab.home);
      },
      child: Scaffold(
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              children: [
                const Spacer(),
                ScaleTransition(
                  scale: CurvedAnimation(parent: _c, curve: Curves.elasticOut),
                  child: Container(
                    width: 110,
                    height: 110,
                    decoration: BoxDecoration(color: kSuccess.withValues(alpha: 0.12), shape: BoxShape.circle),
                    child: const Icon(Icons.check_circle_rounded, color: kSuccess, size: 76),
                  ),
                ),
                const SizedBox(height: 24),
                Text(context.t('Order placed!'), style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800)),
                const SizedBox(height: 8),
                Text(
                  context.t('Thank you for shopping with us. We’ll call you to confirm your order soon.'),
                  textAlign: TextAlign.center,
                  style: theme.textTheme.bodyLarge?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                ),
                const SizedBox(height: 24),
                Panel(
                  child: Column(
                    children: [
                      Row(
                        children: [
                          Text(context.t('Order number'), style: TextStyle(color: theme.colorScheme.onSurfaceVariant)),
                          const Spacer(),
                          Text(widget.orderNumber, style: const TextStyle(fontWeight: FontWeight.w800, letterSpacing: 0.5)),
                          IconButton(
                            tooltip: context.t('Copy'),
                            visualDensity: VisualDensity.compact,
                            icon: const Icon(Icons.copy_rounded, size: 18),
                            onPressed: () {
                              Clipboard.setData(ClipboardData(text: widget.orderNumber));
                              context.toast(tr('Order number copied'));
                            },
                          ),
                        ],
                      ),
                      InfoRow(context.t('Total (cash on delivery)'), Fmt.money(widget.total), bold: true),
                    ],
                  ),
                ),
                const Spacer(),
                FilledButton.icon(
                  style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(52)),
                  onPressed: () => Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => OrderDetailScreen(orderNumber: widget.orderNumber))),
                  icon: const Icon(Icons.receipt_long_rounded),
                  label: Text(context.t('View order')),
                ),
                const SizedBox(height: 10),
                OutlinedButton(
                  style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(52)),
                  onPressed: () => goToTab(context, AppTab.shop),
                  child: Text(context.t('Continue shopping')),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class OrdersScreen extends StatefulWidget {
  const OrdersScreen({super.key});

  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> {
  static const _filters = ['', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
  String _status = '';
  final List<Order> _items = [];
  Pagination? _pagination;
  bool _loading = true;
  ApiException? _error;
  int _seq = 0;

  @override
  void initState() {
    super.initState();
    _load(reset: true);
  }

  Future<void> _load({bool reset = false}) async {
    final seq = reset ? ++_seq : _seq;
    final page = reset ? 1 : (_pagination?.page ?? 0) + 1;
    setState(() {
      _loading = true;
      if (reset) _error = null;
    });
    try {
      final data = asMap(await Api.instance.get('/store/account/orders', {'status': _status, 'page': page, 'limit': 10}));
      if (seq != _seq || !mounted) return;
      setState(() {
        if (reset) _items.clear();
        _items.addAll(asMapList(data['items']).map(Order.fromJson));
        _pagination = Pagination.fromJson(data['pagination']);
      });
    } on ApiException catch (error) {
      if (seq == _seq && mounted) setState(() => _error = error);
    } finally {
      if (seq == _seq && mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(context.t('My orders')),
        actions: [
          IconButton(tooltip: context.t('Track an order'), onPressed: () => context.push(const TrackOrderScreen()), icon: const Icon(Icons.search_rounded)),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(52),
          child: SizedBox(
            height: 52,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.fromLTRB(12, 4, 12, 10),
              children: [
                for (final s in _filters)
                  Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      label: Text(s.isEmpty ? context.t('All') : context.t(kStatusLabels[s] ?? s)),
                      selected: _status == s,
                      onSelected: (_) {
                        setState(() => _status = s);
                        _load(reset: true);
                      },
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
      body: RefreshIndicator(
        onRefresh: () => _load(reset: true),
        child: NotificationListener<ScrollNotification>(
          onNotification: (n) {
            if (n.metrics.pixels > n.metrics.maxScrollExtent - 300 && !_loading && (_pagination?.hasMore ?? false)) _load();
            return false;
          },
          child: _error != null && _items.isEmpty
              ? ListView(
                  children: [
                    const SizedBox(height: 60),
                    ErrorView(message: _error!.message, onRetry: () => _load(reset: true)),
                  ],
                )
              : !_loading && _items.isEmpty
              ? ListView(
                  children: [
                    const SizedBox(height: 60),
                    EmptyState(
                      icon: Icons.receipt_long_outlined,
                      title: _status.isEmpty ? context.t('No orders yet') : context.t('No orders with this status'),
                      message: _status.isEmpty ? context.t('When you place an order, it will show up here.') : null,
                      action: _status.isEmpty ? FilledButton(onPressed: () => goToTab(context, AppTab.shop), child: Text(context.t('Start shopping'))) : null,
                    ),
                  ],
                )
              : ListView.separated(
                  padding: EdgeInsets.fromLTRB(16, 12, 16, 24 + MediaQuery.paddingOf(context).bottom),
                  itemCount: _items.length + (_loading ? 1 : 0),
                  separatorBuilder: (_, _) => const SizedBox(height: 10),
                  itemBuilder: (context, i) {
                    if (i >= _items.length) {
                      return const Padding(
                        padding: EdgeInsets.all(16),
                        child: Center(child: CircularProgressIndicator()),
                      );
                    }
                    return OrderCard(order: _items[i]);
                  },
                ),
        ),
      ),
    );
  }
}

class OrderCard extends StatelessWidget {
  const OrderCard({super.key, required this.order});
  final Order order;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final images = order.items.take(4).toList();
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => context.push(OrderDetailScreen(orderNumber: order.orderNumber)),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('#${order.orderNumber}', style: const TextStyle(fontWeight: FontWeight.w800)),
                        Text(Fmt.date(order.createdAt), style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
                      ],
                    ),
                  ),
                  StatusBadge(order.status),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  for (final item in images)
                    Padding(padding: const EdgeInsets.only(right: 6), child: NetImage(item.imageUrl, width: 44, height: 44, radius: 8)),
                  if (order.items.length > 4)
                    Text(
                      '+${digits(order.items.length - 4)}',
                      style: TextStyle(color: theme.colorScheme.onSurfaceVariant, fontWeight: FontWeight.w700),
                    ),
                  const Spacer(),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(Fmt.money(order.grandTotal), style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                      Text(
                        context.t('{n} items', {'n': order.itemCount}),
                        style: theme.textTheme.labelSmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class OrderDetailScreen extends StatefulWidget {
  const OrderDetailScreen({super.key, required this.orderNumber});
  final String orderNumber;

  @override
  State<OrderDetailScreen> createState() => _OrderDetailScreenState();
}

class _OrderDetailScreenState extends State<OrderDetailScreen> {
  Order? _order;
  ApiException? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final order = Order.fromJson(asMap(await Api.instance.get('/store/account/orders/${Uri.encodeComponent(widget.orderNumber)}')));
      if (mounted) setState(() => _order = order);
    } on ApiException catch (error) {
      if (mounted) setState(() => _error = error);
    }
  }

  @override
  Widget build(BuildContext context) {
    final order = _order;
    return Scaffold(
      appBar: AppBar(
        title: Text('#${widget.orderNumber}'),
        actions: [
          IconButton(tooltip: context.t('Need help?'), onPressed: () => context.push(const ChatScreen()), icon: const Icon(Icons.support_agent_rounded)),
        ],
      ),
      body: order == null
          ? (_error != null ? ErrorView(message: _error!.message, onRetry: _load) : const Center(child: CircularProgressIndicator()))
          : RefreshIndicator(
              onRefresh: _load,
              child: OrderView(order: order),
            ),
    );
  }
}

/// Full order details: progress, items, delivery, payment and totals.
class OrderView extends StatelessWidget {
  const OrderView({super.key, required this.order});
  final Order order;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final address = order.shippingAddress;
    final addressText = [
      asStr(address['line1']),
      asStr(address['line2']),
      asStr(address['city']),
      asStr(address['state']),
      asStr(address['postalCode']),
    ].where((s) => s.isNotEmpty).join(', ');

    Widget title(String text) => Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Text(text, style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w800)),
    );

    return ListView(
      padding: EdgeInsets.fromLTRB(16, 12, 16, 24 + MediaQuery.paddingOf(context).bottom),
      children: [
        Panel(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      context.t('Placed on {date}', {'date': Fmt.dateTime(order.createdAt)}),
                      style: TextStyle(color: theme.colorScheme.onSurfaceVariant),
                    ),
                  ),
                  StatusBadge(order.status),
                ],
              ),
              const SizedBox(height: 16),
              OrderProgress(status: order.status),
              if (order.trackingNumber.isNotEmpty) ...[
                const Divider(height: 24),
                Row(
                  children: [
                    const Icon(Icons.local_shipping_outlined, size: 18),
                    const SizedBox(width: 8),
                    Text(context.t('Tracking number')),
                    const Spacer(),
                    SelectableText(order.trackingNumber, style: const TextStyle(fontWeight: FontWeight.w700)),
                  ],
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: 12),
        Panel(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              title(context.t('Items ({n})', {'n': order.itemCount})),
              for (final item in order.items)
                Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: InkWell(
                    onTap: item.product.isEmpty ? null : () => context.push(ProductScreen(slug: item.product)),
                    child: Row(
                      children: [
                        NetImage(item.imageUrl, width: 56, height: 56, radius: 10),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                item.name,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(fontWeight: FontWeight.w600),
                              ),
                              Text(
                                '${Fmt.money(item.price)} × ${digits(item.quantity)}',
                                style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                              ),
                            ],
                          ),
                        ),
                        Text(Fmt.money(item.total), style: const TextStyle(fontWeight: FontWeight.w700)),
                      ],
                    ),
                  ),
                ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Panel(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              title(context.t('Delivery')),
              Text(asStr(address['name']), style: const TextStyle(fontWeight: FontWeight.w700)),
              if (asStr(address['phone']).isNotEmpty) Text(asStr(address['phone'])),
              if (addressText.isNotEmpty) Text(addressText, style: TextStyle(color: theme.colorScheme.onSurfaceVariant)),
              if (order.shippingMethodName.isNotEmpty) ...[
                const SizedBox(height: 8),
                Row(children: [const Icon(Icons.local_shipping_outlined, size: 16), const SizedBox(width: 6), Text(order.shippingMethodName)]),
              ],
              if (order.notes.isNotEmpty) ...[
                const SizedBox(height: 8),
                Text(context.t('Notes: {text}', {'text': order.notes}), style: TextStyle(color: theme.colorScheme.onSurfaceVariant)),
              ],
            ],
          ),
        ),
        const SizedBox(height: 12),
        Panel(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              title(context.t('Payment')),
              InfoRow(context.t('Method'), context.t(kPaymentLabels[order.paymentMethod] ?? order.paymentMethod)),
              Row(
                children: [
                  Expanded(
                    child: Text(context.t('Status'), style: TextStyle(color: theme.colorScheme.onSurfaceVariant)),
                  ),
                  StatusBadge(order.paymentStatus),
                ],
              ),
              const Divider(height: 22),
              InfoRow(context.t('Subtotal'), Fmt.money(order.subtotal)),
              if (order.discount > 0)
                InfoRow(
                  order.couponCode.isNotEmpty ? context.t('Discount ({code})', {'code': order.couponCode}) : context.t('Discount'),
                  '−${Fmt.money(order.discount)}',
                  valueColor: kSuccess,
                ),
              InfoRow(context.t('Delivery'), order.shippingCharge == 0 ? context.t('Free') : Fmt.money(order.shippingCharge)),
              if (order.tax > 0) InfoRow(context.t('Tax'), Fmt.money(order.tax)),
              const Divider(height: 18),
              InfoRow(context.t('Total'), Fmt.money(order.grandTotal), bold: true),
            ],
          ),
        ),
        if (order.timeline.isNotEmpty) ...[
          const SizedBox(height: 12),
          Panel(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                title(context.t('Order history')),
                for (final event in order.timeline.reversed)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Padding(
                          padding: const EdgeInsets.only(top: 5),
                          child: Container(
                            width: 8,
                            height: 8,
                            decoration: BoxDecoration(color: StatusBadge.colorOf(event.status), shape: BoxShape.circle),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(context.t(kStatusLabels[event.status] ?? event.status), style: const TextStyle(fontWeight: FontWeight.w700)),
                              if (event.note.isNotEmpty) Text(event.note),
                              Text(Fmt.dateTime(event.at), style: theme.textTheme.labelSmall?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ),
        ],
      ],
    );
  }
}

/// pending → confirmed → processing → shipped → delivered.
class OrderProgress extends StatelessWidget {
  const OrderProgress({super.key, required this.status});
  final String status;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    if (status == 'cancelled' || status == 'returned') {
      final color = StatusBadge.colorOf(status);
      return Row(
        children: [
          Icon(status == 'cancelled' ? Icons.cancel_rounded : Icons.assignment_return_rounded, color: color),
          const SizedBox(width: 8),
          Text(
            status == 'cancelled' ? context.t('This order was cancelled.') : context.t('This order was returned.'),
            style: TextStyle(color: color, fontWeight: FontWeight.w600),
          ),
        ],
      );
    }
    final current = kOrderSteps.indexOf(status).clamp(0, kOrderSteps.length - 1);
    const icons = [Icons.receipt_long_rounded, Icons.thumb_up_alt_rounded, Icons.inventory_2_rounded, Icons.local_shipping_rounded, Icons.home_rounded];
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (var i = 0; i < kOrderSteps.length; i++) ...[
          Expanded(
            child: Column(
              children: [
                Row(
                  children: [
                    Expanded(child: Container(height: 2, color: i == 0 ? Colors.transparent : (i <= current ? scheme.primary : scheme.outlineVariant))),
                    CircleAvatar(
                      radius: 15,
                      backgroundColor: i <= current ? scheme.primary : scheme.surfaceContainer,
                      child: Icon(icons[i], size: 15, color: i <= current ? scheme.onPrimary : scheme.onSurfaceVariant),
                    ),
                    Expanded(
                      child: Container(
                        height: 2,
                        color: i == kOrderSteps.length - 1 ? Colors.transparent : (i < current ? scheme.primary : scheme.outlineVariant),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  context.t(kStatusLabels[kOrderSteps[i]]!),
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 10.5,
                    fontWeight: i == current ? FontWeight.w800 : FontWeight.w500,
                    color: i <= current ? scheme.onSurface : scheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }
}

/// Look up one of your orders by its number.
class TrackOrderScreen extends StatefulWidget {
  const TrackOrderScreen({super.key});

  @override
  State<TrackOrderScreen> createState() => _TrackOrderScreenState();
}

class _TrackOrderScreenState extends State<TrackOrderScreen> {
  final _controller = TextEditingController();
  Order? _order;
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _search() async {
    final number = _controller.text.trim().replaceAll('#', '');
    if (number.isEmpty) return;
    FocusScope.of(context).unfocus();
    setState(() {
      _busy = true;
      _error = null;
      _order = null;
    });
    try {
      final order = Order.fromJson(asMap(await Api.instance.get('/store/account/orders/${Uri.encodeComponent(number)}')));
      if (mounted) setState(() => _order = order);
    } on ApiException catch (error) {
      if (mounted) setState(() => _error = error.status == 404 ? tr('We couldn’t find that order in your account.') : error.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(context.t('Track an order'))),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _controller,
                    textCapitalization: TextCapitalization.characters,
                    textInputAction: TextInputAction.search,
                    onSubmitted: (_) => _search(),
                    decoration: InputDecoration(hintText: context.t('Order number, e.g. SN-000125'), prefixIcon: const Icon(Icons.tag_rounded)),
                  ),
                ),
                const SizedBox(width: 10),
                SizedBox(
                  width: 96,
                  child: BusyButton(label: context.t('Track'), busy: _busy, onPressed: _search),
                ),
              ],
            ),
          ),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Text(_error!, style: const TextStyle(color: kDanger)),
            ),
          if (_order != null) Expanded(child: OrderView(order: _order!)),
        ],
      ),
    );
  }
}
