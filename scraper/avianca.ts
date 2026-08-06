/**
 * Avianca booking scraper (research / fixtures for the Chrome extension).
 *
 * Runs a full round-trip search and dumps HTML, screenshots and JSON API
 * responses so we can decide if Avianca is worth integrating (many steps).
 *
 * Default search (override via CLI flags):
 *   CLO → MDE · 2026-07-29 → 2026-08-08 · 2 adults · 1 child · 1 infant · COP
 *
 * Usage:
 *   npx tsx scraper/avianca.ts
 *   npx tsx scraper/avianca.ts --headless
 *   npx tsx scraper/avianca.ts --origin CLO --dest MDE --depart 2026-07-29 --return 2026-08-08
 */

import * as fs from 'fs';
import * as path from 'path';
import { chromium, Page, Response } from 'playwright';
import { CAPTURES_DIR, ensureDir, timestampSlug } from './paths.js';

export interface AviancaSearchParams {
  origin: string;
  destination: string;
  departDate: string; // YYYY-MM-DD
  returnDate: string; // YYYY-MM-DD
  adults: number;
  children: number;
  infants: number;
  currency: string;
  pointOfSale: string;
  language: string;
  headless: boolean;
  /** Max ms to wait on availability after submit. */
  waitMs: number;
}

interface CapturedJson {
  url: string;
  status: number;
  contentType: string;
  savedAs: string;
  bytes: number;
}

const DEFAULTS: AviancaSearchParams = {
  origin: 'CLO',
  destination: 'MDE',
  departDate: '2026-07-29',
  returnDate: '2026-08-08',
  adults: 2,
  children: 1,
  infants: 1,
  currency: 'COP',
  pointOfSale: 'CO',
  language: 'ES',
  headless: false,
  waitMs: 45_000,
};

export function parseAviancaArgs(argv: string[]): AviancaSearchParams {
  const out = { ...DEFAULTS };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === '--headless') out.headless = true;
    else if (a === '--headed') out.headless = false;
    else if (a === '--origin') out.origin = (next() || out.origin).toUpperCase();
    else if (a === '--dest' || a === '--destination')
      out.destination = (next() || out.destination).toUpperCase();
    else if (a === '--depart') out.departDate = next() || out.departDate;
    else if (a === '--return') out.returnDate = next() || out.returnDate;
    else if (a === '--adults') out.adults = Number(next() || out.adults);
    else if (a === '--children') out.children = Number(next() || out.children);
    else if (a === '--infants') out.infants = Number(next() || out.infants);
    else if (a === '--wait') out.waitMs = Number(next() || out.waitMs);
  }
  return out;
}

function interestingJsonUrl(url: string): boolean {
  const u = url.toLowerCase();
  return (
    u.includes('avianca.com') &&
    (u.includes('/av/') ||
      u.includes('booking') ||
      u.includes('availability') ||
      u.includes('air/') ||
      u.includes('cart') ||
      u.includes('journey') ||
      u.includes('fare') ||
      u.includes('search') ||
      u.includes('graphql') ||
      u.includes('api'))
  );
}

async function dismissNoise(page: Page): Promise<void> {
  const candidates = [
    'button:has-text("Aceptar")',
    'button:has-text("Accept")',
    'button:has-text("Entendido")',
    'button:has-text("Cerrar")',
    '[aria-label="Close"]',
    '#onetrust-accept-btn-handler',
    'button#onetrust-accept-btn-handler',
  ];
  for (const sel of candidates) {
    try {
      const loc = page.locator(sel).first();
      if (await loc.isVisible({ timeout: 1500 })) {
        await loc.click({ timeout: 2000 });
        await page.waitForTimeout(500);
      }
    } catch {
      // ignore
    }
  }
}

async function fillAirport(page: Page, role: 'origin' | 'destination', code: string): Promise<boolean> {
  // Avianca home widget changes often; try several known patterns.
  const openers =
    role === 'origin'
      ? [
          '[data-testid="origin"]',
          'input[placeholder*="Origen" i]',
          'input[aria-label*="Origen" i]',
          'button:has-text("Origen")',
          '.origin input',
          '#origin',
        ]
      : [
          '[data-testid="destination"]',
          'input[placeholder*="Destino" i]',
          'input[aria-label*="Destino" i]',
          'button:has-text("Destino")',
          '.destination input',
          '#destination',
        ];

  for (const sel of openers) {
    try {
      const loc = page.locator(sel).first();
      if (!(await loc.isVisible({ timeout: 1200 }))) continue;
      await loc.click({ timeout: 2000 });
      await page.waitForTimeout(400);
      await page.keyboard.type(code, { delay: 80 });
      await page.waitForTimeout(800);
      // pick first suggestion containing the IATA code
      const suggestion = page
        .locator(`text=/${code}/i`)
        .first();
      if (await suggestion.isVisible({ timeout: 2500 })) {
        await suggestion.click({ timeout: 2000 });
        return true;
      }
      await page.keyboard.press('Enter');
      return true;
    } catch {
      // try next selector
    }
  }
  return false;
}

