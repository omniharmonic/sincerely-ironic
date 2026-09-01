/**
 * Create, update and prune the Printify product for every catalogue entry.
 *
 *   pnpm printify-products                    # dry run: prints what it would do
 *   pnpm printify-products --create           # create whatever is missing
 *   pnpm printify-products --update           # dry run of the re-push
 *   pnpm printify-products --create --update  # also re-push existing products
 *   pnpm printify-products --prune            # dry run: ledger rows the catalogue dropped
 *   pnpm printify-products --create --prune   # delete them
 *   pnpm printify-products --create tee       # only handles containing "tee"
 *
 * `--create` gates every write. Without it nothing leaves the machine.
 *
 * Products are created UNPUBLISHED. Nothing reaches Shopify until someone
 * calls publish, deliberately — publishing would make Printify create its own
 * Shopify listing alongside the one we already seeded, which is exactly the
 * duplicate we are avoiding.
 *
 * One product per design, in that design's default treatment only. Printify's
 * variant options are fixed by the blueprint at colour and size, so a second
 * type treatment cannot be a variant — it would have to be a whole second
 * product, and 58 designs times three treatments is not a catalogue anyone
 * wants to manage.
 *
 * Each product carries both colourways, and the two get different artwork:
 * the dark-ink file on the natural garment, the light-ink `--alt` on the
 * black. `print_areas` is a list and each entry names its own `variant_ids`,
 * which is the one place Printify's data model is more flexible than its
 * option model. Order matters: Printify expands the last group to swallow
 * every variant not named in an earlier one.
 *
 * WHERE the art sits is not decided here. `resolvePrint` in
 * `src/lib/typeset.ts` places it, `pnpm print-files` writes a file cut tight
 * to that placement and records the vendor fractions in
 * `print-files/manifest.json`, and this script passes those fractions
 * through untouched. The site art, the print file and the Printify position
 * therefore cannot disagree. There is deliberately no fallback: a print with
 * no manifest row fails its product rather than landing centred, because
 * centred in a 17-inch panel is a print at the navel.
 */

import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { catalog, type CatalogItem, type Place, type Print } from '../src/lib/catalog.ts';
import type { StyleKey } from '../src/lib/typeset.ts';
import { api, LEGACY_SHOP_ID, PrintifyError, SHOP_ID } from './printify.ts';
import { loadMap, type UploadMap } from './printify-upload.ts';

const LEDGER = path.resolve('scripts/printify-products.json');
const MANIFEST = path.resolve('print-files/manifest.json');

interface Blank {
  blueprint: number;
  provider: number;
  /** Colour names as Printify spells them, [natural, black]. Null = no colour option. */
  colours: [string, string] | null;
  /** Catalogue placement → Printify placeholder position. */
  positions: Partial<Record<Place, string>>;
  /** Sizes we sell, as Printify spells them. Omit to take all. */
  sizes?: string[];
}

/**
 * Blueprint and print provider per garment. Two providers cover the line:
 * 99 Printify Choice and 39 SwiftPOD, both US.
 *
 * Note that several catalogue placements share one Printify position — a
 * left-chest hit is a small box high on the FRONT panel, not a panel of its
 * own — so this map is many-to-one and the placeholders are grouped below.
 */
