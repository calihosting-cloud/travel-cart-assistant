import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { CAPTURES_DIR, ensureDir, timestampSlug } from './paths.js';

const SEARCH_URL =
  process.argv[2] ||
  'https://booking.wingo.com/es/search/CLO/BOG/2026-07-29/2026-08-12/2/1/1/0/COP/0/0';

async function main(): Promise<void> {
  const outDir = path.join(CAPTURES_DIR, `${timestampSlug()}_wingo_search`);
  ensureDir(outDir);
  console.log('[wingo] URL:', SEARCH_URL);

  const browser = await chromium.launch({
    headless: !process.argv.includes('--headed'),
    args: ['--disable-blink-features=AutomationControlled'],
  });
  const page = await browser.newPage({
    locale: 'es-CO',
    viewport: { width: 1365, height: 900 },
  });
  await page.addInitScript('window.__name = window.__name || function (f) { return f; };');

  const jsons: string[] = [];
  page.on('response', async (res) => {
    try {
      const u = res.url();
      const ct = (res.headers()['content-type'] || '').toLowerCase();
      if (!/wingo/i.test(u)) return;
      if (!ct.includes('json') && !/api|search|flight|itinerary|booking/i.test(u)) return;
      if (res.status() < 200 || res.status() >= 400) return;
      const t = await res.text();
      if (t.length < 80) return;
      const file = `net_${String(jsons.length + 1).padStart(2, '0')}.json`;
      let body: unknown;
      try {
        body = JSON.parse(t);
      } catch {
        body = { raw: t.slice(0, 300_000) };
      }
      fs.writeFileSync(
        path.join(outDir, file),
        JSON.stringify({ url: u, status: res.status(), body }, null, 2)
      );
      jsons.push(file);
      console.log('[wingo] JSON', file, u.slice(0, 120));
    } catch {
      // ignore
    }
  });

  await page.goto(SEARCH_URL, { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await page.waitForTimeout(5000);

  // Infant / cookie modals
  for (const label of [/Aceptar condiciones/i, /Aceptar/i, /Accept/i, /Continuar/i]) {
    try {
      const btn = page.getByText(label).first();
      if (await btn.isVisible({ timeout: 2000 })) {
        await btn.click();
        await page.waitForTimeout(1500);
      }
    } catch {
      // next
    }
  }

  await page.waitForTimeout(6000);
  await page.screenshot({ path: path.join(outDir, '01_search.png'), fullPage: true });
  fs.writeFileSync(path.join(outDir, '01_search.html'), await page.content(), 'utf8');

  // Try open trip details / total
  for (const sel of [
    'text=Detalles de tu viaje',
    'text=/Total:/i',
    'text=/Tus vuelos/i',
    '[class*="total"]',
  ]) {
    try {
      const loc = page.locator(sel).first();
      if (await loc.isVisible({ timeout: 1500 })) {
        await loc.click({ timeout: 2000 });
        await page.waitForTimeout(1000);
      }
    } catch {
      // continue
    }
  }
  await page.screenshot({ path: path.join(outDir, '02_details.png'), fullPage: true });
  fs.writeFileSync(path.join(outDir, '02_details.html'), await page.content(), 'utf8');

  const probe = await page.evaluate(() => {
    const text = document.body?.innerText || '';
    const interesting = [
      ...document.querySelectorAll(
        '[class*="flight"],[class*="Flight"],[class*="journey"],[class*="Journey"],[class*="fare"],[class*="total"],[class*="Total"],[class*="trip"],[class*="Trip"],[data-testid]'
      ),
    ]
      .slice(0, 60)
      .map((el) => ({
        tag: el.tagName,
        testid: el.getAttribute('data-testid'),
        cls: String(el.className || '').slice(0, 120),
        text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 100),
      }));

    const buttons = [...document.querySelectorAll('button, a')]
      .map((el) => (el.textContent || '').replace(/\s+/g, ' ').trim())
      .filter((t) => t && t.length < 80)
      .filter((t) => /vuelo|total|continuar|seleccion|detalle|tarifa|equipaje|tus/i.test(t))
      .slice(0, 40);

    const headers = [...document.querySelectorAll('h1,h2,h3,h4,[class*="title"]')]
      .map((el) => (el.textContent || '').replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .slice(0, 30);

    return {
      title: document.title,
      url: location.href,
      textSample: text.slice(0, 2000),
      hasTusVuelos: /tus vuelos/i.test(text),
      hasDetalles: /detalles de tu viaje/i.test(text),
      hasTotal: /Total:\s*\$/i.test(text),
      interesting,
      buttons,
      headers,
      winKeys: Object.keys(window).filter((k) =>
        /flight|booking|itinerary|search|ng|__NEXT|dataLayer|digital/i.test(k)
      ),
    };
  });

  fs.writeFileSync(path.join(outDir, 'probe.json'), JSON.stringify({ probe, jsons }, null, 2), 'utf8');
  console.log(JSON.stringify(probe, null, 2));
  console.log('[wingo] Guardado en', outDir);
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
