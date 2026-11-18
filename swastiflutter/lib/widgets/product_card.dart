import 'package:material_ui/material_ui.dart';
import 'package:provider/provider.dart';

import '../core/i18n.dart';
import '../core/theme.dart';
import '../models/models.dart';
import '../screens/product_screen.dart';
import '../state/cart.dart';
import '../state/wishlist.dart';
import 'common.dart';
import 'ui.dart';

class ProductCard extends StatelessWidget {
  const ProductCard({super.key, required this.product, this.width});
  final Product product;
  final double? width;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final saved = context.select<WishlistController, bool>((w) => w.has(product.id));
    final inCart = context.select<CartController, int>((c) => c.quantityOf(product.id));

    return SizedBox(
      width: width,
      child: Card(
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: () => context.push(ProductScreen(slug: product.slug, preview: product)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              AspectRatio(
                aspectRatio: 1,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    NetImage(product.cardImage),
                    if (!product.inStock)
                      Container(
                        color: Colors.black.withValues(alpha: 0.45),
                        alignment: Alignment.center,
                        child: Pill(context.t('Out of stock'), color: Colors.white, textColor: Colors.black87),
                      ),
                    Positioned(
                      top: 8,
                      left: 8,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (product.savePercent > 0)
                            Pill('-${digits(product.savePercent)}%', color: kDanger, textColor: Colors.white)
                          else if (product.isNewArrival)
                            Pill(context.t('New'), color: scheme.primary, textColor: scheme.onPrimary),
                        ],
                      ),
                    ),
                    Positioned(
                      top: 4,
                      right: 4,
                      child: Material(
                        color: scheme.surface.withValues(alpha: 0.92),
                        shape: const CircleBorder(),
                        child: IconButton(
                          visualDensity: VisualDensity.compact,
                          iconSize: 19,
                          tooltip: saved ? context.t('Remove from wishlist') : context.t('Save to wishlist'),
                          onPressed: () => toggleWishlist(context, product),
                          icon: Icon(saved ? Icons.favorite_rounded : Icons.favorite_border_rounded, color: saved ? kDanger : scheme.onSurfaceVariant),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(10, 8, 10, 0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (product.category != null)
                        Text(
                          product.category!.name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: theme.textTheme.labelSmall?.copyWith(color: scheme.onSurfaceVariant),
                        ),
                      const SizedBox(height: 2),
                      Text(
                        product.name,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600, height: 1.25),
                      ),
                      const SizedBox(height: 4),
                      if (product.ratingCount > 0)
                        Row(
                          children: [
                            Stars(rating: product.ratingAverage, size: 12),
                            const SizedBox(width: 4),
                            Text('(${digits(product.ratingCount)})', style: theme.textTheme.labelSmall?.copyWith(color: scheme.onSurfaceVariant)),
                          ],
                        ),
                      const Spacer(),
                    ],
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(10, 0, 6, 8),
                child: Row(
                  children: [
                    Expanded(
                      child: PriceTag(price: product.price, regularPrice: product.regularPrice, size: 15),
                    ),
                    SizedBox(
                      width: 38,
                      height: 38,
                      child: IconButton.filled(
                        padding: EdgeInsets.zero,
                        iconSize: 19,
                        tooltip: context.t('Add to cart'),
                        onPressed: product.inStock ? () => addToCart(context, product) : null,
                        icon: inCart > 0
                            ? Text(digits(inCart), style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14))
                            : const Icon(Icons.add_shopping_cart_rounded),
                      ),
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
}

/// Two-column product grid as a sliver.
class ProductGridSliver extends StatelessWidget {
  const ProductGridSliver({super.key, required this.products});
  final List<Product> products;

  @override
  Widget build(BuildContext context) {
    return SliverPadding(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      sliver: SliverGrid(
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2, mainAxisSpacing: 12, crossAxisSpacing: 12, mainAxisExtent: 318),
        delegate: SliverChildBuilderDelegate((context, i) => ProductCard(product: products[i]), childCount: products.length),
      ),
    );
  }
}

/// Horizontal product carousel.
class ProductRail extends StatelessWidget {
  const ProductRail({super.key, required this.products});
  final List<Product> products;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 318,
      child: ListView.separated(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        scrollDirection: Axis.horizontal,
        itemCount: products.length,
        separatorBuilder: (_, _) => const SizedBox(width: 12),
        itemBuilder: (context, i) => ProductCard(product: products[i], width: 168),
      ),
    );
  }
}

class ProductGridSkeleton extends StatelessWidget {
  const ProductGridSkeleton({super.key, this.count = 6});
  final int count;

  @override
  Widget build(BuildContext context) {
    return SliverPadding(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      sliver: SliverGrid(
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2, mainAxisSpacing: 12, crossAxisSpacing: 12, mainAxisExtent: 318),
        delegate: SliverChildBuilderDelegate(
          (context, i) => const Card(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                AspectRatio(aspectRatio: 1, child: Skeleton(radius: 0)),
                Padding(padding: EdgeInsets.fromLTRB(10, 12, 40, 0), child: Skeleton(height: 12)),
                Padding(padding: EdgeInsets.fromLTRB(10, 8, 20, 0), child: Skeleton(height: 14)),
                Padding(padding: EdgeInsets.fromLTRB(10, 20, 70, 0), child: Skeleton(height: 16)),
              ],
            ),
          ),
          childCount: count,
        ),
      ),
    );
  }
}