const BLANKS: Partial<Record<CatalogItem['garment'], Blank>> = {
  tee: {
    blueprint: 706, // Comfort Colors 1717
    provider: 99,
    colours: ['Ivory', 'Black'],
    positions: { front: 'front', back: 'back', chest: 'front' },
    sizes: ['S', 'M', 'L', 'XL', '2XL'],
  },
  longsleeve: {
    blueprint: 710, // Comfort Colors 6014
    provider: 99,
    colours: ['Ivory', 'Black'],
    positions: { front: 'front', back: 'back', chest: 'front', sleeve: 'left_sleeve' },
    sizes: ['S', 'M', 'L', 'XL', '2XL'],
  },
  crewneck: {
    blueprint: 1405, // Comfort Colors 1466 lightweight
    provider: 39,
    colours: ['Ivory', 'Black'],
    positions: { front: 'front', back: 'back', chest: 'front' },
    sizes: ['S', 'M', 'L', 'XL', '2XL'],
  },
  hoodie: {
    blueprint: 1528, // Comfort Colors 1467 lightweight
    provider: 99,
    colours: ['Ivory', 'Black'],
    positions: { front: 'front', back: 'back', chest: 'front' },
    sizes: ['S', 'M', 'L', 'XL', '2XL'],
  },
  sweatpants: {
    blueprint: 1398, // Gildan 18200
    provider: 39,
    // This blank has no Ivory; Sand is its natural.
    colours: ['Sand', 'Black'],
    positions: { leg: 'left_leg_front' },
    sizes: ['S', 'M', 'L', 'XL', '2XL'],
  },
  cap: {
    blueprint: 1447, // Yupoong 6245CM dad cap
    provider: 99,
    // Stone is this cap's natural; it has no Ivory.
    colours: ['Stone', 'Black'],
    positions: { front: 'front' }, // embroidery
  },
  bucket: {
    blueprint: 1910, // Big Accessories BX003
    provider: 99,
    // Only Black, Navy and White exist here, so White stands in for natural.
    colours: ['White', 'Black'],
    positions: { front: 'front' }, // embroidery
  },
  tote: {
    blueprint: 1313, // Liberty Bags OAD113
    provider: 99,
    colours: ['Natural', 'Black'],
    positions: { front: 'front', back: 'back' },
  },
  fannypack: {
    blueprint: 468,
    provider: 10,
    // One variant, no colour axis: a single print group.
    colours: null,
    positions: { front: 'front' },
  },
  robe: {
    blueprint: 923, // Long Sleeve Kimono Robe, all-over print
    provider: 14,
    colours: ['White', 'Black'],
    // Our one print goes on the back panel, which is the largest.
    positions: { front: 'back' },
    sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL'],
  },
  blanket: {
    blueprint: 238, // Sherpa Fleece Blanket
    provider: 99,
    // Sized only — no colour axis, so it takes a single print group.
    colours: null,
    positions: { front: 'front' },
    sizes: ['60" × 80"'],
  },
};

/**
 * Made in Printify by hand and not reproducible from the catalogue.
 *
 * Only the yard sign qualifies now: its art is a full-colour raster that the
 * typesetter cannot generate. The fanny pack and the robe were on this list
 * because they existed, not because they were right — both carried Printify's
 * *stock* graphics, referenced by ids that live in no upload library
 * (`GET /uploads/{id}` 404s), which is why they could not be copied to
 * another shop. They are built from our own artwork now.
 */
const ALREADY_THEIRS = new Set(['yard-sign']);

interface Variant {
  id: number;
  title: string;
  options: Record<string, string>;
  placeholders: { position: string; width: number; height: number }[];
}

/* ------------------------------------------------------------- the manifest */

/** One row of `print-files/manifest.json`. Only the fields used here. */
interface ManifestRow {
  file: string;
  sha: string;
  handle: string;
  style: string;
  placement: string;
  panelInches: string;
  pixels: string;
  /** Fractions of the print area, ready for Printify. Computed by `resolvePrint`. */
  vendor: { x: number; y: number; scale: number };
  ink: string;
  garmentColour: string;
}

type Manifest = Map<string, ManifestRow>;

async function loadManifest(): Promise<Manifest> {
  if (!existsSync(MANIFEST)) {
    throw new Error(`no ${MANIFEST} — run pnpm print-files first`);
  }
  const rows = JSON.parse(await readFile(MANIFEST, 'utf8')) as ManifestRow[];
  return new Map(rows.map((r) => [r.file, r]));
}

/* --------------------------------------------------------------- the ledger */

interface LedgerEntry {
  id: string;
  blueprint: number;
  provider: number;
  style: string;
}

/** handle → entry, for one shop. */
type ShopLedger = Record<string, LedgerEntry>;

/**
 * shop id → handle → entry.
 *
 * Keyed by shop because a Printify product id is meaningless outside the shop
 * that holds it. Connecting the real Shopify store makes a second Printify
 * shop, and a flat ledger would have claimed those 55 products already
 * existed there.
 */
type Ledger = Record<string, ShopLedger>;

const isEntry = (v: unknown): v is LedgerEntry =>
  typeof v === 'object' && v !== null && typeof (v as LedgerEntry).id === 'string';

/**
 * Read the ledger, migrating the legacy flat shape on the way in.
 *
 * The flat file could only ever have been written by the old script, which
 * only ever talked to one shop — so it migrates under `LEGACY_SHOP_ID` and
 * NOT under whatever `PRINTIFY_SHOP_ID` currently says. Filing 58 existing
 * products under a new, empty shop would make the next run build all of them
 * again in the wrong place.
 */
