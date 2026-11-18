import 'dart:async';

import 'package:material_ui/material_ui.dart';
import 'package:provider/provider.dart';

import '../core/api.dart';
import '../core/format.dart';
import '../core/i18n.dart';
import '../models/models.dart' as m;
import '../state/auth.dart';
import '../state/store.dart';
import '../state/wishlist.dart';
import '../widgets/common.dart';
import '../widgets/product_card.dart';
import '../widgets/ui.dart';
import 'chat_screen.dart';
import 'links.dart';
import 'main_shell.dart';
import 'shop_screen.dart';
import 'wishlist_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  m.HomeData? _data;
  ApiException? _error;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = _data == null;
      _error = null;
    });
    try {
      final data = m.HomeData.fromJson(asMap(await Api.instance.get('/store/home')));
      if (mounted) setState(() => _data = data);
    } on ApiException catch (error) {
      if (mounted) setState(() => _error = error);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _refresh() async {
    await Future.wait([_load(), context.read<StoreController>().load()]);
  }

  @override
  Widget build(BuildContext context) {
    final bottom = MediaQuery.paddingOf(context).bottom;
    final data = _data;

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: _refresh,
        edgeOffset: 120,
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            const _HomeAppBar(),
            if (_loading && data == null) ..._skeleton(),
            if (_error != null && data == null)
              SliverFillRemaining(
                hasScrollBody: false,
                child: ErrorView(message: _error!.message, onRetry: _load),
              ),
            if (data != null) ..._content(context, data),
            SliverToBoxAdapter(child: SizedBox(height: bottom + 24)),
          ],
        ),
      ),
    );
  }

  List<Widget> _skeleton() => const [
    SliverToBoxAdapter(
      child: Padding(
        padding: EdgeInsets.fromLTRB(16, 8, 16, 0),
        child: AspectRatio(aspectRatio: 16 / 8.5, child: Skeleton(radius: 20)),
      ),
    ),
    SliverToBoxAdapter(child: SizedBox(height: 24)),
    ProductGridSkeleton(count: 4),
  ];

  List<Widget> _content(BuildContext context, m.HomeData data) {
    final empty = data.featured.isEmpty && data.newArrivals.isEmpty && data.bestSelling.isEmpty;
    return [
      if (data.slides.isNotEmpty) SliverToBoxAdapter(child: _HeroSlider(slides: data.slides)) else const SliverToBoxAdapter(child: _WelcomeHero()),
      const SliverToBoxAdapter(child: _TrustStrip()),
      if (data.categories.isNotEmpty) ...[
        SliverToBoxAdapter(
          child: SectionHeader(
            eyebrow: context.t('Shop by category'),
            title: context.t('Find what you need'),
            onMore: () => goToTab(context, AppTab.categories),
          ),
        ),
        SliverToBoxAdapter(child: _CategoryRail(categories: data.categories)),
      ],
      if (empty)
        SliverToBoxAdapter(
          child: EmptyState(
            icon: Icons.inventory_2_outlined,
            title: context.t('New products are coming soon'),
            message: context.t('Please check back shortly.'),
          ),
        ),
      ..._rail(context, context.t('Handpicked'), context.t('Featured products'), data.featured, const ShopFilters(featured: true)),
      if (data.banners.isNotEmpty) SliverToBoxAdapter(child: _PromoBanner(banner: data.banners.first)),
      ..._rail(context, context.t('Just in'), context.t('New arrivals'), data.newArrivals, const ShopFilters(sort: 'latest')),
      ..._rail(context, context.t('Customer favourites'), context.t('Best selling'), data.bestSelling, const ShopFilters(sort: 'popular')),
      if (data.banners.length > 1) SliverToBoxAdapter(child: _PromoBanner(banner: data.banners[1])),
      ..._rail(context, context.t('Limited time'), context.t('Special offers'), data.onSale, const ShopFilters(onSale: true)),
      if (data.testimonials.isNotEmpty) ...[
        SliverToBoxAdapter(
          child: SectionHeader(eyebrow: context.t('Customer reviews'), title: context.t('What our customers say')),
        ),
        SliverToBoxAdapter(child: _Testimonials(items: data.testimonials)),
      ],
      const SliverToBoxAdapter(child: _WhyUs()),
    ];
  }

  List<Widget> _rail(BuildContext context, String eyebrow, String title, List<m.Product> products, ShopFilters filters) {
    if (products.isEmpty) return const [];
    return [
      SliverToBoxAdapter(
        child: SectionHeader(
          eyebrow: eyebrow,
          title: title,
          onMore: () => context.push(ShopScreen(filters: filters, title: title)),
        ),
      ),
      SliverToBoxAdapter(child: ProductRail(products: products)),
    ];
  }
}

