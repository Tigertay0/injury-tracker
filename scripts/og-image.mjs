// Rebuilds public/og.png (1200x630 social preview) from the live /demo dashboard.
//
//   npx vite --port 5188 --strictPort          (in another terminal)
//   node scripts/og-image.mjs [baseUrl] [outFile]
//
// Needs Playwright (global install) and Microsoft Edge. Copy and headline are the
// existing ones from the previous og.png; the dashboard is a real dark-mode shot of /demo.
import { writeFileSync, statSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const { chromium } = await import('file:///C:/Users/Tigre/AppData/Roaming/npm/node_modules/playwright/index.mjs');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baseUrl = process.argv[2] ?? 'http://localhost:5188';
const outFile = path.resolve(process.argv[3] ?? path.join(root, 'public/og.png'));
const fontUrl = pathToFileURL(path.join(root, 'public/fonts/host-grotesk/host-grotesk-variable.woff2')).href;

const WIDTH = 1200;
const HEIGHT = 630;
// Dashboard crop in CSS px of a 1200x1000 viewport: the content column right of the 240px sidebar,
// from the "Hi Sam" row down, with 24px of margin so the rounded frame never clips a tile.
const SHOT_VIEWPORT = { width: 1200, height: 1000 };
const SHOT_CLIP = { x: 256, y: 73, width: 928, height: 800 };

async function captureDashboard(browser) {
  const context = await browser.newContext({
    viewport: SHOT_VIEWPORT,
    colorScheme: 'dark',
    reducedMotion: 'reduce',
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/demo`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.getByText('Injury risk score', { exact: false }).first().waitFor();
  await page.waitForTimeout(800);
  const png = await page.screenshot({ clip: SHOT_CLIP });
  await context.close();
  return `data:image/png;base64,${png.toString('base64')}`;
}

const LOGO = `
<svg viewBox="0 0 64 64" width="46" height="46" aria-hidden="true">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#6d93ff"/><stop offset="1" stop-color="#2346e0"/>
  </linearGradient></defs>
  <path d="M10 7H54V29C54 41 47 50 32 58C17 50 10 41 10 29Z" fill="url(#g)"/>
  <path d="M10 30H54" stroke="#070b18" stroke-width="3.5"/>
  <circle cx="32" cy="30" r="8" fill="none" stroke="#070b18" stroke-width="3.5"/>
</svg>`;

function composePage(shot) {
  return `<!doctype html>
<html><head><meta charset="utf-8"><style>
@font-face { font-family: 'Host Grotesk'; src: url('${fontUrl}') format('woff2'); font-weight: 300 800; }
* { box-sizing: border-box; margin: 0; }
html, body { width: ${WIDTH}px; height: ${HEIGHT}px; overflow: hidden; background: #070b18; }
body {
  position: relative;
  font-family: 'Host Grotesk', system-ui, sans-serif;
  color: #fff;
  background:
    radial-gradient(ellipse 620px 520px at 930px 250px, rgba(36, 70, 224, 0.42), transparent 70%),
    radial-gradient(ellipse 520px 260px at 0 630px, rgba(40, 56, 86, 0.5), transparent 70%),
    #070b18;
}
.brand { position: absolute; left: 84px; top: 78px; display: flex; align-items: center; gap: 16px;
  font-size: 34px; font-weight: 700; letter-spacing: -0.03em; line-height: 1; }
h1 { position: absolute; left: 84px; top: 196px; width: 440px; font-size: 64px; line-height: 1.04;
  font-weight: 700; letter-spacing: -0.04em; }
p { position: absolute; left: 86px; top: 456px; width: 400px; font-size: 24px; line-height: 1.4;
  letter-spacing: -0.01em; color: rgba(214, 222, 238, 0.72); }
.shot { position: absolute; left: 540px; top: 92px; width: 636px; border-radius: 28px; overflow: hidden;
  border: 1px solid rgba(160, 185, 255, 0.28);
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.55), 0 0 0 8px rgba(120, 150, 255, 0.05); }
.shot img { display: block; width: 636px; height: auto; }
</style></head><body>
<div class="brand">${LOGO}PitchSafe</div>
<h1>Know when training turns risky.</h1>
<p>Free injury-risk tracking for amateur soccer players.</p>
<div class="shot"><img alt="" src="${shot}"></div>
</body></html>`;
}

const browser = await chromium.launch({ channel: 'msedge' });
try {
  const shot = await captureDashboard(browser);
  const context = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  await page.setContent(composePage(shot), { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  const png = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT } });
  writeFileSync(outFile, png);
  await context.close();
} finally {
  await browser.close();
}

console.log(`${path.relative(root, outFile)}: ${statSync(outFile).size} bytes`);