async function loadLedger(): Promise<{ ledger: Ledger; migrated: boolean }> {
  if (!existsSync(LEDGER)) return { ledger: {}, migrated: false };
  const raw = JSON.parse(await readFile(LEDGER, 'utf8')) as Record<string, unknown>;
  const values = Object.values(raw);

  // A legacy row is an entry; a shop-keyed row is a bag of them. An empty
  // file is ambiguous and harmless either way, so it reads as the new shape.
  const flat = values.length > 0 && values.every(isEntry);
  if (!flat) return { ledger: raw as Ledger, migrated: false };

  return { ledger: { [LEGACY_SHOP_ID]: raw as ShopLedger }, migrated: true };
}

async function saveLedger(l: Ledger) {
  await writeFile(LEDGER, `${JSON.stringify(l, null, 2)}\n`, 'utf8');
}

/* --------------------------------------------------------------- the blanks */

const variantCache = new Map<string, Variant[]>();

async function variantsFor(blank: Blank): Promise<Variant[]> {
  const key = `${blank.blueprint}/${blank.provider}`;
  const hit = variantCache.get(key);
  if (hit) return hit;
  const res = await api<{ variants: Variant[] }>(
    'GET',
    `/catalog/blueprints/${blank.blueprint}/print_providers/${blank.provider}/variants.json`,
  );
  variantCache.set(key, res.variants);
  return res.variants;
}

function pick(all: Variant[], blank: Blank, colour: string | null): Variant[] {
  return all.filter((v) => {
    if (colour !== null && v.options.color !== colour) return false;
    if (!blank.sizes) return true;
    return blank.sizes.includes(v.options.size);
  });
}

/* ---------------------------------------------------------------- the build */

interface PlacedImage {
  id: string;
  x: number;
  y: number;
  scale: number;
  angle: number;
}

interface Placeholder {
  position: string;
  images: PlacedImage[];
}

interface PrintArea {
  variant_ids: number[];
  placeholders: Placeholder[];
}

interface Built {
  body: { title: string; description: string; print_areas: PrintArea[] } & Record<string, unknown>;
  /** One line per colour group, then one per placeholder. For review. */
  lines: string[];
  /** Reasons this product must not be written. Empty means it is safe. */
  blockers: string[];
  /** Worth knowing, not worth stopping for. */
  notes: string[];
}

/**
 * Which file a print uses on a given colourway, and where it sits.
 *
 * The `--alt` file is the same artwork in the opposite ink, rendered from the
 * same `resolvePrint` call, so its placement is identical — but it only
 * exists when `pnpm print-files` was run with `--both-inks`. Without it the
 * as-drawn file stands in on both colourways, which is what shipped before
 * and is at least legible.
 */
function resolveFile(
  base: string,
  useAsDrawn: boolean,
  manifest: Manifest,
  uploads: UploadMap,
): { file: string; row: ManifestRow; upload: UploadMap[string] | undefined; note?: string } {
  const alt = base.replace(/\.png$/, '--alt.png');
  const wanted = useAsDrawn ? base : alt;

  const row = manifest.get(wanted) ?? manifest.get(base);
  if (!row) {
    throw new Error(
      `no manifest row for ${wanted} — run pnpm print-files, then pnpm printify-upload`,
    );
  }

  // Only use the alt when the generator actually made one AND it was
  // uploaded. Falling back is a colour compromise, never a placement one:
  // the vendor fractions come from the row either way.
  const useAlt = !useAsDrawn && manifest.has(alt) && Boolean(uploads[alt]);
  const file = useAlt ? alt : base;
  return {
    file,
    row: manifest.get(file) as ManifestRow,
    upload: uploads[file],
    note: !useAsDrawn && !useAlt ? 'no --alt file; as-drawn stands in' : undefined,
  };
}

