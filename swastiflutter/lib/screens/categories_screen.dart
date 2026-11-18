import 'package:material_ui/material_ui.dart';
import 'package:provider/provider.dart';

import '../core/i18n.dart';
import '../models/models.dart';
import '../state/store.dart';
import '../widgets/common.dart';
import '../widgets/ui.dart';
import 'shop_screen.dart';

class CategoriesScreen extends StatelessWidget {
  const CategoriesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final store = context.watch<StoreController>();
    final top = store.topCategories;
    final bottom = MediaQuery.paddingOf(context).bottom;

    return Scaffold(
      appBar: AppBar(title: Text(context.t('Categories'))),
      body: RefreshIndicator(
        onRefresh: store.load,
        child: top.isEmpty
            ? ListView(
                children: [
                  const SizedBox(height: 80),
                  store.loaded
                      ? EmptyState(icon: Icons.category_outlined, title: context.t('No categories yet'), message: context.t('Pull down to refresh.'))
                      : const Center(child: CircularProgressIndicator()),
                ],
              )
            : ListView.separated(
                padding: EdgeInsets.fromLTRB(16, 12, 16, bottom + 24),
                itemCount: top.length + 1,
                separatorBuilder: (_, _) => const SizedBox(height: 12),
                itemBuilder: (context, i) {
                  if (i == 0) {
                    return _AllProductsTile(onTap: () => context.push(ShopScreen(title: context.t('All products'))));
                  }
                  final category = top[i - 1];
                  return _CategoryTile(category: category, children: store.childrenOf(category.id));
                },
              ),
      ),
    );
  }
}

class _AllProductsTile extends StatelessWidget {
  const _AllProductsTile({required this.onTap});
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final palette = context.watch<StoreController>().palette;
    return Material(
      borderRadius: BorderRadius.circular(16),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Ink(
          decoration: BoxDecoration(gradient: LinearGradient(colors: [palette.dark, palette.main])),
          padding: const EdgeInsets.all(18),
          child: Row(
            children: [
              const Icon(Icons.storefront_rounded, color: Colors.white, size: 30),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      context.t('All products'),
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 16),
                    ),
                    Text(context.t('Browse the full collection'), style: const TextStyle(color: Colors.white70, fontSize: 12.5)),
                  ],
                ),
              ),
              const Icon(Icons.arrow_forward_rounded, color: Colors.white),
            ],
          ),
        ),
      ),
    );
  }
}

class _CategoryTile extends StatelessWidget {
  const _CategoryTile({required this.category, required this.children});
  final Category category;
  final List<Category> children;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    void open(Category c) => context.push(
      ShopScreen(
        filters: ShopFilters(category: c.slug),
        title: c.name,
      ),
    );

    return Card(
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          InkWell(
            onTap: () => open(category),
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Row(
                children: [
                  SizedBox(
                    width: 68,
                    height: 68,
                    child: category.imageUrl.isEmpty
                        ? Container(
                            decoration: BoxDecoration(color: theme.colorScheme.primaryContainer, borderRadius: BorderRadius.circular(14)),
                            child: Icon(Icons.spa_outlined, color: theme.colorScheme.primary, size: 30),
                          )
                        : NetImage(category.imageUrl, radius: 14),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(category.name, style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
                        if (category.shortDescription.isNotEmpty)
                          Text(
                            category.shortDescription,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                          ),
                        if (category.productCount != null)
                          Padding(
                            padding: const EdgeInsets.only(top: 4),
                            child: Text(
                              context.t('{n} products', {'n': category.productCount}),
                              style: theme.textTheme.labelSmall?.copyWith(color: theme.colorScheme.primary, fontWeight: FontWeight.w700),
                            ),
                          ),
                      ],
                    ),
                  ),
                  Icon(Icons.chevron_right_rounded, color: theme.colorScheme.onSurfaceVariant),
                ],
              ),
            ),
          ),
          if (children.isNotEmpty)
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
              child: Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final child in children)
                    ActionChip(
                      visualDensity: VisualDensity.compact,
                      label: Text(child.productCount != null ? '${child.name} · ${digits(child.productCount!)}' : child.name),
                      onPressed: () => open(child),
                    ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
