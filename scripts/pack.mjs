import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { constants, gzipSync } from 'node:zlib';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const sourceDirectory = join(root, 'source');
const chunkBytes = 131072;
const inputArguments = process.argv.slice(2);
const sha256 = (value) => createHash('sha256').update(value).digest('hex');

if (inputArguments.length !== 1) {
  throw new Error('Usage: npm run pack -- /path/to/updated-planner.html');
}

const metadata = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const original = await readFile(resolve(inputArguments[0]));
const html = original.toString('utf8');
if (!Buffer.from(html, 'utf8').equals(original)) {
  throw new Error('The planner must be a valid UTF-8 HTML file.');
}
if (!html.includes(`<span>CNWL job planner · v${metadata.version}</span>`)) {
  throw new Error(`Update package.json to match the planner footer before packing (expected v${metadata.version}).`);
}

// Node's gzip encoder writes a zero timestamp. Set the header explicitly as
// well, and normalize the OS byte so the same input has a portable header.
const compressed = gzipSync(original, { level: constants.Z_BEST_COMPRESSION });
compressed.writeUInt32LE(0, 4);
compressed[9] = 255;

await mkdir(sourceDirectory, { recursive: true });
const parts = [];
for (let offset = 0; offset < compressed.length; offset += chunkBytes) {
  const part = `planner.html.gz.part-${String(parts.length).padStart(3, '0')}`;
  parts.push(part);
  await writeFile(join(sourceDirectory, part), compressed.subarray(offset, offset + chunkBytes));
}

const manifest = {
  format_version: 1,
  version: metadata.version,
  encoding: 'gzip',
  chunk_bytes: chunkBytes,
  original_sha256: sha256(original),
  original_bytes: original.length,
  gzip_sha256: sha256(compressed),
  gzip_bytes: compressed.length,
  parts,
};

await writeFile(join(sourceDirectory, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
for (const existing of await readdir(sourceDirectory)) {
  if (/^planner\.html\.gz\.part-\d+$/.test(existing) && !parts.includes(existing)) {
    await rm(join(sourceDirectory, existing));
  }
}

console.log(`Packed v${metadata.version}: ${original.length} HTML bytes into ${parts.length} parts (${compressed.length} gzip bytes).`);
console.log(`HTML SHA-256: ${manifest.original_sha256}`);
console.log('Run npm test and npm run build before committing source/ and package.json.');
