/**
 * Canonical logo export.
 *
 * Writes the mark to `public/brand/` as SVG and PNG, in the forms a brand
 * actually needs: the full colour lockup, and flat one-colour versions for
 * embroidery, stamps, and anywhere the gradient cannot go.
 *
 *   pnpm logo-files
 *
 * The paths here are the single source: `src/components/Logo.tsx` draws the
 * same two silhouettes on the site.
 */

import { execFile } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);

const VIEWBOX = '0 0 264.58336 223.17815';
const W = 264.58336;
const H = 223.17815;

/** The smaller figure, at the right. */
const FIGURE_A =
  'm 183.78587,-6.9532424e-5 h 31.97516 L 264.58334,111.34812 H 242.8523 l -0.006,32.89246 c -0.16821,14.64858 -12.74832,22.1747 -22.00482,21.90278 H 210.3678 v 57.0348 h -31.7014 v -57.0348 c 24.34385,0.33922 31.8727,-7.32301 31.80542,-25.2265 v -29.56874 h 22.30594 z';

/** The face — the one with the eye. */
const FIGURE_B =
  'M 89.26758,-6.93e-5 H 148.9691 L 198.40466,111.34812 H 176.6736 v 32.99105 c -0.13735,12.03845 -8.88383,20.57637 -21.83507,21.79872 h -11.08729 v 57.0348 H 64.010498 V 163.83265 C 25.697809,158.00406 6e-6,127.55381 6e-6,84.900524 6e-6,34.175831 40.310752,-6.93e-5 89.26758,-6.93e-5 Z m 44.03701,55.4687443 c -11.35899,0 -20.5758,9.190289 -20.5758,20.550281 0,11.39366 9.21681,20.583128 20.5758,20.583128 11.35896,0 20.54838,-9.189468 20.54838,-20.583128 0,-11.35719 -9.18942,-20.550281 -20.54838,-20.550281 z';

/** The slick, in the order the site uses it. */
const SLICK = ['#FF2E9E', '#FFB52E', '#1FCFEE', '#7C3AED'];

const CHROME = process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT = path.resolve('public/brand');

/** The full mark: silhouettes in white glass on the slick, in a rounded tile. */
function fullSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEWBOX}" width="${W}" height="${H}">
  <defs>
    <linearGradient id="slick" x1="0" y1="0" x2="1" y2="1">
${SLICK.map((c, i) => `      <stop offset="${(i / (SLICK.length - 1)).toFixed(3)}" stop-color="${c}"/>`).join('\n')}
    </linearGradient>
    <linearGradient id="glass" x1="0" y1="0" x2="0.4" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.82"/>
      <stop offset="0.5" stop-color="#ffffff" stop-opacity="0.5"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0.64"/>
    </linearGradient>
    <filter id="lift" x="-10%" y="-10%" width="120%" height="125%">
      <feDropShadow dx="0" dy="2.5" stdDeviation="3" flood-color="#000" flood-opacity="0.18"/>
    </filter>
    <clipPath id="tile"><rect width="${W}" height="${H}" rx="16"/></clipPath>
  </defs>
  <g clip-path="url(#tile)">
    <rect width="${W}" height="${H}" fill="url(#slick)"/>
    <g filter="url(#lift)">
      <path d="${FIGURE_B}" fill="url(#glass)" stroke="#ffffff" stroke-opacity="0.85" stroke-width="1.1"/>
      <path d="${FIGURE_A}" fill="url(#glass)" stroke="#ffffff" stroke-opacity="0.85" stroke-width="1.1"/>
    </g>
  </g>
</svg>
`;
}

/** One colour, transparent ground. For embroidery, stamps, and small sizes. */
function flatSvg(colour: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEWBOX}" width="${W}" height="${H}">
  <path d="${FIGURE_B}" fill="${colour}"/>
  <path d="${FIGURE_A}" fill="${colour}" fill-opacity="0.58"/>
</svg>
`;
}

