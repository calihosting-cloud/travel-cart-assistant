import * as fs from 'fs';
import * as path from 'path';
import { chromium, Page } from 'playwright';
import { ensureSession } from './auth.js';
import { CAPTURES_DIR, ensureDir, timestampSlug } from './paths.js';
import { FieldSnapshot, FormSnapshot, PageCapture, PageKind, SelectorHints } from './types.js';

const FIELD_PREFIXES = ['searchhotel[', 'searchtransfer['];

export interface CaptureOptions {
  url: string;
  slug?: string;
  headless?: boolean;
  waitMs?: number;
}

export async function captureBookingMotorPage(options: CaptureOptions): Promise<PageCapture> {
  const sessionFile = await ensureSession();
  const slug = options.slug ?? 'capture';
  const outDir = path.join(CAPTURES_DIR, `${timestampSlug()}_${slug}`);
  ensureDir(outDir);

  const browser = await chromium.launch({ headless: options.headless ?? true });
  const context = await browser.newContext({ storageState: sessionFile });
  const page = await context.newPage();

  // tsx/esbuild wraps serialized evaluate() callbacks with a `__name` helper
  // that doesn't exist in the page context. Define it on every document so the
  // callbacks resolve it as a no-op. (Raw string → not transformed by esbuild.)
  await page.addInitScript('window.__name = window.__name || function (f) { return f; };');

  try {
    console.log(`[scraper] Navegando a ${options.url}`);
    await page.goto(options.url, { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await page.waitForTimeout(options.waitMs ?? 3000);

    await waitForPageSignals(page);
    const windowData = await waitForWindowData(page);

    const title = await page.title();
    const pageKind = await detectPageKind(page);
    const forms = await extractForms(page);
    const selectorHints = await extractSelectorHints(page);

    const screenshotPath = path.join(outDir, 'screenshot.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });

    let formHtmlPath: string | undefined;
    const formSelector = selectorHints.hotelForm || selectorHints.transferForm;
    if (formSelector) {
      formHtmlPath = path.join(outDir, 'form.html');
      const formHtml = await page.locator(formSelector).first().evaluate((el) => el.outerHTML);
      fs.writeFileSync(formHtmlPath, formHtml, 'utf8');
    }

    let resultsHtmlPath: string | undefined;
    const resultsSelector = selectorHints.hotelResults || selectorHints.transferResults;
    if (resultsSelector) {
      resultsHtmlPath = path.join(outDir, 'results.html');
      const resultsHtml = await page.locator(resultsSelector).first().evaluate((el) => el.outerHTML);
      fs.writeFileSync(resultsHtmlPath, resultsHtml, 'utf8');
    }

    const capture: PageCapture = {
      capturedAt: new Date().toISOString(),
      url: page.url(),
      title,
      pageKind,
      windowData,
      forms,
      selectorHints,
      artifacts: {
        screenshot: path.relative(process.cwd(), screenshotPath),
        captureJson: path.relative(process.cwd(), path.join(outDir, 'capture.json')),
        formHtml: formHtmlPath ? path.relative(process.cwd(), formHtmlPath) : undefined,
        resultsHtml: resultsHtmlPath ? path.relative(process.cwd(), resultsHtmlPath) : undefined,
      },
    };

    const jsonPath = path.join(outDir, 'capture.json');
    fs.writeFileSync(jsonPath, JSON.stringify(capture, null, 2), 'utf8');

    console.log(`[scraper] Captura guardada en ${outDir}`);
    console.log(`[scraper] Tipo: ${pageKind}`);
    console.log(`[scraper] Formularios: ${forms.length}`);
    console.log(`[scraper] window.data: ${windowData ? 'sí' : 'no'}`);

    return capture;
  } finally {
    await browser.close();
  }
}

async function waitForPageSignals(page: Page): Promise<void> {
  const selectors = [
    '#search_hotel',
    '#search_transfer',
    '#list-hotel-items',
    '#list-transfer-items',
    '#content',
  ];

  for (const sel of selectors) {
    try {
      await page.waitForSelector(sel, { timeout: 8000 });
      return;
    } catch {
      // try next
    }
  }
}

/**
 * Poll for the page's search context. BookingMotor uses `let data = ...`, a
 * global lexical binding that is NOT `window.data`, so we read the bare `data`
 * via indirect eval (reaches the global lexical scope), with window.data as
 * fallback for older pages.
 */
async function waitForWindowData(page: Page, maxAttempts = 15): Promise<unknown> {
  for (let i = 0; i < maxAttempts; i++) {
    const data = await page.evaluate(() => {
      const w = window as unknown as { data?: unknown };
      if (w.data) return w.data;
      try {
        // eslint-disable-next-line no-eval
        return (0, eval)('typeof data !== "undefined" ? data : null');
      } catch {
        return null;
      }
    });
    if (data) return data;
    await page.waitForTimeout(1000);
  }
  return null;
}

async function detectPageKind(page: Page): Promise<PageKind> {
  return page.evaluate(() => {
    const isVisible = (el: Element | null) => {
      if (!el) return false;
      const html = el as HTMLElement;
      return html.offsetParent !== null || html.getClientRects().length > 0;
    };

    if (document.querySelector('#list-hotel-items')) return 'hotel_results';
    if (document.querySelector('#list-transfer-items')) return 'transfer_results';

    const hotelForm = document.querySelector('#search_hotel, form[name="search_hotel"]');
    if (hotelForm && isVisible(hotelForm)) return 'hotel_form';

    const transferForm = document.querySelector('#search_transfer, form[name="search_transfer"]');
    if (transferForm && isVisible(transferForm)) return 'transfer_form';

    return 'unknown';
  });
}

async function extractSelectorHints(page: Page): Promise<SelectorHints> {
  return page.evaluate(() => {
    const hints: SelectorHints = {};
    if (document.querySelector('#list-hotel-items')) hints.hotelResults = '#list-hotel-items';
    if (document.querySelector('#list-transfer-items')) hints.transferResults = '#list-transfer-items';
    if (document.querySelector('#search_hotel')) hints.hotelForm = '#search_hotel';
    if (document.querySelector('#search_transfer')) hints.transferForm = '#search_transfer';
    return hints;
  });
}

async function extractForms(page: Page): Promise<FormSnapshot[]> {
  return page.evaluate((prefixes) => {
    const isVisible = (el: Element) => {
      const html = el as HTMLElement;
      return html.offsetParent !== null || html.getClientRects().length > 0;
    };

    const forms = Array.from(document.querySelectorAll('form'));
    const snapshots: FormSnapshot[] = [];

    for (const form of forms) {
      const fields: FieldSnapshot[] = [];
      const controls = form.querySelectorAll('input, select, textarea');

      for (const control of controls) {
        const name = control.getAttribute('name') ?? '';
        if (!name || !prefixes.some((p: string) => name.startsWith(p))) continue;

        const tag = control.tagName.toLowerCase();
        const id = control.id ?? '';
        const type = control.getAttribute('type') ?? (tag === 'select' ? 'select' : tag);
        const placeholder = control.getAttribute('placeholder') ?? '';
        const value =
          tag === 'select'
            ? (control as HTMLSelectElement).value
            : (control as HTMLInputElement).value ?? '';

        const field: FieldSnapshot = {
          name,
          id,
          tag,
          type,
          value,
          placeholder,
          visible: isVisible(control),
          selector: id ? `#${CSS.escape(id)}` : `[name="${name}"]`,
        };

        if (tag === 'select') {
          field.options = Array.from((control as HTMLSelectElement).options).map((opt) => ({
            value: opt.value,
            text: opt.textContent?.trim() ?? '',
            selected: opt.selected,
          }));
        }

        fields.push(field);
      }

      if (fields.length === 0) continue;

      snapshots.push({
        id: form.id ?? '',
        name: form.getAttribute('name') ?? '',
        action: form.getAttribute('action') ?? '',
        visible: isVisible(form),
        fields,
        outerHtml: form.outerHTML.slice(0, 120_000),
      });
    }

    return snapshots;
  }, FIELD_PREFIXES);
}
