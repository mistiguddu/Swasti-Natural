import '../core/config.dart';
import '../core/format.dart';

class CategoryRef {
  CategoryRef({required this.id, required this.name, required this.slug});
  final String id;
  final String name;
  final String slug;

  static CategoryRef? fromJson(Object? json) {
    final m = asMap(json);
    if (m.isEmpty) return null;
    return CategoryRef(id: asStr(m['id']), name: asStr(m['name']), slug: asStr(m['slug']));
  }
}

class Category {
  Category({
    required this.id,
    required this.name,
    required this.slug,
    this.image = '',
    this.thumbnail = '',
    this.shortDescription = '',
    this.description = '',
    this.parent,
    this.productCount,
    this.isFeatured = false,
    this.children = const [],
  });

  final String id;
  final String name;
  final String slug;
  final String image;
  final String thumbnail;
  final String shortDescription;
  final String description;
  final String? parent;
  final int? productCount;
  final bool isFeatured;
  final List<Category> children;

  String get imageUrl => AppConfig.imageUrl(thumbnail.isNotEmpty ? thumbnail : image);

  factory Category.fromJson(Map<String, dynamic> m) => Category(
    id: asStr(m['id']),
    name: asStr(m['name']),
    slug: asStr(m['slug']),
    image: asStr(m['image']),
    thumbnail: asStr(m['thumbnail']),
    shortDescription: asStr(m['shortDescription']),
    description: asStr(m['description']),
    parent: m['parent']?.toString(),
    productCount: m['productCount'] == null ? null : asInt(m['productCount']),
    isFeatured: asBool(m['isFeatured']),
    children: asMapList(m['children']).map(Category.fromJson).toList(),
  );
}

class Product {
  Product({
    required this.id,
    required this.name,
    required this.slug,
    required this.price,
    required this.regularPrice,
    this.sku = '',
    this.brand = '',
    this.shortDescription = '',
    this.description = '',
    this.ingredients = '',
    this.howToUse = '',
    this.benefits = '',
    this.discountPercentage = 0,
    this.onSale = false,
    this.inStock = true,
    this.availableQuantity,
    this.lowStock = false,
    this.image = '',
    this.thumbnail = '',
    this.gallery = const [],
    this.ratingAverage = 0,
    this.ratingCount = 0,
    this.category,
    this.subcategory,
    this.tags = const [],
    this.weight = 0,
    this.sizes = const [],
    this.colors = const [],
    this.material = '',
    this.warranty = '',
    this.isNewArrival = false,
    this.isFeatured = false,
    this.isBestSelling = false,
    this.ratingBreakdown = const {},
    this.related = const [],
    this.frequentlyBoughtTogether = const [],
  });

  final String id;
  final String name;
  final String slug;
  final num price;
  final num regularPrice;
  final String sku;
  final String brand;
  final String shortDescription;
  final String description;
  final String ingredients;
  final String howToUse;
  final String benefits;
  final int discountPercentage;
  final bool onSale;
  final bool inStock;
  final int? availableQuantity;
  final bool lowStock;
  final String image;
  final String thumbnail;
  final List<String> gallery;
  final double ratingAverage;
  final int ratingCount;
  final CategoryRef? category;
  final CategoryRef? subcategory;
  final List<String> tags;
  final num weight;
  final List<String> sizes;
  final List<String> colors;
  final String material;
  final String warranty;
  final bool isNewArrival;
  final bool isFeatured;
  final bool isBestSelling;
  final Map<int, int> ratingBreakdown;
  final List<Product> related;
  final List<Product> frequentlyBoughtTogether;

  String get cardImage => AppConfig.imageUrl(thumbnail.isNotEmpty ? thumbnail : image);

  /// Main image first, then the gallery, without duplicates.
  List<String> get images {
    final list = <String>[if (image.isNotEmpty) image, ...gallery];
    final seen = <String>{};
    return list.where(seen.add).map(AppConfig.imageUrl).toList();
  }

  int get savePercent {
    if (discountPercentage > 0) return discountPercentage;
    if (onSale && regularPrice > 0) return (((regularPrice - price) / regularPrice) * 100).round();
    return 0;
  }

