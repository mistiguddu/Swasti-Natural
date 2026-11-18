import 'dart:convert';

import 'package:material_ui/material_ui.dart';
import 'package:provider/provider.dart';

import '../core/api.dart';
import '../core/format.dart';
import '../core/i18n.dart';
import '../core/theme.dart';
import '../models/models.dart';
import '../state/cart.dart';
import '../state/prefs.dart';
import '../state/wishlist.dart';
import '../widgets/common.dart';
import '../widgets/product_card.dart';
import '../widgets/ui.dart';
import 'cart_screen.dart';
import 'checkout_screen.dart';
import 'reviews.dart';
import 'shop_screen.dart';

const _kRecent = 'swasti_recently_viewed';

class ProductScreen extends StatefulWidget {
  const ProductScreen({super.key, required this.slug, this.preview});
  final String slug;

  /// Card data shown instantly while the full details load.
  final Product? preview;

  @override
  State<ProductScreen> createState() => _ProductScreenState();
}

class _ProductScreenState extends State<ProductScreen> {
  Product? _product;
  ApiException? _error;
  bool _loading = true;
  int _quantity = 1;
  int _image = 0;
  List<Product> _recent = [];

  @override
  void initState() {
    super.initState();
    _product = widget.preview;
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final product = Product.fromJson(asMap(await Api.instance.get('/store/products/${Uri.encodeComponent(widget.slug)}')));
      if (!mounted) return;
      setState(() => _product = product);
      _rememberViewed(product.id);
    } on ApiException catch (error) {
      if (mounted) setState(() => _error = error);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _rememberViewed(String id) {
    final prefs = context.read<PrefsController>().raw;
    List<String> list;
    try {
      list = asStrList(jsonDecode(prefs.getString(_kRecent) ?? '[]'));
    } catch (_) {
      list = [];
    }
    final others = list.where((x) => x != id).take(8).toList();
    prefs.setString(_kRecent, jsonEncode([id, ...list.where((x) => x != id)].take(12).toList()));
    if (others.isEmpty) return;
    Api.instance
        .get('/store/products', {'ids': others.join(','), 'limit': 8})
        .then((data) {
          if (mounted) setState(() => _recent = ProductPage.fromJson(asMap(data)).items);
        })
        .catchError((_) {});
  }

  @override
  Widget build(BuildContext context) {
    final product = _product;
    if (product == null) {
      return Scaffold(
        appBar: AppBar(),
        body: _error != null ? ErrorView(message: _error!.message, onRetry: _load) : const Center(child: CircularProgressIndicator()),
      );
    }
    final theme = Theme.of(context);
    final saved = context.select<WishlistController, bool>((w) => w.has(product.id));
    final inCart = context.select<CartController, int>((c) => c.quantityOf(product.id));
    final images = product.images.isEmpty ? [''] : product.images;
    final maxQty = product.availableQuantity ?? 99;

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            pinned: true,
            expandedHeight: MediaQuery.sizeOf(context).width,
            backgroundColor: theme.colorScheme.surface,
            leading: const Padding(padding: EdgeInsets.all(6), child: _CircleBack()),
            actions: [
              _CircleAction(
                icon: saved ? Icons.favorite_rounded : Icons.favorite_border_rounded,
                color: saved ? kDanger : null,
                tooltip: context.t('Wishlist'),
                onTap: () => toggleWishlist(context, product),
              ),
              _CircleAction(
                icon: Icons.shopping_bag_outlined,
                tooltip: context.t('Cart'),
                badge: context.select<CartController, int>((c) => c.count),
                onTap: () => context.push(const CartScreen()),
              ),
              const SizedBox(width: 8),
            ],
            flexibleSpace: FlexibleSpaceBar(
              background: Stack(
                fit: StackFit.expand,
                children: [
                  PageView.builder(
                    itemCount: images.length,
                    onPageChanged: (i) => setState(() => _image = i),
                    itemBuilder: (_, i) => GestureDetector(
                      onTap: () => _openViewer(context, images, i),
                      child: NetImage(images[i], fit: BoxFit.cover),
                    ),
                  ),
                  if (images.length > 1)
                    Positioned(
                      bottom: 14,
                      left: 0,
                      right: 0,
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: List.generate(
                          images.length,
                          (i) => AnimatedContainer(
                            duration: const Duration(milliseconds: 200),
                            margin: const EdgeInsets.symmetric(horizontal: 3),
                            width: i == _image ? 18 : 6,
                            height: 6,
                            decoration: BoxDecoration(color: i == _image ? theme.colorScheme.primary : Colors.white70, borderRadius: BorderRadius.circular(99)),
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: [
                      if (product.category != null)
                        InkWell(
                          onTap: () => context.push(
                            ShopScreen(
                              filters: ShopFilters(category: product.category!.slug),
                              title: product.category!.name,
                            ),
                          ),
                          child: Pill(product.category!.name, icon: Icons.sell_outlined),
                        ),
                      if (product.savePercent > 0)
                        Pill(context.t('Save {n}%', {'n': product.savePercent}), color: kDanger.withValues(alpha: 0.12), textColor: kDanger),
                      if (product.isNewArrival) Pill(context.t('New')),
                      if (product.isBestSelling) Pill(context.t('Best seller'), color: kAccent.withValues(alpha: 0.2), textColor: const Color(0xFF92400E)),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Text(product.name, style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800, height: 1.2)),
                  if (product.brand.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Text(context.t('by {brand}', {'brand': product.brand}), style: TextStyle(color: theme.colorScheme.onSurfaceVariant)),
                    ),
                  const SizedBox(height: 10),
                  if (product.ratingCount > 0)
                    Row(
                      children: [
                        Stars(rating: product.ratingAverage, size: 18),
                        const SizedBox(width: 6),
                        Text(digits(product.ratingAverage.toStringAsFixed(1)), style: const TextStyle(fontWeight: FontWeight.w700)),
                        const SizedBox(width: 4),
                        Text(context.t('({n} reviews)', {'n': product.ratingCount}), style: TextStyle(color: theme.colorScheme.onSurfaceVariant)),
                      ],
                    ),
                  const SizedBox(height: 12),
                  PriceTag(price: product.price, regularPrice: product.regularPrice, size: 26),
                  const SizedBox(height: 10),
                  _StockLine(product: product),
                  if (product.shortDescription.isNotEmpty) ...[
                    const SizedBox(height: 14),
                    Text(product.shortDescription, style: theme.textTheme.bodyLarge?.copyWith(height: 1.45, color: theme.colorScheme.onSurfaceVariant)),
                  ],
                  if (product.inStock) ...[
                    const SizedBox(height: 18),
                    Row(
                      children: [
                        Text(context.t('Quantity'), style: const TextStyle(fontWeight: FontWeight.w700)),
                        const Spacer(),
                        QuantityStepper(value: _quantity, max: maxQty, onChanged: (v) => setState(() => _quantity = v)),
                      ],
                    ),
                    if (inCart > 0)
                      Padding(
                        padding: const EdgeInsets.only(top: 6),
                        child: Text(context.t('{n} already in your cart', {'n': inCart}), style: TextStyle(color: theme.colorScheme.primary, fontSize: 12.5)),
                      ),
                  ],
                  const SizedBox(height: 18),
                  const _Assurances(),
                ],
              ),
            ),
          ),
          SliverToBoxAdapter(child: _DetailSections(product: product)),
          if (_loading && widget.preview != null)
            const SliverToBoxAdapter(
              child: Padding(padding: EdgeInsets.all(16), child: LinearProgressIndicator()),
            ),
          if (product.id.isNotEmpty) SliverToBoxAdapter(child: ReviewsSection(product: product)),
          if (product.frequentlyBoughtTogether.isNotEmpty) ...[
            SliverToBoxAdapter(child: SectionHeader(title: context.t('Frequently bought together'))),
            SliverToBoxAdapter(child: ProductRail(products: product.frequentlyBoughtTogether)),
          ],
          if (product.related.isNotEmpty) ...[
            SliverToBoxAdapter(child: SectionHeader(title: context.t('You may also like'))),
            SliverToBoxAdapter(child: ProductRail(products: product.related)),
          ],
          if (_recent.isNotEmpty) ...[
            SliverToBoxAdapter(child: SectionHeader(title: context.t('Recently viewed'))),
            SliverToBoxAdapter(child: ProductRail(products: _recent)),
          ],
          const SliverToBoxAdapter(child: SizedBox(height: 120)),
        ],
      ),
      bottomNavigationBar: _BuyBar(product: product, quantity: _quantity),
    );
  }

