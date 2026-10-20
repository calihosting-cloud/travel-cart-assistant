/** Cotización minorista (total ÷ pax) vs mayorista (DBL / TPL / CHD). */

export const QUOTE_MODE_KEY = 'tce_quote_mode';

export type QuoteMode = 'retail' | 'wholesale';

/** Default for new installs / unset key. */
export const DEFAULT_QUOTE_MODE: QuoteMode = 'wholesale';

export function normalizeQuoteMode(raw: unknown): QuoteMode {
  if (raw === 'retail') return 'retail';
  if (raw === 'wholesale') return 'wholesale';
  return DEFAULT_QUOTE_MODE;
}

export async function loadQuoteMode(): Promise<QuoteMode> {
  try {
    const result = await chrome.storage.local.get(QUOTE_MODE_KEY);
    if (!(QUOTE_MODE_KEY in result) || result[QUOTE_MODE_KEY] == null || result[QUOTE_MODE_KEY] === '') {
      await chrome.storage.local.set({ [QUOTE_MODE_KEY]: DEFAULT_QUOTE_MODE });
      return DEFAULT_QUOTE_MODE;
    }
    return normalizeQuoteMode(result[QUOTE_MODE_KEY]);
  } catch {
    return DEFAULT_QUOTE_MODE;
  }
}

export async function saveQuoteMode(mode: QuoteMode): Promise<void> {
  try {
    await chrome.storage.local.set({ [QUOTE_MODE_KEY]: mode });
  } catch {
    // storage unavailable
  }
}
