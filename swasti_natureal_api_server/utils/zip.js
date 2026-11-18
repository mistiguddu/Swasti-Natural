import zlib from 'node:zlib';
import AppError from './AppError.js';

/*
 * Minimal ZIP writer/reader (no external dependency) for database backups.
 * Supports "stored" (0) and "deflate" (8) entries, which every unzip tool and OS can open.
 * No ZIP64: a single archive is limited to 4 GB, far beyond a store database backup.
 */

const DOS_EPOCH = new Date(1980, 0, 1);

function dosDateTime(date = new Date()) {
  const d = date < DOS_EPOCH ? DOS_EPOCH : date;
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2);
  const day = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  return { time, day };
}

/** Builds a ZIP archive from `[{ name, data: Buffer }]`. */
export function createZip(entries, { date = new Date() } = {}) {
  const { time, day } = dosDateTime(date);
  const locals = [];
  const centrals = [];
  let offset = 0;

  for (const entry of entries) {
    const name = Buffer.from(entry.name, 'utf8');
    const data = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data);
    const crc = zlib.crc32(data) >>> 0;
    const deflated = data.length > 64 ? zlib.deflateRawSync(data, { level: 6 }) : null;
    const useDeflate = deflated && deflated.length < data.length;
    const body = useDeflate ? deflated : data;
    const method = useDeflate ? 8 : 0;

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(0x0800, 6); // UTF-8 names
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(day, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    locals.push(local, name, body);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4); // version made by
    central.writeUInt16LE(20, 6); // version needed
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(method, 10);
    central.writeUInt16LE(time, 12);
    central.writeUInt16LE(day, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(body.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, name);

    offset += local.length + name.length + body.length;
    if (offset > 0xffffffff) throw new AppError('Backup is too large for a ZIP archive (over 4 GB)', 413);
  }

  const centralSize = centrals.reduce((sum, part) => sum + part.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, ...centrals, end]);
}

export function isZip(buffer) {
  return buffer.length >= 4 && buffer.readUInt32LE(0) === 0x04034b50;
}

/**
 * Reads a ZIP archive into `[{ name, data }]` (folders skipped).
 * Guards against malformed and "zip bomb" archives with entry and size limits.
 */
export function readZip(buffer, { maxEntries = 2000, maxTotalSize = 1024 * 1024 * 1024 } = {}) {
  const invalid = () => new AppError('The file is not a valid ZIP archive', 400);
  // End of central directory: search backwards (a comment of up to 64 KB may follow it).
  let eocd = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 22 - 0xffff); i -= 1) {
    if (buffer.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw invalid();
  const count = buffer.readUInt16LE(eocd + 10);
  const centralOffset = buffer.readUInt32LE(eocd + 16);
  if (count > maxEntries) throw new AppError(`The archive has too many files (limit ${maxEntries})`, 400);

  const entries = [];
  let total = 0;
  let pointer = centralOffset;
  for (let index = 0; index < count; index += 1) {
    if (pointer + 46 > buffer.length || buffer.readUInt32LE(pointer) !== 0x02014b50) throw invalid();
    const method = buffer.readUInt16LE(pointer + 10);
    const crc = buffer.readUInt32LE(pointer + 16);
    const compressedSize = buffer.readUInt32LE(pointer + 20);
    const size = buffer.readUInt32LE(pointer + 24);
    const nameLength = buffer.readUInt16LE(pointer + 28);
    const extraLength = buffer.readUInt16LE(pointer + 30);
    const commentLength = buffer.readUInt16LE(pointer + 32);
    const localOffset = buffer.readUInt32LE(pointer + 42);
    const name = buffer.subarray(pointer + 46, pointer + 46 + nameLength).toString('utf8');
    pointer += 46 + nameLength + extraLength + commentLength;
    if (name.endsWith('/')) continue;

    total += size;
    if (total > maxTotalSize) throw new AppError('The archive is too large to import', 413);
    if (localOffset + 30 > buffer.length || buffer.readUInt32LE(localOffset) !== 0x04034b50) throw invalid();
    const start = localOffset + 30 + buffer.readUInt16LE(localOffset + 26) + buffer.readUInt16LE(localOffset + 28);
    const raw = buffer.subarray(start, start + compressedSize);
    if (raw.length !== compressedSize) throw invalid();

    let data;
    if (method === 0) data = raw;
    else if (method === 8) data = zlib.inflateRawSync(raw, { maxOutputLength: Math.max(size, 1) });
    else throw new AppError(`"${name}" uses an unsupported compression method`, 400);
    if (data.length !== size || (zlib.crc32(data) >>> 0) !== crc) throw new AppError(`"${name}" is damaged (checksum mismatch)`, 400);
    entries.push({ name, data });
  }
  return entries;
}
