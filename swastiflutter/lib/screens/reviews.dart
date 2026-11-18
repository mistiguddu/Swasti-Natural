import 'dart:io';

import 'package:image_picker/image_picker.dart';
import 'package:material_ui/material_ui.dart';
import 'package:provider/provider.dart';

import '../core/api.dart';
import '../core/config.dart';
import '../core/format.dart';
import '../core/i18n.dart';
import '../core/theme.dart';
import '../models/models.dart';
import '../state/auth.dart';
import '../widgets/common.dart';
import '../widgets/ui.dart';

class ReviewSummary {
  ReviewSummary({required this.average, required this.count, required this.distribution, required this.withPhotos});
  final double average;
  final int count;
  final Map<int, int> distribution;
  final int withPhotos;

  factory ReviewSummary.fromJson(Map<String, dynamic> m) {
    final dist = <int, int>{};
    asMap(m['distribution']).forEach((k, v) => dist[int.tryParse(k) ?? 0] = asInt(v));
    return ReviewSummary(average: asDouble(m['average']), count: asInt(m['count']), distribution: dist, withPhotos: asInt(m['withPhotos']));
  }
}

/// Mine: the customer's own review of the product and whether they may write one.
class MyReview {
  MyReview({this.review, this.canReview = false, this.verifiedPurchase = false});
  final Review? review;
  final bool canReview;
  final bool verifiedPurchase;
}

/// Ratings block on the product page: summary, the 3 most helpful reviews, and actions.
class ReviewsSection extends StatefulWidget {
  const ReviewsSection({super.key, required this.product});
  final Product product;

  @override
  State<ReviewsSection> createState() => _ReviewsSectionState();
}