function build(
  item: CatalogItem,
  style: StyleKey,
  manifest: Manifest,
  uploads: UploadMap,
  all: Variant[],
): Built {
  const blank = BLANKS[item.garment];
  if (!blank) throw new Error(`no blank mapped for garment "${item.garment}"`);

  // Which variants each ink goes on.
  const groups: { label: string; variants: Variant[]; useAsDrawn: boolean }[] = [];
  // A product may override the blank's default pair — the house sweatshirt
  // sits on true White rather than the line's Ivory, because a logo piece
  // wants a plain ground.
  const colours = item.colours ?? blank.colours;
  if (colours) {
    const natural = pick(all, blank, colours[0]);
    const black = pick(all, blank, colours[1]);
    if (natural.length === 0) throw new Error(`no "${colours[0]}" variants`);
    if (black.length === 0) throw new Error(`no "${colours[1]}" variants`);
    // A bone entry is drawn dark, so its own file belongs on the natural
    // garment; an ink entry is drawn light and its opposite is the dark one.
    groups.push({ label: colours[0], variants: natural, useAsDrawn: item.colourway === 'bone' });
    groups.push({ label: colours[1], variants: black, useAsDrawn: item.colourway !== 'bone' });
  } else {
    const only = pick(all, blank, null);
    if (only.length === 0) throw new Error('no variants matched');
    groups.push({ label: 'all', variants: only, useAsDrawn: item.colourway === 'bone' });
  }

  // Which prints this blank can actually carry.
  const prints = item.prints.filter((p) => blank.positions[p.place]);
  if (prints.length === 0) {
    throw new Error(`blank carries none of: ${item.prints.map((p) => p.place).join(', ')}`);
  }

  const priceCents = Math.round(item.price * 100);
  const lines: string[] = [];
  const blockers: string[] = [];
  const notes: string[] = [];

  const printAreas: PrintArea[] = groups.map((group) => {
    const sample = group.variants[0];

    // Group by the position the print RESOLVES to, not by the catalogue
    // placement. `chest` and `front` are both the front panel, and Printify's
    // schema is one placeholder per position carrying an array of images —
    // emitting the same position twice makes it keep only the last one.
    const byPosition = new Map<string, { print: Print; image: PlacedImage; row: ManifestRow; file: string }[]>();

    for (const print of prints) {
      const position = blank.positions[print.place] as string;
      const area = sample.placeholders.find((p) => p.position === position);
      if (!area) throw new Error(`no "${position}" placeholder on variant ${sample.id}`);

      // A placement pinned to its own treatment — the gothic back asides —
      // is rendered once and filed under the design's DEFAULT style, not the
      // pinned one. `print.style` changes how it is set, not where the
      // generator puts it.
      const base = `${item.handle}--${style}--${print.place}.png`;
      const { file, row, upload, note } = resolveFile(base, group.useAsDrawn, manifest, uploads);

      if (!upload) {
        blockers.push(`${file} is not uploaded — run pnpm printify-upload`);
      } else if (upload.sha !== row.sha) {
        // The library entry was made from different bytes than the manifest
        // describes — or from before fingerprints were kept, which for this
        // library means the old full-panel artwork. Either way, pairing it
        // with the new tight fractions puts the print somewhere nobody chose,
        // so it does not get written.
        blockers.push(
          upload.sha
            ? `${file}: library holds different bytes (${upload.sha} ≠ ${row.sha}) — re-run pnpm printify-upload`
            : `${file}: library copy predates fingerprints, so it is the old full-panel art — re-run pnpm printify-upload`,
        );
      }
      if (note) notes.push(`${group.label}: ${note}`);

      const list = byPosition.get(position) ?? [];
      list.push({
        print,
        row,
        file,
        image: {
          id: upload?.id ?? `MISSING:${file}`,
          // Straight through from `resolvePrint`. Nothing is recomputed here.
          x: row.vendor.x,
          y: row.vendor.y,
          scale: row.vendor.scale,
          angle: 0,
        },
      });
      byPosition.set(position, list);
    }

    lines.push(`  [${group.label} ×${group.variants.length}]`);
    for (const [position, hits] of byPosition) {
      const area = sample.placeholders.find((p) => p.position === position) as { width: number; height: number };
      lines.push(`    ${position.padEnd(15)} ${hits.length} image${hits.length === 1 ? ' ' : 's'}  ${area.width}×${area.height}`);
      for (const h of hits) {
        const v = h.image;
        lines.push(
          `      ${h.print.place.padEnd(6)} x ${v.x.toFixed(4)}  y ${v.y.toFixed(4)}  scale ${v.scale.toFixed(4)}  ${h.file}${
            v.id.startsWith('MISSING:') ? '  ✗ no upload' : ''
          }`,
        );
      }
    }

    return {
      variant_ids: group.variants.map((v) => v.id),
      placeholders: [...byPosition].map(([position, hits]) => ({
        position,
        images: hits.map((h) => h.image),
      })),
    };
  });

  const variants = groups
    .flatMap((g) => g.variants)
    .map((v) => ({ id: v.id, price: priceCents, is_enabled: true }));

  return {
    body: {
      title: item.title,
      description: item.description.sincere,
      blueprint_id: blank.blueprint,
      print_provider_id: blank.provider,
      variants,
      print_areas: printAreas,
    },
    lines,
    blockers: [...new Set(blockers)],
    notes: [...new Set(notes)],
  };
}

