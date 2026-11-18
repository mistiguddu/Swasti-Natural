import 'package:material_ui/material_ui.dart';
import 'package:url_launcher/url_launcher.dart';

import '../widgets/ui.dart';
import 'info_screens.dart';
import 'main_shell.dart';
import 'product_screen.dart';
import 'shop_screen.dart';

/// Opens a storefront link (as used by banners and sliders on the website) inside the app.
/// Supports /product/:slug, /category/:slug, /products?…, /categories, /cart, /account,
/// /about, /contact; full http(s) links open in the browser.
Future<void> openStoreLink(BuildContext context, String link) async {
  final value = link.trim();
  if (value.isEmpty) return;
  final uri = Uri.tryParse(value);
  if (uri == null) return;
  if (uri.hasScheme && (uri.scheme == 'http' || uri.scheme == 'https')) {
    // A link to our own storefront? Use its path in-app; otherwise open the browser.
    if (uri.pathSegments.isNotEmpty && const ['product', 'category', 'products', 'categories'].contains(uri.pathSegments.first)) {
      return openStoreLink(context, uri.path + (uri.hasQuery ? '?${uri.query}' : ''));
    }
    await launchUrl(uri, mode: LaunchMode.externalApplication);
    return;
  }
  final segments = uri.pathSegments.where((s) => s.isNotEmpty).toList();
  if (segments.isEmpty) return goToTab(context, AppTab.home);
  switch (segments.first) {
    case 'product' when segments.length > 1:
      await context.push(ProductScreen(slug: segments[1]));
    case 'category' when segments.length > 1:
      await context.push(ShopScreen(filters: ShopFilters(category: segments[1])));
    case 'products':
      final q = uri.queryParameters;
      await context.push(
        ShopScreen(
          filters: ShopFilters(
            category: q['category'],
            search: q['search'] ?? q['q'],
            sort: q['sort'] ?? 'latest',
            onSale: q['onSale'] == 'true',
            featured: q['featured'] == 'true',
            newArrival: q['newArrival'] == 'true',
            bestSelling: q['bestSelling'] == 'true',
          ),
        ),
      );
    case 'categories':
      goToTab(context, AppTab.categories);
    case 'cart':
      goToTab(context, AppTab.cart);
    case 'account':
      goToTab(context, AppTab.account);
    case 'about':
      await context.push(const AboutScreen());
    case 'contact':
      await context.push(const ContactScreen());
    default:
      break;
  }
}
