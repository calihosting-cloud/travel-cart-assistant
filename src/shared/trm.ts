/** Daily TRM (COP per 1 USD) for cart header and dual-currency quotes. */

export const TRM_KEY = 'tce_trm';

/** Buffer (COP) added to the day's TRM when converting USD → COP. */
export const TRM_SUPLEMENTO_KEY = 'tce_trm_suplemento';
/** One-shot: old default 150 → 0 (does not block setting 150 again later). */
const TRM_SUPLEMENTO_MIGRATED_KEY = 'tce_trm_suplemento_migrated_v2';
export const DEFAULT_TRM_SUPLEMENTO = 0;

/** Preferred public TRM website (Config). */
export const TRM_SOURCE_KEY = 'tce_trm_source';

export type TrmSourceId = 'dolar-colombia' | 'wilkinson';

export const DEFAULT_TRM_SOURCE: TrmSourceId = 'dolar-colombia';

export const TRM_SOURCES: Record<
  TrmSourceId,
  { id: TrmSourceId; label: string; url: string; shortLabel: string }
> = {
  'dolar-colombia': {
    id: 'dolar-colombia',
    label: 'dolar-colombia.com',
    shortLabel: 'Dolar Colombia',
    url: 'https://www.dolar-colombia.com/',
  },
  wilkinson: {
    id: 'wilkinson',
    label: 'dolar.wilkinsonpc.com.co',
    shortLabel: 'Wilkinson PC',
    url: 'https://dolar.wilkinsonpc.com.co/',
  },
};

/** @deprecated Prefer `TRM_SOURCES['dolar-colombia'].url` / `getTrmReferencePage()`. */
export const TRM_DOLAR_COLOMBIA_URL = TRM_SOURCES['dolar-colombia'].url;

/** @deprecated Prefer `getTrmReferencePage()`. */
export const TRM_REFERENCE_PAGE = TRM_DOLAR_COLOMBIA_URL;

export interface TrmState {
  rate: number;
  date: string; // YYYY-MM-DD
  source: 'manual' | 'page' | 'api';
  /** Website that produced an `api` rate, when known. */
  provider?: TrmSourceId;
  updatedAt: number;
}