  factory Product.fromJson(Map<String, dynamic> m) {
    final breakdown = <int, int>{};
    asMap(m['ratingBreakdown']).forEach((k, v) => breakdown[int.tryParse(k) ?? 0] = asInt(v));
    return Product(
      id: asStr(m['id']),
      name: asStr(m['name']),
      slug: asStr(m['slug']),
      price: asNum(m['price'], asNum(m['regularPrice'])),
      regularPrice: asNum(m['regularPrice']),
      sku: asStr(m['sku']),
      brand: asStr(m['brand']),
      shortDescription: asStr(m['shortDescription']),
      description: asStr(m['description']),
      ingredients: asStr(m['ingredients']),
      howToUse: asStr(m['howToUse']),
      benefits: asStr(m['benefits']),
      discountPercentage: asInt(m['discountPercentage']),
      onSale: asBool(m['onSale']),
      inStock: m['inStock'] == null ? true : asBool(m['inStock']),
      availableQuantity: m['availableQuantity'] == null ? null : asInt(m['availableQuantity']),
      lowStock: asBool(m['lowStock']),
      image: asStr(m['image']),
      thumbnail: asStr(m['thumbnail']),
      gallery: asStrList(m['gallery']),
      ratingAverage: asDouble(m['ratingAverage']),
      ratingCount: asInt(m['ratingCount']),
      category: CategoryRef.fromJson(m['category']),
      subcategory: CategoryRef.fromJson(m['subcategory']),
      tags: asStrList(m['tags']),
      weight: asNum(m['weight']),
      sizes: asStrList(m['sizes']),
      colors: asStrList(m['colors']),
      material: asStr(m['material']),
      warranty: asStr(m['warranty']),
      isNewArrival: asBool(m['isNewArrival']),
      isFeatured: asBool(m['isFeatured']),
      isBestSelling: asBool(m['isBestSelling']),
      ratingBreakdown: breakdown,
      related: asMapList(m['related']).map(Product.fromJson).toList(),
      frequentlyBoughtTogether: asMapList(m['frequentlyBoughtTogether']).map(Product.fromJson).toList(),
    );
  }
}

class Pagination {
  Pagination({required this.page, required this.pages, required this.total});
  final int page;
  final int pages;
  final int total;
  bool get hasMore => page < pages;

  factory Pagination.fromJson(Object? json) {
    final m = asMap(json);
    final total = asInt(m['total']);
    final limit = asInt(m['limit'], 1);
    return Pagination(page: asInt(m['page'], 1), pages: asInt(m['pages'], asInt(m['totalPages'], limit > 0 ? (total / limit).ceil() : 1)), total: total);
  }
}

class ProductPage {
  ProductPage({required this.items, required this.pagination, this.minPrice = 0, this.maxPrice = 0, this.category});
  final List<Product> items;
  final Pagination pagination;
  final num minPrice;
  final num maxPrice;
  final Category? category;

  factory ProductPage.fromJson(Map<String, dynamic> m) {
    final range = asMap(m['priceRange']);
    return ProductPage(
      items: asMapList(m['items']).map(Product.fromJson).toList(),
      pagination: Pagination.fromJson(m['pagination']),
      minPrice: asNum(range['min']),
      maxPrice: asNum(range['max']),
      category: m['category'] is Map ? Category.fromJson(asMap(m['category'])) : null,
    );
  }
}

class Banner {
  Banner({required this.id, required this.title, this.subtitle = '', this.image = '', this.link = '', this.buttonText = ''});
  final String id;
  final String title;
  final String subtitle;
  final String image;
  final String link;
  final String buttonText;

  String get imageUrl => AppConfig.imageUrl(image);

  factory Banner.fromJson(Map<String, dynamic> m) => Banner(
    id: asStr(m['id']),
    title: asStr(m['title']),
    subtitle: asStr(m['subtitle']),
    image: asStr(m['image']),
    link: asStr(m['link']),
    buttonText: asStr(m['buttonText']),
  );
}

class Testimonial {
  Testimonial({required this.rating, required this.comment, required this.author, this.title = '', this.productName = '', this.productSlug = ''});
  final int rating;
  final String title;
  final String comment;
  final String author;
  final String productName;
  final String productSlug;

  factory Testimonial.fromJson(Map<String, dynamic> m) {
    final product = asMap(m['product']);
    return Testimonial(
      rating: asInt(m['rating']),
      title: asStr(m['title']),
      comment: asStr(m['comment']),
      author: asStr(m['author'], 'Customer'),
      productName: asStr(product['name']),
      productSlug: asStr(product['slug']),
    );
  }
}

class HomeData {
  HomeData({
    required this.slides,
    required this.banners,
    required this.categories,
    required this.featured,
    required this.newArrivals,
    required this.bestSelling,
    required this.onSale,
    required this.testimonials,
  });
  final List<Banner> slides;
  final List<Banner> banners;
  final List<Category> categories;
  final List<Product> featured;
  final List<Product> newArrivals;
  final List<Product> bestSelling;
  final List<Product> onSale;
  final List<Testimonial> testimonials;

