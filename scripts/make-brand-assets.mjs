/**
 * Builds every Naqatar brand asset from the two source logos:
 *   brand/source/naqatar-mark.jpg  (shield mark)
 *   brand/source/naqatar-logo.jpg  (mark + "Naqatar" wordmark)
 *
 *   npm run brand:assets
 *
 * The sources are JPEGs on a white background, and the mark has WHITE text
 * inside the shield. A plain "white → transparent" would erase that text, so
 * the background is removed by flood-filling from the image border only:
 * white that is enclosed by the shield is never reached and stays.
 * The wordmark (teal letters on white, with enclosed counters in a/q) is
 * handled separately with a colour-to-alpha pass against the brand teal.
 */
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

export const TEAL = { r: 0x1d, g: 0x56, b: 0x5d };   // #1D565D
export const GOLD = { r: 0xa9, g: 0x87, b: 0x3f };   // #A9873F
const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };
const CLEAR = { r: 0, g: 0, b: 0, alpha: 0 };

const OUT_BRAND = 'public/brand';
const OUT_ICONS = 'public/icons-naqatar';
mkdirSync(OUT_BRAND, { recursive: true });
mkdirSync(OUT_ICONS, { recursive: true });

async function raw(path) {
  const { data, info } = await sharp(path).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
}

/** Flood-fill near-white from the border → transparent, with soft edges. */
function removeBorderWhite({ data, w, h }, threshold = 200) {
  const out = Buffer.alloc(w * h * 4);
  const bg = new Uint8Array(w * h);
  const light = i => Math.min(data[i * 3], data[i * 3 + 1], data[i * 3 + 2]) >= threshold;
  const stack = [];
  for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1);
  while (stack.length) {
    const p = stack.pop();
    if (bg[p] || !light(p)) continue;
    bg[p] = 1;
    const x = p % w, y = (p / w) | 0;
    if (x > 0) stack.push(p - 1);
    if (x < w - 1) stack.push(p + 1);
    if (y > 0) stack.push(p - w);
    if (y < h - 1) stack.push(p + w);
  }
  for (let p = 0; p < w * h; p++) {
    const r = data[p * 3], g = data[p * 3 + 1], b = data[p * 3 + 2];
    let a = 255;
    if (bg[p]) {
      a = 0;
    } else {
      // Anti-aliased rim: a pixel touching the background fades by its lightness.
      const x = p % w, y = (p / w) | 0;
      const nearBg = (x > 0 && bg[p - 1]) || (x < w - 1 && bg[p + 1]) || (y > 0 && bg[p - w]) || (y < h - 1 && bg[p + w]);
      if (nearBg) a = Math.round(255 * Math.min(1, (255 - Math.min(r, g, b)) / (255 - TEAL.r)));
    }
    out.set([r, g, b, a], p * 4);
  }
  return sharp(out, { raw: { width: w, height: h, channels: 4 } });
}

/** Colour-to-alpha against one ink colour (for the teal wordmark). */
function inkToAlpha({ data, w, h }, ink, recolor = ink) {
  const out = Buffer.alloc(w * h * 4);
  for (let p = 0; p < w * h; p++) {
    const m = Math.min(data[p * 3], data[p * 3 + 1], data[p * 3 + 2]);
    const a = Math.round(255 * Math.max(0, Math.min(1, (255 - m) / (255 - Math.min(ink.r, ink.g, ink.b)))));
    out.set([recolor.r, recolor.g, recolor.b, a < 12 ? 0 : a], p * 4);
  }
  return sharp(out, { raw: { width: w, height: h, channels: 4 } });
}

const png = s => s.png({ compressionLevel: 9, palette: false });
const trimmed = async s => sharp(await png(s).toBuffer()).trim({ threshold: 1 });

/** Place `img` (buffer) centred on a square canvas, scaled to `ratio` of the side. */
async function onSquare(img, size, ratio, background) {
  const inner = Math.round(size * ratio);
  const fitted = await sharp(img).resize(inner, inner, { fit: 'contain', background: CLEAR }).toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background } })
    .composite([{ input: fitted, gravity: 'center' }]);
}

// ── 1. Mark (transparent) ────────────────────────────────────────────────
const markSrc = await raw('brand/source/naqatar-mark.jpg');
const mark = await (await trimmed(removeBorderWhite(markSrc))).png().toBuffer();
await sharp(mark).resize({ height: 512 }).png().toFile(`${OUT_BRAND}/naqatar-mark.png`);

// Monochrome silhouette of the shield (white on transparent) — Android notification badge.
const { data: md, info: mi } = await sharp(mark).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
for (let i = 0; i < md.length; i += 4) { md[i] = md[i + 1] = md[i + 2] = 255; }
const silhouette = await sharp(md, { raw: { width: mi.width, height: mi.height, channels: 4 } }).png().toBuffer();

