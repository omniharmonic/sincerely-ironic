---
name: placing-print-artwork
description: Use when deciding how big a Sincerely Ironic print should be and where it sits on the garment, or when putting a supplied image (a photograph, meme or illustration) on a product rather than type. Covers the PrintBox model, the DPI budget for raster art, and how art and type compose.
---

# Placing print artwork

Every print's size and position is one object, a `PrintBox` in
`src/lib/typeset.ts`. Both things a customer's order depends on — the PNG the
printer receives and the x/y/scale handed to the vendor — come from a single
`resolvePrint()` call, so the file and the position it prints at cannot
disagree. (The site itself shows vendor photographs; `GarmentArt.tsx` is dead
code and no longer renders anything.)

```ts
{ w, h, top, x, gap?, emblem?, center? }   // all fractions of the print area
```

A `Print`'s `box` is a `Partial<PrintBox>` spread over `defaultBox(place, text)`,
so name only what you are changing; omitted keys keep their defaults.

- `w` — block width as a fraction of the panel width. Also the vendor `scale`.
- `h` — **load-bearing.** The greatest height the *type block* may take.
- `top` — where the block starts, as a fraction of panel height.
- `x` — centre across the panel. `0.5` is centred.
- `emblem` — the art or emblem's share of `w` when something sits above type.
- `gap` — space between that and the type, as a share of `w`.

**Why `h` matters.** Without a height cap the engine always prefers more lines:
more lines mean a shorter longest line, which lets the type set bigger. So a
slogan builds a tower down the belly instead of a block across the chest.

**`h` is a cliff, not a dial.** Its range has plateaus — line counts — with
valleys between them where the block is height-bound and every line gets
stretched to the measure. Sweep `h`, watch where the font size stops changing,
and take a value on a plateau with margin either side. Copying another design's
`h` lands in a valley whenever the slogan or the art aspect differs.

**The garment wins.** `GARMENTS[g].boxes` beats a design's own box, because a
cap front is 4 × 2.25in and a tee front is 15 × 17in — fractions that read well
on one are wrong on the other. `rebox()` is the escape hatch for one product.

**Hats were deliberately left out** of the placement redesign. Their boxes
reproduce the old fill-the-panel-and-centre behaviour. Do not "fix" them.

## Supplied art

Art is a file in `public/art` named by a `Print`'s `asset` field. A name **with
a file extension** is supplied art; a name without one is a brand SVG in
`public/brand` and gets `{tone}` recoloured to the garment. Supplied art is
drawn exactly as given and never recoloured — the artwork is not the mark.

**Prefer `.jpg`; use `.png` only for a knockout.** `.gitignore` ignores `*.png`
everywhere except `public/art/`, which is negated precisely so a
transparent-background asset can be committed. Photographs are far smaller as
JPEG and need no alpha; reach for PNG only when you have actually cut the
background out.

Art rides the **emblem slot**, which already exists: `resolvePrint` sizes it
from the file's real pixel aspect, then leaves the type block its headroom
underneath. Art alone, or art above a slogan, need no new code.

```ts
// art above its caption, sharing one measure
{ place: 'front', asset: 'two-wolves.jpg',
  text: 'Inside me there are two wolves', aside: { text: 'one of them is gay' },
  box: { w: 0.38, h: 0.1, top: 0.09, emblem: 1, gap: 0.045 } }
```

`emblem: 1` makes the art exactly as wide as the type so the whole thing reads
as one object. The 0.62 default leaves a slogan set wider than the picture
above it, which looks unintentional.

## The DPI budget — size the box to the file, not the panel

The pipeline renders at 300 DPI and Printify rejects a bad file with
`400 code 8203`. Supplied art almost never has the pixels for a full panel:

```
DPI = source pixel width ÷ printed inches
printed inches = box.w × panel width      (tee front panel = 15in)
```

So a 640px image printed 10in wide is 64 DPI — unusable. **Pick `box.w` from
the file's resolution, not from how big you wish the print were.** Upscaling
invents no detail; it silences the warning and still prints soft.

| Design | Source | Printed | DPI |
|---|---|---|---|
| two-wolves | 1600 × 2400 | 5.7 × 8.6in | 281 |
| chat-is-this-real | 1600 × 1390 | 5.3 × 4.6in | 301 |

Aim for 300; below ~150 is visibly soft on fabric. A small, sharp print beats a
big, mushy one.

**Budget against 15in because the largest shirt sets the floor.** The panel is
not one size: blueprint 706/99 gives 3703 × 4200px on S, 4107 × 4658 on M and
4494 × 5097 on L and up. `scale` is a fraction, so the same box prints
physically bigger — and at lower DPI — on a 2XL than on a small. Size to the
biggest panel and every other size is comfortably above it.

**Backgrounds print, on both shirts.** A rectangular image with a baked
background prints as a visible rectangle. `colourway` does **not** choose the
garment: every tee ships both colours in `BLANKS.tee.colours`, and `colourway`
only decides which ink file is "as drawn" and which colour the site leads with.
So a baked background lands on the other shirt too, whatever you pick.

Choose the colourway to flatter the majority — art falling to near-black goes
on `ink`, a cream page on `bone` — and accept the rectangle on the other, or
knock the background out.

Matching the blank to the artwork instead does not work: `build()` hands the
two colour groups *opposite* inks, so a dark/dark pair would set near-black
type on a near-black shirt. Any second colour has to be light. Pairing two dark
garments needs a code change, not a catalogue entry.

## Verifying

- `pnpm check-prints` measures real alpha bounds and fails on ink at an edge.
  Art **alone** is exempt — a full-bleed rectangle is meant to reach its edges —
  and reports `art only, edges not checked`. Art with a slogan under it is
  **not** exempt: the picture owns the top and sides, but the bottom edge
  belongs to the type, and that is where a comma or a descender shears off. So
  a captioned art print is still checked on the bottom, and still fails empty.
- `pnpm placement-proof <handle>` composites the file onto a real garment
  photo at the exact vendor x/y/scale and prints `collar +N in`. The line
  currently sits at **collar +4.5 to +5.2in**; a new design should land there.

  Two things about the blank it draws on. It always uses a **bone** garment, so
  light type on an ink design washes out — judge position, not legibility. And
  the blank is hardcoded to `mockups['quietly-disrespectful-tee'].images[0]`,
  chosen because that print is the smallest we ship: it is a photograph that
  already carries its own faint print. So proofing *that* handle overlays new
  art on old, and enlarging its design would quietly degrade the baseline for
  every other product.
