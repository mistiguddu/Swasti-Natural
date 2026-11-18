import 'package:flutter/services.dart';
import 'package:material_ui/material_ui.dart';

import '../core/bd_data.dart';
import '../core/i18n.dart';
import '../models/models.dart';

final phonePattern = RegExp(r'^\+?[0-9\s-]{7,20}$');

String? validatePhone(String? value) {
  final v = (value ?? '').trim();
  if (v.isEmpty) return tr('Enter your mobile number');
  if (!phonePattern.hasMatch(v)) return tr('Enter a valid mobile number');
  return null;
}

String? validateEmail(String? value) {
  final v = (value ?? '').trim();
  if (v.isEmpty) return tr('Enter your email');
  if (!RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(v)) return tr('Enter a valid email');
  return null;
}

/// Controllers for a Bangladesh delivery address (division → district → area).
class AddressFormController {
  AddressFormController([Address? initial]) {
    load(initial);
  }

  final label = TextEditingController();
  final name = TextEditingController();
  final phone = TextEditingController();
  final area = TextEditingController();
  final line1 = TextEditingController();
  final postalCode = TextEditingController();
  String? division;
  String? district;
  bool isDefault = false;

  void load(Address? a) {
    label.text = a?.label ?? 'Home';
    name.text = a?.name ?? '';
    phone.text = a?.phone ?? '';
    area.text = a?.area ?? '';
    line1.text = a?.line1 ?? '';
    postalCode.text = a?.postalCode ?? '';
    division = kDivisions.containsKey(a?.division) ? a!.division : null;
    district = division != null && kDivisions[division]!.contains(a?.district) ? a!.district : null;
    isDefault = a?.isDefault ?? false;
  }

  Address toAddress() => Address(
    label: label.text.trim().isEmpty ? 'Home' : label.text.trim(),
    name: name.text.trim(),
    phone: phone.text.trim(),
    division: division ?? '',
    district: district ?? '',
    area: area.text.trim(),
    line1: line1.text.trim(),
    postalCode: postalCode.text.trim(),
    isDefault: isDefault,
  );

  void dispose() {
    for (final c in [label, name, phone, area, line1, postalCode]) {
      c.dispose();
    }
  }
}

class AddressFields extends StatefulWidget {
  const AddressFields({super.key, required this.controller, this.showLabel = true});
  final AddressFormController controller;
  final bool showLabel;

  @override
  State<AddressFields> createState() => _AddressFieldsState();
}

class _AddressFieldsState extends State<AddressFields> {
  AddressFormController get c => widget.controller;

  @override
  Widget build(BuildContext context) {
    const gap = SizedBox(height: 12);
    final districts = c.division == null ? const <String>[] : kDivisions[c.division]!;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (widget.showLabel) ...[
          Wrap(
            spacing: 8,
            children: [
              for (final label in const ['Home', 'Office', 'Other'])
                ChoiceChip(label: Text(context.t(label)), selected: c.label.text == label, onSelected: (_) => setState(() => c.label.text = label)),
            ],
          ),
          gap,
        ],
        TextFormField(
          controller: c.name,
          textCapitalization: TextCapitalization.words,
          textInputAction: TextInputAction.next,
          decoration: InputDecoration(labelText: context.t('Full name'), prefixIcon: const Icon(Icons.person_outline_rounded)),
          validator: (v) => (v ?? '').trim().length < 2 ? tr('Enter the recipient’s name') : null,
        ),
        gap,
        TextFormField(
          controller: c.phone,
          keyboardType: TextInputType.phone,
          textInputAction: TextInputAction.next,
          inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9+\s-]')), LengthLimitingTextInputFormatter(20)],
          decoration: InputDecoration(labelText: context.t('Mobile number'), hintText: '01XXXXXXXXX', prefixIcon: const Icon(Icons.phone_outlined)),
          validator: validatePhone,
        ),
        gap,
        DropdownButtonFormField<String>(
          initialValue: c.division,
          isExpanded: true,
          decoration: InputDecoration(labelText: context.t('Division'), prefixIcon: const Icon(Icons.map_outlined)),
          items: [for (final d in kDivisions.keys) DropdownMenuItem(value: d, child: Text(d))],
          onChanged: (v) => setState(() {
            c.division = v;
            c.district = null;
          }),
          validator: (v) => v == null ? tr('Choose a division') : null,
        ),
        gap,
        DropdownButtonFormField<String>(
          key: ValueKey('district-${c.division}'),
          initialValue: c.district,
          isExpanded: true,
          decoration: InputDecoration(labelText: context.t('District'), prefixIcon: const Icon(Icons.location_city_outlined)),
          items: [for (final d in districts) DropdownMenuItem(value: d, child: Text(d))],
          onChanged: c.division == null ? null : (v) => setState(() => c.district = v),
          validator: (v) => v == null ? tr('Choose a district') : null,
        ),
        gap,
        TextFormField(
          controller: c.area,
          textInputAction: TextInputAction.next,
          decoration: InputDecoration(labelText: context.t('Upazila / Thana / Area (optional)'), prefixIcon: const Icon(Icons.place_outlined)),
        ),
        gap,
        TextFormField(
          controller: c.line1,
          minLines: 2,
          maxLines: 3,
          textInputAction: TextInputAction.newline,
          decoration: InputDecoration(
            labelText: context.t('House, road, village / area details'),
            alignLabelWithHint: true,
            prefixIcon: const Icon(Icons.home_outlined),
          ),
          validator: (v) => (v ?? '').trim().length < 5 ? tr('Enter the full address (at least 5 characters)') : null,
        ),
        gap,
        TextFormField(
          controller: c.postalCode,
          keyboardType: TextInputType.number,
          inputFormatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(10)],
          decoration: InputDecoration(labelText: context.t('Postal code (optional)'), prefixIcon: const Icon(Icons.markunread_mailbox_outlined)),
        ),
      ],
    );
  }
}