  factory HomeData.fromJson(Map<String, dynamic> m) {
    List<Product> products(String key) => asMapList(m[key]).map(Product.fromJson).toList();
    return HomeData(
      slides: asMapList(m['slides']).map(Banner.fromJson).toList(),
      banners: asMapList(m['banners']).map(Banner.fromJson).toList(),
      categories: asMapList(m['categories']).map(Category.fromJson).toList(),
      featured: products('featured'),
      newArrivals: products('newArrivals'),
      bestSelling: products('bestSelling'),
      onSale: products('onSale'),
      testimonials: asMapList(m['testimonials']).map(Testimonial.fromJson).toList(),
    );
  }
}

class ShippingMethod {
  ShippingMethod({required this.id, required this.name, this.description = '', this.charge = 0, this.freeShippingThreshold = 0, this.estimatedDelivery = ''});
  final String id;
  final String name;
  final String description;
  final num charge;
  final num freeShippingThreshold;
  final String estimatedDelivery;

  factory ShippingMethod.fromJson(Map<String, dynamic> m) => ShippingMethod(
    id: asStr(m['id']),
    name: asStr(m['name']),
    description: asStr(m['description']),
    charge: asNum(m['charge']),
    freeShippingThreshold: asNum(m['freeShippingThreshold']),
    estimatedDelivery: asStr(m['estimatedDelivery']),
  );
}

class StoreInfo {
  StoreInfo({
    required this.storeName,
    this.tagline = '',
    this.email = '',
    this.phone = '',
    this.address = '',
    this.website = '',
    this.facebook = '',
    this.instagram = '',
    this.youtube = '',
    this.whatsapp = '',
    this.currencySymbol = '৳',
    this.shippingMethods = const [],
    this.paymentMethods = const ['cash_on_delivery'],
  });

  final String storeName;
  final String tagline;
  final String email;
  final String phone;
  final String address;
  final String website;
  final String facebook;
  final String instagram;
  final String youtube;
  final String whatsapp;
  final String currencySymbol;
  final List<ShippingMethod> shippingMethods;
  final List<String> paymentMethods;

  num? get freeShippingFrom {
    final values = shippingMethods.map((m) => m.freeShippingThreshold).where((v) => v > 0).toList();
    if (values.isEmpty) return null;
    return values.reduce((a, b) => a < b ? a : b);
  }

  factory StoreInfo.fromJson(Map<String, dynamic> m) {
    final contact = asMap(m['contact']);
    final social = asMap(m['social']);
    return StoreInfo(
      storeName: asStr(m['storeName'], 'Swasti Natural'),
      tagline: asStr(m['tagline']),
      email: asStr(contact['email']),
      phone: asStr(contact['phone']),
      address: asStr(contact['address']),
      website: asStr(contact['website']),
      facebook: asStr(social['facebook']),
      instagram: asStr(social['instagram']),
      youtube: asStr(social['youtube']),
      whatsapp: asStr(social['whatsapp']),
      currencySymbol: asStr(m['currencySymbol'], '৳').isEmpty ? '৳' : asStr(m['currencySymbol'], '৳'),
      shippingMethods: asMapList(m['shippingMethods']).map(ShippingMethod.fromJson).toList(),
      paymentMethods: asStrList(m['paymentMethods']).isEmpty ? const ['cash_on_delivery'] : asStrList(m['paymentMethods']),
    );
  }
}

class Customer {
  Customer({required this.id, required this.name, required this.email, this.phone = '', this.role = 'user', this.createdAt});
  final String id;
  final String name;
  final String email;
  final String phone;
  final String role;
  final String? createdAt;

  String get initials {
    final parts = name.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty).toList();
    if (parts.isEmpty) return '?';
    return (parts.first[0] + (parts.length > 1 ? parts.last[0] : '')).toUpperCase();
  }

  factory Customer.fromJson(Map<String, dynamic> m) => Customer(
    id: asStr(m['id'] ?? m['_id']),
    name: asStr(m['name']),
    email: asStr(m['email']),
    phone: asStr(m['phone']),
    role: asStr(m['role'], 'user'),
    createdAt: m['createdAt']?.toString(),
  );
}

class Address {
  Address({
    this.id = '',
    this.label = 'Home',
    required this.name,
    required this.phone,
    required this.division,
    required this.district,
    this.area = '',
    required this.line1,
    this.postalCode = '',
    this.isDefault = false,
  });
  final String id;
  final String label;
  final String name;
  final String phone;
  final String division;
  final String district;
  final String area;
  final String line1;
  final String postalCode;
  final bool isDefault;

  String get oneLine => [line1, area, district, division, postalCode].where((s) => s.isNotEmpty).join(', ');

