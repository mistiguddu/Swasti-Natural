import 'package:material_ui/material_ui.dart';
import 'package:provider/provider.dart';

import '../core/format.dart';
import '../core/i18n.dart';
import '../core/theme.dart';
import '../models/models.dart';
import '../state/cart.dart';
import '../state/store.dart';
import '../widgets/common.dart';
import '../widgets/ui.dart';
import 'checkout_screen.dart';
import 'main_shell.dart';
import 'product_screen.dart';

class CartScreen extends StatefulWidget {
  const CartScreen({super.key, this.isTab = false});
  final bool isTab;

  @override
  State<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends State<CartScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _requote());
  }

  Future<void> _requote() => context.read<CartController>().requestQuote(context.read<StoreController>().info.shippingMethods);

  @override
  Widget build(BuildContext context) {
    final cart = context.watch<CartController>();
    final quote = cart.quote;
    final bottomInset = widget.isTab ? MediaQuery.paddingOf(context).bottom : 0.0;

    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: !widget.isTab,
        title: Text(cart.isEmpty ? context.t('Your cart') : context.t('Your cart ({n})', {'n': cart.count})),
        actions: [
          if (!cart.isEmpty)
            TextButton(
              onPressed: () async {
                if (await confirmDialog(
                  context,
                  title: tr('Empty your cart?'),
                  message: tr('All items will be removed.'),
                  confirm: tr('Empty cart'),
                  danger: true,
                )) {
                  cart.clear();
                }
              },
              child: Text(context.t('Clear')),
            ),
        ],
      ),
      body: cart.isEmpty
          ? Padding(
              padding: EdgeInsets.only(bottom: bottomInset),
              child: EmptyState(
                icon: Icons.shopping_bag_outlined,
                title: context.t('Your cart is empty'),
                message: context.t('Browse our natural products and add your favourites.'),
                action: FilledButton(
                  onPressed: () => widget.isTab ? goToTab(context, AppTab.shop) : (Navigator.of(context)..popUntil((r) => r.isFirst)),
                  child: Text(context.t('Start shopping')),
                ),
              ),
            )
          : RefreshIndicator(
              onRefresh: _requote,
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
                children: [
                  if (cart.quoteError != null)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: _Notice(icon: Icons.wifi_off_rounded, text: cart.quoteError!.message, onRetry: _requote),
                    ),
                  for (final item in cart.items) ...[
                    _CartLine(item: item, line: quote?.lines.where((l) => l.product == item.product).firstOrNull),
                    const SizedBox(height: 10),
                  ],
                  const SizedBox(height: 6),
                  const _CouponBox(),
                  const SizedBox(height: 12),
                  const ShippingPicker(),
                  const SizedBox(height: 12),
                  OrderTotals(quote: quote, loading: cart.quoting),
                ],
              ),
            ),
      bottomNavigationBar: cart.isEmpty
          ? null
          : Padding(
              padding: EdgeInsets.only(bottom: bottomInset),
              child: _CheckoutBar(quote: quote, loading: cart.quoting),
            ),
    );
  }
}

class _Notice extends StatelessWidget {
  const _Notice({required this.icon, required this.text, this.onRetry});
  final IconData icon;
  final String text;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    const c = Color(0xFFD97706);
    return Container(
      padding: const EdgeInsets.fromLTRB(12, 8, 4, 8),
      decoration: BoxDecoration(color: c.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12)),
      child: Row(
        children: [
          Icon(icon, color: c, size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              text,
              style: TextStyle(color: c, fontWeight: FontWeight.w600),
            ),
          ),
          if (onRetry != null) TextButton(onPressed: onRetry, child: Text(context.t('Retry'))),
        ],
      ),
    );
  }
}

class _CartLine extends StatelessWidget {
  const _CartLine({required this.item, this.line});
  final CartItem item;
  final QuoteLine? line;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final cart = context.read<CartController>();
    final problem = line != null && !line!.ok;
    final price = line?.price ?? item.price;
    final unitDiscount = line?.unitDiscount ?? 0;