class _ReviewsSectionState extends State<ReviewsSection> {
  ReviewSummary? _summary;
  List<Review> _items = [];
  MyReview? _mine;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final data = asMap(await Api.instance.get('/store/products/${widget.product.id}/reviews', {'limit': 3, 'sort': 'helpful'}));
      if (!mounted) return;
      setState(() {
        _summary = ReviewSummary.fromJson(asMap(data['summary']));
        _items = asMapList(data['items']).map(Review.fromJson).toList();
      });
    } catch (_) {
    } finally {
      if (mounted) setState(() => _loading = false);
    }
    await _loadMine();
  }

  Future<void> _loadMine() async {
    if (!context.read<AuthController>().isSignedIn) return;
    try {
      final data = asMap(await Api.instance.get('/reviews/mine/${widget.product.id}'));
      if (!mounted) return;
      setState(
        () => _mine = MyReview(
          review: data['review'] is Map ? Review.fromJson(asMap(data['review'])) : null,
          canReview: asBool(data['canReview']),
          verifiedPurchase: asBool(data['verifiedPurchase']),
        ),
      );
    } catch (_) {}
  }

  Future<void> _write() async {
    if (!await context.requireSignIn() || !mounted) return;
    await _loadMine();
    if (!mounted) return;
    final saved = await context.push<bool>(ReviewFormScreen(product: widget.product, existing: _mine?.review));
    if (saved == true) _load();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final summary = _summary;
    final mine = _mine?.review;

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 24, 16, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(context.t('Ratings & reviews'), style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800, fontSize: 19)),
          const SizedBox(height: 12),
          if (_loading) const Skeleton(height: 110, radius: 14) else if (summary != null) Panel(child: RatingSummaryView(summary: summary)),
          if (mine != null) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: theme.colorScheme.primaryContainer.withValues(alpha: 0.6), borderRadius: BorderRadius.circular(12)),
              child: Row(
                children: [
                  Icon(Icons.rate_review_outlined, color: theme.colorScheme.primary),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      mine.status == 'approved' ? context.t('You reviewed this product.') : context.t('Your review is waiting for approval.'),
                      style: const TextStyle(fontWeight: FontWeight.w600),
                    ),
                  ),
                  TextButton(onPressed: _write, child: Text(context.t('Edit'))),
                ],
              ),
            ),
          ],
          const SizedBox(height: 12),
          for (final review in _items)
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: ReviewTile(review: review, onChanged: (r) => setState(() => _items = _items.map((x) => x.id == r.id ? r : x).toList())),
            ),
          Row(
            children: [
              if ((summary?.count ?? 0) > _items.length)
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => context.push(AllReviewsScreen(product: widget.product)),
                    child: Text(context.t('See all {n} reviews', {'n': summary?.count ?? 0})),
                  ),
                ),
              if ((summary?.count ?? 0) > _items.length && mine == null) const SizedBox(width: 10),
              if (mine == null)
                Expanded(
                  child: FilledButton.tonalIcon(onPressed: _write, icon: const Icon(Icons.edit_outlined), label: Text(context.t('Write a review'))),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

class RatingSummaryView extends StatelessWidget {
  const RatingSummaryView({super.key, required this.summary});
  final ReviewSummary summary;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    if (summary.count == 0) {
      return Row(
        children: [
          const Icon(Icons.star_outline_rounded, color: kStar, size: 32),
          const SizedBox(width: 12),
          Expanded(child: Text(context.t('No reviews yet. Be the first to share your thoughts!'))),
        ],
      );
    }
    return Row(
      children: [
        Column(
          children: [
            Text(digits(summary.average.toStringAsFixed(1)), style: theme.textTheme.displaySmall?.copyWith(fontWeight: FontWeight.w800)),
            Stars(rating: summary.average, size: 16),
            const SizedBox(height: 4),
            Text(context.t('{n} reviews', {'n': summary.count}), style: theme.textTheme.labelSmall?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
          ],
        ),
        const SizedBox(width: 20),
        Expanded(
          child: Column(
            children: [
              for (final star in [5, 4, 3, 2, 1])
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 2),
                  child: Row(
                    children: [
                      SizedBox(width: 14, child: Text(digits(star), style: theme.textTheme.labelSmall)),
                      const Icon(Icons.star_rounded, size: 12, color: kStar),
                      const SizedBox(width: 6),
                      Expanded(
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(99),
                          child: LinearProgressIndicator(
                            value: summary.count == 0 ? 0 : (summary.distribution[star] ?? 0) / summary.count,
                            minHeight: 7,
                            color: kStar,
                            backgroundColor: theme.colorScheme.surfaceContainer,
                          ),
                        ),
                      ),
                      SizedBox(
                        width: 30,
                        child: Text(digits(summary.distribution[star] ?? 0), textAlign: TextAlign.end, style: theme.textTheme.labelSmall),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ],
    );
  }
}

class ReviewTile extends StatelessWidget {
  const ReviewTile({super.key, required this.review, required this.onChanged});
  final Review review;
  final ValueChanged<Review> onChanged;

  Future<void> _helpful(BuildContext context) async {
    if (!await context.requireSignIn() || !context.mounted) return;
    try {
      final data = asMap(await Api.instance.post('/reviews/${review.id}/helpful'));
      onChanged(review.copyWith(helpful: asBool(data['helpful']), helpfulCount: asInt(data['helpfulCount'])));
    } catch (error) {
      if (context.mounted) context.errorToast(error);
    }
  }

  Future<void> _report(BuildContext context) async {
    if (!await context.requireSignIn() || !context.mounted) return;
    final reason = await showModalBottomSheet<String>(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
              child: Text(ctx.t('Why are you reporting this review?'), style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
            ),
            for (final entry in const {
              'spam': 'Spam or advertising',
              'offensive': 'Offensive language',
              'irrelevant': 'Not about this product',
              'fake': 'Looks fake',
              'other': 'Something else',
            }.entries)
              ListTile(title: Text(ctx.t(entry.value)), onTap: () => Navigator.pop(ctx, entry.key)),
          ],
        ),
      ),
    );
    if (reason == null || !context.mounted) return;
    try {
      await Api.instance.post('/reviews/${review.id}/report', {'reason': reason, 'details': ''});
      if (context.mounted) context.toast(tr('Thanks — our team will take a look.'));
    } catch (error) {
      if (context.mounted) context.errorToast(error);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Panel(
      padding: const EdgeInsets.fromLTRB(14, 12, 6, 6),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 16,
                backgroundColor: theme.colorScheme.primaryContainer,
                child: Text(
                  review.author.isEmpty ? '?' : review.author[0].toUpperCase(),
                  style: TextStyle(color: theme.colorScheme.primary, fontWeight: FontWeight.w800),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(
                            review.author,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontWeight: FontWeight.w700),
                          ),
                        ),
                        if (review.verifiedPurchase) ...[
                          const SizedBox(width: 6),
                          Pill(context.t('Verified'), icon: Icons.verified_rounded, color: kSuccess.withValues(alpha: 0.12), textColor: kSuccess),
                        ],
                      ],
                    ),
                    Text(Fmt.date(review.createdAt), style: theme.textTheme.labelSmall?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
                  ],
                ),
              ),
              if (!review.mine)
                PopupMenuButton<String>(
                  tooltip: context.t('More'),
                  onSelected: (_) => _report(context),
                  itemBuilder: (ctx) => [PopupMenuItem(value: 'report', child: Text(ctx.t('Report review')))],
                ),
            ],
          ),
          const SizedBox(height: 8),
          Stars(rating: review.rating.toDouble()),
          if (review.title.isNotEmpty) ...[const SizedBox(height: 6), Text(review.title, style: const TextStyle(fontWeight: FontWeight.w700))],
          const SizedBox(height: 4),
          Padding(
            padding: const EdgeInsets.only(right: 8),
            child: Text(review.comment, style: const TextStyle(height: 1.45)),
          ),
          if (review.images.isNotEmpty) ...[
            const SizedBox(height: 10),
            SizedBox(
              height: 72,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: review.images.length,
                separatorBuilder: (_, _) => const SizedBox(width: 8),
                itemBuilder: (_, i) => GestureDetector(
                  onTap: () => showDialog<void>(
                    context: context,
                    builder: (_) => Dialog(
                      clipBehavior: Clip.antiAlias,
                      child: InteractiveViewer(child: NetImage(AppConfig.imageUrl(review.images[i]), fit: BoxFit.contain)),
                    ),
                  ),
                  child: NetImage(AppConfig.imageUrl(review.images[i]), width: 72, height: 72, radius: 10),
                ),
              ),
            ),
          ],
          if (review.adminReply.isNotEmpty) ...[
            const SizedBox(height: 10),
            Container(
              margin: const EdgeInsets.only(right: 8),
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(color: theme.colorScheme.surfaceContainerLow, borderRadius: BorderRadius.circular(10)),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    context.t('Reply from the store'),
                    style: theme.textTheme.labelMedium?.copyWith(fontWeight: FontWeight.w800, color: theme.colorScheme.primary),
                  ),
                  const SizedBox(height: 2),
                  Text(review.adminReply),
                ],
              ),
            ),
          ],
          Row(
            children: [
              TextButton.icon(
                onPressed: review.mine ? null : () => _helpful(context),
                icon: Icon(review.helpful ? Icons.thumb_up_alt_rounded : Icons.thumb_up_alt_outlined, size: 17),
                label: Text(review.helpfulCount > 0 ? context.t('Helpful ({n})', {'n': review.helpfulCount}) : context.t('Helpful')),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class AllReviewsScreen extends StatefulWidget {
  const AllReviewsScreen({super.key, required this.product});
  final Product product;

  @override
  State<AllReviewsScreen> createState() => _AllReviewsScreenState();
}

class _AllReviewsScreenState extends State<AllReviewsScreen> {
  final List<Review> _items = [];
  ReviewSummary? _summary;
  Pagination? _pagination;
  bool _loading = true;
  String _sort = 'helpful';
  int? _rating;
  bool _withPhotos = false;
  int _seq = 0;

  @override
  void initState() {
    super.initState();
    _load(reset: true);
  }

  Future<void> _load({bool reset = false}) async {
    final seq = reset ? ++_seq : _seq;
    final page = reset ? 1 : (_pagination?.page ?? 0) + 1;
    setState(() => _loading = true);
    try {
      final data = asMap(
        await Api.instance.get('/store/products/${widget.product.id}/reviews', {
          'page': page,
          'limit': 10,
          'sort': _sort,
          'rating': _rating,
          if (_withPhotos) 'withPhotos': 'true',
        }),
      );
      if (seq != _seq || !mounted) return;
      setState(() {
        if (reset) _items.clear();
        _items.addAll(asMapList(data['items']).map(Review.fromJson));
        _summary = ReviewSummary.fromJson(asMap(data['summary']));
        _pagination = Pagination.fromJson(data['pagination']);
      });
    } catch (error) {
      if (mounted) context.errorToast(error);
    } finally {
      if (mounted && seq == _seq) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    const sorts = {'helpful': 'Most helpful', 'newest': 'Newest', 'highest': 'Highest rating', 'lowest': 'Lowest rating'};
    return Scaffold(
      appBar: AppBar(title: Text(context.t('Reviews'))),
      body: NotificationListener<ScrollNotification>(
        onNotification: (n) {
          if (n.metrics.pixels > n.metrics.maxScrollExtent - 400 && !_loading && (_pagination?.hasMore ?? false)) _load();
          return false;
        },
        child: ListView(
          padding: EdgeInsets.fromLTRB(16, 12, 16, 24 + MediaQuery.paddingOf(context).bottom),
          children: [
            Text(widget.product.name, style: const TextStyle(fontWeight: FontWeight.w700)),
            const SizedBox(height: 12),
            if (_summary != null) Panel(child: RatingSummaryView(summary: _summary!)),
            const SizedBox(height: 12),
            SizedBox(
              height: 40,
              child: ListView(
                scrollDirection: Axis.horizontal,
                children: [
                  PopupMenuButton<String>(
                    initialValue: _sort,
                    onSelected: (v) {
                      setState(() => _sort = v);
                      _load(reset: true);
                    },
                    itemBuilder: (ctx) => [for (final e in sorts.entries) PopupMenuItem(value: e.key, child: Text(ctx.t(e.value)))],
                    child: Chip(avatar: const Icon(Icons.swap_vert_rounded, size: 16), label: Text(context.t(sorts[_sort]!))),
                  ),
                  const SizedBox(width: 8),
                  FilterChip(
                    label: Text(context.t('With photos')),
                    selected: _withPhotos,
                    onSelected: (v) {
                      setState(() => _withPhotos = v);
                      _load(reset: true);
                    },
                  ),
                  for (final star in [5, 4, 3, 2, 1]) ...[
                    const SizedBox(width: 8),
                    FilterChip(
                      label: Text('${digits(star)}★'),
                      selected: _rating == star,
                      onSelected: (v) {
                        setState(() => _rating = v ? star : null);
                        _load(reset: true);
                      },
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 12),
            for (final review in _items)
              Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: ReviewTile(review: review, onChanged: (r) => setState(() => _items[_items.indexWhere((x) => x.id == r.id)] = r)),
              ),
            if (_loading)
              const Padding(
                padding: EdgeInsets.all(20),
                child: Center(child: CircularProgressIndicator()),
              ),
            if (!_loading && _items.isEmpty) EmptyState(icon: Icons.reviews_outlined, title: context.t('No reviews match these filters')),
          ],
        ),
      ),
    );
  }
}

/// Write or edit your own review (rating, title, comment and up to 4 photos).
class ReviewFormScreen extends StatefulWidget {
  const ReviewFormScreen({super.key, required this.product, this.existing});
  final Product product;
  final Review? existing;

  @override
  State<ReviewFormScreen> createState() => _ReviewFormScreenState();
}

class _ReviewFormScreenState extends State<ReviewFormScreen> {
  final _form = GlobalKey<FormState>();
  late int _rating = widget.existing?.rating ?? 0;
  late final _title = TextEditingController(text: widget.existing?.title ?? '');
  late final _comment = TextEditingController(text: widget.existing?.comment ?? '');
  late final List<String> _keep = List.of(widget.existing?.images ?? const []);
  final List<XFile> _new = [];
  bool _busy = false;

  static const _maxPhotos = 4;

  @override
  void dispose() {
    _title.dispose();
    _comment.dispose();
    super.dispose();
  }

  Future<void> _pick() async {
    final room = _maxPhotos - _keep.length - _new.length;
    if (room <= 0) return;
    try {
      final files = await ImagePicker().pickMultiImage(imageQuality: 80, maxWidth: 1600, limit: room);
      if (files.isNotEmpty) setState(() => _new.addAll(files.take(room)));
    } catch (_) {
      if (mounted) context.toast(tr('Couldn’t open your photos.'), error: true);
    }
  }

  Future<void> _submit() async {
    if (_rating == 0) {
      context.toast(tr('Please choose a star rating.'), error: true);
      return;
    }
    if (!_form.currentState!.validate()) return;
    setState(() => _busy = true);
    try {
      final body = {'rating': _rating, 'title': _title.text.trim(), 'comment': _comment.text.trim()};
      final paths = _new.map((f) => f.path).toList();
      final existing = widget.existing;
      final Map<String, dynamic> saved = asMap(
        existing == null
            ? await Api.instance.multipart('POST', '/reviews', {...body, 'product': widget.product.id}, paths)
            : await Api.instance.multipart('PUT', '/reviews/mine/${existing.id}', {...body, 'keepImages': _keep}, paths),
      );
      if (!mounted) return;
      context.toast(saved['status'] == 'approved' ? tr('Thanks for your review!') : tr('Thanks! Your review will appear once approved.'));
      Navigator.pop(context, true);
    } catch (error) {
      if (mounted) context.errorToast(error);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _delete() async {
    final existing = widget.existing;
    if (existing == null) return;
    if (!await confirmDialog(context, title: tr('Delete your review?'), confirm: tr('Delete'), danger: true) || !mounted) return;
    setState(() => _busy = true);
    try {
      await Api.instance.delete('/reviews/mine/${existing.id}');
      if (!mounted) return;
      context.toast(tr('Review deleted'));
      Navigator.pop(context, true);
    } catch (error) {
      if (mounted) context.errorToast(error);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    const labels = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];
    final photoCount = _keep.length + _new.length;

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.existing == null ? context.t('Write a review') : context.t('Edit your review')),
        actions: [
          if (widget.existing != null)
            IconButton(tooltip: context.t('Delete'), onPressed: _busy ? null : _delete, icon: const Icon(Icons.delete_outline_rounded)),
        ],
      ),
      body: Form(
        key: _form,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Row(
              children: [
                NetImage(widget.product.cardImage, width: 56, height: 56, radius: 12),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(widget.product.name, style: const TextStyle(fontWeight: FontWeight.w700)),
                ),
              ],
            ),
            const SizedBox(height: 24),
            Center(
              child: Text(context.t('How would you rate it?'), style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
            ),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(5, (i) {
                final value = i + 1;
                return IconButton(
                  tooltip: digits(value),
                  iconSize: 40,
                  onPressed: () => setState(() => _rating = value),
                  icon: Icon(value <= _rating ? Icons.star_rounded : Icons.star_outline_rounded, color: kStar),
                );
              }),
            ),
            Center(
              child: Text(
                _rating == 0 ? ' ' : context.t(labels[_rating]),
                style: TextStyle(color: theme.colorScheme.primary, fontWeight: FontWeight.w700),
              ),
            ),
            const SizedBox(height: 20),
            TextFormField(
              controller: _title,
              maxLength: 150,
              decoration: InputDecoration(labelText: context.t('Title (optional)'), hintText: context.t('Sum it up in a few words')),
            ),
            const SizedBox(height: 8),
            TextFormField(
              controller: _comment,
              minLines: 4,
              maxLines: 8,
              maxLength: 3000,
              decoration: InputDecoration(
                labelText: context.t('Your review'),
                hintText: context.t('What did you like or dislike? How did you use it?'),
                alignLabelWithHint: true,
              ),
              validator: (v) => (v ?? '').trim().length < 10 ? tr('Please write at least 10 characters') : null,
            ),
            const SizedBox(height: 12),
            Text(context.t('Photos ({n}/4)', {'n': photoCount}), style: const TextStyle(fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final path in _keep)
                  _PhotoThumb(child: NetImage(AppConfig.imageUrl(path), width: 76, height: 76, radius: 10), onRemove: () => setState(() => _keep.remove(path))),
                for (final file in _new)
                  _PhotoThumb(
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(10),
                      child: Image.file(File(file.path), width: 76, height: 76, fit: BoxFit.cover, cacheWidth: 200),
                    ),
                    onRemove: () => setState(() => _new.remove(file)),
                  ),
                if (photoCount < _maxPhotos)
                  InkWell(
                    onTap: _pick,
                    borderRadius: BorderRadius.circular(10),
                    child: Container(
                      width: 76,
                      height: 76,
                      decoration: BoxDecoration(
                        border: Border.all(color: theme.colorScheme.outlineVariant),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Icon(Icons.add_a_photo_outlined, color: theme.colorScheme.primary),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 28),
            BusyButton(label: widget.existing == null ? context.t('Submit review') : context.t('Save changes'), busy: _busy, onPressed: _submit),
          ],
        ),
      ),
    );
  }
}

class _PhotoThumb extends StatelessWidget {
  const _PhotoThumb({required this.child, required this.onRemove});
  final Widget child;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    return Stack(
      clipBehavior: Clip.none,
      children: [
        child,
        Positioned(
          top: -6,
          right: -6,
          child: Material(
            color: Colors.black87,
            shape: const CircleBorder(),
            child: InkWell(
              customBorder: const CircleBorder(),
              onTap: onRemove,
              child: const Padding(
                padding: EdgeInsets.all(3),
                child: Icon(Icons.close_rounded, size: 14, color: Colors.white),
              ),
            ),
          ),
        ),
      ],
    );
  }
}
