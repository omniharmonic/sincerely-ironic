/**
 * Upload the generated print files to Printify's image library.
 *
 *   pnpm printify-upload            # everything in print-files/manifest.json
 *   pnpm printify-upload two-wolves # only files whose name contains that
 *
 * Every upload is recorded in `scripts/printify-uploads.json` keyed by file
 * name, so the run is resumable and nothing is ever uploaded twice — a second
 * copy in Printify's library is indistinguishable from the first and there is
 * no way to tell which one a product is pointing at.
 */

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

import { api } from './printify.ts';

const OUT = path.resolve('print-files');
const MAP = path.resolve('scripts/printify-uploads.json');

/**
 * Their art already lives in Printify and did not come from our typesetting,
 * so the placeholder files the generator makes for them are meaningless.
 * Uploading them would just be clutter in the user's library.
 */
const NOT_OURS = new Set(['yard-sign', 'fanny-pack']);

export interface Uploaded {
  id: string;
  width: number;
  height: number;
  previewUrl: string;
}

export type UploadMap = Record<string, Uploaded>;

export async function loadMap(): Promise<UploadMap> {
  if (!existsSync(MAP)) return {};
  return JSON.parse(await readFile(MAP, 'utf8')) as UploadMap;
}

async function saveMap(map: UploadMap) {
  await writeFile(MAP, `${JSON.stringify(map, null, 2)}\n`, 'utf8');
}

interface ManifestRow {
  file: string;
  handle: string;
}

async function main() {
  const filter = process.argv[2] ?? '';

  const manifest = JSON.parse(
    await readFile(path.join(OUT, 'manifest.json'), 'utf8'),
  ) as ManifestRow[];

  const onDisk = new Set(await readdir(OUT));
  const map = await loadMap();

  const queue = manifest
    .filter((r) => !NOT_OURS.has(r.handle))
    .filter((r) => (filter ? r.file.includes(filter) : true))
    .filter((r) => onDisk.has(r.file))
    .filter((r) => !map[r.file]);

  const skipped = manifest.filter((r) => NOT_OURS.has(r.handle)).length;
  console.log(
    `${manifest.length} in manifest · ${Object.keys(map).length} already uploaded · ` +
      `${skipped} skipped (art not ours) · ${queue.length} to upload\n`,
  );
  if (queue.length === 0) {
    console.log('Nothing to do.');
    return;
  }

  let done = 0;
  const failures: { file: string; reason: string }[] = [];

  for (const row of queue) {
    const bytes = await readFile(path.join(OUT, row.file));
    try {
      const res = await api<{ id: string; width: number; height: number; preview_url: string }>(
        'POST',
        '/uploads/images.json',
        { file_name: row.file, contents: bytes.toString('base64') },
      );
      map[row.file] = {
        id: res.id,
        width: res.width,
        height: res.height,
        previewUrl: res.preview_url,
      };
      done += 1;
      console.log(`✓ ${row.file}  ${res.width}×${res.height}  ${res.id}`);
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e);
      failures.push({ file: row.file, reason });
      console.warn(`✗ ${row.file} — ${reason}`);
    }
    // Persist as we go, so an interruption never costs more than one upload.
    if (done % 10 === 0) await saveMap(map);
  }

  await saveMap(map);

  console.log(`\n${done} uploaded, ${failures.length} failed. Library now holds ${Object.keys(map).length}.`);
  for (const f of failures) console.log(`  ${f.file}: ${f.reason}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
