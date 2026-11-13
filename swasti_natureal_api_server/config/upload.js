import fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import multer from 'multer';
import AppError from '../utils/AppError.js';

export const UPLOAD_ROOT = path.resolve('uploads');
export const PUBLIC_UPLOAD_PREFIX = '/uploads/';
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const EXTENSIONS = { 'image/jpeg': '.jpg', 'image/jpg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

function storageFor(folder) {
  const directory = path.join(UPLOAD_ROOT, folder);
  fs.mkdirSync(directory, { recursive: true });
  return multer.diskStorage({
    destination: (req, file, callback) => callback(null, directory),
    filename: (req, file, callback) => {
      callback(null, `${Date.now()}-${randomBytes(6).toString('hex')}${EXTENSIONS[file.mimetype]}`);
    },
  });
}

function imageFilter(req, file, callback) {
  if (!EXTENSIONS[file.mimetype] || !/\.(jpe?g|png|webp)$/i.test(file.originalname)) {
    callback(new AppError(`${file.fieldname}: only JPG, JPEG, PNG and WEBP images are allowed`, 400));
    return;
  }
  callback(null, true);
}

/** Multer middleware for image fields, e.g. imageUpload('categories', [{ name: 'image', maxCount: 1 }]). */
export function imageUpload(folder, fields) {
  return multer({
    storage: storageFor(folder),
    fileFilter: imageFilter,
    limits: { fileSize: MAX_IMAGE_SIZE, files: 20, fields: 50 },
  }).fields(fields);
}

export function publicPath(file, folder) {
  return `${PUBLIC_UPLOAD_PREFIX}${folder}/${file.filename}`;
}

/** Collects the public paths of every file multer stored for this request. */
export function uploadedPaths(req) {
  return Object.values(req.files ?? {}).flat().map((file) => path.relative(UPLOAD_ROOT, file.path).split(path.sep).join('/'))
    .map((relative) => `${PUBLIC_UPLOAD_PREFIX}${relative}`);
}

/** Multipart forms send their fields as one JSON string in `data`; expose it as req.body. */
export function parseMultipartJson(req, res, next) {
  if (typeof req.body?.data === 'string') {
    try {
      req.body = JSON.parse(req.body.data);
    } catch {
      next(new AppError('Invalid form data', 400));
      return;
    }
  }
  next();
}
