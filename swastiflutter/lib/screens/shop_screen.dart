import 'dart:async';

import 'package:material_ui/material_ui.dart';
import 'package:provider/provider.dart';

import '../core/api.dart';
import '../core/format.dart';
import '../core/i18n.dart';
import '../models/models.dart';
import '../state/store.dart';
import '../widgets/common.dart';
import '../widgets/product_card.dart';

class ShopFilters {
  const ShopFilters({
    this.category,
    this.search,
    this.sort = 'latest',
    this.onSale = false,
    this.featured = false,
    this.newArrival = false,
    this.bestSelling = false,
    this.inStockOnly = false,
    this.minPrice,
    this.maxPrice,
  });

  final String? category;
  final String? search;
  final String sort;
  final bool onSale;
  final bool featured;
  final bool newArrival;
  final bool bestSelling;
  final bool inStockOnly;
  final num? minPrice;
  final num? maxPrice;

  int get activeCount => [onSale, featured, newArrival, bestSelling, inStockOnly, minPrice != null, maxPrice != null].where((v) => v).length;

  ShopFilters copyWith({
    Object? category = _keep,
    Object? search = _keep,
    String? sort,
    bool? onSale,
    bool? featured,
    bool? newArrival,
    bool? bestSelling,
    bool? inStockOnly,
    Object? minPrice = _keep,
    Object? maxPrice = _keep,
  }) => ShopFilters(
    category: category == _keep ? this.category : category as String?,
    search: search == _keep ? this.search : search as String?,
    sort: sort ?? this.sort,
    onSale: onSale ?? this.onSale,
    featured: featured ?? this.featured,
    newArrival: newArrival ?? this.newArrival,
    bestSelling: bestSelling ?? this.bestSelling,
    inStockOnly: inStockOnly ?? this.inStockOnly,
    minPrice: minPrice == _keep ? this.minPrice : minPrice as num?,
    maxPrice: maxPrice == _keep ? this.maxPrice : maxPrice as num?,
  );

  ShopFilters clearFilters() => ShopFilters(category: category, search: search, sort: sort);

  Map<String, dynamic> toQuery(int page) => {
    'page': page,
    'limit': 20,
    'sort': sort,
    'category': category,
    'search': search?.trim(),
    if (onSale) 'onSale': 'true',
    if (featured) 'featured': 'true',
    if (newArrival) 'newArrival': 'true',
    if (bestSelling) 'bestSelling': 'true',
    if (inStockOnly) 'availability': 'in_stock',
    'minPrice': minPrice,
    'maxPrice': maxPrice,
  };
}

const _keep = Object();

const kSorts = {
  'latest': 'Newest',
  'popular': 'Most popular',
  'rating': 'Top rated',
  'price_asc': 'Price: low to high',
  'price_desc': 'Price: high to low',
  'name': 'Name A–Z',
};

class ShopScreen extends StatefulWidget {
  const ShopScreen({super.key, this.filters = const ShopFilters(), this.title, this.isTab = false, this.autofocusSearch = false});
  final ShopFilters filters;
  final String? title;
  final bool isTab;
  final bool autofocusSearch;

  @override
  State<ShopScreen> createState() => _ShopScreenState();
}

class _ShopScreenState extends State<ShopScreen> {
  late ShopFilters _filters = widget.filters;
  late final _search = TextEditingController(text: widget.filters.search ?? '');
  final _scroll = ScrollController();
  Timer? _debounce;

  final List<Product> _items = [];
  Pagination? _pagination;
  Category? _category;
  num _priceMin = 0;
  num _priceMax = 0;
  bool _loading = true;
  bool _loadingMore = false;
  ApiException? _error;
  int _seq = 0;

