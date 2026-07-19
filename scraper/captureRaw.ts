import * as fs from 'fs';
import * as path from 'path';
import { chromium } from 'playwright';
import { CAPTURES_DIR, ensureDir, timestampSlug } from './paths.js';

/**
 * Generic full-page capture for ANY url (no BookingMotor assumptions, no session).
 * Saves the rendered HTML + a screenshot so we can study unknown sites (e.g.
 * Despegar) before writing a provider parser.
 *
 * Usage: tsx scraper/captureRaw.ts <url> [slug]
 */
const url = process.argv[2];
const slug = process.argv[3] ?? 'raw';

if (!url) {
  console.error('Uso: tsx scraper/captureRaw.ts <url> [slug]');
  process.exit(1);
}

const outDir = path.join(CAPTURES_DIR, `${timestampSlug()}_${slug}`);
ensureDir(outDir);

const browser = await chromium.launch({
  headless: true,
  args: ['--disable-blink-features=AutomationControlled'],
});

const context = await browser.newContext({
  userAgent:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  locale: 'es-CO',
  viewport: { width: 1440, height: 900 },
});

const page = await context.newPage();

try {
  console.log(`[raw] Navegando a ${url}`);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120_000 });

  // SPA: give it time and settle network.
  await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => undefined);
  await page.waitForTimeout(6000);

  // Scroll to trigger lazy-loaded flight cards.
  await autoScroll(page);
  await page.waitForTimeout(3000);

  const title = await page.title();
  const finalUrl = page.url();

  const html = await page.content();
  const htmlPath = path.join(outDir, 'page.html');
  fs.writeFileSync(htmlPath, html, 'utf8');

  const shotPath = path.join(outDir, 'screenshot.png');
  await page.screenshot({ path: shotPath, fullPage: true });

  const meta = {
    capturedAt: new Date().toISOString(),
    requestedUrl: url,
    finalUrl,
    title,
    htmlBytes: Buffer.byteLength(html, 'utf8'),
  };
  fs.writeFileSync(path.join(outDir, 'meta.json'), JSON.stringify(meta, null, 2), 'utf8');

  console.log(`[raw] Guardado en ${outDir}`);
  console.log(`[raw] Título: ${title}`);
  console.log(`[raw] URL final: ${finalUrl}`);
  console.log(`[raw] HTML: ${meta.htmlBytes} bytes`);
} finally {
  await browser.close();
}

async function autoScroll(page: import('playwright').Page): Promise<void> {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      let total = 0;
      const step = 600;
      const timer = setInterval(() => {
        window.scrollBy(0, step);
        total += step;
        if (total >= document.body.scrollHeight - window.innerHeight - step) {
          clearInterval(timer);
          window.scrollTo(0, 0);
          resolve();
        }
      }, 300);
    });
  });
}