class _HomeAppBar extends StatelessWidget {
  const _HomeAppBar();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final user = context.select<AuthController, String>((a) => a.user?.name ?? '');
    final wishCount = context.select<WishlistController, int>((w) => w.count);
    final firstName = user.split(' ').first;

    return SliverAppBar(
      pinned: true,
      floating: false,
      toolbarHeight: 64,
      expandedHeight: 128,
      backgroundColor: theme.colorScheme.surface,
      titleSpacing: 16,
      title: Row(
        children: [
          const LogoMark(size: 38),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  firstName.isEmpty ? context.t('Welcome to Swasti') : context.t('Hi, {name}', {'name': firstName}),
                  style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
                  overflow: TextOverflow.ellipsis,
                ),
                Text(context.t('Natural wellness, delivered'), style: theme.textTheme.labelSmall?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
              ],
            ),
          ),
        ],
      ),
      actions: [
        IconButton(tooltip: context.t('Live chat'), onPressed: () => context.push(const ChatScreen()), icon: const Icon(Icons.chat_bubble_outline_rounded)),
        IconButton(
          tooltip: context.t('Wishlist'),
          onPressed: () => context.push(const WishlistScreen()),
          icon: Badge(isLabelVisible: wishCount > 0, label: Text(digits(wishCount)), child: const Icon(Icons.favorite_border_rounded)),
        ),
        const SizedBox(width: 6),
      ],
      bottom: PreferredSize(
        preferredSize: const Size.fromHeight(64),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
          child: _SearchField(onTap: () => context.push(const ShopScreen(autofocusSearch: true))),
        ),
      ),
    );
  }
}

