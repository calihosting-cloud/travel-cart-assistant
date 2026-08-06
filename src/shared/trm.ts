/** Daily TRM (COP per 1 USD) for cart header and dual-currency quotes. */

export const TRM_KEY = 'tce_trm';

/** Buffer (COP) added to the day's TRM when converting USD → COP. */
export const TRM_SUPLEMENTO_KEY = 'tce_trm_suplemento';
export const DEFAULT_TRM_SUPLEMENTO = 150;

/**
 * Market / published TRM from dolar-colombia.com (updates for the day
 * without waiting for BanRep’s next-day figure at ~16:30).
 */
export const TRM_DOLAR_COLOMBIA_URL = 'https://www.dolar-colombia.com/';

/** Human reference page. */
export const TRM_REFERENCE_PAGE = TRM_DOLAR_COLOMBIA_URL;

export interface TrmState {
  rate: number;
  date: string; // YYYY-MM-DD
  source: 'manual' | 'page' | 'api';
  updatedAt: number;
}

export function todayIso(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
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
    const result = await chrome.storage.local.get(TRM_SUPLEMENTO_KEY);
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

/**
 * Fetches today's TRM from dolar-colombia.com HTML.
 * Returns null on network / parse failure.
 */
export async function fetchOfficialTrm(): Promise<TrmState | null> {
  try {
    const res = await fetch(TRM_DOLAR_COLOMBIA_URL, {
      method: 'GET',
      headers: { Accept: 'text/html' },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const html = await res.text();
    const parsed = parseDolarColombiaRate(html);
    if (parsed == null || !(parsed > 0) || !Number.isFinite(parsed)) return null;
    return { rate: parsed, date: todayIso(), source: 'api', updatedAt: Date.now() };
  } catch {
    return null;
  }
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
    const raw = m[1].trim();
    // "3,219.31" or "3219.31" or "3.219,31"
    let normalized = raw;
    if (/\d,\d{3}\.\d/.test(raw) || /^\d{1,3}(,\d{3})+(\.\d+)?$/.test(raw)) {
      normalized = raw.replace(/,/g, '');
    } else if (/\d\.\d{3},\d/.test(raw) || /^\d{1,3}(\.\d{3})+(,\d+)?$/.test(raw)) {
      normalized = raw.replace(/\./g, '').replace(',', '.');
    } else {
      normalized = raw.replace(/,/g, '.');
    }
    const rate = parseFloat(normalized);
    if (rate > 100 && rate < 20_000) return rate;
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
  const next = await fetchOfficialTrm();
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
  // Whole USD (no cents) for cart display / quotes.
  return Math.round(cop / trm);
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
