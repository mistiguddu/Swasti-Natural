import fs from 'node:fs/promises';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import AppError from '../utils/AppError.js';
import { createZip, isZip, readZip } from '../utils/zip.js';

/*
 * Super-admin database backup, export and import in real MongoDB formats:
 *
 *  - "bson"  → mongodump layout:  dump/<db>/<collection>.bson + <collection>.metadata.json
 *              Restore with:      mongorestore --dir=dump   (after unzipping)
 *  - "json"  → mongoexport layout: <db>/<collection>.json, one canonical Extended JSON v2
 *              document per line, + <collection>.metadata.json (indexes).
 *              Import with:       mongoimport --db=<db> --collection=<name> --file=<name>.json
 *
 * Both are ZIP archives. Import accepts either archive, or a single .bson / .json file
 * (mongoexport lines or --jsonArray). Data is copied byte-for-byte (BSON) or with exact types
 * (canonical EJSON), so ObjectIds, dates, Int32/Int64/Double and Decimal128 survive unchanged.
 */

const { BSON } = mongoose.mongo;
const { EJSON } = BSON;

export const BACKUP_DIR = path.resolve('backups');
const STAGING_DIR = path.join(BACKUP_DIR, '.staging');
const STAGING_TTL_MS = 60 * 60 * 1000;
const MAX_AUTO_BACKUPS = 20;
const BATCH = 1000;
const MANIFEST = 'swasti-backup.json';

/** Keep exact BSON types when decoding (Int32 vs Double, Int64, binary, regex). */
const DESERIALIZE = { promoteValues: false, promoteLongs: false, promoteBuffers: false, bsonRegExp: true };
const COLLECTION_NAME = /^[A-Za-z0-9_][A-Za-z0-9_.-]{0,119}$/;

const db = () => {
  const database = mongoose.connection.db;
  if (!database) throw new AppError('The database is not connected', 503);
  return database;
};

const isUserCollection = (name) => COLLECTION_NAME.test(name) && !name.startsWith('system.');