async function setPassengerCounts(
  page: Page,
  adults: number,
  children: number,
  infants: number
): Promise<void> {
  const openers = [
    'button:has-text("Pasajero")',
    'button:has-text("pasajero")',
    '[data-testid="passengers"]',
    'button:has-text("Adulto")',
  ];
  for (const sel of openers) {
    try {
      const loc = page.locator(sel).first();
      if (await loc.isVisible({ timeout: 1500 })) {
        await loc.click();
        break;
      }
    } catch {
      // continue
    }
  }
  await page.waitForTimeout(600);

  // Naive +/- approach: click until counts match (best-effort).
  async function bump(label: RegExp, target: number): Promise<void> {
    const row = page.locator('div, li, section').filter({ hasText: label }).first();
    if (!(await row.count())) return;
    for (let i = 0; i < 6; i++) {
      const text = (await row.innerText().catch(() => '')) || '';
      const m = text.match(/(\d+)/);
      const current = m ? Number(m[1]) : 0;
      if (current === target) return;
      const btn =
        current < target
          ? row.locator('button').filter({ hasText: /\+|Más|Add/i }).last()
          : row.locator('button').filter({ hasText: /−|-|Menos|Remove/i }).last();
      try {
        await btn.click({ timeout: 1000 });
        await page.waitForTimeout(250);
      } catch {
        return;
      }
    }
  }

  await bump(/Adult/i, adults);
  await bump(/Niñ|Child/i, children);
  await bump(/Beb|Infant|Infante/i, infants);

  try {
    await page.locator('button:has-text("Listo"), button:has-text("Aplicar"), button:has-text("Done")').first().click({ timeout: 2000 });
  } catch {
    // panel may auto-close
  }
}

async function trySubmitSearch(page: Page): Promise<boolean> {
  const submitters = [
    'button:has-text("Buscar vuelos")',
    'button:has-text("Buscar")',
    'button:has-text("Search")',
    '[data-testid="search-flights"]',
    'button[type="submit"]',
  ];
  for (const sel of submitters) {
    try {
      const loc = page.locator(sel).first();
      if (await loc.isVisible({ timeout: 1500 })) {
        await loc.click({ timeout: 3000 });
        return true;
      }
    } catch {
      // next
    }
  }
  return false;
}

/**
 * Snapshot of the saved fixture (offline analysis) so we still get signal
 * even if the live site blocks automation.
 */