  factory Address.fromJson(Map<String, dynamic> m) => Address(
    id: asStr(m['id'] ?? m['_id']),
    label: asStr(m['label'], 'Home'),
    name: asStr(m['name']),
    phone: asStr(m['phone']),
    division: asStr(m['division']),
    district: asStr(m['district']),
    area: asStr(m['area']),
    line1: asStr(m['line1']),
    postalCode: asStr(m['postalCode']),
    isDefault: asBool(m['isDefault']),
  );

  Map<String, dynamic> toJson({bool includeDefault = true}) => {
    'label': label,
    'name': name,
    'phone': phone,
    'division': division,
    'district': district,
    'area': area,
    'line1': line1,
    'postalCode': postalCode,
    if (includeDefault) 'isDefault': isDefault,
  };
}

class OrderItem {
  OrderItem({required this.product, required this.name, required this.price, required this.quantity, required this.total, this.image = '', this.discount = 0});
  final String product;
  final String name;
  final String image;
  final num price;
  final int quantity;
  final num discount;
  final num total;

  String get imageUrl => AppConfig.imageUrl(image);

  factory OrderItem.fromJson(Map<String, dynamic> m) => OrderItem(
    product: asStr(m['product']),
    name: asStr(m['name']),
    image: asStr(m['image']),
    price: asNum(m['price']),
    quantity: asInt(m['quantity'], 1),
    discount: asNum(m['discount']),
    total: asNum(m['total']),
  );
}

class TimelineEvent {
  TimelineEvent({required this.status, this.note = '', this.at});
  final String status;
  final String note;
  final String? at;
  factory TimelineEvent.fromJson(Map<String, dynamic> m) => TimelineEvent(status: asStr(m['status']), note: asStr(m['note']), at: m['at']?.toString());
}

class Order {
  Order({
    required this.id,
    required this.orderNumber,
    required this.status,
    required this.paymentStatus,
    required this.paymentMethod,
    required this.items,
    required this.subtotal,
    required this.discount,
    required this.shippingCharge,
    required this.tax,
    required this.grandTotal,
    required this.itemCount,
    this.couponCode = '',
    this.shippingMethodName = '',
    this.trackingNumber = '',
    this.notes = '',
    this.shippingAddress = const {},
    this.timeline = const [],
    this.createdAt,
  });

  final String id;
  final String orderNumber;
  final String status;
  final String paymentStatus;
  final String paymentMethod;
  final List<OrderItem> items;
  final num subtotal;
  final num discount;
  final num shippingCharge;
  final num tax;
  final num grandTotal;
  final int itemCount;
  final String couponCode;
  final String shippingMethodName;
  final String trackingNumber;
  final String notes;
  final Map<String, dynamic> shippingAddress;
  final List<TimelineEvent> timeline;
  final String? createdAt;

  factory Order.fromJson(Map<String, dynamic> m) => Order(
    id: asStr(m['id']),
    orderNumber: asStr(m['orderNumber']),
    status: asStr(m['status'], 'pending'),
    paymentStatus: asStr(m['paymentStatus'], 'pending'),
    paymentMethod: asStr(m['paymentMethod'], 'cash_on_delivery'),
    items: asMapList(m['items']).map(OrderItem.fromJson).toList(),
    subtotal: asNum(m['subtotal']),
    discount: asNum(m['discount']),
    shippingCharge: asNum(m['shippingCharge']),
    tax: asNum(m['tax']),
    grandTotal: asNum(m['grandTotal']),
    itemCount: asInt(m['itemCount']),
    couponCode: asStr(m['couponCode']),
    shippingMethodName: asStr(m['shippingMethodName']),
    trackingNumber: asStr(m['trackingNumber']),
    notes: asStr(m['notes']),
    shippingAddress: asMap(m['shippingAddress']),
    timeline: asMapList(m['timeline']).map(TimelineEvent.fromJson).toList(),
    createdAt: m['createdAt']?.toString(),
  );
}

class QuoteLine {
  QuoteLine({
    required this.product,
    required this.quantity,
    required this.status,
    this.message = '',
    this.name = '',
    this.slug = '',
    this.image = '',
    this.price = 0,
    this.regularPrice = 0,
    this.unitDiscount = 0,
    this.total = 0,
    this.availableQuantity,
  });
  final String product;
  final int quantity;
  final String status; // ok | unavailable | out_of_stock | insufficient_stock
  final String message;
  final String name;
  final String slug;
  final String image;
  final num price;
  final num regularPrice;
  final num unitDiscount;
  final num total;
  final int? availableQuantity;

  bool get ok => status == 'ok';

