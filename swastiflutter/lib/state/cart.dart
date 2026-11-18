import 'dart:convert';

import 'package:material_ui/material_ui.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../core/api.dart';
import '../core/config.dart';
import '../core/format.dart';
import '../models/models.dart';

class CartItem {
  CartItem({
    required this.product,
    required this.quantity,
    this.name = '',
    this.slug = '',
    this.image = '',
    this.price = 0,
    this.regularPrice = 0,
    this.availableQuantity,
  });
  final String product;
  int quantity;
  String name;
  String slug;
  String image;
  num price;
  num regularPrice;
  int? availableQuantity;

  String get imageUrl => AppConfig.imageUrl(image);
  int get max => availableQuantity ?? 999;

  Map<String, dynamic> toJson() => {
    'product': product,
    'quantity': quantity,
    'name': name,
    'slug': slug,
    'image': image,
    'price': price,
    'regularPrice': regularPrice,
    'availableQuantity': availableQuantity,
  };

  factory CartItem.fromJson(Map<String, dynamic> m) => CartItem(
    product: asStr(m['product']),
    quantity: asInt(m['quantity'], 1),
    name: asStr(m['name']),
    slug: asStr(m['slug']),
    image: asStr(m['image']),
    price: asNum(m['price']),
    regularPrice: asNum(m['regularPrice']),
    availableQuantity: m['availableQuantity'] == null ? null : asInt(m['availableQuantity']),
  );
}

enum AddResult { added, outOfStock, limitReached }

/// Shopping cart saved on the device. Prices shown in the cart always come from the
/// server quote (/store/cart/quote); the saved snapshot is only for instant display.
class CartController extends ChangeNotifier {
  CartController(this._prefs) {
    try {
      final raw = jsonDecode(_prefs.getString(_kCart) ?? '[]');
      _items = asMapList(raw).map(CartItem.fromJson).where((i) => i.product.isNotEmpty && i.quantity > 0).toList();
    } catch (_) {
      _items = [];
    }
    _coupon = _prefs.getString(_kCoupon) ?? '';
    _shippingMethod = _prefs.getString(_kShipping) ?? '';
  }

  final SharedPreferences _prefs;
  static const _kCart = 'swasti_cart';
  static const _kCoupon = 'swasti_coupon';
  static const _kShipping = 'swasti_shipping';

  List<CartItem> _items = [];
  String _coupon = '';
  String _shippingMethod = '';

  Quote? _quote;
  bool _quoting = false;
  ApiException? _quoteError;
  int _quoteSeq = 0;

  List<CartItem> get items => List.unmodifiable(_items);
  int get count => _items.fold(0, (sum, i) => sum + i.quantity);
  bool get isEmpty => _items.isEmpty;
  String get couponCode => _coupon;
  String get shippingMethod => _shippingMethod;
  Quote? get quote => _quote;
  bool get quoting => _quoting;
  ApiException? get quoteError => _quoteError;

  int quantityOf(String productId) => _items.where((i) => i.product == productId).fold(0, (s, i) => s + i.quantity);
  bool has(String productId) => _items.any((i) => i.product == productId);

  List<Map<String, dynamic>> get requestItems => _items.map((i) => {'product': i.product, 'quantity': i.quantity}).toList();

  void _save() {
    _prefs.setString(_kCart, jsonEncode(_items.map((i) => i.toJson()).toList()));
  }

  AddResult add(Product product, [int quantity = 1]) {
    if (!product.inStock) return AddResult.outOfStock;
    final existing = _items.where((i) => i.product == product.id).firstOrNull;
    final have = existing?.quantity ?? 0;
    final next = (have + quantity).clamp(0, product.availableQuantity ?? 999);
    if (next <= have) return AddResult.limitReached;
    if (existing != null) {
      existing
        ..quantity = next
        ..name = product.name
        ..price = product.price
        ..regularPrice = product.regularPrice
        ..availableQuantity = product.availableQuantity;
    } else {
      _items.add(
        CartItem(
          product: product.id,
          quantity: next,
          name: product.name,
          slug: product.slug,
          image: product.thumbnail.isNotEmpty ? product.thumbnail : product.image,
          price: product.price,
          regularPrice: product.regularPrice,
          availableQuantity: product.availableQuantity,
        ),
      );
    }
    _changed();
    return AddResult.added;
  }

  void setQuantity(String productId, int quantity) {
    final item = _items.where((i) => i.product == productId).firstOrNull;
    if (item == null) return;
    item.quantity = quantity.clamp(1, item.max);
    _changed();
  }

  /// Removes a product and returns a function that puts it back (for "Undo").
  VoidCallback remove(String productId) {
    final index = _items.indexWhere((i) => i.product == productId);
    if (index == -1) return () {};
    final removed = _items.removeAt(index);
    _changed();
    return () {
      if (has(productId)) return;
      _items.insert(index.clamp(0, _items.length), removed);
      _changed();
    };
  }

  void clear() {
    _items = [];
    _coupon = '';
    _prefs.remove(_kCoupon);
    _quote = null;
    _changed(requote: false);
  }

  void setCoupon(String code) {
    _coupon = code.trim().toUpperCase();
    _coupon.isEmpty ? _prefs.remove(_kCoupon) : _prefs.setString(_kCoupon, _coupon);
    _changed();
  }

  void setShippingMethod(String id) {
    _shippingMethod = id;
    _prefs.setString(_kShipping, id);
    _changed();
  }

  void _changed({bool requote = true}) {
    _save();
    notifyListeners();
    if (requote) requestQuote();
  }

  /// The selected shipping method, or the first available one.
  String effectiveShipping(List<ShippingMethod> methods) {
    if (methods.any((m) => m.id == _shippingMethod)) return _shippingMethod;
    return methods.isNotEmpty ? methods.first.id : '';
  }

  List<ShippingMethod> _methods = const [];

  /// Gets live prices, discounts, coupon, shipping, tax and stock from the server.
  Future<void> requestQuote([List<ShippingMethod>? methods]) async {
    if (methods != null) _methods = methods;
    if (_items.isEmpty) {
      _quote = null;
      _quoting = false;
      _quoteError = null;
      notifyListeners();
      return;
    }
    final seq = ++_quoteSeq;
    _quoting = true;
    _quoteError = null;
    notifyListeners();
    await Future<void>.delayed(const Duration(milliseconds: 250)); // debounce quick taps
    if (seq != _quoteSeq) return;
    final shipping = effectiveShipping(_methods);
    try {
      final data = asMap(
        await Api.instance.post('/store/cart/quote', {'items': requestItems, 'couponCode': _coupon, 'shippingMethod': shipping.isEmpty ? null : shipping}),
      );
      if (seq != _quoteSeq) return;
      final quote = Quote.fromJson(data);
      _syncFromQuote(quote.lines);
      _quote = quote;
      _quoting = false;
      notifyListeners();
    } on ApiException catch (error) {
      if (seq != _quoteSeq) return;
      _quoteError = error;
      _quoting = false;
      notifyListeners();
    }
  }

  void _syncFromQuote(List<QuoteLine> lines) {
    var changed = false;
    for (final line in lines) {
      if (line.status == 'unavailable') continue;
      final item = _items.where((i) => i.product == line.product).firstOrNull;
      if (item == null) continue;
      if (item.name != line.name || item.price != line.price || item.availableQuantity != line.availableQuantity || item.image != line.image) {
        item
          ..name = line.name
          ..slug = line.slug
          ..image = line.image
          ..price = line.price
          ..regularPrice = line.regularPrice
          ..availableQuantity = line.availableQuantity;
        changed = true;
      }
    }
    if (changed) _save();
  }
}
