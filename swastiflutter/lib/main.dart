import 'package:flutter/services.dart';
import 'package:material_ui/material_ui.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'app.dart';
import 'core/secure_store.dart';
import 'state/auth.dart';
import 'state/cart.dart';
import 'state/prefs.dart';
import 'state/store.dart';
import 'state/wishlist.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);
  SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);

  final prefs = await SharedPreferences.getInstance();
  await SecureStore.load();

  final auth = AuthController();
  final wishlist = WishlistController(prefs);
  auth.addListener(() => wishlist.syncWith(auth));

  runApp(SwastiApp(prefs: PrefsController(prefs), store: StoreController(prefs), auth: auth, cart: CartController(prefs), wishlist: wishlist));
}
