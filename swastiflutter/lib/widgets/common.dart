import 'package:cached_network_image/cached_network_image.dart';
import 'package:material_ui/material_ui.dart';

import '../core/format.dart';
import '../core/i18n.dart';
import '../core/theme.dart';

/// Network image with a soft placeholder and a logo fallback.
class NetImage extends StatelessWidget {
  const NetImage(this.url, {super.key, this.fit = BoxFit.cover, this.radius = 0, this.width, this.height});
  final String url;
  final BoxFit fit;
  final double radius;
  final double? width;
  final double? height;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final fallback = Container(
      width: width,
      height: height,
      color: scheme.surfaceContainer,
      alignment: Alignment.center,
      child: Opacity(opacity: 0.35, child: Image.asset('assets/images/logo-mark.png', width: 36, height: 36)),
    );
    final child = url.isEmpty
        ? fallback
        : CachedNetworkImage(
            imageUrl: url,
            fit: fit,
            width: width,
            height: height,
            fadeInDuration: const Duration(milliseconds: 200),
            placeholder: (_, _) => Container(color: scheme.surfaceContainer),
            errorWidget: (_, _, _) => fallback,
          );
    return radius > 0 ? ClipRRect(borderRadius: BorderRadius.circular(radius), child: child) : child;
  }
}

/// Pulsing placeholder block for loading states.
class Skeleton extends StatefulWidget {
  const Skeleton({super.key, this.width, this.height = 14, this.radius = 8});
  final double? width;
  final double height;
  final double radius;

  @override
  State<Skeleton> createState() => _SkeletonState();
}

class _SkeletonState extends State<Skeleton> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 900))..repeat(reverse: true);

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return FadeTransition(
      opacity: Tween(begin: 0.45, end: 1.0).animate(_c),
      child: Container(
        width: widget.width,
        height: widget.height,
        decoration: BoxDecoration(color: scheme.surfaceContainer, borderRadius: BorderRadius.circular(widget.radius)),
      ),
    );
  }
}

class EmptyState extends StatelessWidget {
  const EmptyState({super.key, required this.icon, required this.title, this.message, this.action});
  final IconData icon;
  final String title;
  final String? message;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 88,
              height: 88,
              decoration: BoxDecoration(color: theme.colorScheme.primaryContainer, shape: BoxShape.circle),
              child: Icon(icon, size: 40, color: theme.colorScheme.primary),
            ),
            const SizedBox(height: 20),
            Text(
              title,
              textAlign: TextAlign.center,
              style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
            ),
            if (message != null) ...[
              const SizedBox(height: 8),
              Text(
                message!,
                textAlign: TextAlign.center,
                style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant),
              ),
            ],
            if (action != null) ...[const SizedBox(height: 20), action!],
          ],
        ),
      ),
    );
  }
}

class ErrorView extends StatelessWidget {
  const ErrorView({super.key, required this.message, this.onRetry});
  final String message;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    return EmptyState(
      icon: Icons.cloud_off_rounded,
      title: context.t('Something went wrong'),
      message: message,
      action: onRetry == null ? null : FilledButton.tonalIcon(onPressed: onRetry, icon: const Icon(Icons.refresh_rounded), label: Text(context.t('Try again'))),
    );
  }
}

class SectionHeader extends StatelessWidget {
  const SectionHeader({super.key, required this.title, this.eyebrow, this.onMore, this.padding = const EdgeInsets.fromLTRB(16, 24, 8, 12)});
  final String title;
  final String? eyebrow;
  final VoidCallback? onMore;
  final EdgeInsets padding;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: padding,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (eyebrow != null)
                  Text(
                    eyebrow!.toUpperCase(),
                    style: theme.textTheme.labelSmall?.copyWith(color: theme.colorScheme.secondary, fontWeight: FontWeight.w700, letterSpacing: 1.1),
                  ),
                Text(title, style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800, fontSize: 19)),
              ],
            ),
          ),
          if (onMore != null)
            TextButton(
              onPressed: onMore,
              child: Row(mainAxisSize: MainAxisSize.min, children: [Text(context.t('View all')), const Icon(Icons.chevron_right_rounded, size: 18)]),
            ),
        ],
      ),
    );
  }
}

class Stars extends StatelessWidget {
  const Stars({super.key, required this.rating, this.size = 14});
  final double rating;
  final double size;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(5, (i) {
        final fill = rating - i;
        final icon = fill >= 0.75 ? Icons.star_rounded : (fill >= 0.25 ? Icons.star_half_rounded : Icons.star_outline_rounded);
        return Icon(icon, size: size, color: kStar);
      }),
    );
  }
}

