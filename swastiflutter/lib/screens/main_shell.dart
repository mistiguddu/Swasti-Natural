import 'package:flutter/services.dart';
import 'package:material_ui/material_ui.dart';
import 'package:provider/provider.dart';

import '../core/i18n.dart';
import '../core/theme.dart';
import '../state/auth.dart';
import '../state/cart.dart';
import '../state/store.dart';
import '../widgets/ui.dart';
import 'account_screen.dart';
import 'cart_screen.dart';
import 'categories_screen.dart';
import 'home_screen.dart';
import 'shop_screen.dart';

enum AppTab { shop, categories, home, cart, account }

/// The live shell, so pages pushed on top of it (which are not its descendants) can switch tabs.
_MainShellState? _shell;

/// Switches to a tab and closes any pages pushed on top of the shell
/// (e.g. "Continue shopping" after an order → Shop).
void goToTab(BuildContext context, AppTab tab) {
  Navigator.of(context).popUntil((route) => route.isFirst);
  _shell?._select(tab);
}

class MainShell extends StatefulWidget {
  const MainShell({super.key});

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  AppTab _tab = AppTab.home;
  final Set<AppTab> _visited = {AppTab.home};
  DateTime? _lastBack;
  late final AuthController _auth;

  @override
  void initState() {
    super.initState();
    _shell = this;
    _auth = context.read<AuthController>()..addListener(_onAuth);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<CartController>().requestQuote(context.read<StoreController>().info.shippingMethods);
    });
  }

  void _onAuth() {
    if (_auth.consumeExpiredFlag() && mounted) {
      context.toast(tr('Your session has ended. Please sign in again.'), error: true);
    }
  }

  @override
  void dispose() {
    _auth.removeListener(_onAuth);
    if (_shell == this) _shell = null;
    super.dispose();
  }

  void _select(AppTab tab) {
    if (tab == _tab) return;
    HapticFeedback.selectionClick();
    setState(() {
      _tab = tab;
      _visited.add(tab);
    });
  }

  Widget _page(AppTab tab) => switch (tab) {
    AppTab.shop => const ShopScreen(isTab: true),
    AppTab.categories => const CategoriesScreen(),
    AppTab.home => const HomeScreen(),
    AppTab.cart => const CartScreen(isTab: true),
    AppTab.account => const AccountScreen(),
  };

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (didPop) return;
        if (_tab != AppTab.home) {
          _select(AppTab.home);
          return;
        }
        final now = DateTime.now();
        if (_lastBack != null && now.difference(_lastBack!) < const Duration(seconds: 2)) {
          SystemNavigator.pop();
        } else {
          _lastBack = now;
          context.toast(tr('Press back again to exit'));
        }
      },
      child: Scaffold(
        extendBody: true,
        body: IndexedStack(index: _tab.index, children: [for (final tab in AppTab.values) _visited.contains(tab) ? _page(tab) : const SizedBox.shrink()]),
        bottomNavigationBar: SwastiBottomNav(current: _tab, onSelect: _select),
      ),
    );
  }
}

/// Bottom navigation: dark brand-gradient bar with rounded top, a raised centre Home
/// button, white pill for the active tab, amber dot and cart badge.
class SwastiBottomNav extends StatelessWidget {
  const SwastiBottomNav({super.key, required this.current, required this.onSelect});
  final AppTab current;
  final ValueChanged<AppTab> onSelect;

  @override
  Widget build(BuildContext context) {
    final palette = context.watch<StoreController>().palette;
    final cartCount = context.select<CartController, int>((c) => c.count);
    final bottom = MediaQuery.paddingOf(context).bottom;
    final barTop = palette.dark;
    final barBottom = Color.lerp(palette.dark, Colors.black, 0.45)!;

    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [barTop, barBottom]),
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        boxShadow: [BoxShadow(color: barBottom.withValues(alpha: 0.35), blurRadius: 24, offset: const Offset(0, -6))],
      ),
      padding: EdgeInsets.only(bottom: bottom),
      child: SizedBox(
        height: 66,
        child: Row(
          children: [
            _NavTab(
              icon: Icons.storefront_outlined,
              activeIcon: Icons.storefront_rounded,
              label: context.t('Shop'),
              active: current == AppTab.shop,
              onTap: () => onSelect(AppTab.shop),
              palette: palette,
            ),
            _NavTab(
              icon: Icons.grid_view_outlined,
              activeIcon: Icons.grid_view_rounded,
              label: context.t('Categories'),
              active: current == AppTab.categories,
              onTap: () => onSelect(AppTab.categories),
              palette: palette,
            ),
            _HomeTab(active: current == AppTab.home, onTap: () => onSelect(AppTab.home), palette: palette),
            _NavTab(
              icon: Icons.shopping_bag_outlined,
              activeIcon: Icons.shopping_bag_rounded,
              label: context.t('Cart'),
              active: current == AppTab.cart,
              onTap: () => onSelect(AppTab.cart),
              palette: palette,
              badge: cartCount,
            ),
            _NavTab(
              icon: Icons.person_outline_rounded,
              activeIcon: Icons.person_rounded,
              label: context.t('Account'),
              active: current == AppTab.account,
              onTap: () => onSelect(AppTab.account),
              palette: palette,
            ),
          ],
        ),
      ),
    );
  }
}