/* ------------------------------------------------------------------ the run */

/**
 * Widen a product's print areas to name every variant it has.
 *
 * Creating a product only names the variants being sold, and Printify is
 * happy with that. Updating one is not the same operation: the product
 * carries the blueprint's whole variant list — 437 of them on a Comfort
 * Colors tee, of which we enable ten — and a PUT is rejected outright unless
 * `print_areas.*.variant_ids` accounts for all of them:
 *
 *   8251 — "Variants do not match selected blueprint and print provider.
 *           Please make sure that all product variants are present in the
 *           `print_areas.*.variant_ids` field"
 *
 * So the artwork is spread over the full list on the same rule the enabled
 * variants use: black garments take the light file, everything else takes the
 * dark one. Only the ten we sell can be ordered, but if a colour is ever
 * switched on it already has sensible art rather than none.
 */
async function coverEveryVariant(productId: string, areas: PrintArea[]): Promise<PrintArea[]> {
  const p = await api<{ variants: { id: number; title: string }[] }>(
    'GET',
    `/shops/${SHOP_ID}/products/${productId}.json`,
  );
  const all = p.variants;
  if (areas.length === 1) return [{ ...areas[0], variant_ids: all.map((v) => v.id) }];

  const isBlack = (title: string) => /\bblack\b/i.test(title);
  // build() pushes [natural, black], in that order.
  return [
    { ...areas[0], variant_ids: all.filter((v) => !isBlack(v.title)).map((v) => v.id) },
    { ...areas[1], variant_ids: all.filter((v) => isBlack(v.title)).map((v) => v.id) },
  ];
}