/// Price with optional struck-through regular price.
class PriceTag extends StatelessWidget {
  const PriceTag({super.key, required this.price, this.regularPrice, this.size = 16});
  final num price;
  final num? regularPrice;
  final double size;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    context.dependOnInheritedWidgetOfExactType<LanguageScope>(); // Bangla digits follow the language
    final showOld = regularPrice != null && regularPrice! > price;
    return Wrap(
      crossAxisAlignment: WrapCrossAlignment.end,
      spacing: 6,
      children: [
        Text(
          Fmt.money(price),
          style: TextStyle(fontSize: size, fontWeight: FontWeight.w800, color: theme.colorScheme.primary),
        ),
        if (showOld)
          Text(
            Fmt.money(regularPrice),
            style: TextStyle(fontSize: size * 0.78, color: theme.colorScheme.onSurfaceVariant, decoration: TextDecoration.lineThrough),
          ),
      ],
    );
  }
}

class Pill extends StatelessWidget {
  const Pill(this.text, {super.key, this.color, this.textColor, this.icon});
  final String text;
  final Color? color;
  final Color? textColor;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(color: color ?? scheme.primaryContainer, borderRadius: BorderRadius.circular(999)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[Icon(icon, size: 12, color: textColor ?? scheme.onPrimaryContainer), const SizedBox(width: 3)],
          Text(
            text,
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: textColor ?? scheme.onPrimaryContainer),
          ),
        ],
      ),
    );
  }
}

/// Coloured badge for order and payment status.
class StatusBadge extends StatelessWidget {
  const StatusBadge(this.status, {super.key});
  final String status;

  static Color colorOf(String status) => switch (status) {
    'delivered' || 'paid' => const Color(0xFF059669),
    'shipped' => const Color(0xFF2563EB),
    'processing' => const Color(0xFF7C3AED),
    'confirmed' => const Color(0xFF0891B2),
    'cancelled' || 'failed' => const Color(0xFFDC2626),
    'returned' || 'refunded' => const Color(0xFF64748B),
    _ => const Color(0xFFD97706),
  };

  @override
  Widget build(BuildContext context) {
    final color = colorOf(status);
    final label = status.isEmpty ? '' : status[0].toUpperCase() + status.substring(1).replaceAll('_', ' ');
    return Pill(context.t(label), color: color.withValues(alpha: 0.12), textColor: color);
  }
}

class QuantityStepper extends StatelessWidget {
  const QuantityStepper({super.key, required this.value, required this.onChanged, this.max = 999, this.compact = false});
  final int value;
  final int max;
  final bool compact;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final size = compact ? 32.0 : 42.0;
    Widget button(IconData icon, VoidCallback? onTap, String label) => SizedBox(
      width: size,
      height: size,
      child: IconButton(tooltip: label, padding: EdgeInsets.zero, iconSize: compact ? 16 : 20, onPressed: onTap, icon: Icon(icon)),
    );
    return Container(
      decoration: BoxDecoration(
        border: Border.all(color: scheme.outlineVariant),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          button(Icons.remove_rounded, value > 1 ? () => onChanged(value - 1) : null, context.t('Decrease')),
          SizedBox(
            width: compact ? 28 : 36,
            child: Text(
              digits(value),
              textAlign: TextAlign.center,
              style: const TextStyle(fontWeight: FontWeight.w700),
            ),
          ),
          button(Icons.add_rounded, value < max ? () => onChanged(value + 1) : null, context.t('Increase')),
        ],
      ),
    );
  }
}

class InfoRow extends StatelessWidget {
  const InfoRow(this.label, this.value, {super.key, this.bold = false, this.valueColor});
  final String label;
  final String value;
  final bool bold;
  final Color? valueColor;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final style = bold
        ? theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800)
        : theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        children: [
          Expanded(child: Text(label, style: style)),
          Text(
            value,
            style: style?.copyWith(color: valueColor ?? (bold ? theme.colorScheme.onSurface : null), fontWeight: bold ? FontWeight.w800 : FontWeight.w600),
          ),
        ],
      ),
    );
  }
}

/// White card with padding.
class Panel extends StatelessWidget {
  const Panel({super.key, required this.child, this.padding = const EdgeInsets.all(16), this.margin});
  final Widget child;
  final EdgeInsets padding;
  final EdgeInsets? margin;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: margin ?? EdgeInsets.zero,
      child: Card(
        child: Padding(padding: padding, child: child),
      ),
    );
  }
}

/// Logo that adapts to dark mode (sits on a soft white disc so the green mark stays visible).
class LogoMark extends StatelessWidget {
  const LogoMark({super.key, this.size = 40});
  final double size;

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    final image = Image.asset('assets/images/logo-mark.png', width: size, height: size);
    if (!dark) return image;
    return Container(
      padding: EdgeInsets.all(size * 0.12),
      decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle),
      child: Image.asset('assets/images/logo-mark.png', width: size * 0.76, height: size * 0.76),
    );
  }
}