function stamp(date = new Date()) {
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

/* ───────────────────────────── Overview ───────────────────────────── */

async function collectionInfos() {
  const infos = await db().listCollections({}, { nameOnly: false }).toArray();
  return infos.filter((info) => (info.type ?? 'collection') === 'collection' && isUserCollection(info.name))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function overview() {
  const database = db();
  const infos = await collectionInfos();
  const collections = await Promise.all(infos.map(async (info) => {
    const collection = database.collection(info.name);
    const [documents, indexes] = await Promise.all([collection.estimatedDocumentCount(), collection.indexes().catch(() => [])]);
    return { name: info.name, documents, indexes: indexes.length };
  }));
  let stats = null;
  try {
    const result = await database.stats();
    stats = { dataSize: Number(result.dataSize ?? 0), storageSize: Number(result.storageSize ?? 0), indexSize: Number(result.indexSize ?? 0), objects: Number(result.objects ?? 0) };
  } catch { /* stats need extra privileges on some hosts */ }
  return {
    database: database.databaseName,
    collections,
    totals: { collections: collections.length, documents: collections.reduce((sum, item) => sum + item.documents, 0) },
    stats,
    backups: await listBackups(),
  };
}

/* ───────────────────────────── Export ───────────────────────────── */

function uuidOf(info) {
  try {
    const uuid = info.info?.uuid;
    if (!uuid) return undefined;
    return Buffer.from(uuid.buffer ?? uuid.value?.() ?? uuid).toString('hex');
  } catch {
    return undefined;
  }
}

/** The same metadata document mongodump writes (canonical Extended JSON). */
async function metadataFor(info) {
  const indexes = await db().collection(info.name).listIndexes().toArray().catch(() => []);
  const metadata = {
    indexes,
    ...(uuidOf(info) ? { uuid: uuidOf(info) } : {}),
    collectionName: info.name,
    type: 'collection',
  };
  if (info.options && Object.keys(info.options).length) metadata.options = info.options;
  return Buffer.from(EJSON.stringify(metadata, { relaxed: false }));
}

/** Reads every document of a collection as raw BSON buffers (exact bytes, no re-encoding). */
async function rawDocuments(name) {
  const cursor = db().collection(name).find({}, { raw: true, batchSize: BATCH });
  const docs = [];
  for await (const doc of cursor) docs.push(Buffer.from(doc));
  return docs;
}

function resolveSelection(infos, requested) {
  if (!requested?.length) return infos;
  const wanted = new Set(requested);
  const selected = infos.filter((info) => wanted.has(info.name));
  const unknown = [...wanted].filter((name) => !infos.some((info) => info.name === name));
  if (unknown.length) throw new AppError(`Unknown collection(s): ${unknown.join(', ')}`, 400);
  return selected;
}

/**
 * Builds a backup ZIP. Returns `{ buffer, filename, collections }`.
 * `format`: "bson" (mongodump) or "json" (mongoexport, canonical Extended JSON).
 */
export async function exportDatabase({ format = 'bson', collections: requested = [], label = 'export' } = {}) {
  if (!['bson', 'json'].includes(format)) throw new AppError('Format must be "bson" or "json"', 400);
  const database = db();
  const dbName = database.databaseName;
  const selected = resolveSelection(await collectionInfos(), requested);
  if (!selected.length) throw new AppError('There are no collections to export', 400);

  const entries = [];
  const summary = [];
  const base = format === 'bson' ? `dump/${dbName}` : dbName;
  for (const info of selected) {
    const docs = await rawDocuments(info.name);
    const data = format === 'bson'
      ? Buffer.concat(docs)
      : Buffer.from(docs.map((raw) => EJSON.stringify(BSON.deserialize(raw, DESERIALIZE), { relaxed: false })).join('\n') + (docs.length ? '\n' : ''));
    entries.push({ name: `${base}/${info.name}.${format}`, data });
    entries.push({ name: `${base}/${info.name}.metadata.json`, data: await metadataFor(info) });
    summary.push({ name: info.name, documents: docs.length });
  }

  const createdAt = new Date();
  entries.push({
    name: MANIFEST,
    data: Buffer.from(JSON.stringify({
      app: 'swasti_natureal_api_server',
      database: dbName,
      format: format === 'bson' ? 'mongodump-bson' : 'mongoexport-canonical-extended-json',
      createdAt: createdAt.toISOString(),
      collections: summary,
      restore: format === 'bson'
        ? 'Unzip, then: mongorestore --uri="<connection string>" --dir=dump'
        : `Unzip, then for each file: mongoimport --uri="<connection string>" --db=${dbName} --collection=<name> --file=${dbName}/<name>.json`,
    }, null, 2)),
  });

  return {
    buffer: createZip(entries, { date: createdAt }),
    filename: `swasti-${dbName}-${label}-${stamp(createdAt)}-${format}.zip`,
    collections: summary,
  };
}

/* ───────────────────────────── Parsing an upload ───────────────────────────── */

function parseBson(buffer, file) {
  const docs = [];
  let offset = 0;
  while (offset < buffer.length) {
    if (offset + 5 > buffer.length) throw new AppError(`"${file}" ends in the middle of a document`, 400);
    const size = buffer.readInt32LE(offset);
    if (size < 5 || offset + size > buffer.length) throw new AppError(`"${file}" is not valid BSON (bad document at byte ${offset})`, 400);
    try {
      docs.push(BSON.deserialize(buffer.subarray(offset, offset + size), DESERIALIZE));
    } catch {
      throw new AppError(`"${file}" is not valid BSON (bad document at byte ${offset})`, 400);
    }
    offset += size;
  }
  return docs;
}

function parseJson(buffer, file) {
  const text = buffer.toString('utf8').replace(/^﻿/, '').trim();
  if (!text) return [];
  if (text.startsWith('[')) {
    let parsed;
    try {
      parsed = EJSON.parse(text, { relaxed: false });
    } catch (error) {
      throw new AppError(`"${file}" is not valid Extended JSON: ${error.message}`, 400);
    }
    if (!Array.isArray(parsed)) throw new AppError(`"${file}" must contain documents`, 400);
    return parsed;
  }
  return text.split(/\r?\n/).flatMap((line, index) => {
    if (!line.trim()) return [];
    try {
      const doc = EJSON.parse(line, { relaxed: false });
      if (!doc || typeof doc !== 'object' || Array.isArray(doc)) throw new Error('each line must be one document');
      return [doc];
    } catch (error) {
      throw new AppError(`"${file}" line ${index + 1}: invalid Extended JSON (${error.message})`, 400);
    }
  });
}

/**
 * Turns an uploaded file into `{ format, database, collections: Map<name, { docs, indexes }> }`.
 * Accepts a mongodump/mongoexport ZIP, a single .bson file or a single .json file.
 */
export function parseBackup(buffer, originalName) {
  const lowerName = originalName.toLowerCase();
  let files;
  if (isZip(buffer)) files = readZip(buffer);
  else if (lowerName.endsWith('.bson') || lowerName.endsWith('.json')) files = [{ name: originalName, data: buffer }];
  else throw new AppError('Upload a .zip backup, a .bson file or a .json file', 400);

  const collections = new Map();
  const databases = new Set();
  const formats = new Set();
  const entry = (name) => {
    if (!isUserCollection(name)) throw new AppError(`"${name}" is not a valid collection name`, 400);
    if (!collections.has(name)) collections.set(name, { docs: null, indexes: [] });
    return collections.get(name);
  };

  for (const file of files) {
    const parts = file.name.split('/').filter(Boolean);
    const base = parts.at(-1) ?? '';
    if (parts.some((part) => part === '..') || parts[0] === '__MACOSX' || base.startsWith('.')) continue;
    if (base === MANIFEST || base === 'prelude.json' || base === 'oplog.bson') continue;
    if (parts.length >= 2) databases.add(parts.at(-2));

    if (base.endsWith('.metadata.json')) {
      try {
        const metadata = EJSON.parse(file.data.toString('utf8'), { relaxed: true });
        entry(base.slice(0, -'.metadata.json'.length)).indexes = Array.isArray(metadata.indexes) ? metadata.indexes : [];
      } catch {
        throw new AppError(`"${file.name}" is not valid metadata`, 400);
      }
    } else if (base.endsWith('.bson')) {
      const target = entry(base.slice(0, -5));
      if (target.docs) throw new AppError(`The backup contains "${base}" more than once (several databases?)`, 400);
      target.docs = parseBson(file.data, file.name);
      formats.add('bson');
    } else if (base.endsWith('.json')) {
      const target = entry(base.slice(0, -5));
      if (target.docs) throw new AppError(`The backup contains "${base}" more than once (several databases?)`, 400);
      target.docs = parseJson(file.data, file.name);
      formats.add('json');
    }
  }

  for (const [name, item] of collections) if (!item.docs) collections.delete(name);
  if (!collections.size) throw new AppError('No collections were found in this file', 400);
  return {
    format: formats.size > 1 ? 'mixed' : [...formats][0],
    database: databases.size === 1 ? [...databases][0] : null,
    collections,
  };
}

/* ───────────────────────────── Staged uploads (preview → confirm) ───────────────────────────── */

export async function ensureDirectories() {
  await fs.mkdir(STAGING_DIR, { recursive: true });
}

export const stagingDir = () => STAGING_DIR;

async function cleanStaging() {
  const files = await fs.readdir(STAGING_DIR).catch(() => []);
  await Promise.all(files.map(async (file) => {
    const full = path.join(STAGING_DIR, file);
    const info = await fs.stat(full).catch(() => null);
    if (info && Date.now() - info.mtimeMs > STAGING_TTL_MS) await fs.rm(full, { force: true });
  }));
}

const UPLOAD_ID = /^[a-f0-9]{32}$/;

/** Validates an uploaded file and keeps it for the confirm step. Returns a preview. */
export async function previewUpload(file) {
  await cleanStaging();
  const id = randomBytes(16).toString('hex');
  try {
    const buffer = await fs.readFile(file.path);
    const parsed = parseBackup(buffer, file.originalname);
    await fs.rename(file.path, path.join(STAGING_DIR, `${id}.upload`));
    await fs.writeFile(path.join(STAGING_DIR, `${id}.json`), JSON.stringify({ originalName: file.originalname, size: file.size }));
    const existing = new Map((await overview()).collections.map((item) => [item.name, item.documents]));
    return {
      uploadId: id,
      fileName: file.originalname,
      size: file.size,
      format: parsed.format,
      database: parsed.database,
      currentDatabase: db().databaseName,
      collections: [...parsed.collections].map(([name, item]) => ({
        name,
        documents: item.docs.length,
        indexes: item.indexes.length,
        exists: existing.has(name),
        currentDocuments: existing.get(name) ?? 0,
      })),
    };
  } catch (error) {
    await fs.rm(file.path, { force: true });
    throw error;
  }
}

async function loadStaged(uploadId) {
  if (!UPLOAD_ID.test(String(uploadId))) throw new AppError('Invalid upload. Please choose the file again.', 400);
  const dataPath = path.join(STAGING_DIR, `${uploadId}.upload`);
  const metaPath = path.join(STAGING_DIR, `${uploadId}.json`);
  const [buffer, meta] = await Promise.all([
    fs.readFile(dataPath).catch(() => null),
    fs.readFile(metaPath, 'utf8').then(JSON.parse).catch(() => null),
  ]);
  if (!buffer || !meta) throw new AppError('This upload has expired. Please choose the file again.', 410);
  return { buffer, meta, cleanup: () => Promise.all([fs.rm(dataPath, { force: true }), fs.rm(metaPath, { force: true })]) };
}

/* ───────────────────────────── Import ───────────────────────────── */

const INDEX_OPTION_SKIP = new Set(['v', 'key', 'ns', 'background']);

async function applyIndexes(collection, indexes, warnings) {
  for (const index of indexes) {
    if (!index?.key || index.name === '_id_') continue;
    const options = Object.fromEntries(Object.entries(index).filter(([key]) => !INDEX_OPTION_SKIP.has(key)));
    try {
      await collection.createIndex(index.key, options);
    } catch (error) {
      warnings.push(`${collection.collectionName}: index "${index.name}" was not created (${error.message})`);
    }
  }
}

async function writeCollection(name, item, mode, warnings) {
  const database = db();
  const collection = database.collection(name);
  const result = { name, documents: item.docs.length, inserted: 0, updated: 0, removed: 0 };

  if (mode === 'replace') {
    result.removed = (await collection.deleteMany({})).deletedCount;
    for (let i = 0; i < item.docs.length; i += BATCH) {
      result.inserted += (await collection.insertMany(item.docs.slice(i, i + BATCH), { ordered: true, bypassDocumentValidation: true })).insertedCount;
    }
  } else {
    for (let i = 0; i < item.docs.length; i += BATCH) {
      const operations = item.docs.slice(i, i + BATCH).map((doc) => (doc._id === undefined
        ? { insertOne: { document: doc } }
        : { replaceOne: { filter: { _id: doc._id }, replacement: doc, upsert: true } }));
      const outcome = await collection.bulkWrite(operations, { ordered: true, bypassDocumentValidation: true });
      result.inserted += outcome.insertedCount + outcome.upsertedCount;
      result.updated += outcome.modifiedCount;
    }
  }
  await applyIndexes(collection, item.indexes, warnings);
  return result;
}

let busy = false;

async function withLock(task) {
  if (busy) throw new AppError('Another import or restore is already running. Please wait.', 409);
  busy = true;
  try {
    return await task();
  } finally {
    busy = false;
  }
}

/** True when at least one active super admin would remain, so nobody is locked out. */
async function hasActiveSuperAdmin() {
  return Boolean(await db().collection('users').countDocuments({ role: 'superadmin', isActive: { $ne: false } }, { limit: 1 }));
}

/**
 * Writes `parsed` into the database. A backup of every affected collection is saved first;
 * if anything fails — or no active super admin would remain — the affected collections are
 * put back exactly as they were.
 */
async function applyBackup(parsed, { mode, collections: requested, label }) {
  if (!['merge', 'replace'].includes(mode)) throw new AppError('Mode must be "merge" or "replace"', 400);
  const names = requested?.length ? requested : [...parsed.collections.keys()];
  const missing = names.filter((name) => !parsed.collections.has(name));
  if (missing.length) throw new AppError(`Not in this backup: ${missing.join(', ')}`, 400);
  if (!names.length) throw new AppError('Choose at least one collection to import', 400);

  const existingNames = new Set((await collectionInfos()).map((info) => info.name));
  const toBackUp = names.filter((name) => existingNames.has(name));
  const safety = toBackUp.length ? await saveBackup({ format: 'bson', collections: toBackUp, label }) : null;

  const warnings = [];
  const results = [];
  try {
    for (const name of names) results.push(await writeCollection(name, parsed.collections.get(name), mode, warnings));
    if (names.includes('users') && !(await hasActiveSuperAdmin())) {
      throw new AppError('The import would leave no active super administrator, so it was cancelled to keep you from being locked out.', 400);
    }
  } catch (error) {
    await rollback(names, existingNames, safety);
    if (error instanceof AppError) throw new AppError(`${error.message} All changes were rolled back.`, error.statusCode);
    if (error?.code === 11000) throw new AppError(`Duplicate key in ${error.keyValue ? JSON.stringify(error.keyValue) : 'the data'}. All changes were rolled back.`, 409);
    throw new AppError(`Import failed: ${error.message}. All changes were rolled back.`, 400);
  }
  return { mode, collections: results, warnings, safetyBackup: safety?.name ?? null };
}

async function rollback(names, existingNames, safety) {
  const database = db();
  const saved = safety ? parseBackup(await fs.readFile(path.join(BACKUP_DIR, safety.name)), safety.name) : { collections: new Map() };
  for (const name of names) {
    try {
      if (!existingNames.has(name)) {
        await database.collection(name).drop().catch(() => {});
        continue;
      }
      const item = saved.collections.get(name) ?? { docs: [], indexes: [] };
      await database.collection(name).deleteMany({});
      for (let i = 0; i < item.docs.length; i += BATCH) await database.collection(name).insertMany(item.docs.slice(i, i + BATCH), { ordered: false });
    } catch (error) {
      console.error(`Rollback of "${name}" failed:`, error);
    }
  }
}

export async function importUpload({ uploadId, mode, collections }) {
  return withLock(async () => {
    const staged = await loadStaged(uploadId);
    const parsed = parseBackup(staged.buffer, staged.meta.originalName);
    const result = await applyBackup(parsed, { mode, collections, label: 'pre-import' });
    await staged.cleanup();
    await pruneAutoBackups();
    return { ...result, fileName: staged.meta.originalName };
  });
}

/* ───────────────────────────── Server-side backups ───────────────────────────── */

const BACKUP_NAME = /^swasti-[A-Za-z0-9_.-]+\.zip$/;

export function backupPath(name) {
  if (!BACKUP_NAME.test(String(name))) throw new AppError('Backup not found', 404);
  return path.join(BACKUP_DIR, path.basename(name));
}

export async function saveBackup({ format = 'bson', collections = [], label = 'backup' } = {}) {
  await ensureDirectories();
  const { buffer, filename, collections: summary } = await exportDatabase({ format, collections, label });
  await fs.writeFile(path.join(BACKUP_DIR, filename), buffer, { mode: 0o600 });
  return { name: filename, size: buffer.length, collections: summary };
}

export async function listBackups() {
  const files = await fs.readdir(BACKUP_DIR).catch(() => []);
  const items = await Promise.all(files.filter((file) => BACKUP_NAME.test(file)).map(async (name) => {
    const info = await fs.stat(path.join(BACKUP_DIR, name)).catch(() => null);
    if (!info) return null;
    return {
      name,
      size: info.size,
      createdAt: info.mtime,
      format: name.endsWith('-json.zip') ? 'json' : 'bson',
      automatic: /-pre-(import|restore)-/.test(name),
    };
  }));
  return items.filter(Boolean).sort((a, b) => b.createdAt - a.createdAt);
}

export async function deleteBackup(name) {
  await fs.rm(backupPath(name)).catch((error) => {
    if (error.code === 'ENOENT') throw new AppError('Backup not found', 404);
    throw error;
  });
}

export async function restoreBackup(name, { mode = 'replace', collections } = {}) {
  return withLock(async () => {
    const buffer = await fs.readFile(backupPath(name)).catch(() => null);
    if (!buffer) throw new AppError('Backup not found', 404);
    const result = await applyBackup(parseBackup(buffer, name), { mode, collections, label: 'pre-restore' });
    await pruneAutoBackups();
    return { ...result, fileName: name };
  });
}

/** Keeps the newest automatic (pre-import / pre-restore) backups; manual ones are never removed. */
async function pruneAutoBackups() {
  const automatic = (await listBackups()).filter((item) => item.automatic);
  await Promise.all(automatic.slice(MAX_AUTO_BACKUPS).map((item) => fs.rm(path.join(BACKUP_DIR, item.name), { force: true })));
}