async function main() {
  const args = process.argv.slice(2);
  const create = args.includes('--create');
  const update = args.includes('--update');
  const prune = args.includes('--prune');
  const filter = args.find((a) => !a.startsWith('--')) ?? '';

  const manifest = await loadManifest();
  const uploads = await loadMap();
  const { ledger, migrated } = await loadLedger();
  const shop: ShopLedger = (ledger[SHOP_ID] ??= {});

  console.log(`Printify shop ${SHOP_ID}${SHOP_ID === LEGACY_SHOP_ID ? '' : ' (from PRINTIFY_SHOP_ID)'}`);
  if (migrated) {
    console.log(
      `  ledger is in the legacy flat shape: ${Object.keys(ledger[LEGACY_SHOP_ID]).length} entries ` +
        `will be re-filed under shop ${LEGACY_SHOP_ID}` +
        (create ? ' on the first write this run.' : ' (write pending — dry run).'),
    );
  }

  const eligible = catalog
    .filter((c) => !ALREADY_THEIRS.has(c.handle))
    .filter((c) => BLANKS[c.garment])
    .filter((c) => (filter ? c.handle.includes(filter) : true));

  const existing = eligible.filter((c) => shop[c.handle]);
  const missing = eligible.filter((c) => !shop[c.handle]);
  const queue = update ? eligible : missing;

  const unmapped = [
    ...new Set(
      catalog.filter((c) => !BLANKS[c.garment] && !ALREADY_THEIRS.has(c.handle)).map((c) => c.garment),
    ),
  ];

  console.log(
    `${catalog.length} in catalogue · ${ALREADY_THEIRS.size} already theirs · ` +
      `${Object.keys(shop).length} in this shop's ledger · ` +
      `${missing.length} to create · ${update ? `${existing.length} to update` : `${existing.length} unchanged`}` +
      (unmapped.length ? ` · unmapped garments: ${unmapped.join(', ')}` : ''),
  );

  /* ------------------------------------------------------------- the prune */

  const orphans = Object.keys(shop).filter(
    (h) => !catalog.some((c) => c.handle === h) && (filter ? h.includes(filter) : true),
  );

  if (prune) {
    console.log('\n── prune ──────────────────────────────────────────────');
    if (orphans.length === 0) {
      console.log('Every ledger entry still has a catalogue entry.');
    } else {
      console.log(`${orphans.length} ledger entr${orphans.length === 1 ? 'y has' : 'ies have'} no catalogue entry:`);
      for (const h of orphans) console.log(`  ${h}  ${shop[h].id}  (bp${shop[h].blueprint}/p${shop[h].provider})`);
      if (!create) console.log('  (dry run — nothing deleted)');
    }
  } else if (orphans.length) {
    console.log(`\n${orphans.length} ledger entries no longer in the catalogue. Run with --prune.`);
  }

  if (prune && create) {
    for (const h of orphans) {
      try {
        await api('DELETE', `/shops/${SHOP_ID}/products/${shop[h].id}.json`);
        delete shop[h];
        await saveLedger(ledger);
        console.log(`  deleted ${h}`);
      } catch (e) {
        console.warn(`  ✗ ${h}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  if (queue.length === 0) {
    if (!prune) console.log('\nNothing to do.');
    return;
  }
  console.log('');

  /* ---------------------------------------------- create and update */

  const failures: { handle: string; reason: string }[] = [];
  const blocked: { handle: string; reasons: string[] }[] = [];
  let made = 0;
  let changed = 0;

  for (const item of queue) {
    const style = item.styles[0];
    const blank = BLANKS[item.garment] as Blank;
    const known = shop[item.handle];
    const verb = known ? 'update' : 'create';

    try {
      const all = await variantsFor(blank);
      const { body, lines, blockers, notes } = build(item, style, manifest, uploads, all);

      console.log(
        `${verb} ${item.handle} (${style}) · bp${blank.blueprint}/p${blank.provider}` +
          (known ? ` · ${known.id}` : ''),
      );
      for (const l of lines) console.log(l);
      for (const n of notes) console.log(`    · ${n}`);
      for (const b of blockers) console.log(`    ! ${b}`);
      if (blockers.length) blocked.push({ handle: item.handle, reasons: blockers });

      if (!create) {
        console.log('    (dry run)');
        continue;
      }
      if (blockers.length) {
        console.log('    skipped: artwork is not ready');
        continue;
      }

      if (known) {
        // Only what can change. `blueprint_id` and `print_provider_id` are
        // fixed for the life of a product, and re-sending `variants` would
        // reset prices someone may have tuned in the Printify UI.
        await api('PUT', `/shops/${SHOP_ID}/products/${known.id}.json`, {
          title: body.title,
          description: body.description,
          print_areas: await coverEveryVariant(known.id, body.print_areas),
        });
        shop[item.handle] = { ...known, style };
        changed += 1;
        console.log(`    updated ${known.id}`);
      } else {
        const res = await api<{ id: string }>('POST', `/shops/${SHOP_ID}/products.json`, body);
        shop[item.handle] = { id: res.id, blueprint: blank.blueprint, provider: blank.provider, style };
        made += 1;
        console.log(`    created ${res.id}`);
      }
      // Persist as we go: an interruption should never cost more than one.
      await saveLedger(ledger);
    } catch (e) {
      // Printify puts the actual complaint in the body; the status alone
      // says nothing useful about which field it rejected.
      const reason =
        e instanceof PrintifyError ? `${e.message}\n     ${e.body}` : e instanceof Error ? e.message : String(e);
      failures.push({ handle: item.handle, reason });
      console.warn(`${item.handle}\n    ✗ ${reason}`);
    }
  }

  if (create) await saveLedger(ledger);

  console.log(
    `\n${made} created, ${changed} updated, ${blocked.length} blocked, ${failures.length} failed. ` +
      `Shop ${SHOP_ID} holds ${Object.keys(shop).length}.`,
  );
  for (const f of failures) console.log(`  ✗ ${f.handle}: ${f.reason}`);
  if (blocked.length) {
    const reasons = new Map<string, number>();
    for (const b of blocked) for (const r of b.reasons) {
      const kind = r.includes('predates fingerprints')
        ? 'unfingerprinted upload'
        : r.includes('different bytes')
          ? 'stale upload'
          : r.includes('not uploaded')
            ? 'never uploaded'
            : r;
      reasons.set(kind, (reasons.get(kind) ?? 0) + 1);
    }
    console.log(`  blocked: ${[...reasons].map(([k, n]) => `${n} × ${k}`).join(', ')}`);
  }
  if (create) console.log('\nAll unpublished. Nothing has reached Shopify.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