export function todayIso(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function normalizeTrmSource(raw: unknown): TrmSourceId {
  return raw === 'wilkinson' ? 'wilkinson' : 'dolar-colombia';
}

export async function loadTrmSource(): Promise<TrmSourceId> {
  try {
    const result = await chrome.storage.local.get(TRM_SOURCE_KEY);
    return normalizeTrmSource(result[TRM_SOURCE_KEY]);
  } catch {
    return DEFAULT_TRM_SOURCE;
  }
}

export async function saveTrmSource(source: TrmSourceId): Promise<void> {
  try {
    await chrome.storage.local.set({ [TRM_SOURCE_KEY]: normalizeTrmSource(source) });
  } catch {
    // ignore
  }
}

export function getTrmReferencePage(source?: TrmSourceId): string {
  const id = source ? normalizeTrmSource(source) : DEFAULT_TRM_SOURCE;
  return TRM_SOURCES[id].url;
}

export async function loadTrm(): Promise<TrmState | null> {
  try {
    const result = await chrome.storage.local.get(TRM_KEY);
    const stored = result[TRM_KEY] as TrmState | undefined;
    if (stored && typeof stored.rate === 'number' && stored.rate > 0) return stored;
  } catch {
    // ignore
  }
  return null;
}

export async function saveTrm(state: TrmState): Promise<void> {
  try {
    await chrome.storage.local.set({ [TRM_KEY]: state });
  } catch {
    // ignore
  }
}

export function normalizeTrmSuplemento(raw: unknown): number {
  if (typeof raw === 'number' && Number.isFinite(raw) && raw >= 0) return raw;
  return DEFAULT_TRM_SUPLEMENTO;
}

export async function loadTrmSuplemento(): Promise<number> {
  try {
    const result = await chrome.storage.local.get([
      TRM_SUPLEMENTO_KEY,
      TRM_SUPLEMENTO_MIGRATED_KEY,
    ]);
    const migrated = result[TRM_SUPLEMENTO_MIGRATED_KEY] === true;
    if (
      !migrated &&
      TRM_SUPLEMENTO_KEY in result &&
      normalizeTrmSuplemento(result[TRM_SUPLEMENTO_KEY]) === 150
    ) {
      await chrome.storage.local.set({
        [TRM_SUPLEMENTO_KEY]: 0,
        [TRM_SUPLEMENTO_MIGRATED_KEY]: true,
      });
      return 0;
    }
    if (!migrated) {
      await chrome.storage.local.set({ [TRM_SUPLEMENTO_MIGRATED_KEY]: true });
    }
    if (TRM_SUPLEMENTO_KEY in result) {
      return normalizeTrmSuplemento(result[TRM_SUPLEMENTO_KEY]);
    }
  } catch {
    // ignore
  }
  return DEFAULT_TRM_SUPLEMENTO;
}

export async function saveTrmSuplemento(value: number): Promise<void> {
  try {
    await chrome.storage.local.set({
      [TRM_SUPLEMENTO_KEY]: normalizeTrmSuplemento(value),
    });
  } catch {
    // ignore
  }
}

/** TRM of the day + buffer (used to convert USD cart lines to COP). */
export function effectiveTrm(rate: number, suplemento: number): number {
  if (!(rate > 0)) return 0;
  return rate + Math.max(0, suplemento || 0);
}

function parseLatinAmount(raw: string): number | null {
  const cleaned = raw.trim();
  if (!cleaned) return null;
  let normalized = cleaned;
  if (/\d,\d{3}\.\d/.test(cleaned) || /^\d{1,3}(,\d{3})+(\.\d+)?$/.test(cleaned)) {
    normalized = cleaned.replace(/,/g, '');
  } else if (/\d\.\d{3},\d/.test(cleaned) || /^\d{1,3}(\.\d{3})+(,\d+)?$/.test(cleaned)) {
    normalized = cleaned.replace(/\./g, '').replace(',', '.');
  } else {
    normalized = cleaned.replace(/,/g, '.');
  }
  const rate = parseFloat(normalized);
  if (rate > 100 && rate < 20_000) return rate;
  return null;
}

/**
 * Fetches today's TRM from dolar-colombia.com HTML.
 * Returns null on network / parse failure.
 */
export async function fetchDolarColombiaTrm(): Promise<TrmState | null> {
  try {
    const res = await fetch(TRM_SOURCES['dolar-colombia'].url, {
      method: 'GET',
      headers: { Accept: 'text/html' },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const html = await res.text();
    const parsed = parseDolarColombiaRate(html);
    if (parsed == null) return null;
    return {
      rate: parsed,
      date: todayIso(),
      source: 'api',
      provider: 'dolar-colombia',
      updatedAt: Date.now(),
    };
  } catch {
    return null;
  }
}

/**
 * Fetches today's official TRM from dolar.wilkinsonpc.com.co.
 * Prefers the “TRM OFICIAL … Hoy” block (not next-day / spot).
 */
export async function fetchWilkinsonTrm(): Promise<TrmState | null> {
  try {
    const res = await fetch(TRM_SOURCES.wilkinson.url, {
      method: 'GET',
      headers: { Accept: 'text/html' },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const html = await res.text();
    const parsed = parseWilkinsonRate(html);
    if (parsed == null) return null;
    return {
      rate: parsed,
      date: todayIso(),
      source: 'api',
      provider: 'wilkinson',
      updatedAt: Date.now(),
    };
  } catch {
    return null;
  }
}

export async function fetchTrmFromSource(source: TrmSourceId): Promise<TrmState | null> {
  return source === 'wilkinson' ? fetchWilkinsonTrm() : fetchDolarColombiaTrm();
}

/** @deprecated Use `fetchPublishedTrm` / `fetchDolarColombiaTrm`. */
export async function fetchOfficialTrm(): Promise<TrmState | null> {
  return fetchPublishedTrm();
}

/**
 * Preferred source first, then the other site as fallback.
 */
export async function fetchPublishedTrm(
  preferred?: TrmSourceId
): Promise<TrmState | null> {
  const primary = preferred ?? (await loadTrmSource());
  const order: TrmSourceId[] =
    primary === 'wilkinson'
      ? ['wilkinson', 'dolar-colombia']
      : ['dolar-colombia', 'wilkinson'];
  for (const src of order) {
    const next = await fetchTrmFromSource(src);
    if (next) return next;
  }
  return null;
}

/** Parse "1 USD = 3,219.31 COP" (comma thousands, optional decimals / HTML spans). */
export function parseDolarColombiaRate(html: string): number | null {
  const patterns = [
    /USD\s*\$\s*1\s*=\s*COP\s*\$\s*([\d.,]+)/i,
    /1\s*USD\s*=[\s\S]{0,120}?([\d]{1,2}[.,]\d{3}(?:[.,]\d{1,4})?)\s*<\/span>\s*COP/i,
    /1\s*USD\s*=\s*([\d.,]+)\s*COP/i,
    /USD\s*=\s*([\d.,]+)\s*COP/i,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (!m?.[1]) continue;
    const rate = parseLatinAmount(m[1]);
    if (rate != null) return rate;
  }
  return null;
}

/**
 * Wilkinson “TRM OFICIAL … Hoy”: `$3,121<span…>.07</span>` or text `1 USD = $3,121.07 COP`.
 */
export function parseWilkinsonRate(html: string): number | null {
  const official = html.match(
    /title=["']TRM OFICIAL[^"']*["'][\s\S]{0,500}?\$\s*([\d,]+)\s*<span[^>]*>\s*\.(\d+)\s*<\/span>/i
  );
  if (official) {
    const rate = parseFloat(`${official[1].replace(/,/g, '')}.${official[2]}`);
    if (rate > 100 && rate < 20_000) return rate;
  }

  const plain = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const patterns = [
    /TRM OFICIAL[\s\S]{0,80}?1\s*USD\s*=\s*\$?\s*([\d.,]+)\s*COP/i,
    /1\s*USD\s*=\s*\$?\s*([\d.,]+)\s*COP/i,
    /USD\s*=\s*\$?\s*([\d.,]+)\s*COP/i,
  ];
  for (const re of patterns) {
    const m = plain.match(re);
    if (!m?.[1]) continue;
    const rate = parseLatinAmount(m[1]);
    if (rate != null) return rate;
  }
  return null;
}

/**
 * Refresh TRM unless the advisor already set a manual value for today
 * (pass force=true to overwrite).
 */
export async function refreshOfficialTrm(force = false): Promise<TrmState | null> {
  const existing = await loadTrm();
  if (!force && existing?.source === 'manual' && existing.date === todayIso()) {
    return existing;
  }
  const next = await fetchPublishedTrm();
  if (!next) return existing;
  await saveTrm(next);
  return next;
}

/** Infer TRM from a COP/USD pair (e.g. activity card). */
export function trmFromPair(cop: number, usd: number): number | null {
  if (!(cop > 0) || !(usd > 0)) return null;
  const rate = cop / usd;
  return Number.isFinite(rate) && rate > 100 && rate < 20_000 ? rate : null;
}

export function usdToCop(usd: number, trm: number): number {
  return Math.round(usd * trm);
}

export function copToUsd(cop: number, trm: number): number {
  if (!(trm > 0)) return 0;
  return Math.round((cop / trm) * 100) / 100;
}

/** TRM del día para el input / barra (siempre 2 decimales). */
export function formatTrmRate(rate: number): string {
  if (!(rate > 0) || !Number.isFinite(rate)) return '';
  return rate.toLocaleString('es-CO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function trmInputValue(rate: number): string {
  if (!(rate > 0) || !Number.isFinite(rate)) return '';
  return (Math.round(rate * 100) / 100).toFixed(2);
}

export type DisplayCurrency = 'COP' | 'USD';

export const DISPLAY_CURRENCY_KEY = 'tce_display_currency';

export function normalizeDisplayCurrency(raw: unknown): DisplayCurrency {
  return raw === 'USD' ? 'USD' : 'COP';
}

export async function loadDisplayCurrency(): Promise<DisplayCurrency> {
  try {
    const result = await chrome.storage.local.get(DISPLAY_CURRENCY_KEY);
    return normalizeDisplayCurrency(result[DISPLAY_CURRENCY_KEY]);
  } catch {
    return 'COP';
  }
}

export async function saveDisplayCurrency(currency: DisplayCurrency): Promise<void> {
  try {
    await chrome.storage.local.set({ [DISPLAY_CURRENCY_KEY]: currency });
  } catch {
    // ignore
  }
}