  factory QuoteLine.fromJson(Map<String, dynamic> m) => QuoteLine(
    product: asStr(m['product']),
    quantity: asInt(m['quantity'], 1),
    status: asStr(m['status'], 'ok'),
    message: asStr(m['message']),
    name: asStr(m['name']),
    slug: asStr(m['slug']),
    image: asStr(m['image']),
    price: asNum(m['price']),
    regularPrice: asNum(m['regularPrice']),
    unitDiscount: asNum(m['unitDiscount']),
    total: asNum(m['total']),
    availableQuantity: m['availableQuantity'] == null ? null : asInt(m['availableQuantity']),
  );
}

class Quote {
  Quote({
    required this.lines,
    required this.canCheckout,
    required this.subtotal,
    required this.itemDiscount,
    required this.couponDiscount,
    required this.shipping,
    required this.tax,
    required this.grandTotal,
    required this.couponCode,
    required this.couponValid,
    required this.couponMessage,
    this.shippingMethodName,
  });
  final List<QuoteLine> lines;
  final bool canCheckout;
  final num subtotal;
  final num itemDiscount;
  final num couponDiscount;
  final num shipping;
  final num tax;
  final num grandTotal;
  final String couponCode;
  final bool couponValid;
  final String couponMessage;
  final String? shippingMethodName;

  factory Quote.fromJson(Map<String, dynamic> m) {
    final totals = asMap(m['totals']);
    final coupon = asMap(m['coupon']);
    final shipping = asMap(m['shippingMethod']);
    return Quote(
      lines: asMapList(m['lines']).map(QuoteLine.fromJson).toList(),
      canCheckout: asBool(m['canCheckout']),
      subtotal: asNum(totals['subtotal']),
      itemDiscount: asNum(totals['itemDiscount']),
      couponDiscount: asNum(totals['couponDiscount']),
      shipping: asNum(totals['shipping']),
      tax: asNum(totals['tax']),
      grandTotal: asNum(totals['grandTotal']),
      couponCode: asStr(coupon['code']),
      couponValid: asBool(coupon['valid']),
      couponMessage: asStr(coupon['message']),
      shippingMethodName: shipping.isEmpty ? null : asStr(shipping['name']),
    );
  }
}

class Review {
  Review({
    required this.id,
    required this.rating,
    required this.comment,
    required this.author,
    this.title = '',
    this.images = const [],
    this.verifiedPurchase = false,
    this.helpfulCount = 0,
    this.helpful = false,
    this.mine = false,
    this.adminReply = '',
    this.status = 'approved',
    this.createdAt,
  });
  final String id;
  final int rating;
  final String title;
  final String comment;
  final String author;
  final List<String> images;
  final bool verifiedPurchase;
  final int helpfulCount;
  final bool helpful;
  final bool mine;
  final String adminReply;
  final String status;
  final String? createdAt;

  Review copyWith({int? helpfulCount, bool? helpful}) => Review(
    id: id,
    rating: rating,
    title: title,
    comment: comment,
    author: author,
    images: images,
    verifiedPurchase: verifiedPurchase,
    helpfulCount: helpfulCount ?? this.helpfulCount,
    helpful: helpful ?? this.helpful,
    mine: mine,
    adminReply: adminReply,
    status: status,
    createdAt: createdAt,
  );

  factory Review.fromJson(Map<String, dynamic> m) => Review(
    id: asStr(m['id']),
    rating: asInt(m['rating']),
    title: asStr(m['title']),
    comment: asStr(m['comment']),
    author: asStr(m['author'], 'Customer'),
    images: asStrList(m['images']),
    verifiedPurchase: asBool(m['verifiedPurchase']),
    helpfulCount: asInt(m['helpfulCount']),
    helpful: asBool(m['helpful']),
    mine: asBool(m['mine']),
    adminReply: asStr(m['adminReply']),
    status: asStr(m['status'], 'approved'),
    createdAt: m['createdAt']?.toString(),
  );
}

class ChatMessage {
  ChatMessage({required this.id, required this.sender, required this.body, this.senderName = '', this.createdAt, this.readAt});
  final String id;
  final String sender; // customer | staff | system
  final String senderName;
  final String body;
  final String? createdAt;
  final String? readAt;

  bool get mine => sender == 'customer';

  factory ChatMessage.fromJson(Map<String, dynamic> m) => ChatMessage(
    id: asStr(m['id']),
    sender: asStr(m['sender']),
    senderName: asStr(m['senderName']),
    body: asStr(m['body']),
    createdAt: m['createdAt']?.toString(),
    readAt: m['readAt']?.toString(),
  );
}
