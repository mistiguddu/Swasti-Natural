import { randomBytes } from 'node:crypto';
import { Router } from 'express';
import bcrypt from 'bcrypt';
import multer from 'multer';
import { z } from 'zod';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate, requirePermission } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { notify } from '../services/notification.service.js';
import * as database from '../services/database.service.js';

/*
 * Database backup, export and import — super administrators only ("database.manage" is not
 * granted to admins, and a super admin "viewing as admin" loses it too). Every action that
 * changes or deletes data also asks for the account password again.
 */

export const MAX_IMPORT_SIZE = 250 * 1024 * 1024;

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, callback) => database.ensureDirectories().then(() => callback(null, database.stagingDir()), callback),
    filename: (req, file, callback) => callback(null, `${randomBytes(12).toString('hex')}.incoming`),
  }),
  limits: { fileSize: MAX_IMPORT_SIZE, files: 1, fields: 5 },
  fileFilter: (req, file, callback) => {
    if (!/\.(zip|bson|json)$/i.test(file.originalname)) {
      callback(new AppError('Upload a .zip backup, a .bson file or a .json file', 400));
      return;
    }
    callback(null, true);
  },
}).single('file');

const collectionList = z.array(z.string().trim().regex(/^[A-Za-z0-9_][A-Za-z0-9_.-]{0,119}$/, 'Invalid collection name')).max(500).default([]);
const password = z.string().min(1, 'Enter your password to confirm').max(128);

const importSchema = z.object({
  body: z.object({
    uploadId: z.string().regex(/^[a-f0-9]{32}$/, 'Invalid upload'),
    mode: z.enum(['merge', 'replace']),
    collections: collectionList,
    password,
  }),
});
const backupSchema = z.object({ body: z.object({ format: z.enum(['bson', 'json']).default('bson'), collections: collectionList }) });
const restoreSchema = z.object({ body: z.object({ mode: z.enum(['merge', 'replace']).default('replace'), collections: collectionList, password }) });
const deleteSchema = z.object({ body: z.object({ password }) });

/** Re-checks the signed-in super admin's password before a destructive action. */
async function confirmPassword(req) {
  const user = await User.findById(req.user._id).select('+passwordHash');
  if (!user || !(await bcrypt.compare(req.validated.body.password, user.passwordHash))) {
    throw new AppError('Password is incorrect', 400, [{ path: 'password', message: 'Password is incorrect' }]);
  }
}

function sendZip(res, { buffer, filename }) {
  res.set({
    'Content-Type': 'application/zip',
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Content-Length': buffer.length,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.send(buffer);
}

const actor = (req) => ({ name: req.user.name });
const ok = (fn) => asyncHandler(async (req, res) => res.json({ data: await fn(req) }));

export const databaseRouter = Router();
databaseRouter.use(authenticate, requirePermission('database.manage'));

databaseRouter.get('/', ok(() => database.overview()));

/** Download a backup: ?format=bson|json&collections=a,b (all collections when omitted). */
databaseRouter.get('/export', asyncHandler(async (req, res) => {
  const format = req.query.format === 'json' ? 'json' : 'bson';
  const collections = String(req.query.collections ?? '').split(',').map((name) => name.trim()).filter(Boolean);
  const result = await database.exportDatabase({ format, collections });
  await notify({
    type: 'database.export',
    title: 'Database exported',
    message: `${result.collections.length} collection(s), ${format === 'bson' ? 'BSON (mongodump)' : 'Extended JSON (mongoexport)'}`,
    link: '/database',
    actor: actor(req),
  });
  sendZip(res, result);
}));

/** Step 1 of an import: upload and check the file; nothing is changed yet. */
databaseRouter.post('/import/preview', (req, res, next) => upload(req, res, (error) => {
  if (error?.code === 'LIMIT_FILE_SIZE') return next(new AppError(`The file is larger than ${MAX_IMPORT_SIZE / 1024 / 1024} MB`, 413));
  if (error) return next(error);
  if (!req.file) return next(new AppError('Choose a backup file to import', 400));
  return database.previewUpload(req.file).then((data) => res.json({ data }), next);
}));

/** Step 2: apply the checked upload (password required). */
databaseRouter.post('/import', validate(importSchema), asyncHandler(async (req, res) => {
  await confirmPassword(req);
  const { uploadId, mode, collections } = req.validated.body;
  const result = await database.importUpload({ uploadId, mode, collections });
  await notify({
    type: 'database.import',
    title: 'Database imported',
    message: `${result.fileName} · ${mode} · ${result.collections.map((item) => item.name).join(', ')}`.slice(0, 480),
    link: '/database',
    actor: actor(req),
  });
  res.json({ data: result });
}));

databaseRouter.get('/backups', ok(() => database.listBackups()));

databaseRouter.post('/backups', validate(backupSchema), asyncHandler(async (req, res) => {
  const backup = await database.saveBackup({ ...req.validated.body, label: 'backup' });
  await notify({ type: 'database.backup', title: 'Database backup saved on the server', message: backup.name, link: '/database', actor: actor(req) });
  res.status(201).json({ data: backup });
}));

databaseRouter.get('/backups/:name', asyncHandler(async (req, res) => {
  const file = database.backupPath(req.params.name);
  res.set('Cache-Control', 'no-store');
  res.download(file, req.params.name, (error) => {
    if (error && !res.headersSent) res.status(404).json({ error: { message: 'Backup not found' } });
  });
}));

databaseRouter.post('/backups/:name/restore', validate(restoreSchema), asyncHandler(async (req, res) => {
  await confirmPassword(req);
  const { mode, collections } = req.validated.body;
  const result = await database.restoreBackup(req.params.name, { mode, collections });
  await notify({ type: 'database.restore', title: 'Database restored from backup', message: `${req.params.name} · ${mode}`, link: '/database', actor: actor(req) });
  res.json({ data: result });
}));

databaseRouter.delete('/backups/:name', validate(deleteSchema), asyncHandler(async (req, res) => {
  await confirmPassword(req);
  await database.deleteBackup(req.params.name);
  res.status(204).end();
}));