  void _openViewer(BuildContext context, List<String> images, int initial) {
    if (images.first.isEmpty) return;
    Navigator.of(context).push(
      PageRouteBuilder(
        opaque: false,
        pageBuilder: (_, _, _) => _ImageViewer(images: images, initial: initial),
        transitionsBuilder: (_, a, _, child) => FadeTransition(opacity: a, child: child),
      ),
    );
  }
}

class _CircleBack extends StatelessWidget {
  const _CircleBack();
  @override
  Widget build(BuildContext context) {
    return Material(
      color: Theme.of(context).colorScheme.surface.withValues(alpha: 0.92),
      shape: const CircleBorder(),
      child: IconButton(tooltip: context.t('Back'), onPressed: () => Navigator.maybePop(context), icon: const Icon(Icons.arrow_back_rounded)),
    );
  }
}

class _CircleAction extends StatelessWidget {
  const _CircleAction({required this.icon, required this.onTap, required this.tooltip, this.color, this.badge = 0});
  final IconData icon;
  final VoidCallback onTap;
  final String tooltip;
  final Color? color;
  final int badge;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(left: 6),
      child: Material(
        color: Theme.of(context).colorScheme.surface.withValues(alpha: 0.92),
        shape: const CircleBorder(),
        child: IconButton(
          tooltip: tooltip,
          onPressed: onTap,
          icon: Badge(
            isLabelVisible: badge > 0,
            label: Text(digits(badge)),
            child: Icon(icon, color: color),
          ),
        ),
      ),
    );
  }
}

