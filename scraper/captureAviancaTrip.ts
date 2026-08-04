import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { CAPTURES_DIR, ensureDir, timestampSlug } from './paths.js';

const TRIP_URL =
  process.argv[2] ||
  'https://booking.avianca.com/av/booking/trip?cartId=195Q1YPPV29B1OGU&pointOfSale=CO&language=ES&overrides=%257B%2522enableFlexCancelTeaser%2522%253A%2522true%2522%252C%2522useHPP%2522%253A%2522true%2522%252C%2522useAvCheckout%2522%253A%2522false%2522%257D';

async function main(): Promise<void> {
  const outDir = path.join(CAPTURES_DIR, `${timestampSlug()}_avianca_trip`);
  ensureDir(outDir);
  console.log('[avianca-trip] URL:', TRIP_URL);

  const browser = await chromium.launch({
    headless: !process.argv.includes('--headed'),
    args: ['--disable-blink-features=AutomationControlled'],
  });
  const page = await browser.newPage({
    locale: 'es-CO',
    viewport: { width: 1365, height: 900 },
  });

  const jsons: string[] = [];
  page.on('response', async (res) => {
    try {
      const u = res.url();
      const ct = (res.headers()['content-type'] || '').toLowerCase();
      if (!/avianca\.com/i.test(u)) return;
      if (!ct.includes('json') && !/\/av\//.test(u)) return;
      if (res.status() < 200 || res.status() >= 400) return;
      const t = await res.text();
      if (t.length < 80) return;
      const file = `net_${String(jsons.length + 1).padStart(2, '0')}.json`;
      let body: unknown;
      try {
        body = JSON.parse(t);
      } catch {
        body = { raw: t.slice(0, 200_000) };
      }
      fs.writeFileSync(path.join(outDir, file), JSON.stringify({ url: u, status: res.status(), body }, null, 2));
      jsons.push(file);
      console.log('[avianca-trip] JSON', file, u.slice(0, 110));
    } catch {
      // ignore
    }
  });

  await page.goto(TRIP_URL, { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await page.waitForTimeout(10_000);
  await page.screenshot({ path: path.join(outDir, 'trip.png'), fullPage: true });
  fs.writeFileSync(path.join(outDir, 'trip.html'), await page.content(), 'utf8');

  const info = await page.evaluate(() => {
    const w = window as unknown as { digitalData?: unknown };
    return {
      title: document.title,
      url: location.href,
      croPag: document.documentElement.getAttribute('cro-pag'),
      hasTripSummary: !!document.querySelector('.trip-summary-content, trip-summary-page'),
      bounds: document.querySelectorAll('bound-displayer-pres').length,
      dataFlight: document.querySelectorAll('[data-flight]').length,
      textSample: (document.body?.innerText || '').slice(0, 1200),
      hasDigitalData: typeof w.digitalData !== 'undefined',
    };
  });

  fs.writeFileSync(path.join(outDir, 'probe.json'), JSON.stringify({ info, jsons }, null, 2), 'utf8');
  console.log(JSON.stringify(info, null, 2));
  console.log('[avianca-trip] Guardado en', outDir);
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