// ── 2. Full logo + wordmark (transparent) ────────────────────────────────
const logoSrc = await raw('brand/source/naqatar-logo.jpg');
const SPLIT_Y = 565;                                   // shield above, wordmark below
const logoMark = await (await trimmed(removeBorderWhite(logoSrc))).png().toBuffer();
const wordSrc = await sharp('brand/source/naqatar-logo.jpg')
  .extract({ left: 0, top: SPLIT_Y, width: logoSrc.w, height: logoSrc.h - SPLIT_Y }).removeAlpha()
  .raw().toBuffer({ resolveWithObject: true });
const wordRaw = { data: wordSrc.data, w: wordSrc.info.width, h: wordSrc.info.height };
const wordmark      = await (await trimmed(inkToAlpha(wordRaw, TEAL))).png().toBuffer();
const wordmarkWhite = await (await trimmed(inkToAlpha(wordRaw, TEAL, { r: 255, g: 255, b: 255 }))).png().toBuffer();

await sharp(wordmark).resize({ height: 120 }).png().toFile(`${OUT_BRAND}/naqatar-wordmark.png`);
await sharp(wordmarkWhite).resize({ height: 120 }).png().toFile(`${OUT_BRAND}/naqatar-wordmark-white.png`);

// Stacked logo rebuilt from clean parts: mark above wordmark.
async function stacked(word) {
  const W = 900, markH = 420, wordH = 150, gap = 50;
  const m = await sharp(mark).resize({ height: markH }).toBuffer();
  const t = await sharp(word).resize({ height: wordH }).toBuffer();
  const tm = await sharp(t).metadata(), mm = await sharp(m).metadata();
  return sharp({ create: { width: W, height: markH + gap + wordH, channels: 4, background: CLEAR } })
    .composite([
      { input: m, left: Math.round((W - mm.width) / 2), top: 0 },
      { input: t, left: Math.round((W - tm.width) / 2), top: markH + gap },
    ]).png().toBuffer();
}
await sharp(await stacked(wordmark)).png().toFile(`${OUT_BRAND}/naqatar-logo.png`);
await sharp(await stacked(wordmarkWhite)).png().toFile(`${OUT_BRAND}/naqatar-logo-white.png`);

// Horizontal lockup (mark left, wordmark right) — navbar.
async function horizontal(word) {
  const H = 160, markH = 160, wordH = 78, gap = 28;
  const m = await sharp(mark).resize({ height: markH }).toBuffer();
  const t = await sharp(word).resize({ height: wordH }).toBuffer();
  const mm = await sharp(m).metadata(), tm = await sharp(t).metadata();
  return sharp({ create: { width: mm.width + gap + tm.width, height: H, channels: 4, background: CLEAR } })
    .composite([
      { input: m, left: 0, top: 0 },
      { input: t, left: mm.width + gap, top: Math.round((H - tm.height) / 2) },
    ]).png().toBuffer();
}
await sharp(await horizontal(wordmark)).png().toFile(`${OUT_BRAND}/naqatar-lockup.png`);
await sharp(await horizontal(wordmarkWhite)).png().toFile(`${OUT_BRAND}/naqatar-lockup-white.png`);

// ── 3. PWA / favicon / Apple icons ───────────────────────────────────────
for (const size of [72, 96, 128, 144, 152, 192, 384, 512]) {
  // "any": transparent, mark fills the icon.
  await (await onSquare(mark, size, 0.92, CLEAR)).png().toFile(`${OUT_ICONS}/icon-${size}x${size}.png`);
}
for (const size of [192, 512]) {
  // "maskable": opaque white, mark inside the 80% safe-zone circle.
  await (await onSquare(mark, size, 0.6, WHITE)).png().toFile(`${OUT_ICONS}/icon-maskable-${size}x${size}.png`);
}
await (await onSquare(mark, 180, 0.78, WHITE)).png().toFile(`${OUT_ICONS}/apple-touch-icon.png`);
await (await onSquare(silhouette, 96, 0.9, CLEAR)).png().toFile(`${OUT_ICONS}/badge-monochrome.png`);
await (await onSquare(mark, 64, 0.96, CLEAR)).png().toFile('public/favicon-naqatar.png');

// ── 4. Social share (Open Graph) 1200×628 ────────────────────────────────
{
  const W = 1200, H = 628;
  const logo = await sharp(await stacked(wordmark)).resize({ height: 440 }).toBuffer();
  const bar = await sharp({ create: { width: W, height: 14, channels: 4, background: { ...GOLD, alpha: 1 } } }).png().toBuffer();
  await sharp({ create: { width: W, height: H, channels: 4, background: WHITE } })
    .composite([{ input: logo, gravity: 'center' }, { input: bar, left: 0, top: H - 14 }])
    .png().toFile('public/og-image-naqatar.png');
}

