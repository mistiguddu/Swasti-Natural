import 'package:material_ui/material_ui.dart';
import 'package:provider/provider.dart';

import '../core/api.dart';
import '../core/format.dart';
import '../core/i18n.dart';
import '../models/models.dart';
import '../state/cart.dart';
import '../state/wishlist.dart';
import '../widgets/common.dart';
import '../widgets/product_card.dart';
import '../widgets/ui.dart';
import 'main_shell.dart';

class WishlistScreen extends StatefulWidget {
  const WishlistScreen({super.key});

  @override
  State<WishlistScreen> createState() => _WishlistScreenState();
}

class _WishlistScreenState extends State<WishlistScreen> {
  List<Product> _products = [];
  bool _loading = true;
  ApiException? _error;
  String _loadedKey = '';

  Future<void> _load(List<String> ids) async {
    final key = ids.join(',');
    _loadedKey = key;
    if (ids.isEmpty) {
      setState(() {
        _products = [];
        _loading = false;
      });
      return;
    }
    setState(() {
      _loading = _products.isEmpty;
      _error = null;
    });
    try {
      final page = ProductPage.fromJson(asMap(await Api.instance.get('/store/products', {'ids': key, 'limit': 48})));
      if (!mounted || key != _loadedKey) return;
      final order = {for (var i = 0; i < ids.length; i++) ids[i]: i};
      setState(() => _products = page.items..sort((a, b) => (order[a.id] ?? 0).compareTo(order[b.id] ?? 0)));
    } on ApiException catch (error) {
      if (mounted) setState(() => _error = error);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final ids = context.watch<WishlistController>().ids;
    final key = ids.join(',');
    if (key != _loadedKey) WidgetsBinding.instance.addPostFrameCallback((_) => _load(ids));
    final visible = _products.where((p) => ids.contains(p.id)).toList();
    final inStock = visible.where((p) => p.inStock).toList();

    return Scaffold(
      appBar: AppBar(
        title: Text(context.t('Wishlist')),
        actions: [
          if (inStock.isNotEmpty)
            TextButton.icon(
              onPressed: () {
                final cart = context.read<CartController>();
                var added = 0;
                for (final p in inStock) {
                  if (cart.add(p) == AddResult.added) added++;
                }
                context.toast(tr('{n} items added to cart', {'n': added}), actionLabel: tr('View cart'), onAction: () => goToTab(context, AppTab.cart));
              },
              icon: const Icon(Icons.add_shopping_cart_rounded, size: 18),
              label: Text(context.t('Add all')),
            ),
        ],
      ),
      body: _loading && visible.isEmpty && ids.isNotEmpty
          ? const CustomScrollView(
              slivers: [
                SliverToBoxAdapter(child: SizedBox(height: 12)),
                ProductGridSkeleton(count: 4),
              ],
            )
          : _error != null && visible.isEmpty
          ? ErrorView(message: _error!.message, onRetry: () => _load(ids))
          : ids.isEmpty
          ? EmptyState(
              icon: Icons.favorite_border_rounded,
              title: context.t('Your wishlist is empty'),
              message: context.t('Tap the heart on any product to save it for later.'),
              action: FilledButton(onPressed: () => goToTab(context, AppTab.shop), child: Text(context.t('Discover products'))),
            )
          : CustomScrollView(
              slivers: [
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                    child: Text(context.t('{n} saved items', {'n': ids.length}), style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant)),
                  ),
                ),
                ProductGridSliver(products: visible),
                SliverToBoxAdapter(child: SizedBox(height: 24 + MediaQuery.paddingOf(context).bottom)),
              ],
            ),
    );
  }
}
