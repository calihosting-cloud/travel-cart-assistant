import { chromium } from 'playwright';
import { SESSION_FILE } from './paths.js';

const url = process.argv[2];
if (!url) {
  console.error('Uso: tsx scraper/diag.ts <url>');
  process.exit(1);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ storageState: SESSION_FILE });
const page = await context.newPage();
await page.addInitScript('window.__name = window.__name || function (f) { return f; };');

await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90_000 });
await page.waitForTimeout(5000);

const diag = await page.evaluate(() => {
  const out: Record<string, unknown> = {};
  const w = window as unknown as Record<string, unknown>;

  out['typeof window.data'] = typeof w['data'];

  // Bare `data` resolves to a global lexical (let/const) binding if present.
  try {
    // eslint-disable-next-line no-eval
    out['typeof data (bare)'] = eval('typeof data');
  } catch (e) {
    out['typeof data (bare)'] = 'eval error: ' + (e as Error).message;
  }

  try {
    const bare = eval('(typeof data !== "undefined") ? data : null') as Record<string, unknown> | null;
    out['data keys'] = bare ? Object.keys(bare) : null;
    out['has searchhotel'] = bare ? 'searchhotel' in bare : false;
  } catch (e) {
    out['data keys'] = 'eval error: ' + (e as Error).message;
  }

  // Look for other likely globals holding the search context.
  const candidates = Object.keys(w).filter((k) => /search|data|book|hotel/i.test(k));
  out['window candidate keys'] = candidates.slice(0, 40);

  return out;
});

console.log(JSON.stringify(diag, null, 2));
await browser.close();