    return Dismissible(
      key: ValueKey(item.product),
      direction: DismissDirection.endToStart,
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 24),
        decoration: BoxDecoration(color: kDanger, borderRadius: BorderRadius.circular(14)),
        child: const Icon(Icons.delete_outline_rounded, color: Colors.white),
      ),
      onDismissed: (_) => _remove(context, cart),
      child: Card(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
          side: BorderSide(color: problem ? kDanger.withValues(alpha: 0.5) : theme.colorScheme.outlineVariant),
        ),
        child: Padding(
          padding: const EdgeInsets.all(10),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              GestureDetector(
                onTap: item.slug.isEmpty ? null : () => context.push(ProductScreen(slug: item.slug)),
                child: NetImage(item.imageUrl, width: 84, height: 84, radius: 12),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Text(
                            item.name.isEmpty ? context.t('Product') : item.name,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontWeight: FontWeight.w600),
                          ),
                        ),
                        InkWell(
                          onTap: () => _remove(context, cart),
                          borderRadius: BorderRadius.circular(99),
                          child: Padding(
                            padding: const EdgeInsets.all(4),
                            child: Icon(Icons.close_rounded, size: 18, color: theme.colorScheme.onSurfaceVariant),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    PriceTag(
                      price: price - unitDiscount,
                      regularPrice: (line?.regularPrice ?? item.regularPrice) > price - unitDiscount ? (line?.regularPrice ?? item.regularPrice) : null,
                      size: 15,
                    ),
                    if (problem)
                      Padding(
                        padding: const EdgeInsets.only(top: 4),
                        child: Text(
                          _problemText(line!),
                          style: const TextStyle(color: kDanger, fontSize: 12.5, fontWeight: FontWeight.w600),
                        ),
                      ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        if (line?.status != 'unavailable')
                          QuantityStepper(compact: true, value: item.quantity, max: item.max, onChanged: (v) => cart.setQuantity(item.product, v)),
                        const Spacer(),
                        Text(Fmt.money((price - unitDiscount) * item.quantity), style: const TextStyle(fontWeight: FontWeight.w800)),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _problemText(QuoteLine line) => switch (line.status) {
    'unavailable' => tr('No longer available — please remove it.'),
    'out_of_stock' => tr('Out of stock — please remove it.'),
    'insufficient_stock' => tr('Only {n} left — lower the quantity.', {'n': line.availableQuantity ?? 0}),
    _ => line.message,
  };

  void _remove(BuildContext context, CartController cart) {
    final undo = cart.remove(item.product);
    context.toast(tr('Removed from cart'), actionLabel: tr('Undo'), onAction: undo);
  }
}

class _CouponBox extends StatefulWidget {
  const _CouponBox();

  @override
  State<_CouponBox> createState() => _CouponBoxState();
}

class _CouponBoxState extends State<_CouponBox> {
  final _controller = TextEditingController();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final cart = context.watch<CartController>();
    final quote = cart.quote;
    final applied = cart.couponCode;

    if (applied.isNotEmpty) {
      final valid = quote?.couponValid ?? true;
      final color = valid ? kSuccess : kDanger;
      return Container(
        padding: const EdgeInsets.fromLTRB(14, 6, 4, 6),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: color.withValues(alpha: 0.4)),
        ),
        child: Row(
          children: [
            Icon(valid ? Icons.local_offer_rounded : Icons.error_outline_rounded, color: color),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    applied,
                    style: TextStyle(fontWeight: FontWeight.w800, color: color, letterSpacing: 1),
                  ),
                  Text(
                    valid
                        ? ((quote?.couponDiscount ?? 0) > 0
                              ? context.t('You save {amount}', {'amount': Fmt.money(quote!.couponDiscount)})
                              : context.t('Coupon applied'))
                        : (quote?.couponMessage.isNotEmpty ?? false ? quote!.couponMessage : context.t('This coupon can’t be used')),
                    style: TextStyle(fontSize: 12.5, color: color),
                  ),
                ],
              ),
            ),
            TextButton(onPressed: () => cart.setCoupon(''), child: Text(context.t('Remove'))),
          ],
        ),
      );
    }

    return Row(
      children: [
        Expanded(
          child: TextField(
            controller: _controller,
            textCapitalization: TextCapitalization.characters,
            decoration: InputDecoration(hintText: context.t('Coupon code'), prefixIcon: const Icon(Icons.local_offer_outlined)),
            onSubmitted: (v) => v.trim().isEmpty ? null : cart.setCoupon(v),
          ),
        ),
        const SizedBox(width: 10),
        FilledButton.tonal(
          onPressed: () {
            if (_controller.text.trim().isEmpty) return;
            FocusScope.of(context).unfocus();
            cart.setCoupon(_controller.text);
            _controller.clear();
          },
          child: Text(context.t('Apply')),
        ),
      ],
    );
  }
}