class _StockLine extends StatelessWidget {
  const _StockLine({required this.product});
  final Product product;

  @override
  Widget build(BuildContext context) {
    final (icon, color, text) = !product.inStock
        ? (Icons.cancel_outlined, kDanger, context.t('Out of stock'))
        : product.lowStock
        ? (Icons.warning_amber_rounded, const Color(0xFFD97706), context.t('Only {n} left — order soon', {'n': product.availableQuantity ?? 0}))
        : (Icons.check_circle_outline_rounded, kSuccess, context.t('In stock'));
    return Row(
      children: [
        Icon(icon, size: 18, color: color),
        const SizedBox(width: 6),
        Text(
          text,
          style: TextStyle(color: color, fontWeight: FontWeight.w600),
        ),
      ],
    );
  }
}

class _Assurances extends StatelessWidget {
  const _Assurances();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final items = [
      (Icons.payments_outlined, context.t('Cash on delivery')),
      (Icons.local_shipping_outlined, context.t('Delivery across Bangladesh')),
      (Icons.verified_outlined, context.t('Genuine products')),
    ];
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
      decoration: BoxDecoration(color: theme.colorScheme.surfaceContainerLow, borderRadius: BorderRadius.circular(14)),
      child: Row(
        children: [
          for (final (icon, label) in items)
            Expanded(
              child: Column(
                children: [
                  Icon(icon, color: theme.colorScheme.primary, size: 22),
                  const SizedBox(height: 4),
                  Text(
                    label,
                    textAlign: TextAlign.center,
                    style: theme.textTheme.labelSmall?.copyWith(fontWeight: FontWeight.w600),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class _DetailSections extends StatelessWidget {
  const _DetailSections({required this.product});
  final Product product;

  @override
  Widget build(BuildContext context) {
    final details = <(String, String)>[
      if (product.sku.isNotEmpty) (context.t('SKU'), product.sku),
      if (product.brand.isNotEmpty) (context.t('Brand'), product.brand),
      if (product.weight > 0) (context.t('Weight'), '${digits(product.weight)} ${context.t('kg')}'),
      if (product.material.isNotEmpty) (context.t('Material'), product.material),
      if (product.sizes.isNotEmpty) (context.t('Sizes'), product.sizes.join(', ')),
      if (product.colors.isNotEmpty) (context.t('Colours'), product.colors.join(', ')),
      if (product.warranty.isNotEmpty) (context.t('Warranty'), product.warranty),
    ];
    final sections = <(IconData, String, Widget)>[
      if (product.description.isNotEmpty) (Icons.description_outlined, context.t('Description'), _Body(product.description)),
      if (product.benefits.isNotEmpty) (Icons.favorite_outline_rounded, context.t('Benefits'), _Body(product.benefits)),
      if (product.ingredients.isNotEmpty) (Icons.eco_outlined, context.t('Ingredients'), _Body(product.ingredients)),
      if (product.howToUse.isNotEmpty) (Icons.lightbulb_outline_rounded, context.t('How to use'), _Body(product.howToUse)),
      if (details.isNotEmpty) (Icons.info_outline_rounded, context.t('Product details'), Column(children: [for (final (k, v) in details) InfoRow(k, v)])),
    ];
    if (sections.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 0),
      child: Card(
        clipBehavior: Clip.antiAlias,
        child: Column(
          children: [
            for (var i = 0; i < sections.length; i++) ...[
              if (i > 0) const Divider(height: 1),
              Theme(
                data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
                child: ExpansionTile(
                  initiallyExpanded: i == 0,
                  leading: Icon(sections[i].$1, color: Theme.of(context).colorScheme.primary),
                  title: Text(sections[i].$2, style: const TextStyle(fontWeight: FontWeight.w700)),
                  childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                  expandedCrossAxisAlignment: CrossAxisAlignment.start,
                  children: [sections[i].$3],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Plain-text body. Strips basic HTML tags in case the description was written with formatting.
class _Body extends StatelessWidget {
  const _Body(this.text);
  final String text;

  @override
  Widget build(BuildContext context) {
    final clean = text
        .replaceAll(RegExp(r'<br\s*/?>', caseSensitive: false), '\n')
        .replaceAll(RegExp(r'</(p|li|h\d)>', caseSensitive: false), '\n')
        .replaceAll(RegExp(r'<li[^>]*>', caseSensitive: false), '• ')
        .replaceAll(RegExp(r'<[^>]+>'), '')
        .replaceAll('&nbsp;', ' ')
        .replaceAll('&amp;', '&')
        .replaceAll(RegExp(r'\n{3,}'), '\n\n')
        .trim();
    return SelectableText(clean, style: Theme.of(context).textTheme.bodyMedium?.copyWith(height: 1.55));
  }
}

class _BuyBar extends StatelessWidget {
  const _BuyBar({required this.product, required this.quantity});
  final Product product;
  final int quantity;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        border: Border(top: BorderSide(color: theme.colorScheme.outlineVariant)),
        boxShadow: const [BoxShadow(color: Color(0x14000000), blurRadius: 16, offset: Offset(0, -4))],
      ),
      padding: EdgeInsets.fromLTRB(16, 12, 16, 12 + MediaQuery.paddingOf(context).bottom),
      child: !product.inStock
          ? FilledButton.tonalIcon(
              onPressed: () => toggleWishlist(context, product),
              icon: const Icon(Icons.favorite_border_rounded),
              label: Text(context.t('Out of stock — save for later')),
            )
          : Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => addToCart(context, product, quantity: quantity, onViewCart: () => context.push(const CartScreen())),
                    icon: const Icon(Icons.add_shopping_cart_rounded),
                    label: Text(context.t('Add to cart')),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: FilledButton.icon(
                    onPressed: () async {
                      final cart = context.read<CartController>();
                      final have = cart.quantityOf(product.id);
                      if (have < quantity) {
                        final result = cart.add(product, quantity - have);
                        if (result == AddResult.outOfStock) return;
                      }
                      if (!await context.requireSignIn() || !context.mounted) return;
                      await context.push(const CheckoutScreen());
                    },
                    icon: const Icon(Icons.flash_on_rounded),
                    label: Text(context.t('Buy now')),
                  ),
                ),
              ],
            ),
    );
  }
}

class _ImageViewer extends StatelessWidget {
  const _ImageViewer({required this.images, required this.initial});
  final List<String> images;
  final int initial;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(backgroundColor: Colors.black, foregroundColor: Colors.white),
      body: PageView.builder(
        controller: PageController(initialPage: initial),
        itemCount: images.length,
        itemBuilder: (_, i) => InteractiveViewer(
          maxScale: 4,
          child: Center(child: NetImage(images[i], fit: BoxFit.contain)),
        ),
      ),
    );
  }
}
