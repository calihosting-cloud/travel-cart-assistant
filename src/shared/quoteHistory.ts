import { CartItem, SearchContext } from '../engine/core/types';

export const HISTORY_KEY = 'tce_quote_history';
export const QUOTE_SEQ_KEY = 'tce_quote_seq';
export const PENDING_QUOTE_KEY = 'tce_pending_quote';
export const ADVISOR_KEY = 'tce_advisor_name';
export const CLIENT_KEY = 'tce_client_name';
export const USD_EQUIV_KEY = 'tce_quote_usd_equiv';

export interface HistoryEntry {
  id: string;
  quoteNumber: number;
  advisorName: string;
  /** Client name for the quote (historial only; not WhatsApp). */
  clientName?: string;
  destination?: string;
  searchContext: SearchContext | null;
  items: CartItem[];
  fees: Record<string, number>;
  /** TA × pax at archive time (included in grandTotal). */
  taTotal?: number;
  trm?: number;
  grandTotal?: number;
  primaryCurrency?: string;
  createdAt: number;
}

const MAX_HISTORY = 50;

/** Display ref: CAR001, CAR012, … */
export function formatQuoteRef(n: number): string {
  return `CAR${String(Math.max(0, Math.floor(n))).padStart(3, '0')}`;
}

/** Next number that would be used — does not advance the sequence. */
export async function peekNextQuoteNumber(): Promise<number> {
  try {
    const result = await chrome.storage.local.get(QUOTE_SEQ_KEY);
    const current = typeof result[QUOTE_SEQ_KEY] === 'number' ? result[QUOTE_SEQ_KEY] : 0;
    return current + 1;
  } catch {
    return 1;
  }
}

/**
 * Ensures `tce_quote_seq` is at least `n` (call when archiving a peeked number).
 */
export async function commitQuoteNumber(n: number): Promise<void> {
  if (!(n > 0)) return;
  try {
    const result = await chrome.storage.local.get(QUOTE_SEQ_KEY);
    const current = typeof result[QUOTE_SEQ_KEY] === 'number' ? result[QUOTE_SEQ_KEY] : 0;
    if (n > current) {
      await chrome.storage.local.set({ [QUOTE_SEQ_KEY]: n });
    }
  } catch {
    // ignore
  }
}

/** @deprecated Prefer peek + commit; kept for callers that still allocate eagerly. */
export async function nextQuoteNumber(): Promise<number> {
  const next = await peekNextQuoteNumber();
  await commitQuoteNumber(next);
  return next;
}

export async function loadPendingQuoteNumber(): Promise<number | null> {
  try {
    const result = await chrome.storage.local.get(PENDING_QUOTE_KEY);
    const n = result[PENDING_QUOTE_KEY];
    return typeof n === 'number' && n > 0 ? n : null;
  } catch {
    return null;
  }
}

export async function savePendingQuoteNumber(n: number | null): Promise<void> {
  try {
    if (n === null) {
      await chrome.storage.local.remove(PENDING_QUOTE_KEY);
    } else {
      await chrome.storage.local.set({ [PENDING_QUOTE_KEY]: n });
    }
  } catch {
    // ignore
  }
}

export async function loadAdvisorName(): Promise<string> {
  try {
    const result = await chrome.storage.local.get(ADVISOR_KEY);
    const name = result[ADVISOR_KEY];
    return typeof name === 'string' ? name : '';
  } catch {
    return '';
  }
}

export async function saveAdvisorName(name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) return;
  try {
    await chrome.storage.local.set({ [ADVISOR_KEY]: trimmed });
  } catch {
    // ignore
  }
}

export async function loadClientName(): Promise<string> {
  try {
    const result = await chrome.storage.local.get(CLIENT_KEY);
    const name = result[CLIENT_KEY];
    return typeof name === 'string' ? name : '';
  } catch {
    return '';
  }
}

export async function saveClientName(name: string): Promise<void> {
  try {
    await chrome.storage.local.set({ [CLIENT_KEY]: name });
  } catch {
    // ignore
  }
}

export async function loadIncludeUsdEquiv(): Promise<boolean> {
  try {
    const result = await chrome.storage.local.get(USD_EQUIV_KEY);
    return result[USD_EQUIV_KEY] === true;
  } catch {
    return false;
  }
}

export async function saveIncludeUsdEquiv(on: boolean): Promise<void> {
  try {
    await chrome.storage.local.set({ [USD_EQUIV_KEY]: on });
  } catch {
    // ignore
  }
}

/** Read advisor display name from BookingMotor chrome UI. */
export function readAdvisorNameFromDom(doc: Document): string {
  const profile = doc.querySelector('.profile-info .flex-grow-1, .menu-profile-info .flex-grow-1');
  const fromProfile = profile?.textContent?.replace(/\s+/g, ' ').trim();
  if (fromProfile) return fromProfile;

  const nav = doc.querySelector('.navbar-user .navbar-link');
  const fromNav = nav?.textContent?.replace(/\s+/g, ' ').trim();
  if (fromNav && fromNav.length < 40) return fromNav;

  return '';
}

export async function loadHistory(): Promise<HistoryEntry[]> {
  try {
    const result = await chrome.storage.local.get(HISTORY_KEY);
    return Array.isArray(result[HISTORY_KEY])
      ? (result[HISTORY_KEY] as HistoryEntry[])
      : [];
  } catch {
    return [];
  }
}

/** Insert or replace by quoteNumber (keeps one entry per CAR###). */
export async function upsertHistory(entry: HistoryEntry): Promise<void> {
  try {
    const prev = await loadHistory();
    const without = prev.filter((h) => h.quoteNumber !== entry.quoteNumber);
    const next = [entry, ...without].slice(0, MAX_HISTORY);
    await chrome.storage.local.set({ [HISTORY_KEY]: next });
  } catch {
    // ignore
  }
}

export async function prependHistory(entry: HistoryEntry): Promise<void> {
  await upsertHistory(entry);
}

export async function clearHistory(): Promise<void> {
  try {
    await chrome.storage.local.remove(HISTORY_KEY);
  } catch {
    // ignore
  }
}
