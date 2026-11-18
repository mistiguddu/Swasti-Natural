// Builds assets/images/logo-mark-foreground.png: the logo mark centred on a
// transparent 1024px square with safe-zone padding, for the Android adaptive
// icon and the Android 12+ launch screen. Run: dart run tool/make_icon_foreground.dart
// ignore_for_file: depend_on_referenced_packages, avoid_print
import 'dart:io';

import 'package:image/image.dart' as img;

void main() {
  final source = img.decodePng(File('assets/images/logo-mark.png').readAsBytesSync())!;
  const size = 1024;
  const inner = 540; // ~53%: inside the 66% adaptive-icon safe zone
  final scale = inner / (source.width > source.height ? source.width : source.height);
  final resized = img.copyResize(
    source.convert(numChannels: 4),
    width: (source.width * scale).round(),
    height: (source.height * scale).round(),
    interpolation: img.Interpolation.cubic,
  );
  final canvas = img.Image(width: size, height: size, numChannels: 4);
  img.compositeImage(canvas, resized, dstX: (size - resized.width) ~/ 2, dstY: (size - resized.height) ~/ 2);
  File('assets/images/logo-mark-foreground.png').writeAsBytesSync(img.encodePng(canvas));
  print('Wrote assets/images/logo-mark-foreground.png');
}
