/**
 * Headed capture for Scape/XNet FlightResults.
 * You log in manually in the Chromium window. When ready, create the sentinel
 * file (the agent does this when you say "listo"):
 *   scraper/.session/scape-capture-now
 *
 * Usage: tsx scraper/captureScape.ts [url] [slug]
 */
import * as fs from 'fs';
import * as path from 'path';
import { chromium } from 'playwright';
import { CAPTURES_DIR, SESSION_DIR, ensureDir, timestampSlug } from './paths.js';

const DEFAULT_URL = 'https://scape.xnet.travel/FlightResults.aspx#';
const url = process.argv[2] ?? DEFAULT_URL;
const slug = process.argv[3] ?? 'scape-flights';
const SESSION_FILE = path.join(SESSION_DIR, 'scape-state.json');
const READY_FILE = path.join(SESSION_DIR, 'scape-capture-now');
const STATUS_FILE = path.join(SESSION_DIR, 'scape-status.json');

async function waitForSentinel(timeoutMs = 30 * 60_000): Promise<void> {
  if (fs.existsSync(READY_FILE)) fs.unlinkSync(READY_FILE);
  const started = Date.now();
  console.log(`[scape] Esperando señal: creá/escribí ${READY_FILE}`);
  console.log('[scape] (o decile "listo" al agente para que la cree)');

  while (!fs.existsSync(READY_FILE)) {
    if (Date.now() - started > timeoutMs) {
      throw new Error('Timeout esperando señal de captura (30 min).');
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  fs.unlinkSync(READY_FILE);
}

ensureDir(SESSION_DIR);
ensureDir(CAPTURES_DIR);

const browser = await chromium.launch({
  headless: false,
  args: ['--disable-blink-features=AutomationControlled'],
});

const context = await browser.newContext({
  ...(fs.existsSync(SESSION_FILE) ? { storageState: SESSION_FILE } : {}),
  userAgent:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  locale: 'es-CO',
  viewport: { width: 1440, height: 900 },
});

const page = await context.newPage();
await page.addInitScript('window.__name = window.__name || function (f) { return f; };');

console.log(`\n[scape] Abriendo ${url}`);
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120_000 });

const statusTimer = setInterval(async () => {
  try {
    fs.writeFileSync(
      STATUS_FILE,
      JSON.stringify({ url: page.url(), title: await page.title(), at: new Date().toISOString() }, null, 2),
      'utf8',
    );
  } catch {
    // page may be mid-navigation
  }
}, 2000);

console.log('[scape] Logueate / navega al vuelo seleccionado o al carrito.');
console.log('[scape] Cuando esté listo, avisá al agente ("listo").\n');
await waitForSentinel();
clearInterval(statusTimer);

await page.waitForTimeout(1500);

const outDir = path.join(CAPTURES_DIR, `${timestampSlug()}_${slug}`);
ensureDir(outDir);

const title = await page.title();
const finalUrl = page.url();

const html = await page.content();
fs.writeFileSync(path.join(outDir, 'page.html'), html, 'utf8');

await page.screenshot({ path: path.join(outDir, 'screenshot.png'), fullPage: true });

const snapshot = await page.evaluate(() => {
  const w = window as unknown as Record<string, unknown>;
  const pick = (key: string) => {
    try {
      return w[key] ?? null;
    } catch {
      return null;
    }
  };

  const globalKeys = Object.keys(w).filter((k) =>
    /^(G|Obj|flight|Flight|search|Search|result|Result|recomend|cluster)/i.test(k),
  );

  return {
    title: document.title,
    url: location.href,
    hasAvailableFlights: !!document.querySelector('#availableFlights'),
    hasResultByPrice: !!document.querySelector('#resultByPrice'),
    hasNoFlightResults: !!document.querySelector('#noFlightResults'),
    resultByPriceVisible: (() => {
      const el = document.querySelector('#resultByPrice') as HTMLElement | null;
      return !!el && el.offsetParent !== null;
    })(),
    flightCardCount: document.querySelectorAll(
      '#availableFlights .flight, #availableFlights .recommendation, #resultByPrice .boxResult, #resultByPrice tr, [class*="flight"]',
    ).length,
    idsSample: Array.from(document.querySelectorAll('[id]'))
      .map((el) => el.id)
      .filter((id) => /flight|result|price|recomend|cluster|cart|basket|reserva/i.test(id))
      .slice(0, 80),
    classSample: Array.from(
      new Set(
        Array.from(document.querySelectorAll('#availableFlights [class], #resultByPrice [class]'))
          .flatMap((el) => Array.from(el.classList))
          .filter((c) => /flight|result|price|segment|cia|airline|recomend/i.test(c)),
      ),
    ).slice(0, 80),
    globals: {
      GDominioSite: pick('GDominioSite'),
      GObjDatosLogin: pick('GObjDatosLogin')
        ? {
            nomeUsuario: (pick('GObjDatosLogin') as Record<string, unknown>).nomeUsuario,
            entidade: (pick('GObjDatosLogin') as Record<string, unknown>).entidade,
          }
        : null,
      GObjReservaActual: pick('GObjReservaActual'),
      GObjServices: pick('GObjServices'),
      GObjServicesSel: pick('GObjServicesSel'),
      GObjTicketSearchboxParameters: pick('GObjTicketSearchboxParameters'),
      candidateKeys: globalKeys.slice(0, 60),
    },
  };
});

fs.writeFileSync(path.join(outDir, 'snapshot.json'), JSON.stringify(snapshot, null, 2), 'utf8');

const resultsEl = page.locator('#availableFlights, #resultByPrice, #divPriceSummary').first();
if ((await resultsEl.count()) > 0) {
  const resultsHtml = await resultsEl.evaluate((el) => el.outerHTML);
  fs.writeFileSync(path.join(outDir, 'results.html'), resultsHtml, 'utf8');
}

await context.storageState({ path: SESSION_FILE });

console.log(`\n[scape] Captura en ${outDir}`);
console.log(`[scape] Título: ${title}`);
console.log(`[scape] URL: ${finalUrl}`);
console.log(`[scape] Sesión guardada en ${SESSION_FILE}`);
console.log(`[scape] availableFlights: ${snapshot.hasAvailableFlights}`);
console.log(`[scape] flightCardCount (heurística): ${snapshot.flightCardCount}`);

await browser.close();