function analyzeSavedFixture(outDir: string): void {
  const fixture = path.resolve(process.cwd(), 'html', 'Avianca.html');
  if (!fs.existsSync(fixture)) {
    console.log('[avianca] No hay html/Avianca.html para análisis offline.');
    return;
  }
  const html = fs.readFileSync(fixture, 'utf8');
  const savedUrl = html.match(/saved from url=\([^)]*\)(https?:\/\/[^-\s]+)/)?.[1] || '';
  const croPag = html.match(/cro-pag="([^"]+)"/)?.[1] || '';
  const cartId = savedUrl.match(/cartId=([^&]+)/)?.[1] || html.match(/cartId[=:][\s"]*([A-Z0-9]+)/i)?.[1] || '';
  const hints = {
    fixtureBytes: html.length,
    savedUrl,
    croPag,
    cartId,
    bookingHost: 'booking.avianca.com',
    stepsSeenInScripts: [
      'availability-nbfob',
      'availability-nbfib',
      'availability-nbfconf',
      'ancillary-nbfaas',
    ].filter((s) => html.includes(s)),
    hasAngular: html.includes('_nghost') || html.includes('ng-version'),
    note:
      'El HTML guardado ya está en el paso de disponibilidad/confirmación (multi-step). El scraper live intenta reproducir la búsqueda desde avianca.com.',
  };
  fs.writeFileSync(path.join(outDir, 'fixture_analysis.json'), JSON.stringify(hints, null, 2), 'utf8');
  console.log('[avianca] Análisis de Avianca.html → fixture_analysis.json');
  console.log(`[avianca]   cro-pag=${croPag || '?'} cartId=${cartId || '?'}`);
}

export async function scrapeAvianca(params: AviancaSearchParams = DEFAULTS): Promise<string> {
  const slug = `avianca_${params.origin}-${params.destination}_${params.departDate}`;
  const outDir = path.join(CAPTURES_DIR, `${timestampSlug()}_${slug}`);
  ensureDir(outDir);
  analyzeSavedFixture(outDir);

  const meta = {
    startedAt: new Date().toISOString(),
    params,
    homeUrl: 'https://www.avianca.com/co/es/',
    steps: [] as Array<{ at: string; label: string; url: string }>,
    jsonCaptures: [] as CapturedJson[],
    finalUrl: '',
    title: '',
    error: null as string | null,
  };

  const browser = await chromium.launch({
    headless: params.headless,
    args: ['--disable-blink-features=AutomationControlled'],
  });
  const context = await browser.newContext({
    locale: 'es-CO',
    viewport: { width: 1365, height: 900 },
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();
  await page.addInitScript('window.__name = window.__name || function (f) { return f; };');

  let jsonIndex = 0;
  page.on('response', async (res: Response) => {
    try {
      const url = res.url();
      if (!interestingJsonUrl(url)) return;
      const ct = (res.headers()['content-type'] || '').toLowerCase();
      if (!ct.includes('json') && !ct.includes('javascript') && !url.includes('graphql')) return;
      const status = res.status();
      if (status < 200 || status >= 300) return;
      const body = await res.text();
      if (body.length < 40) return;
      jsonIndex += 1;
      const file = `net_${String(jsonIndex).padStart(2, '0')}.json`;
      // Wrap raw body; if not JSON, still keep it
      let payload: unknown = body;
      try {
        payload = JSON.parse(body);
      } catch {
        payload = { _raw: body.slice(0, 500_000) };
      }
      fs.writeFileSync(path.join(outDir, file), JSON.stringify({ url, status, contentType: ct, body: payload }, null, 2), 'utf8');
      meta.jsonCaptures.push({ url, status, contentType: ct, savedAs: file, bytes: body.length });
      console.log(`[avianca] JSON capturado (${body.length} B): ${url.slice(0, 120)}`);
    } catch {
      // response may be disposed
    }
  });

  const mark = async (label: string) => {
    meta.steps.push({ at: new Date().toISOString(), label, url: page.url() });
    const safe = label.replace(/[^\w.-]+/g, '_').slice(0, 40);
    await page.screenshot({ path: path.join(outDir, `${safe}.png`), fullPage: true }).catch(() => {});
    const html = await page.content().catch(() => '');
    if (html) fs.writeFileSync(path.join(outDir, `${safe}.html`), html, 'utf8');
    console.log(`[avianca] Step: ${label} → ${page.url()}`);
  };

  try {
    console.log('[avianca] Abriendo home…');
    await page.goto(meta.homeUrl, { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await page.waitForTimeout(3000);
    await dismissNoise(page);
    await mark('01_home');

    // Prefer round-trip if there's a toggle
    try {
      const rt = page.locator('label:has-text("Ida y vuelta"), button:has-text("Ida y vuelta"), [aria-label*="Ida y vuelta" i]').first();
      if (await rt.isVisible({ timeout: 2000 })) await rt.click();
    } catch {
      // already round-trip
    }

    const originOk = await fillAirport(page, 'origin', params.origin);
    const destOk = await fillAirport(page, 'destination', params.destination);
    console.log(`[avianca] Aeropuertos: origin=${originOk} dest=${destOk}`);
    await mark('02_airports');

    // Dates: best-effort — type into date inputs if present
    try {
      const dateInputs = page.locator('input[type="date"], input[placeholder*="Fecha" i]');
      const count = await dateInputs.count();
      if (count >= 1) await dateInputs.nth(0).fill(params.departDate);
      if (count >= 2) await dateInputs.nth(1).fill(params.returnDate);
    } catch {
      console.log('[avianca] No se pudieron llenar fechas por input type=date (calendario custom probable).');
    }
    await setPassengerCounts(page, params.adults, params.children, params.infants);
    await mark('03_pax_dates');

    const submitted = await trySubmitSearch(page);
    console.log(`[avianca] Submit búsqueda: ${submitted}`);
    await mark('04_after_submit');

    // Wait for booking.avianca.com or availability markers
    try {
      await page.waitForURL(/booking\.avianca\.com|availability|trip\?cartId/i, {
        timeout: params.waitMs,
      });
    } catch {
      console.log('[avianca] Timeout esperando booking.avianca.com — revisa screenshots (posible captcha / calendario).');
    }
    await page.waitForTimeout(5000);
    await dismissNoise(page);
    await mark('05_availability');

    meta.finalUrl = page.url();
    meta.title = await page.title();

    // Extra wait to collect late XHR
    await page.waitForTimeout(4000);
  } catch (err) {
    meta.error = err instanceof Error ? err.message : String(err);
    console.error('[avianca] Error:', meta.error);
    await mark('99_error');
  } finally {
    meta.steps.push({ at: new Date().toISOString(), label: 'done', url: page.url() });
    fs.writeFileSync(path.join(outDir, 'capture_meta.json'), JSON.stringify(meta, null, 2), 'utf8');
    await browser.close();
  }

  console.log(`[avianca] Artefactos en ${outDir}`);
  console.log(`[avianca] JSON de red: ${meta.jsonCaptures.length}`);
  if (meta.error) console.log(`[avianca] Terminó con error (ver 99_error.*)`);
  return outDir;
}
