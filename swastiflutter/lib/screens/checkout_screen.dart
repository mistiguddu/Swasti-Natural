import 'package:flutter/services.dart';
import 'package:material_ui/material_ui.dart';
import 'package:provider/provider.dart';

import '../core/api.dart';
import '../core/bd_data.dart';
import '../core/format.dart';
import '../core/i18n.dart';
import '../models/models.dart';
import '../state/auth.dart';
import '../state/cart.dart';
import '../state/store.dart';
import '../widgets/address_form.dart';
import '../widgets/common.dart';
import '../widgets/ui.dart';
import 'cart_screen.dart';
import 'order_screens.dart';

class CheckoutScreen extends StatefulWidget {
  const CheckoutScreen({super.key});

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  final _form = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _phone = TextEditingController();
  final _email = TextEditingController();
  final _notes = TextEditingController();
  final _address = AddressFormController();

  List<Address> _saved = [];
  String? _selectedId; // saved address id, or null for a new address
  bool _saveAddress = true;
  bool _loadingAddresses = true;
  bool _placing = false;

  @override
  void initState() {
    super.initState();
    final user = context.read<AuthController>().user;
    _name.text = user?.name ?? '';
    _phone.text = user?.phone ?? '';
    _email.text = user?.email ?? '';
    _address.name.text = user?.name ?? '';
    _address.phone.text = user?.phone ?? '';
    _loadAddresses();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<CartController>().requestQuote(context.read<StoreController>().info.shippingMethods);
    });
  }

  @override
  void dispose() {
    for (final c in [_name, _phone, _email, _notes]) {
      c.dispose();
    }
    _address.dispose();
    super.dispose();
  }

  Future<void> _loadAddresses() async {
    try {
      final list = asMapList(await Api.instance.get('/store/account/addresses')).map(Address.fromJson).toList();
      if (!mounted) return;
      setState(() {
        _saved = list;
        if (list.isNotEmpty) {
          _selectedId = (list.where((a) => a.isDefault).firstOrNull ?? list.first).id;
        }
      });
    } catch (_) {
      // Fall back to entering a new address.
    } finally {
      if (mounted) setState(() => _loadingAddresses = false);
    }
  }

  Address? get _selected => _saved.where((a) => a.id == _selectedId).firstOrNull;

  Future<void> _placeOrder() async {
    final cart = context.read<CartController>();
    final store = context.read<StoreController>();
    final quote = cart.quote;
    if (quote == null || !quote.canCheckout) {
      context.toast(tr('Please review your cart before placing the order.'), error: true);
      return;
    }
    if (!_form.currentState!.validate()) {
      context.toast(tr('Please check the highlighted fields.'), error: true);
      return;
    }
    final address = _selected ?? _address.toAddress();
    final shipping = cart.effectiveShipping(store.info.shippingMethods);

    setState(() => _placing = true);
    try {
      final data = asMap(
        await Api.instance.post('/store/account/checkout', {
          'items': cart.requestItems,
          'customer': {'name': _name.text.trim(), 'phone': _phone.text.trim(), 'email': _email.text.trim()},
          'address': address.toJson(includeDefault: false),
          'instructions': _notes.text.trim(),
          'couponCode': cart.couponCode,
          'shippingMethod': shipping.isEmpty ? null : shipping,
          'paymentMethod': 'cash_on_delivery',
          'saveAddress': _selected == null && _saveAddress,
        }),
      );
      if (!mounted) return;
      HapticFeedback.mediumImpact();
      cart.clear();
      await Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(
          builder: (_) => OrderPlacedScreen(orderNumber: asStr(data['orderNumber']), total: asNum(data['grandTotal'])),
        ),
        (route) => route.isFirst,
      );
    } on ApiException catch (error) {
      if (!mounted) return;
      context.toast(error.message, error: true);
      // Prices or stock may have changed: refresh the quote.
      await cart.requestQuote(store.info.shippingMethods);
    } finally {
      if (mounted) setState(() => _placing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final cart = context.watch<CartController>();
    final quote = cart.quote;
    final payment = context.select<StoreController, List<String>>((s) => s.info.paymentMethods);

    Widget section(String title, IconData icon, Widget child) => Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Panel(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Icon(icon, color: theme.colorScheme.primary, size: 20),
                const SizedBox(width: 8),
                Text(title, style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w800)),
              ],
            ),
            const SizedBox(height: 14),
            child,
          ],
        ),
      ),
    );

    return Scaffold(
      appBar: AppBar(title: Text(context.t('Checkout'))),
      body: Form(
        key: _form,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            const _Steps(),
            const SizedBox(height: 14),
            section(
              context.t('Contact details'),
              Icons.person_outline_rounded,
              Column(
                children: [
                  TextFormField(
                    controller: _name,
                    textCapitalization: TextCapitalization.words,
                    decoration: InputDecoration(labelText: context.t('Full name')),
                    validator: (v) => (v ?? '').trim().length < 2 ? tr('Enter your name') : null,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _phone,
                    keyboardType: TextInputType.phone,
                    inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9+\s-]')), LengthLimitingTextInputFormatter(20)],
                    decoration: InputDecoration(labelText: context.t('Mobile number'), hintText: '01XXXXXXXXX'),
                    validator: validatePhone,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _email,
                    keyboardType: TextInputType.emailAddress,
                    decoration: InputDecoration(labelText: context.t('Email')),
                    validator: validateEmail,
                  ),
                ],
              ),
            ),
            section(
              context.t('Delivery address'),
              Icons.location_on_outlined,
              _loadingAddresses
                  ? const Column(children: [Skeleton(height: 60), SizedBox(height: 8), Skeleton(height: 60)])
                  : RadioGroup<String?>(
                      groupValue: _selectedId,
                      onChanged: (v) => setState(() => _selectedId = v),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          for (final a in _saved) _AddressOption(address: a, selected: _selectedId == a.id, onTap: () => setState(() => _selectedId = a.id)),
                          if (_saved.isNotEmpty) _NewAddressOption(selected: _selectedId == null, onTap: () => setState(() => _selectedId = null)),
                          if (_selectedId == null) ...[
                            if (_saved.isNotEmpty) const SizedBox(height: 12),
                            AddressFields(controller: _address),
                            if (_saved.length < 10)
                              CheckboxListTile(
                                contentPadding: EdgeInsets.zero,
                                controlAffinity: ListTileControlAffinity.leading,
                                value: _saveAddress,
                                onChanged: (v) => setState(() => _saveAddress = v ?? false),
                                title: Text(context.t('Save this address for next time')),
                              ),
                          ],
                        ],
                      ),
                    ),
            ),
            section(context.t('Delivery method'), Icons.local_shipping_outlined, const ShippingPicker()),
            section(
              context.t('Payment'),
              Icons.payments_outlined,
              Column(
                children: [
                  for (final method in payment)
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        border: Border.all(color: theme.colorScheme.primary, width: 1.5),
                        borderRadius: BorderRadius.circular(12),
                        color: theme.colorScheme.primaryContainer.withValues(alpha: 0.4),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.radio_button_checked_rounded, color: theme.colorScheme.primary),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(context.t(kPaymentLabels[method] ?? method), style: const TextStyle(fontWeight: FontWeight.w700)),
                                if (method == 'cash_on_delivery')
                                  Text(
                                    context.t('Pay in cash when your order arrives.'),
                                    style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                                  ),
                              ],
                            ),
                          ),
                          const Icon(Icons.payments_rounded),
                        ],
                      ),
                    ),
                ],
              ),
            ),
            section(
              context.t('Order notes (optional)'),
              Icons.sticky_note_2_outlined,
              TextFormField(
                controller: _notes,
                minLines: 2,
                maxLines: 4,
                maxLength: 500,
                decoration: InputDecoration(hintText: context.t('Delivery instructions, landmark, preferred time…')),
              ),
            ),
            _ItemsPreview(quote: quote),
            const SizedBox(height: 14),
            OrderTotals(quote: quote, loading: cart.quoting),
            const SizedBox(height: 12),
            Row(
              children: [
                Icon(Icons.shield_outlined, size: 16, color: theme.colorScheme.onSurfaceVariant),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    context.t('Prices, stock and discounts are checked again when you place the order.'),
                    style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: theme.colorScheme.surface,
          border: Border(top: BorderSide(color: theme.colorScheme.outlineVariant)),
        ),
        padding: EdgeInsets.fromLTRB(16, 12, 16, 12 + MediaQuery.paddingOf(context).bottom),
        child: Row(
          children: [
            Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(context.t('To pay'), style: theme.textTheme.labelMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
                Text(quote == null ? '—' : Fmt.money(quote.grandTotal), style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800)),
              ],
            ),
            const SizedBox(width: 16),
            Expanded(
              child: BusyButton(
                label: context.t('Place order'),
                icon: Icons.check_circle_outline_rounded,
                busy: _placing,
                onPressed: cart.isEmpty || cart.quoting ? null : _placeOrder,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Steps extends StatelessWidget {
  const _Steps();

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    Widget step(String label, bool done, bool current) => Column(
      children: [
        CircleAvatar(
          radius: 13,
          backgroundColor: done || current ? scheme.primary : scheme.surfaceContainer,
          child: Icon(done ? Icons.check_rounded : Icons.circle, size: done ? 16 : 8, color: done || current ? scheme.onPrimary : scheme.onSurfaceVariant),
        ),
        const SizedBox(height: 4),
        Text(label, style: TextStyle(fontSize: 11.5, fontWeight: current ? FontWeight.w700 : FontWeight.w500)),
      ],
    );
    Widget line(bool done) => Expanded(
      child: Container(height: 2, margin: const EdgeInsets.only(bottom: 18), color: done ? scheme.primary : scheme.outlineVariant),
    );
    return Row(
      children: [step(context.t('Cart'), true, false), line(true), step(context.t('Details'), false, true), line(false), step(context.t('Done'), false, false)],
    );
  }
}

class _AddressOption extends StatelessWidget {
  const _AddressOption({required this.address, required this.selected, required this.onTap});
  final Address address;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.fromLTRB(4, 8, 12, 8),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: selected ? scheme.primary : scheme.outlineVariant, width: selected ? 1.5 : 1),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Radio<String?>(value: address.id),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(context.t(address.label), style: const TextStyle(fontWeight: FontWeight.w800)),
                        if (address.isDefault) ...[const SizedBox(width: 6), Pill(context.t('Default'))],
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text('${address.name} · ${address.phone}'),
                    Text(address.oneLine, style: TextStyle(color: scheme.onSurfaceVariant, fontSize: 13)),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _NewAddressOption extends StatelessWidget {
  const _NewAddressOption({required this.selected, required this.onTap});
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.fromLTRB(4, 4, 12, 4),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: selected ? scheme.primary : scheme.outlineVariant, width: selected ? 1.5 : 1),
        ),
        child: Row(
          children: [
            const Radio<String?>(value: null),
            Icon(Icons.add_location_alt_outlined, color: scheme.primary, size: 20),
            const SizedBox(width: 8),
            Text(context.t('Use a new address'), style: const TextStyle(fontWeight: FontWeight.w600)),
          ],
        ),
      ),
    );
  }
}

class _ItemsPreview extends StatelessWidget {
  const _ItemsPreview({required this.quote});
  final Quote? quote;

  @override
  Widget build(BuildContext context) {
    final cart = context.watch<CartController>();
    return Panel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(context.t('Items ({n})', {'n': cart.count}), style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w800)),
          const SizedBox(height: 10),
          for (final item in cart.items)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(
                children: [
                  NetImage(item.imageUrl, width: 44, height: 44, radius: 8),
                  const SizedBox(width: 10),
                  Expanded(child: Text(item.name, maxLines: 2, overflow: TextOverflow.ellipsis)),
                  const SizedBox(width: 8),
                  Text('× ${digits(item.quantity)}', style: const TextStyle(fontWeight: FontWeight.w700)),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
