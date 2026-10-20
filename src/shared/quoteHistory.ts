import { CartItem, SearchContext } from '../engine/core/types';
import type { QuoteLine } from './quoteConfig';
import type { HotelCompareOptionGroup } from './quoteOptions';
import type { TaSelection } from './taConfig';

export const HISTORY_KEY = 'tce_quote_history';
/** Mirror of HISTORY_KEY — used to recover if the primary key is empty after an update. */
export const HISTORY_BACKUP_KEY = 'tce_quote_history_backup';
export const QUOTE_SEQ_KEY = 'tce_quote_seq';
export const PENDING_QUOTE_KEY = 'tce_pending_quote';
export const ADVISOR_KEY = 'tce_advisor_name';
export const CLIENT_KEY = 'tce_client_name';
export const INITIAL_DEPOSIT_KEY = 'tce_initial_deposit';
/** When false, PDF omits the insurance coverage annex. Default true. */
export const PDF_INSURANCE_ANNEX_KEY = 'tce_pdf_insurance_annex';
/** Mayorista: incluir total del mix en WhatsApp/PDF (pestaña Acomodación). */
export const OCCUPANCY_TOTAL_OPEN_KEY = 'tce_occupancy_total_open';
/** Mayorista: incluir valor aproximado de comisión en WhatsApp/PDF. */
export const COMMISSION_APPROX_OPEN_KEY = 'tce_commission_approx_open';
/** Mayorista: freelance (10%) | agency (12%). */
export const COMMISSION_APPROX_KIND_KEY = 'tce_commission_approx_kind';
/** Mayorista: el asesor tocó/confirmó el mix en Acomodación (chip verde). */
export const ACCOMMODATION_CONFIRMED_KEY = 'tce_accommodation_confirmed';
export const AGENCY_KEY = 'tce_agency_name';
export const USD_EQUIV_KEY = 'tce_quote_usd_equiv';
/** When true, WhatsApp/PDF show TRM del día (never the suplemento). Default false. */
export const SHOW_TRM_IN_QUOTE_KEY = 'tce_show_trm_in_quote';
/** Mayorista: redondeo …9 automático en tarifas pp SGL/DBL/TPL/CHD. Default true. */
export const AUTO_ROUND_OCCUPANCY_KEY = 'tce_auto_round_occupancy';
/** When auto-round is off: option ids with manual package …9 applied. */
export const MANUAL_PACKAGE_ROUND_IDS_KEY = 'tce_manual_package_round_ids';

export interface HistoryEntry {
  id: string;
  quoteNumber: number;
  advisorName: string;
  /** Client name for the quote (historial only; not WhatsApp). */
  clientName?: string;
  /** Agency label at archive time. */
  agencyName?: string;
  destination?: string;
  searchContext: SearchContext | null;
  /**
   * Frozen cart as searched/priced (hotels keep occupancy, occupancyRates,
   * hotelId, sourceUrl/bookingUrl for reopen in BM).
   */
  items: CartItem[];
  fees: Record<string, number>;
  /** TA × pax at archive time (included in grandTotal when present). */
  taTotal?: number;
  /** TA unit/type so restore matches the quote math. */
  taSelection?: TaSelection;
  /**
   * TRM del día (COP/USD) al archivar. Entradas antiguas podían guardar
   * la TRM efectiva (día + suplemento); al restaurar sin `trmSuplemento`
   * se usa tal cual como tasa del día.
   */
  trm?: number;
  /** Suplemento TRM (COP) al archivar. */
  trmSuplemento?: number;
  /** Texto de depósito inicial (mayorista) al archivar. */
  initialDeposit?: string;
  grandTotal?: number;
  primaryCurrency?: string;
  displayCurrency?: 'COP' | 'USD';
  /** retail | wholesale at archive time. */
  quoteMode?: 'retail' | 'wholesale';
  hotelsAsOptions?: boolean;
  hotelOptionGroups?: HotelCompareOptionGroup[];
  /** Whether “Incluir total en WhatsApp” was checked in Acomodación. */
  occupancyTotalOpen?: boolean;
  /** Whether “Incluir valor aproximado de comisión” was checked. */
  commissionApproxOpen?: boolean;
  /** freelance | agency when commission approx is on. */
  commissionApproxKind?: 'freelance' | 'agency';
  /** Redondeo automático …9 en tarifas pp al archivar. */
  autoRoundOccupancy?: boolean;
  /** Mostrar TRM del día en WA/PDF al archivar. */
  showTrmInQuote?: boolean;
  /** Incluir equivalente USD en cotización al archivar. */
  includeUsdEquiv?: boolean;
  /** Include/exclude/policy lines as configured when archived. */
  quoteLines?: QuoteLine[];
  createdAt: number;
}