class _Dot extends StatelessWidget {
  const _Dot({required this.active});
  final bool active;

  @override
  Widget build(BuildContext context) {
    return AnimatedScale(
      scale: active ? 1 : 0,
      duration: const Duration(milliseconds: 250),
      child: Container(
        width: 4,
        height: 4,
        decoration: const BoxDecoration(color: kAccent, shape: BoxShape.circle),
      ),
    );
  }
}

class _NavTab extends StatelessWidget {
  const _NavTab({
    required this.icon,
    required this.activeIcon,
    required this.label,
    required this.active,
    required this.onTap,
    required this.palette,
    this.badge = 0,
  });
  final IconData icon;
  final IconData activeIcon;
  final String label;
  final bool active;
  final VoidCallback onTap;
  final StorePalette palette;
  final int badge;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Semantics(
        button: true,
        selected: active,
        label: badge > 0 ? '$label ($badge)' : label,
        child: InkResponse(
          onTap: onTap,
          radius: 36,
          highlightColor: Colors.transparent,
          splashColor: Colors.white24,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              AnimatedContainer(
                duration: const Duration(milliseconds: 280),
                curve: Curves.easeOutCubic,
                width: 50,
                height: 32,
                decoration: BoxDecoration(
                  color: active ? Colors.white : Colors.transparent,
                  borderRadius: BorderRadius.circular(99),
                  boxShadow: active ? [const BoxShadow(color: Colors.black26, blurRadius: 10, offset: Offset(0, 3))] : null,
                ),
                child: Stack(
                  clipBehavior: Clip.none,
                  alignment: Alignment.center,
                  children: [
                    Icon(active ? activeIcon : icon, size: 21, color: active ? palette.dark : Colors.white),
                    if (badge > 0)
                      Positioned(
                        top: -3,
                        right: 4,
                        child: Container(
                          constraints: const BoxConstraints(minWidth: 17),
                          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                          decoration: BoxDecoration(
                            color: kAccent,
                            borderRadius: BorderRadius.circular(99),
                            border: Border.all(color: palette.dark, width: 1.5),
                          ),
                          child: Text(
                            badge > 99 ? '99+' : digits(badge),
                            textAlign: TextAlign.center,
                            style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w800, color: palette.dark),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 3),
              Text(
                label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: active ? FontWeight.w700 : FontWeight.w500, letterSpacing: 0.2),
              ),
              const SizedBox(height: 2),
              _Dot(active: active),
            ],
          ),
        ),
      ),
    );
  }
}

class _HomeTab extends StatelessWidget {
  const _HomeTab({required this.active, required this.onTap, required this.palette});
  final bool active;
  final VoidCallback onTap;
  final StorePalette palette;

  @override
  Widget build(BuildContext context) {
    final label = context.t('Home');
    return Expanded(
      child: Semantics(
        button: true,
        selected: active,
        label: label,
        child: GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTap: onTap,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Transform.translate(
                offset: const Offset(0, -10),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 280),
                  width: 50,
                  height: 50,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [Colors.white, palette.light]),
                    border: Border.all(color: palette.dark, width: 4),
                    boxShadow: [
                      if (active) BoxShadow(color: Colors.white.withValues(alpha: 0.18), spreadRadius: 6),
                      const BoxShadow(color: Colors.black38, blurRadius: 14, offset: Offset(0, 6)),
                    ],
                  ),
                  child: Icon(active ? Icons.home_rounded : Icons.home_outlined, color: palette.dark, size: 23),
                ),
              ),
              Transform.translate(
                offset: const Offset(0, -7),
                child: Column(
                  children: [
                    Text(
                      label,
                      style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: active ? FontWeight.w700 : FontWeight.w500),
                    ),
                    const SizedBox(height: 2),
                    _Dot(active: active),
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