/** The same, with both figures solid — the version to hand a digitiser. */
function solidSvg(colour: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEWBOX}" width="${W}" height="${H}">
  <path d="${FIGURE_B}" fill="${colour}"/>
  <path d="${FIGURE_A}" fill="${colour}"/>
</svg>
`;
}

async function png(svgFile: string, out: string, width: number) {
  const height = Math.round((width * H) / W);
  const page = `${svgFile}.html`;
  await writeFile(
    page,
    `<!doctype html><meta charset="utf-8">
<style>html,body{margin:0;padding:0;background:transparent}img{display:block;width:${width}px;height:${height}px}</style>
<img src="${path.basename(svgFile)}">`,
    'utf8',
  );
  await run(CHROME, [
    '--headless',
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    '--default-background-color=00000000',
    `--window-size=${width},${height}`,
    '--virtual-time-budget=4000',
    `--screenshot=${out}`,
    `file://${page}`,
  ]).catch((e: unknown) => console.warn(`  chrome: ${(e as Error).message.split('\n')[0]}`));
  await rm(page, { force: true });
  console.log(`✓ ${path.basename(out)}  ${width}×${height}`);
}

async function main() {
  await mkdir(OUT, { recursive: true });

  const files: [string, string][] = [
    ['sincerely-ironic-logo.svg', fullSvg()],
    ['sincerely-ironic-logo-black.svg', flatSvg('#0D0D0D')],
    ['sincerely-ironic-logo-white.svg', flatSvg('#FFFFFF')],
    ['sincerely-ironic-logo-solid-black.svg', solidSvg('#0D0D0D')],
    ['sincerely-ironic-logo-solid-white.svg', solidSvg('#FFFFFF')],
  ];

  for (const [name, body] of files) {
    await writeFile(path.join(OUT, name), body, 'utf8');
    console.log(`✓ ${name}`);
  }

  const full = path.join(OUT, 'sincerely-ironic-logo.svg');
  for (const size of [512, 1024, 2048]) {
    await png(full, path.join(OUT, `sincerely-ironic-logo-${size}.png`), size);
  }
  await png(
    path.join(OUT, 'sincerely-ironic-logo-black.svg'),
    path.join(OUT, 'sincerely-ironic-logo-black-1024.png'),
    1024,
  );
  await png(
    path.join(OUT, 'sincerely-ironic-logo-white.svg'),
    path.join(OUT, 'sincerely-ironic-logo-white-1024.png'),
    1024,
  );

  await writeFile(
    path.join(OUT, 'README.md'),
    `# Sincerely Ironic — logo files

Generated by \`pnpm logo-files\`. Do not hand-edit; edit
\`scripts/logo-files.ts\` and re-run, so these stay in step with the mark the
site draws in \`src/components/Logo.tsx\`.

| File | Use |
| --- | --- |
| \`sincerely-ironic-logo.svg\` | Canonical. Silhouettes in white glass on the slick, rounded tile. Works on any ground. |
| \`sincerely-ironic-logo-{512,1024,2048}.png\` | The same, rasterised, transparent outside the tile. |
| \`sincerely-ironic-logo-black.svg\` / \`-white.svg\` | One colour, transparent, second figure held back at 58% — the flat version of the canonical mark. |
| \`sincerely-ironic-logo-solid-black.svg\` / \`-solid-white.svg\` | Both figures at full strength. This is the one to hand an embroidery digitiser or a single-colour printer. |
| \`sincerely-ironic-logo-black-1024.png\` / \`-white-1024.png\` | Flat versions, rasterised. |

Colours: the slick runs ${SLICK.join(' → ')}. Ink is \`#0D0D0D\`, paper is \`#F3F3F0\`.

Clear space: at least the height of the smaller figure on every side. Minimum
size: 24px tall on screen; below that use a solid one-colour version.
`,
    'utf8',
  );
  console.log(`\nBrand files in ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