/** Deep-clone cart / snapshot payloads so later edits do not mutate history. */
export function freezeHistoryPayload<T>(value: T): T {
  try {
    return JSON.parse(JSON.stringify(value)) as T;
  } catch {
    return value;
  }
}

const MAX_HISTORY = 50;

/** Display ref: CAR001, CAR012, … */
export function formatQuoteRef(n: number): string {
  return `CAR${String(Math.max(0, Math.floor(n))).padStart(3, '0')}`;
}

/** First 2 letters of advisor name (A–Z), e.g. Rodrigo → RO. */
export function advisorInitials(name?: string): string {
  const letters = (name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z]/g, '');
  if (letters.length >= 2) return letters.slice(0, 2).toUpperCase();
  if (letters.length === 1) return `${letters}X`.toUpperCase();
  return 'XX';
}

/** PDF/historial style: RO0001 (initials + quote number). */
export function formatAdvisorQuoteRef(advisorName: string | undefined, n: number): string {
  return `${advisorInitials(advisorName)}${String(Math.max(0, Math.floor(n))).padStart(4, '0')}`;
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

export async function loadInitialDeposit(): Promise<string> {
  try {
    const result = await chrome.storage.local.get(INITIAL_DEPOSIT_KEY);
    const value = result[INITIAL_DEPOSIT_KEY];
    return typeof value === 'string' ? value : '';
  } catch {
    return '';
  }
}

export async function saveInitialDeposit(value: string): Promise<void> {
  try {
    await chrome.storage.local.set({ [INITIAL_DEPOSIT_KEY]: value });
  } catch {
    // ignore
  }
}

export async function loadPdfInsuranceAnnex(): Promise<boolean> {
  try {
    const result = await chrome.storage.local.get(PDF_INSURANCE_ANNEX_KEY);
    if (result[PDF_INSURANCE_ANNEX_KEY] === false) return false;
    return true;
  } catch {
    return true;
  }
}

export async function savePdfInsuranceAnnex(on: boolean): Promise<void> {
  try {
    await chrome.storage.local.set({ [PDF_INSURANCE_ANNEX_KEY]: on });
  } catch {
    // ignore
  }
}

export async function loadOccupancyTotalOpen(): Promise<boolean> {
  try {
    const result = await chrome.storage.local.get(OCCUPANCY_TOTAL_OPEN_KEY);
    return result[OCCUPANCY_TOTAL_OPEN_KEY] === true;
  } catch {
    return false;
  }
}

export async function saveOccupancyTotalOpen(on: boolean): Promise<void> {
  try {
    await chrome.storage.local.set({ [OCCUPANCY_TOTAL_OPEN_KEY]: on });
  } catch {
    // ignore
  }
}

export async function loadCommissionApproxOpen(): Promise<boolean> {
  try {
    const result = await chrome.storage.local.get(COMMISSION_APPROX_OPEN_KEY);
    return result[COMMISSION_APPROX_OPEN_KEY] === true;
  } catch {
    return false;
  }
}

export async function saveCommissionApproxOpen(on: boolean): Promise<void> {
  try {
    await chrome.storage.local.set({ [COMMISSION_APPROX_OPEN_KEY]: on });
  } catch {
    // ignore
  }
}

export async function loadCommissionApproxKind(): Promise<'freelance' | 'agency' | null> {
  try {
    const result = await chrome.storage.local.get(COMMISSION_APPROX_KIND_KEY);
    const raw = result[COMMISSION_APPROX_KIND_KEY];
    if (raw === 'freelance' || raw === 'agency') return raw;
    return null;
  } catch {
    return null;
  }
}

export async function saveCommissionApproxKind(
  kind: 'freelance' | 'agency' | null
): Promise<void> {
  try {
    if (kind == null) {
      await chrome.storage.local.remove(COMMISSION_APPROX_KIND_KEY);
    } else {
      await chrome.storage.local.set({ [COMMISSION_APPROX_KIND_KEY]: kind });
    }
  } catch {
    // ignore
  }
}

export async function loadAccommodationConfirmed(): Promise<boolean> {
  try {
    const result = await chrome.storage.local.get(ACCOMMODATION_CONFIRMED_KEY);
    return result[ACCOMMODATION_CONFIRMED_KEY] === true;
  } catch {
    return false;
  }
}

export async function saveAccommodationConfirmed(on: boolean): Promise<void> {
  try {
    await chrome.storage.local.set({ [ACCOMMODATION_CONFIRMED_KEY]: on });
  } catch {
    // ignore
  }
}

export async function loadAgencyName(): Promise<string> {
  try {
    const result = await chrome.storage.local.get(AGENCY_KEY);
    const name = result[AGENCY_KEY];
    return typeof name === 'string' ? name : '';
  } catch {
    return '';
  }
}

export async function saveAgencyName(name: string): Promise<void> {
  try {
    await chrome.storage.local.set({ [AGENCY_KEY]: name });
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

export async function loadShowTrmInQuote(): Promise<boolean> {
  try {
    const result = await chrome.storage.local.get(SHOW_TRM_IN_QUOTE_KEY);
    return result[SHOW_TRM_IN_QUOTE_KEY] === true;
  } catch {
    return false;
  }
}

export async function saveShowTrmInQuote(on: boolean): Promise<void> {
  try {
    await chrome.storage.local.set({ [SHOW_TRM_IN_QUOTE_KEY]: on });
  } catch {
    // ignore
  }
}

/** Bump to tell BM content scripts to clear red selection marks. */
export const BM_CLEAR_MARKS_KEY = 'tce_bm_clear_marks';

export async function signalBmClearMarks(): Promise<void> {
  try {
    await chrome.storage.local.set({ [BM_CLEAR_MARKS_KEY]: Date.now() });
  } catch {
    // ignore
  }
}

export async function loadAutoRoundOccupancy(): Promise<boolean> {
  try {
    const result = await chrome.storage.local.get(AUTO_ROUND_OCCUPANCY_KEY);
    if (result[AUTO_ROUND_OCCUPANCY_KEY] === false) return false;
    return true;
  } catch {
    return true;
  }
}

export async function saveAutoRoundOccupancy(on: boolean): Promise<void> {
  try {
    await chrome.storage.local.set({ [AUTO_ROUND_OCCUPANCY_KEY]: on });
  } catch {
    // ignore
  }
}

export async function loadManualPackageRoundIds(): Promise<string[]> {
  try {
    const result = await chrome.storage.local.get(MANUAL_PACKAGE_ROUND_IDS_KEY);
    const raw = result[MANUAL_PACKAGE_ROUND_IDS_KEY];
    if (!Array.isArray(raw)) return [];
    return raw.filter((id): id is string => typeof id === 'string' && id.length > 0);
  } catch {
    return [];
  }
}

export async function saveManualPackageRoundIds(ids: string[]): Promise<void> {
  try {
    await chrome.storage.local.set({ [MANUAL_PACKAGE_ROUND_IDS_KEY]: [...new Set(ids)] });
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

function isHistoryArray(value: unknown): value is HistoryEntry[] {
  return Array.isArray(value) && value.every((row) => row && typeof row === 'object');
}

/** Drop huge data-URL images so history stays under chrome.storage quota. */
export function slimHistoryEntry(entry: HistoryEntry): HistoryEntry {
  const items = freezeHistoryPayload(entry.items).map((item) => {
    const row = item as CartItem & { imageUrl?: string };
    if (typeof row.imageUrl === 'string' && row.imageUrl.startsWith('data:')) {
      const { imageUrl: _drop, ...rest } = row;
      return rest as CartItem;
    }
    return item;
  });
  return { ...entry, items };
}

async function writeHistoryKeys(next: HistoryEntry[]): Promise<void> {
  const slimmed = next.map(slimHistoryEntry);
  await chrome.storage.local.set({
    [HISTORY_KEY]: slimmed,
    [HISTORY_BACKUP_KEY]: slimmed,
  });
}

/**
 * Load history. If the primary key is empty but the backup mirror has rows
 * (e.g. after a flaky write), restore primary from backup.
 */
export async function loadHistory(): Promise<HistoryEntry[]> {
  try {
    const result = await chrome.storage.local.get([HISTORY_KEY, HISTORY_BACKUP_KEY]);
    const primary = isHistoryArray(result[HISTORY_KEY])
      ? (result[HISTORY_KEY] as HistoryEntry[])
      : [];
    if (primary.length > 0) return primary;

    const backup = isHistoryArray(result[HISTORY_BACKUP_KEY])
      ? (result[HISTORY_BACKUP_KEY] as HistoryEntry[])
      : [];
    if (backup.length > 0) {
      await chrome.storage.local.set({ [HISTORY_KEY]: backup });
      return backup;
    }
    return [];
  } catch {
    return [];
  }
}

/** After extension update: ensure primary ↔ backup are aligned. */
export async function ensureHistorySurvivedUpdate(): Promise<number> {
  try {
    const list = await loadHistory();
    if (list.length === 0) return 0;
    await writeHistoryKeys(list);
    return list.length;
  } catch {
    return 0;
  }
}

export interface HistoryBuildParams {
  quoteNumber: number;
  advisorName: string;
  clientName?: string;
  agencyName?: string;
  destination?: string;
  searchContext: SearchContext | null;
  items: CartItem[];
  fees: Record<string, number>;
  taTotal?: number;
  taSelection?: TaSelection;
  trm?: number;
  trmSuplemento?: number;
  initialDeposit?: string;
  grandTotal?: number;
  primaryCurrency?: string;
  displayCurrency?: 'COP' | 'USD';
  quoteMode?: 'retail' | 'wholesale';
  hotelsAsOptions?: boolean;
  hotelOptionGroups?: HotelCompareOptionGroup[];
  occupancyTotalOpen?: boolean;
  commissionApproxOpen?: boolean;
  commissionApproxKind?: 'freelance' | 'agency';
  autoRoundOccupancy?: boolean;
  showTrmInQuote?: boolean;
  includeUsdEquiv?: boolean;
  quoteLines?: QuoteLine[];
  createdAt?: number;
}

/** Build a frozen history row (items include occupancyRates + baseline). */
export function buildHistoryEntry(params: HistoryBuildParams): HistoryEntry {
  const n = params.quoteNumber;
  return {
    id: `hist_${n}_${params.createdAt ?? Date.now()}`,
    quoteNumber: n,
    advisorName: params.advisorName,
    clientName: params.clientName,
    agencyName: params.agencyName,
    destination: params.destination,
    searchContext: freezeHistoryPayload(params.searchContext),
    items: freezeHistoryPayload(params.items),
    fees: freezeHistoryPayload({ ...params.fees }),
    taTotal: params.taTotal,
    taSelection: params.taSelection
      ? freezeHistoryPayload(params.taSelection)
      : undefined,
    trm: params.trm,
    trmSuplemento: params.trmSuplemento,
    initialDeposit: params.initialDeposit,
    grandTotal: params.grandTotal,
    primaryCurrency: params.primaryCurrency,
    displayCurrency: params.displayCurrency,
    quoteMode: params.quoteMode,
    hotelsAsOptions: params.hotelsAsOptions,
    hotelOptionGroups: params.hotelOptionGroups
      ? freezeHistoryPayload(params.hotelOptionGroups)
      : undefined,
    occupancyTotalOpen: params.occupancyTotalOpen,
    commissionApproxOpen: params.commissionApproxOpen,
    commissionApproxKind: params.commissionApproxKind,
    autoRoundOccupancy: params.autoRoundOccupancy,
    showTrmInQuote: params.showTrmInQuote,
    includeUsdEquiv: params.includeUsdEquiv,
    quoteLines: params.quoteLines ? freezeHistoryPayload(params.quoteLines) : undefined,
    createdAt: params.createdAt ?? Date.now(),
  };
}

/** Upsert draft; keeps original createdAt when updating the same CAR###. */
export async function upsertHistoryDraft(params: HistoryBuildParams): Promise<void> {
  if (params.items.length === 0) return;
  const prev = await loadHistory();
  const existing = prev.find((h) => h.quoteNumber === params.quoteNumber);
  await upsertHistory(
    buildHistoryEntry({
      ...params,
      createdAt: existing?.createdAt ?? params.createdAt ?? Date.now(),
    })
  );
}

const historyDraftTimers = new Map<number, ReturnType<typeof setTimeout>>();

/** Debounced autosave of the active quote into historial (recover mid-session). */
export function scheduleHistoryDraft(
  params: HistoryBuildParams,
  debounceMs = 2000
): void {
  if (params.items.length === 0) return;
  const n = params.quoteNumber;
  const prev = historyDraftTimers.get(n);
  if (prev !== undefined) clearTimeout(prev);
  historyDraftTimers.set(
    n,
    setTimeout(() => {
      historyDraftTimers.delete(n);
      void upsertHistoryDraft(params);
    }, debounceMs)
  );
}

/** Insert or replace by quoteNumber (keeps one entry per CAR###). */
export async function upsertHistory(entry: HistoryEntry): Promise<void> {
  try {
    const prev = await loadHistory();
    const without = prev.filter((h) => h.quoteNumber !== entry.quoteNumber);
    const next = [slimHistoryEntry(entry), ...without].slice(0, MAX_HISTORY);
    await writeHistoryKeys(next);
  } catch (err) {
    console.error('[TCE] upsertHistory failed (quota o storage)', err);
  }
}

export async function prependHistory(entry: HistoryEntry): Promise<void> {
  await upsertHistory(entry);
}

export async function clearHistory(): Promise<void> {
  try {
    await chrome.storage.local.remove([HISTORY_KEY, HISTORY_BACKUP_KEY]);
  } catch {
    // ignore
  }
}

export interface HistoryExportPayload {
  version: 1;
  exportedAt: string;
  entries: HistoryEntry[];
}

/** JSON backup for download (survives Remove + Load unpacked). */
export function exportHistoryJson(entries: HistoryEntry[]): string {
  const payload: HistoryExportPayload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    entries: entries.map(slimHistoryEntry),
  };
  return JSON.stringify(payload, null, 2);
}

/** Merge imported entries by quoteNumber (imported wins on conflict). */
export async function importHistoryJson(raw: string): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  try {
    const parsed = JSON.parse(raw) as unknown;
    let rows: unknown[] = [];
    if (Array.isArray(parsed)) {
      rows = parsed;
    } else if (parsed && typeof parsed === 'object' && Array.isArray((parsed as HistoryExportPayload).entries)) {
      rows = (parsed as HistoryExportPayload).entries;
    } else {
      return { ok: false, error: 'JSON inválido: se esperaba { entries: [...] } o un array.' };
    }
    if (!isHistoryArray(rows)) {
      return { ok: false, error: 'Las entradas del historial no tienen el formato esperado.' };
    }
    const incoming = (rows as HistoryEntry[])
      .filter((h) => typeof h.quoteNumber === 'number' && Array.isArray(h.items))
      .map(slimHistoryEntry);
    if (incoming.length === 0) {
      return { ok: false, error: 'No hay cotizaciones válidas en el archivo.' };
    }
    const prev = await loadHistory();
    const byNum = new Map<number, HistoryEntry>();
    for (const h of prev) byNum.set(h.quoteNumber, h);
    for (const h of incoming) byNum.set(h.quoteNumber, h);
    const next = [...byNum.values()]
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      .slice(0, MAX_HISTORY);
    await writeHistoryKeys(next);

    const maxQuote = next.reduce((m, h) => Math.max(m, h.quoteNumber || 0), 0);
    if (maxQuote > 0) {
      const seq = await chrome.storage.local.get(QUOTE_SEQ_KEY);
      const current = typeof seq[QUOTE_SEQ_KEY] === 'number' ? seq[QUOTE_SEQ_KEY] : 0;
      if (maxQuote > current) {
        await chrome.storage.local.set({ [QUOTE_SEQ_KEY]: maxQuote });
      }
    }
    return { ok: true, count: incoming.length };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Trigger a browser download of the history JSON. */
export function downloadHistoryBackup(entries: HistoryEntry[], filename?: string): void {
  const blob = new Blob([exportHistoryJson(entries)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download =
    filename ||
    `carrito-gt-historial-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