/// Delivery method choice; free-delivery thresholds are shown when set.
class ShippingPicker extends StatelessWidget {
  const ShippingPicker({super.key});

  @override
  Widget build(BuildContext context) {
    final methods = context.select<StoreController, List<ShippingMethod>>((s) => s.info.shippingMethods);
    final cart = context.watch<CartController>();
    if (methods.isEmpty) return const SizedBox.shrink();
    final selected = cart.effectiveShipping(methods);
    final theme = Theme.of(context);

    return Panel(
      padding: const EdgeInsets.fromLTRB(4, 12, 12, 4),
      child: RadioGroup<String>(
        groupValue: selected,
        onChanged: (v) => v == null ? null : cart.setShippingMethod(v),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.only(left: 12, bottom: 4),
              child: Text(context.t('Delivery'), style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w800)),
            ),
            for (final m in methods)
              RadioListTile<String>(
                value: m.id,
                contentPadding: const EdgeInsets.only(left: 4),
                title: Row(
                  children: [
                    Expanded(
                      child: Text(m.name, style: const TextStyle(fontWeight: FontWeight.w600)),
                    ),
                    Text(m.charge == 0 ? context.t('Free') : Fmt.money(m.charge), style: const TextStyle(fontWeight: FontWeight.w700)),
                  ],
                ),
                subtitle: Text(
                  [
                    if (m.estimatedDelivery.isNotEmpty) m.estimatedDelivery,
                    if (m.freeShippingThreshold > 0) context.t('Free over {amount}', {'amount': Fmt.money(m.freeShippingThreshold)}),
                    if (m.description.isNotEmpty && m.estimatedDelivery.isEmpty) m.description,
                  ].join(' · '),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class OrderTotals extends StatelessWidget {
  const OrderTotals({super.key, required this.quote, this.loading = false});
  final Quote? quote;
  final bool loading;

  @override
  Widget build(BuildContext context) {
    final q = quote;
    final theme = Theme.of(context);
    return Panel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Text(context.t('Order summary'), style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w800)),
              const Spacer(),
              if (loading) const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)),
            ],
          ),
          const SizedBox(height: 8),
          if (q == null)
            const Column(children: [Skeleton(height: 14), SizedBox(height: 10), Skeleton(height: 14), SizedBox(height: 10), Skeleton(height: 18)])
          else ...[
            InfoRow(context.t('Subtotal'), Fmt.money(q.subtotal)),
            if (q.itemDiscount > 0) InfoRow(context.t('Discount'), '−${Fmt.money(q.itemDiscount)}', valueColor: kSuccess),
            if (q.couponDiscount > 0) InfoRow(context.t('Coupon'), '−${Fmt.money(q.couponDiscount)}', valueColor: kSuccess),
            InfoRow(context.t('Delivery'), q.shipping == 0 ? context.t('Free') : Fmt.money(q.shipping)),
            if (q.tax > 0) InfoRow(context.t('Tax'), Fmt.money(q.tax)),
            const Divider(height: 18),
            InfoRow(context.t('Total'), Fmt.money(q.grandTotal), bold: true),
          ],
        ],
      ),
    );
  }
}

class _CheckoutBar extends StatelessWidget {
  const _CheckoutBar({required this.quote, required this.loading});
  final Quote? quote;
  final bool loading;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final blocked = quote != null && !quote!.canCheckout;
    return Container(
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        border: Border(top: BorderSide(color: theme.colorScheme.outlineVariant)),
      ),
      padding: EdgeInsets.fromLTRB(16, 12, 16, 12 + (Navigator.of(context).canPop() ? MediaQuery.paddingOf(context).bottom : 0)),
      child: Row(
        children: [
          Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(context.t('Total'), style: theme.textTheme.labelMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
              Text(quote == null ? '—' : Fmt.money(quote!.grandTotal), style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800)),
            ],
          ),
          const SizedBox(width: 16),
          Expanded(
            child: FilledButton.icon(
              onPressed: blocked || quote == null || loading
                  ? null
                  : () async {
                      if (!await context.requireSignIn() || !context.mounted) return;
                      await context.push(const CheckoutScreen());
                    },
              icon: const Icon(Icons.lock_outline_rounded, size: 18),
              label: Text(blocked ? context.t('Fix cart to continue') : context.t('Checkout')),
            ),
          ),
        ],
      ),
    );
  }
}
