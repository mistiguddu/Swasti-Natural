import { Setting } from '../models/Marketing.js';

export async function getSettings() {
  return (await Setting.findById('store')) ?? Setting.create({ _id: 'store' });
}

export async function updateSettings(section, values) {
  const settings = await getSettings();
  settings.set(section, { ...settings.toObject()[section], ...values });
  await settings.save();
  return settings;
}
