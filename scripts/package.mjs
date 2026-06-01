// Packages dist/chrome and dist/firefox into store-ready .zip artifacts with zero
// dependencies (Node's zlib for deflate, shared CRC-32). Produces a standard ZIP
// with the manifest at the archive root, which is what both stores expect.
import { deflateRawSync } from 'node:zlib';
import { readFileSync, readdirSync, statSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crc32 } from './_crc.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const VERSION = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8')).version;
const ARTIFACTS = resolve(ROOT, 'artifacts');

function listFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...listFiles(full));
    else out.push(full);
  }
  return out;
}

function zip(srcDir, outFile) {
  const files = listFiles(srcDir);
  const locals = [];
  const central = [];
  let offset = 0;

  for (const full of files) {
    const name = relative(srcDir, full).split(sep).join('/'); // ZIP uses forward slashes
    const data = readFileSync(full);
    const compressed = deflateRawSync(data, { level: 9 });
    const useStore = compressed.length >= data.length;
    const body = useStore ? data : compressed;
    const method = useStore ? 0 : 8;
    const crc = crc32(data);
    const nameBuf = Buffer.from(name, 'utf8');

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(0, 6); // flags
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(0, 10); // mod time
    local.writeUInt16LE(0x21, 12); // mod date (1980-01-01)
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    locals.push(local, nameBuf, body);

    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4); // version made by
    cd.writeUInt16LE(20, 6); // version needed
    cd.writeUInt16LE(0, 8);
    cd.writeUInt16LE(method, 10);
    cd.writeUInt16LE(0, 12);
    cd.writeUInt16LE(0x21, 14);
    cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(body.length, 20);
    cd.writeUInt32LE(data.length, 24);
    cd.writeUInt16LE(nameBuf.length, 28);
    cd.writeUInt32LE(offset, 42);
    central.push(cd, nameBuf);

    offset += local.length + nameBuf.length + body.length;
  }

  const centralBuf = Buffer.concat(central);
  const localBuf = Buffer.concat(locals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(localBuf.length, 16);

  writeFileSync(outFile, Buffer.concat([localBuf, centralBuf, end]));
  return { count: files.length, bytes: localBuf.length + centralBuf.length + end.length };
}

mkdirSync(ARTIFACTS, { recursive: true });
for (const target of ['chrome', 'firefox']) {
  const dir = resolve(ROOT, 'dist', target);
  if (!existsSync(dir)) {
    console.error(`✗ dist/${target} missing — run "npm run build" first.`);
    process.exit(1);
  }
  const out = resolve(ARTIFACTS, `lockd-${target}-${VERSION}.zip`);
  const { count, bytes } = zip(dir, out);
  console.log(`✓ lockd-${target}-${VERSION}.zip — ${count} files, ${(bytes / 1024).toFixed(1)} KB`);
}
