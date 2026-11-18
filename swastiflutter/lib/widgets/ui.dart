import 'package:flutter/services.dart';
import 'package:material_ui/material_ui.dart';
import 'package:provider/provider.dart';

import '../core/api.dart';
import '../core/i18n.dart';
import '../models/models.dart';
import '../screens/auth_screens.dart';
import '../state/auth.dart';
import '../state/cart.dart';
import '../state/wishlist.dart';

/// Navigation and feedback helpers used across screens.
extension Nav on BuildContext {
  Future<T?> push<T>(Widget page) => Navigator.of(this).push<T>(MaterialPageRoute(builder: (_) => page));

  void toast(String message, {String? actionLabel, VoidCallback? onAction, bool error = false}) {
    final messenger = ScaffoldMessenger.maybeOf(this);
    if (messenger == null) return;
    messenger
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Row(
            children: [
              Icon(
                error ? Icons.error_outline_rounded : Icons.check_circle_rounded,
                color: error ? const Color(0xFFFCA5A5) : const Color(0xFF6EE7B7),
                size: 20,
              ),
              const SizedBox(width: 10),
              Expanded(child: Text(message)),
            ],
          ),
          duration: Duration(milliseconds: actionLabel != null ? 4000 : 2400),
          action: actionLabel == null ? null : SnackBarAction(label: actionLabel, onPressed: onAction ?? () {}),
        ),
      );
  }

  void errorToast(Object error) => toast(error is ApiException ? error.message : tr('Something went wrong. Please try again.'), error: true);

  /// Ensures the customer is signed in; opens the sign-in screen if not. Returns true when signed in.
  Future<bool> requireSignIn() async {
    if (read<AuthController>().isSignedIn) return true;
    final result = await push<bool>(const LoginScreen(returnAfter: true));
    return result == true || (mounted && read<AuthController>().isSignedIn);
  }
}

/// Short haptic tick.
void tapFeedback() => HapticFeedback.selectionClick();

/// Shared add-to-cart flow with feedback.
void addToCart(BuildContext context, Product product, {int quantity = 1, VoidCallback? onViewCart}) {
  tapFeedback();
  final result = context.read<CartController>().add(product, quantity);
  switch (result) {
    case AddResult.added:
      context.toast(
        quantity > 1 ? tr('Added {n} × {name} to cart', {'n': quantity, 'name': product.name}) : tr('Added to cart: {name}', {'name': product.name}),
        actionLabel: onViewCart == null ? null : tr('View cart'),
        onAction: onViewCart,
      );
    case AddResult.outOfStock:
      context.toast(tr('{name} is out of stock right now.', {'name': product.name}), error: true);
    case AddResult.limitReached:
      context.toast(tr('Only {n} available.', {'n': product.availableQuantity ?? 0}), error: true);
  }
}

Future<void> toggleWishlist(BuildContext context, Product product) async {
  tapFeedback();
  try {
    final saved = await context.read<WishlistController>().toggle(product);
    if (context.mounted) context.toast(saved ? tr('Saved to wishlist') : tr('Removed from wishlist'));
  } catch (error) {
    if (context.mounted) context.errorToast(error);
  }
}

Future<bool> confirmDialog(BuildContext context, {required String title, String? message, String? confirm, bool danger = false}) async {
  final result = await showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      title: Text(title),
      content: message == null ? null : Text(message),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(tr('Cancel'))),
        FilledButton(
          style: danger
              ? FilledButton.styleFrom(backgroundColor: const Color(0xFFDC2626), minimumSize: const Size(64, 44))
              : FilledButton.styleFrom(minimumSize: const Size(64, 44)),
          onPressed: () => Navigator.pop(ctx, true),
          child: Text(confirm ?? tr('Confirm')),
        ),
      ],
    ),
  );
  return result == true;
}

/// Button that shows a spinner while [onPressed] runs.
class BusyButton extends StatelessWidget {
  const BusyButton({super.key, required this.label, required this.busy, required this.onPressed, this.icon});
  final String label;
  final bool busy;
  final VoidCallback? onPressed;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    return FilledButton(
      onPressed: busy ? null : onPressed,
      child: busy
          ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.4))
          : Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (icon != null) ...[Icon(icon, size: 20), const SizedBox(width: 8)],
                Flexible(child: Text(label, overflow: TextOverflow.ellipsis)),
              ],
            ),
    );
  }
}
