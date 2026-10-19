import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { Script } from 'node:vm';
import { gunzipSync } from 'node:zlib';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const sourceDirectory = join(root, 'source');
const publicDirectory = join(root, 'public');
const outputDirectory = join(root, 'dist');
const metadata = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const manifest = JSON.parse(await readFile(join(sourceDirectory, 'manifest.json'), 'utf8'));
const release = `v${metadata.version}`;
const sha256 = (value) => createHash('sha256').update(value).digest('hex');

if (manifest.format_version !== 1 || manifest.encoding !== 'gzip') {
  throw new Error('Unsupported planner source manifest format.');
}
if (manifest.version !== metadata.version) {
  throw new Error('Source manifest and package.json versions do not match.');
}
if (manifest.chunk_bytes !== 131072
    || !Number.isSafeInteger(manifest.gzip_bytes) || manifest.gzip_bytes <= 0
    || !Number.isSafeInteger(manifest.original_bytes) || manifest.original_bytes <= 0
    || !/^[a-f0-9]{64}$/.test(manifest.gzip_sha256)
    || !/^[a-f0-9]{64}$/.test(manifest.original_sha256)
    || !Array.isArray(manifest.parts)
    || manifest.parts.length !== Math.ceil(manifest.gzip_bytes / manifest.chunk_bytes)) {
  throw new Error('Invalid planner source manifest metadata.');
}

const chunks = [];
for (let index = 0; index < manifest.parts.length; index += 1) {
  const part = manifest.parts[index];
  const expectedName = `planner.html.gz.part-${String(index).padStart(3, '0')}`;
  if (part !== expectedName) throw new Error(`Unexpected source part name or order: ${part}`);
  const chunk = await readFile(join(sourceDirectory, part));
  const expectedBytes = Math.min(manifest.chunk_bytes, manifest.gzip_bytes - index * manifest.chunk_bytes);
  if (chunk.length !== expectedBytes) throw new Error(`Incorrect size for source part ${part}.`);
  chunks.push(chunk);
}

const compressed = Buffer.concat(chunks);
if (sha256(compressed) !== manifest.gzip_sha256) {
  throw new Error('Packaged planner checksum does not match source/manifest.json.');
}
if (compressed.readUInt32LE(4) !== 0) {
  throw new Error('Packaged planner gzip timestamp must be zero.');
}
const original = gunzipSync(compressed);
if (original.length !== manifest.original_bytes || sha256(original) !== manifest.original_sha256) {
  throw new Error('Restored planner size or checksum does not match source/manifest.json.');
}
const html = original.toString('utf8');
if (!Buffer.from(html, 'utf8').equals(original)) {
  throw new Error('The restored planner is not valid UTF-8.');
}

if (!html.includes(`<span>CNWL job planner · ${release}</span>`)) {
  throw new Error(`The planner footer must match package.json release ${release}.`);
}

const scriptPattern = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
const typePattern = /(?:^|\s)type\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/i;
const javascriptTypes = new Set([
  '',
  'text/javascript',
  'application/javascript',
  'text/ecmascript',
  'application/ecmascript',
  'module',
]);
let checked = 0;

for (const [tag, attributes, source] of html.matchAll(scriptPattern)) {
  const typeMatch = attributes.match(typePattern);
  const type = (typeMatch?.[1] ?? typeMatch?.[2] ?? typeMatch?.[3] ?? '').trim().toLowerCase();
  // JSON, import maps and other data script elements are not executable JavaScript.
  if (!javascriptTypes.has(type) || !source.trim()) continue;

  checked += 1;
  const filename = `index.html:inline-script-${checked}`;
  if (type === 'module') {
    const result = spawnSync(process.execPath, ['--input-type=module', '--check'], {
      input: source,
      encoding: 'utf8',
    });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`${filename}\n${result.stderr}`);
  } else {
    new Script(source, { filename });
  }
}

if (checked === 0) throw new Error('No executable inline scripts were found.');
console.log(`Validated ${checked} inline scripts and release ${release}.`);
console.log(`Verified ${original.length} HTML bytes; SHA-256 ${manifest.original_sha256}.`);

if (!process.argv.includes('--check')) {
  await rm(outputDirectory, { recursive: true, force: true });
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(join(outputDirectory, 'index.html'), original);
  await copyFile(join(publicDirectory, '_headers'), join(outputDirectory, '_headers'));
  console.log('Restored unchanged dist/index.html and copied public/_headers.');
}