class _SearchField extends StatelessWidget {
  const _SearchField({required this.onTap});
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Material(
      color: theme.inputDecorationTheme.fillColor,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(color: theme.colorScheme.outlineVariant),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onTap,
        child: SizedBox(
          height: 48,
          child: Row(
            children: [
              const SizedBox(width: 14),
              Icon(Icons.search_rounded, color: theme.colorScheme.onSurfaceVariant),
              const SizedBox(width: 10),
              Expanded(
                child: Text(context.t('Search products, brands…'), style: TextStyle(color: theme.colorScheme.onSurfaceVariant)),
              ),
              Container(
                margin: const EdgeInsets.all(6),
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(color: theme.colorScheme.primary, borderRadius: BorderRadius.circular(10)),
                child: Icon(Icons.tune_rounded, size: 18, color: theme.colorScheme.onPrimary),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _HeroSlider extends StatefulWidget {
  const _HeroSlider({required this.slides});
  final List<m.Banner> slides;

  @override
  State<_HeroSlider> createState() => _HeroSliderState();
}

class _HeroSliderState extends State<_HeroSlider> {
  final _controller = PageController(viewportFraction: 0.92);
  int _index = 0;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    if (widget.slides.length > 1) {
      _timer = Timer.periodic(const Duration(seconds: 5), (_) {
        if (!_controller.hasClients) return;
        final next = (_index + 1) % widget.slides.length;
        _controller.animateToPage(next, duration: const Duration(milliseconds: 600), curve: Curves.easeOutCubic);
      });
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Column(
      children: [
        const SizedBox(height: 8),
        AspectRatio(
          aspectRatio: 16 / 8.5,
          child: PageView.builder(
            controller: _controller,
            itemCount: widget.slides.length,
            onPageChanged: (i) => setState(() => _index = i),
            itemBuilder: (context, i) {
              final slide = widget.slides[i];
              return Padding(
                padding: const EdgeInsets.symmetric(horizontal: 5),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(20),
                  child: InkWell(
                    onTap: slide.link.isEmpty ? null : () => openStoreLink(context, slide.link),
                    child: Stack(
                      fit: StackFit.expand,
                      children: [
                        NetImage(slide.imageUrl),
                        if (slide.title.isNotEmpty || slide.subtitle.isNotEmpty)
                          DecoratedBox(
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                colors: [Colors.black.withValues(alpha: 0.62), Colors.transparent],
                                begin: Alignment.centerLeft,
                                end: Alignment.centerRight,
                              ),
                            ),
                          ),
                        Padding(
                          padding: const EdgeInsets.all(18),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisAlignment: MainAxisAlignment.end,
                            children: [
                              if (slide.title.isNotEmpty)
                                SizedBox(
                                  width: 230,
                                  child: Text(
                                    slide.title,
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w800, height: 1.15),
                                  ),
                                ),
                              if (slide.subtitle.isNotEmpty) ...[
                                const SizedBox(height: 4),
                                SizedBox(
                                  width: 230,
                                  child: Text(
                                    slide.subtitle,
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(color: Colors.white70, fontSize: 12.5),
                                  ),
                                ),
                              ],
                              if (slide.link.isNotEmpty) ...[
                                const SizedBox(height: 10),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                                  decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(99)),
                                  child: Text(
                                    slide.buttonText.isNotEmpty ? slide.buttonText : context.t('Shop now'),
                                    style: TextStyle(color: scheme.primary, fontWeight: FontWeight.w700, fontSize: 12.5),
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            },
          ),
        ),
        if (widget.slides.length > 1)
          Padding(
            padding: const EdgeInsets.only(top: 10),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(widget.slides.length, (i) {
                final active = i == _index;
                return AnimatedContainer(
                  duration: const Duration(milliseconds: 250),
                  margin: const EdgeInsets.symmetric(horizontal: 3),
                  width: active ? 20 : 6,
                  height: 6,
                  decoration: BoxDecoration(color: active ? scheme.primary : scheme.outlineVariant, borderRadius: BorderRadius.circular(99)),
                );
              }),
            ),
          ),
      ],
    );
  }
}

class _WelcomeHero extends StatelessWidget {
  const _WelcomeHero();

  @override
  Widget build(BuildContext context) {
    final palette = context.watch<StoreController>().palette;
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(20),
          gradient: LinearGradient(colors: [palette.dark, palette.main], begin: Alignment.topLeft, end: Alignment.bottomRight),
        ),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    context.t('Pure care, naturally'),
                    style: const TextStyle(color: Colors.white, fontSize: 21, fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 6),
                  Text(context.t('Natural wellness products, delivered to your door.'), style: const TextStyle(color: Colors.white70, fontSize: 13)),
                  const SizedBox(height: 14),
                  FilledButton(
                    style: FilledButton.styleFrom(backgroundColor: Colors.white, foregroundColor: palette.dark, minimumSize: const Size(0, 40)),
                    onPressed: () => goToTab(context, AppTab.shop),
                    child: Text(context.t('Shop now')),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 12),
            Container(
              width: 84,
              height: 84,
              padding: const EdgeInsets.all(14),
              decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle),
              child: Image.asset('assets/images/logo-mark.png'),
            ),
          ],
        ),
      ),
    );
  }
}

class _TrustStrip extends StatelessWidget {
  const _TrustStrip();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final free = context.select<StoreController, num?>((s) => s.info.freeShippingFrom);
    final items = [
      (Icons.local_shipping_outlined, free != null ? context.t('Free delivery over {amount}', {'amount': Fmt.money(free)}) : context.t('Fast delivery')),
      (Icons.payments_outlined, context.t('Cash on delivery')),
      (Icons.eco_outlined, context.t('100% natural')),
    ];
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
      child: Row(
        children: [
          for (final (icon, label) in items)
            Expanded(
              child: Container(
                margin: const EdgeInsets.symmetric(horizontal: 3),
                padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 6),
                decoration: BoxDecoration(color: theme.colorScheme.primaryContainer.withValues(alpha: 0.6), borderRadius: BorderRadius.circular(12)),
                child: Column(
                  children: [
                    Icon(icon, size: 20, color: theme.colorScheme.primary),
                    const SizedBox(height: 4),
                    Text(
                      label,
                      textAlign: TextAlign.center,
                      maxLines: 2,
                      style: theme.textTheme.labelSmall?.copyWith(fontWeight: FontWeight.w600, height: 1.2),
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

class _CategoryRail extends StatelessWidget {
  const _CategoryRail({required this.categories});
  final List<m.Category> categories;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return SizedBox(
      height: 112,
      child: ListView.separated(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        scrollDirection: Axis.horizontal,
        itemCount: categories.length,
        separatorBuilder: (_, _) => const SizedBox(width: 14),
        itemBuilder: (context, i) {
          final category = categories[i];
          return InkWell(
            borderRadius: BorderRadius.circular(16),
            onTap: () => context.push(
              ShopScreen(
                filters: ShopFilters(category: category.slug),
                title: category.name,
              ),
            ),
            child: SizedBox(
              width: 76,
              child: Column(
                children: [
                  Container(
                    width: 72,
                    height: 72,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: theme.colorScheme.primaryContainer,
                      border: Border.all(color: theme.colorScheme.outlineVariant),
                    ),
                    clipBehavior: Clip.antiAlias,
                    child: category.imageUrl.isEmpty ? Icon(Icons.spa_outlined, color: theme.colorScheme.primary, size: 30) : NetImage(category.imageUrl),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    category.name,
                    maxLines: 2,
                    textAlign: TextAlign.center,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.labelSmall?.copyWith(fontWeight: FontWeight.w600),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

class _PromoBanner extends StatelessWidget {
  const _PromoBanner({required this.banner});
  final m.Banner banner;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 24, 16, 0),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(18),
        child: InkWell(
          onTap: banner.link.isEmpty ? null : () => openStoreLink(context, banner.link),
          child: AspectRatio(
            aspectRatio: 16 / 7,
            child: Stack(
              fit: StackFit.expand,
              children: [
                NetImage(banner.imageUrl),
                if (banner.title.isNotEmpty)
                  Container(
                    alignment: Alignment.bottomLeft,
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [Colors.black.withValues(alpha: 0.55), Colors.transparent],
                        begin: Alignment.bottomCenter,
                        end: Alignment.topCenter,
                      ),
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          banner.title,
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 17),
                        ),
                        if (banner.subtitle.isNotEmpty)
                          Text(
                            banner.subtitle,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(color: Colors.white70, fontSize: 12.5),
                          ),
                      ],
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _Testimonials extends StatelessWidget {
  const _Testimonials({required this.items});
  final List<m.Testimonial> items;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return SizedBox(
      height: 172,
      child: ListView.separated(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        scrollDirection: Axis.horizontal,
        itemCount: items.length,
        separatorBuilder: (_, _) => const SizedBox(width: 12),
        itemBuilder: (context, i) {
          final t = items[i];
          return SizedBox(
            width: 270,
            child: Panel(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Stars(rating: t.rating.toDouble()),
                      const Spacer(),
                      Icon(Icons.format_quote_rounded, color: theme.colorScheme.primary.withValues(alpha: 0.35)),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Expanded(
                    child: Text(t.comment, maxLines: 4, overflow: TextOverflow.ellipsis, style: theme.textTheme.bodyMedium?.copyWith(height: 1.35)),
                  ),
                  const SizedBox(height: 6),
                  Text('— ${t.author}', style: theme.textTheme.labelMedium?.copyWith(fontWeight: FontWeight.w700)),
                  if (t.productName.isNotEmpty)
                    Text(
                      t.productName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.labelSmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                    ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

class _WhyUs extends StatelessWidget {
  const _WhyUs();

  @override
  Widget build(BuildContext context) {
    final palette = context.watch<StoreController>().palette;
    final store = context.watch<StoreController>().info.storeName;
    final points = [
      (Icons.verified_outlined, context.t('Genuine products'), context.t('Sourced carefully and checked before dispatch.')),
      (Icons.local_shipping_outlined, context.t('Delivery across Bangladesh'), context.t('All 64 districts, with order tracking.')),
      (Icons.support_agent_outlined, context.t('Friendly support'), context.t('Chat with our team whenever you need help.')),
    ];
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 28, 16, 0),
      child: Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(20),
          gradient: LinearGradient(colors: [palette.dark, Color.lerp(palette.dark, Colors.black, 0.35)!], begin: Alignment.topLeft, end: Alignment.bottomRight),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              context.t('Why shop with {name}', {'name': store}),
              style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 14),
            for (final (icon, title, text) in points)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(10)),
                      child: Icon(icon, color: Colors.white, size: 20),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            title,
                            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
                          ),
                          Text(text, style: const TextStyle(color: Colors.white70, fontSize: 12.5)),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}
