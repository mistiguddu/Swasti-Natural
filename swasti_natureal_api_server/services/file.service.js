import fs from 'node:fs/promises';
import path from 'node:path';
import { PUBLIC_UPLOAD_PREFIX, UPLOAD_ROOT } from '../config/upload.js';
import Category from '../models/Category.js';
import Product from '../models/Product.js';
import { Banner, Setting } from '../models/Marketing.js';

function toDiskPath(publicPath) {
  if (typeof publicPath !== 'string' || !publicPath.startsWith(PUBLIC_UPLOAD_PREFIX)) return null;
  const diskPath = path.resolve(UPLOAD_ROOT, publicPath.slice(PUBLIC_UPLOAD_PREFIX.length));
  // Never touch anything outside the uploads folder.
  return diskPath.startsWith(UPLOAD_ROOT + path.sep) ? diskPath : null;
}

export async function isFileReferenced(publicPath) {
  const [categories, products, banners, settings] = await Promise.all([
    Category.exists({ $or: [{ image: publicPath }, { thumbnail: publicPath }] }),
    Product.exists({ $or: [{ image: publicPath }, { thumbnail: publicPath }, { gallery: publicPath }] }),
    Banner.exists({ image: publicPath }),
    Setting.exists({ $or: [{ 'branding.logo': publicPath }, { 'branding.logoMark': publicPath }] }),
  ]);
  return Boolean(categories || products || banners || settings);
}

/** Deletes upload files that no category, product or banner references any more. */
export async function deleteUnusedFiles(publicPaths) {
  const unique = [...new Set(publicPaths.filter(Boolean))];
  await Promise.all(unique.map(async (publicPath) => {
    const diskPath = toDiskPath(publicPath);
    if (!diskPath || await isFileReferenced(publicPath)) return;
    await fs.unlink(diskPath).catch((error) => {
      if (error.code !== 'ENOENT') console.warn(`Could not delete ${publicPath}: ${error.message}`);
    });
  }));
}

/** Removes files multer stored for a request that failed. */
export async function discardRequestFiles(req) {
  const files = Object.values(req.files ?? {}).flat().concat(req.file ?? []);
  await Promise.all(files.map((file) => fs.unlink(file.path).catch(() => {})));
}
