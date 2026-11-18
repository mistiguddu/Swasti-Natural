import 'package:flutter/services.dart';
import 'package:material_ui/material_ui.dart';
import 'package:provider/provider.dart';

import 'core/config.dart';
import 'core/i18n.dart';
import 'core/theme.dart';
import 'screens/app_lock.dart';
import 'screens/splash_screen.dart';
import 'state/auth.dart';
import 'state/cart.dart';
import 'state/prefs.dart';
import 'state/store.dart';
import 'state/wishlist.dart';

final rootNavigatorKey = GlobalKey<NavigatorState>();

class SwastiApp extends StatelessWidget {
  const SwastiApp({super.key, required this.prefs, required this.store, required this.auth, required this.cart, required this.wishlist});

  final PrefsController prefs;
  final StoreController store;
  final AuthController auth;
  final CartController cart;
  final WishlistController wishlist;

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider.value(value: prefs),
        ChangeNotifierProvider.value(value: store),
        ChangeNotifierProvider.value(value: auth),
        ChangeNotifierProvider.value(value: cart),
        ChangeNotifierProvider.value(value: wishlist),
      ],
      child: Consumer2<PrefsController, StoreController>(
        builder: (context, prefs, store, _) {
          final palette = store.palette;
          return LanguageScope(
            language: prefs.language,
            child: MaterialApp(
              title: AppConfig.appName,
              debugShowCheckedModeBanner: false,
              navigatorKey: rootNavigatorKey,
              themeMode: prefs.themeMode,
              theme: AppTheme.build(palette, Brightness.light),
              darkTheme: AppTheme.build(palette, Brightness.dark),
              builder: (context, child) {
                final dark = Theme.of(context).brightness == Brightness.dark;
                SystemChrome.setSystemUIOverlayStyle(
                  SystemUiOverlayStyle(
                    statusBarColor: Colors.transparent,
                    statusBarIconBrightness: dark ? Brightness.light : Brightness.dark,
                    systemNavigationBarColor: Colors.transparent,
                  ),
                );
                // Keep text readable: honour the system font size but cap extreme scaling.
                final media = MediaQuery.of(context);
                return MediaQuery(
                  data: media.copyWith(textScaler: media.textScaler.clamp(minScaleFactor: 0.85, maxScaleFactor: 1.3)),
                  child: AppLockGate(child: child ?? const SizedBox.shrink()),
                );
              },
              home: const SplashScreen(),
            ),
          );
        },
      ),
    );
  }
}