  @override
  void initState() {
    super.initState();
    _scroll.addListener(() {
      if (_scroll.position.pixels > _scroll.position.maxScrollExtent - 600) _loadMore();
    });
    _load();
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _search.dispose();
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final seq = ++_seq;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final page = ProductPage.fromJson(asMap(await Api.instance.get('/store/products', _filters.toQuery(1))));
      if (seq != _seq || !mounted) return;
      setState(() {
        _items
          ..clear()
          ..addAll(page.items);
        _pagination = page.pagination;
        _category = page.category;
        if (_filters.minPrice == null && _filters.maxPrice == null) {
          _priceMin = page.minPrice;
          _priceMax = page.maxPrice;
        }
      });
    } on ApiException catch (error) {
      if (seq == _seq && mounted) setState(() => _error = error);
    } finally {
      if (seq == _seq && mounted) setState(() => _loading = false);
    }
  }

  Future<void> _loadMore() async {
    final pagination = _pagination;
    if (_loading || _loadingMore || pagination == null || !pagination.hasMore) return;
    final seq = _seq;
    setState(() => _loadingMore = true);
    try {
      final page = ProductPage.fromJson(asMap(await Api.instance.get('/store/products', _filters.toQuery(pagination.page + 1))));
      if (seq != _seq || !mounted) return;
      setState(() {
        final known = _items.map((p) => p.id).toSet();
        _items.addAll(page.items.where((p) => !known.contains(p.id)));
        _pagination = page.pagination;
      });
    } catch (_) {
      // Keep what we have; scrolling again retries.
    } finally {
      if (mounted) setState(() => _loadingMore = false);
    }
  }

  void _apply(ShopFilters filters) {
    setState(() => _filters = filters);
    if (_scroll.hasClients) _scroll.jumpTo(0);
    _load();
  }

  void _onSearch(String value) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 400), () => _apply(_filters.copyWith(search: value.trim().isEmpty ? null : value.trim())));
  }

  String _title(BuildContext context) {
    if (widget.title != null) return widget.title!;
    if (_category != null) return _category!.name;
    return context.t('Shop');
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final bottom = MediaQuery.paddingOf(context).bottom;
    final store = context.watch<StoreController>();
    final subcategories = _category != null ? store.childrenOf(_category!.id) : <Category>[];
    final total = _pagination?.total;

    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: !widget.isTab,
        title: Text(_title(context)),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(64),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
            child: TextField(
              controller: _search,
              autofocus: widget.autofocusSearch,
              textInputAction: TextInputAction.search,
              onChanged: _onSearch,
              onSubmitted: (v) {
                _debounce?.cancel();
                _apply(_filters.copyWith(search: v.trim().isEmpty ? null : v.trim()));
              },
              decoration: InputDecoration(
                hintText: context.t('Search products, brands…'),
                prefixIcon: const Icon(Icons.search_rounded),
                suffixIcon: ListenableBuilder(
                  listenable: _search,
                  builder: (_, _) => _search.text.isEmpty
                      ? const SizedBox.shrink()
                      : IconButton(
                          tooltip: context.t('Clear'),
                          icon: const Icon(Icons.close_rounded),
                          onPressed: () {
                            _search.clear();
                            _apply(_filters.copyWith(search: null));
                          },
                        ),
                ),
              ),
            ),
          ),
        ),
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: CustomScrollView(
          controller: _scroll,
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(12, 12, 12, 4),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        total == null ? '' : context.t('{n} products', {'n': total}),
                        style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                      ),
                    ),
                    _ToolbarButton(icon: Icons.swap_vert_rounded, label: context.t(kSorts[_filters.sort] ?? 'Sort'), onTap: () => _pickSort(context)),
                    const SizedBox(width: 8),
                    _ToolbarButton(
                      icon: Icons.tune_rounded,
                      label: _filters.activeCount > 0 ? context.t('Filters ({n})', {'n': _filters.activeCount}) : context.t('Filters'),
                      highlighted: _filters.activeCount > 0,
                      onTap: () => _openFilters(context),
                    ),
                  ],
                ),
              ),
            ),
            if (subcategories.isNotEmpty)
              SliverToBoxAdapter(
                child: SizedBox(
                  height: 48,
                  child: ListView(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    children: [
                      for (final sub in subcategories)
                        Padding(
                          padding: const EdgeInsets.only(right: 8),
                          child: ActionChip(
                            label: Text(sub.name),
                            onPressed: () => Navigator.of(context).push(
                              MaterialPageRoute(
                                builder: (_) => ShopScreen(
                                  filters: ShopFilters(category: sub.slug),
                                  title: sub.name,
                                ),
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            const SliverToBoxAdapter(child: SizedBox(height: 8)),
            if (_loading && _items.isEmpty) const ProductGridSkeleton(),
            if (_error != null && _items.isEmpty)
              SliverFillRemaining(
                hasScrollBody: false,
                child: ErrorView(message: _error!.message, onRetry: _load),
              ),
            if (!_loading && _error == null && _items.isEmpty)
              SliverFillRemaining(
                hasScrollBody: false,
                child: EmptyState(
                  icon: Icons.search_off_rounded,
                  title: context.t('No products found'),
                  message: context.t('Try a different search or clear the filters.'),
                  action: (_filters.activeCount > 0 || (_filters.search ?? '').isNotEmpty)
                      ? OutlinedButton(
                          onPressed: () {
                            _search.clear();
                            _apply(_filters.clearFilters().copyWith(search: null));
                          },
                          child: Text(context.t('Clear all')),
                        )
                      : null,
                ),
              ),
            if (_items.isNotEmpty) ProductGridSliver(products: _items),
            if (_loadingMore)
              const SliverToBoxAdapter(
                child: Padding(
                  padding: EdgeInsets.all(20),
                  child: Center(child: CircularProgressIndicator()),
                ),
              ),
            SliverToBoxAdapter(child: SizedBox(height: bottom + 24)),
          ],
        ),
      ),
    );
  }

  Future<void> _pickSort(BuildContext context) async {
    final value = await showModalBottomSheet<String>(
      context: context,
      builder: (ctx) => SafeArea(
        child: RadioGroup<String>(
          groupValue: _filters.sort,
          onChanged: (v) => Navigator.pop(ctx, v),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: Text(ctx.t('Sort by'), style: Theme.of(ctx).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800)),
                ),
              ),
              for (final entry in kSorts.entries) RadioListTile<String>(value: entry.key, title: Text(ctx.t(entry.value))),
              const SizedBox(height: 8),
            ],
          ),
        ),
      ),
    );
    if (value != null && value != _filters.sort) _apply(_filters.copyWith(sort: value));
  }

  Future<void> _openFilters(BuildContext context) async {
    final result = await showModalBottomSheet<ShopFilters>(
      context: context,
      isScrollControlled: true,
      builder: (_) => _FilterSheet(filters: _filters, min: _priceMin, max: _priceMax),
    );
    if (result != null) _apply(result);
  }
}