// ── 4b. iPhone splash screens (apple-touch-startup-image) ────────────────
// iOS ignores the manifest for splash screens; it needs one portrait image
// per device size + a matching <link media="…">. The logo sits exactly where
// index.html's #app-shell draws it (180 CSS px wide, logo+gap+spinner group
// centred), so the hand-off from splash to loading screen doesn't jump.
const OUT_SPLASH = 'public/splash';
mkdirSync(OUT_SPLASH, { recursive: true });
// [CSS width, CSS height, device pixel ratio, models]
const IPHONES = [
  [320, 568, 2, 'SE (1st), 5s'],
  [375, 667, 2, 'SE (2nd/3rd), 8, 7, 6s'],
  [414, 736, 3, '8 Plus, 7 Plus'],
  [375, 812, 3, 'X, XS, 11 Pro, 12 mini, 13 mini'],
  [414, 896, 2, 'XR, 11'],
  [414, 896, 3, 'XS Max, 11 Pro Max'],
  [390, 844, 3, '12, 13, 14, 16e'],
  [428, 926, 3, '12/13 Pro Max, 14 Plus'],
  [393, 852, 3, '14 Pro, 15, 15 Pro, 16'],
  [430, 932, 3, '14 Pro Max, 15 Plus/Pro Max, 16 Plus'],
  [402, 874, 3, '16 Pro, 17, 17 Pro'],
  [420, 912, 3, 'Air'],
  [440, 956, 3, '16 Pro Max, 17 Pro Max'],
];
const SHELL = { logoW: 180, gap: 24, spinner: 38 };             // mirrors #app-shell CSS (32px spinner + 2×3px border, content-box)
const logoBuf = await sharp(await stacked(wordmark)).png().toBuffer();
const { width: lw0, height: lh0 } = await sharp(logoBuf).metadata();
const splashLinks = [];
for (const [cw, ch, dpr, models] of IPHONES) {
  const W = cw * dpr, H = ch * dpr;
  const logoW = Math.round(SHELL.logoW * dpr);
  const logoH = Math.round(logoW * lh0 / lw0);
  const groupH = logoH + (SHELL.gap + SHELL.spinner) * dpr;
  const top = Math.round((H - groupH) / 2);
  const logo = await sharp(logoBuf).resize(logoW, logoH).toBuffer();
  const name = `iphone-${W}x${H}.png`;
  await sharp({ create: { width: W, height: H, channels: 4, background: WHITE } })
    .composite([{ input: logo, left: Math.round((W - logoW) / 2), top }])
    .png().toFile(`${OUT_SPLASH}/${name}`);
  splashLinks.push(`  <!-- iPhone ${models} -->\n  <link rel="apple-touch-startup-image" href="/splash/${name}" media="(device-width: ${cw}px) and (device-height: ${ch}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: portrait)" />`);
}
// Write the <link> tags into index.html between the markers.
{
  const { readFileSync, writeFileSync } = await import('node:fs');
  const START = '<!-- apple-splash:start (generated by npm run brand:assets — do not edit by hand) -->';
  const END = '<!-- apple-splash:end -->';
  let html = readFileSync('index.html', 'utf8');
  const block = `${START}\n${splashLinks.join('\n')}\n  ${END}`;
  const re = /<!-- apple-splash:start[\s\S]*?<!-- apple-splash:end -->/;
  html = re.test(html) ? html.replace(re, block) : html.replace('  <title>', `  ${block}\n\n  <title>`);
  writeFileSync('index.html', html);
}

// ── 5. Compress every output (palette PNG, like pngquant) ────────────────
// The artwork is flat teal/gold/white, so a 256-colour palette with
// dithering is visually identical and ~70–80% smaller. A file is only
// replaced when the result is actually smaller.
{
  const { readdirSync, readFileSync, writeFileSync } = await import('node:fs');
  const files = [
    ...readdirSync(OUT_BRAND).filter(f => f.endsWith('.png')).map(f => `${OUT_BRAND}/${f}`),
    ...readdirSync(OUT_ICONS).filter(f => f.endsWith('.png')).map(f => `${OUT_ICONS}/${f}`),
    ...readdirSync(OUT_SPLASH).filter(f => f.endsWith('.png')).map(f => `${OUT_SPLASH}/${f}`),
    'public/favicon-naqatar.png',
    'public/og-image-naqatar.png',
  ];
  let before = 0, after = 0;
  for (const f of files) {
    const src = readFileSync(f);
    const out = await sharp(src).png({ palette: true, quality: 90, effort: 10, dither: 1.0, compressionLevel: 9 }).toBuffer();
    before += src.length;
    if (out.length < src.length) { writeFileSync(f, out); after += out.length; } else after += src.length;
  }
  console.log(`🗜️  Compressed ${files.length} PNGs: ${Math.round(before / 1024)} KB → ${Math.round(after / 1024)} KB`);
}

console.log('✅ Brand assets generated:');
console.log(`   ${OUT_BRAND}/   mark, logo, logo-white, wordmark(-white), lockup(-white)`);
console.log(`   ${OUT_ICONS}/   icon-72..512, icon-maskable-192/512, apple-touch-icon, badge-monochrome`);
console.log('   public/favicon-naqatar.png, public/og-image-naqatar.png');
