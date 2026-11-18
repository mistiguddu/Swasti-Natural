# Swasti — customer app (Android)

Flutter shopping app for **Swasti Natural** customers. It matches the customer side of
`swasti_natureal_web_client_nextjs` (no admin or super-admin screens) and talks to
`swasti_natureal_api_server` (`/api/v1`).

## Run

```bash
# 1. Start the API server (default port 3000)
cd ../swasti_natureal_api_server && npm run dev

# 2. Run the app on an Android emulator (10.0.2.2 = your computer)
cd ../swastiflutter
flutter pub get
flutter run

# Real phone or production server: pass the API address
flutter run --dart-define=API_BASE_URL=http://192.168.0.10:3000/api/v1
flutter build apk --release --dart-define=API_BASE_URL=https://api.your-domain.com/api/v1
```

On Windows, Flutter asks for **Developer Mode** (Settings → For developers) when building
with plugins — turn it on once.

## Features

| Area | What's included |
|---|---|
| Launch | Native splash (logo, light/dark) → animated brand splash → first-run language picker |
| Navigation | Bottom bar: Shop · Categories · **Home** (raised centre) · Cart (badge) · Account |
| Home | Hero slider, trust strip, category rail, featured / new / best-selling / offers, promo banners, reviews, "why shop with us" |
| Shop | Search, 6 sort orders, filters (category, price, in stock, sale, featured, new, best-selling), infinite scroll, sub-category chips |
| Product | Image gallery + zoom, price/discount, stock, quantity, description sections, reviews, bought-together, related, recently viewed, Add to cart / Buy now |
| Reviews | Rating summary, filters, helpful votes, report, write / edit / delete with up to 4 photos |
| Cart | Live server quote (prices, discounts, coupon, delivery, tax, stock problems), swipe to remove + undo |
| Checkout | Contact, saved or new Bangladesh address (division → district), delivery method, cash on delivery, notes |
| Account | Summary, orders (filters, details, progress tracker, history), track by number, addresses, profile, password |
| Other | Wishlist (device for guests, synced + merged after sign-in), live chat (guests too), contact, about, privacy |
| Theme | Light / dark / system; store colours follow the admin's **Branding → store theme** |
| Language | English and বাংলা (with Bangla digits); `lib/core/strings_bn.dart` |

## Security

- Sign-in token stored only in Android Keystore-backed secure storage; app data excluded from backups.
- Expired tokens are never sent; the session ends automatically at JWT expiry; any 401 signs out.
- Staff (admin / super admin) accounts are refused — customers only.
- Sign-in cool-down after 5 wrong passwords (30 s, doubling up to 10 min).
- Password rules + strength meter (register, reset, change).
- Optional **app lock** (fingerprint / face / PIN) on start and after 60 s in the background; content hidden in the app switcher.

## Structure

```
lib/
  core/      config, API client, secure storage, i18n (+ Bangla), theme, formatting, BD divisions
  models/    product, category, order, quote, review, chat …
  state/     auth, cart, wishlist, store info/branding, preferences (provider)
  widgets/   product card/grid/rail, address form, shared UI
  screens/   splash, shell + bottom nav, home, shop, categories, product, reviews, cart,
             checkout, orders, auth, account, wishlist, chat, info, app lock
```

Regenerate the launcher icon / native splash after changing `assets/images/logo-mark.png`:

```bash
dart run tool/make_icon_foreground.dart
dart run flutter_launcher_icons
dart run flutter_native_splash:create
```