class _ToolbarButton extends StatelessWidget {
  const _ToolbarButton({required this.icon, required this.label, required this.onTap, this.highlighted = false});
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final bool highlighted;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Material(
      color: highlighted ? scheme.primaryContainer : scheme.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(10),
        side: BorderSide(color: highlighted ? scheme.primary : scheme.outlineVariant),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(10),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 17, color: scheme.primary),
              const SizedBox(width: 5),
              ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 130),
                child: Text(
                  label,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _FilterSheet extends StatefulWidget {
  const _FilterSheet({required this.filters, required this.min, required this.max});
  final ShopFilters filters;
  final num min;
  final num max;

  @override
  State<_FilterSheet> createState() => _FilterSheetState();
}

class _FilterSheetState extends State<_FilterSheet> {
  late ShopFilters _f = widget.filters;
  late final _minCtrl = TextEditingController(text: widget.filters.minPrice?.toString() ?? '');
  late final _maxCtrl = TextEditingController(text: widget.filters.maxPrice?.toString() ?? '');

  @override
  void dispose() {
    _minCtrl.dispose();
    _maxCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final categories = context.watch<StoreController>().topCategories;

    Widget toggle(String label, bool value, ValueChanged<bool> onChanged) =>
        SwitchListTile(contentPadding: EdgeInsets.zero, title: Text(label), value: value, onChanged: (v) => setState(() => onChanged(v)));

    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(context.t('Filters'), style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800)),
                  ),
                  TextButton(
                    onPressed: () {
                      _minCtrl.clear();
                      _maxCtrl.clear();
                      setState(() => _f = _f.clearFilters());
                    },
                    child: Text(context.t('Reset')),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              if (categories.isNotEmpty) ...[
                Text(context.t('Category'), style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700)),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    ChoiceChip(
                      label: Text(context.t('All')),
                      selected: _f.category == null,
                      onSelected: (_) => setState(() => _f = _f.copyWith(category: null)),
                    ),
                    for (final c in categories)
                      ChoiceChip(
                        label: Text(c.name),
                        selected: _f.category == c.slug,
                        onSelected: (_) => setState(() => _f = _f.copyWith(category: c.slug)),
                      ),
                  ],
                ),
                const SizedBox(height: 16),
              ],
              Text(context.t('Price range'), style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700)),
              if (widget.max > 0)
                Padding(
                  padding: const EdgeInsets.only(top: 2),
                  child: Text(
                    context.t('From {min} to {max}', {'min': Fmt.money(widget.min), 'max': Fmt.money(widget.max)}),
                    style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                  ),
                ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _minCtrl,
                      keyboardType: TextInputType.number,
                      decoration: InputDecoration(labelText: context.t('Min'), prefixText: Fmt.currencySymbol),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextField(
                      controller: _maxCtrl,
                      keyboardType: TextInputType.number,
                      decoration: InputDecoration(labelText: context.t('Max'), prefixText: Fmt.currencySymbol),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              toggle(context.t('In stock only'), _f.inStockOnly, (v) => _f = _f.copyWith(inStockOnly: v)),
              toggle(context.t('On sale'), _f.onSale, (v) => _f = _f.copyWith(onSale: v)),
              toggle(context.t('Featured'), _f.featured, (v) => _f = _f.copyWith(featured: v)),
              toggle(context.t('New arrivals'), _f.newArrival, (v) => _f = _f.copyWith(newArrival: v)),
              toggle(context.t('Best selling'), _f.bestSelling, (v) => _f = _f.copyWith(bestSelling: v)),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: () {
                    final min = num.tryParse(_minCtrl.text.trim());
                    final max = num.tryParse(_maxCtrl.text.trim());
                    Navigator.pop(context, _f.copyWith(minPrice: min, maxPrice: max));
                  },
                  child: Text(context.t('Show results')),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
