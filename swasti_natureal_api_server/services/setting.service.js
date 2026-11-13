import { Setting } from '../models/Marketing.js';
import { publicPath } from '../config/upload.js';
import { deleteUnusedFiles } from './file.service.js';

export async function getSettings() {
  return (await Setting.findById('store')) ?? Setting.create({ _id: 'store' });
}

export async function updateSettings(section, values) {
  const settings = await getSettings();
  settings.set(section, { ...settings.toObject()[section], ...values });
  await settings.save();
  return settings;
}

/** Brand details anyone may see (login page, browser tab) — no contact or store data. */
export async function getPublicBranding() {
  const settings = await getSettings();
  return {
    storeName: settings.general.storeName,
    tagline: settings.general.tagline,
    logo: settings.branding?.logo ?? '',
    logoMark: settings.branding?.logoMark ?? '',
    updatedAt: settings.updatedAt,
  };
}

/** Updates the project name/tagline and the full logo + icon. Old files are deleted when replaced or removed. */
export async function updateBranding(data, files) {
  const settings = await getSettings();
  settings.set('general', { ...settings.toObject().general, storeName: data.storeName, tagline: data.tagline });
  const replaced = [];
  for (const [field, removeFlag] of [['logo', data.removeLogo], ['logoMark', data.removeLogoMark]]) {
    const upload = files?.[field]?.[0] ? publicPath(files[field][0], 'branding') : null;
    if (upload || removeFlag) {
      replaced.push(settings.branding?.[field]);
      settings.set(`branding.${field}`, upload ?? '');
    }
  }
  await settings.save();
  await deleteUnusedFiles(replaced);
  return getPublicBranding();
}
