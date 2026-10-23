/** Chat Center CRM — oportunidades de venta (Grupos Travel). */

import {
  carApiConfigured,
  listBoardQuotes,
  type BoardQuoteLabel,
} from './carApi';
import {
  formatQuoteRef,
  loadHistory,
  loadPendingQuoteNumber,
  peekNextQuoteNumber,
} from './quoteHistory';

export const CHAT_CENTER_ORIGIN = 'https://chatcrm.grupostravel.com';
export const CHAT_CENTER_OPORTUNIDADES_URL = `${CHAT_CENTER_ORIGIN}/oportunidades`;
export const CHAT_CENTER_CONVERSACIONES_URL = `${CHAT_CENTER_ORIGIN}/conversaciones`;
export const CHAT_CENTER_HOST = 'chatcrm.grupostravel.com';

/** BookingMotor / Isabela — backoffice (Conversaciones → Abrir Isabela). */
export const ISABELA_BACKOFFICE_URL = 'https://reservas.grupostravel.com/es/backoffice';

export const OPEN_ISABELA_BTN_CLASS = 'tce-open-isabela';
export const CAR_QUOTE_REF_CLASS = 'tce-car-quote-ref';
export const OP_CARD_QUOTE_LABEL_CLASS = 'tce-op-card-quote';
export const OP_COLUMN_TOTAL_CLASS = 'tce-op-col-total';
export const OP_KPI_TOTAL_CLASS = 'tce-op-kpi-total';
export const OP_MODAL_AMOUNT_CLASS = 'tce-op-modal-amount';

/** Soft fuchsia for Abrir Isabela buttons. */
const ISABELA_BTN_BG = '#e879a9';
const ISABELA_BTN_BG_HOVER = '#db2777';
const ISABELA_BTN_BORDER = '#f9a8d4';

/** Vertical position of the blue Asistente tab (0–100, % of viewport). */
export const TAB_TOP_PCT_KEY = 'tce_tab_top_pct';
const DEFAULT_TAB_TOP_PCT = 50;

export function isChatCenterHost(hostname: string = location.hostname): boolean {
  return hostname === CHAT_CENTER_HOST || hostname.endsWith(`.${CHAT_CENTER_HOST}`);
}

export async function loadTabTopPct(): Promise<number> {
  try {
    const result = await chrome.storage.local.get(TAB_TOP_PCT_KEY);
    const n = Number(result[TAB_TOP_PCT_KEY]);
    if (Number.isFinite(n) && n >= 8 && n <= 92) return n;
  } catch {
    // ignore
  }
  return DEFAULT_TAB_TOP_PCT;
}

export async function saveTabTopPct(pct: number): Promise<void> {
  const clamped = Math.min(92, Math.max(8, Math.round(pct)));
  try {
    await chrome.storage.local.set({ [TAB_TOP_PCT_KEY]: clamped });
  } catch {
    // ignore
  }
}

/** Read contact name from an open opportunity modal (or card). */
export function readChatCenterContact(doc: Document = document): string | null {
  const modal = doc.querySelector('.op-modal');
  if (modal) {
    const nodes = Array.from(modal.querySelectorAll('div'));
    for (let i = 0; i < nodes.length; i++) {
      const label = (nodes[i].textContent || '').replace(/\s+/g, ' ').trim();
      if (!/^Contacto$/i.test(label)) continue;
      const nameEl = nodes[i + 1];
      const name = (nameEl?.textContent || '').replace(/\s+/g, ' ').trim();
      if (
        name &&
        name.length >= 2 &&
        name.length < 120 &&
        !/^Contacto$/i.test(name) &&
        !/^\d{8,}$/.test(name)
      ) {
        return name;
      }
    }
  }

  // Fallback: client line on first opportunity card (under "Cotización #N")
  const card = doc.querySelector('.op-card');
  if (card) {
    for (const el of Array.from(card.children)) {
      const line = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (!line) continue;
      if (/Cotización\s*#/i.test(line) || /^📋/.test(line)) continue;
      if (/^\d{8,}$/.test(line) || /^👤/.test(line)) continue;
      if (line.length >= 2 && line.length < 100 && /[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(line)) {
        return line;
      }
    }
  }
  return null;
}

/** Quote textarea in the opportunity modal (not the chat composer). */
export function findOpportunityQuoteTextarea(
  doc: Document = document
): HTMLTextAreaElement | null {
  const modal = doc.querySelector('.op-modal');
  const candidates = Array.from(
    (modal || doc).querySelectorAll('textarea')
  ) as HTMLTextAreaElement[];

  const isChatComposer = (ta: HTMLTextAreaElement) =>
    /escribe un mensaje/i.test(ta.placeholder || '');

  const preferred = candidates.find((ta) => {
    if (isChatComposer(ta)) return false;
    const p = (ta.placeholder || '').toLowerCase();
    return /oportunidad|cotizaci[oó]n|respuesta/.test(p);
  });
  if (preferred) return preferred;

  const inModal = candidates.find((ta) => modal?.contains(ta) && !isChatComposer(ta));
  if (inModal) return inModal;

  return (
    (doc.querySelector(
      'textarea[placeholder*="oportunidad" i], textarea[placeholder*="cotización" i], textarea[placeholder*="cotizacion" i], textarea[placeholder*="respuesta" i]'
    ) as HTMLTextAreaElement | null) || null
  );
}

/** Paste quote text into the opportunity “Respuesta al cliente” textarea (React-friendly). */
export function pasteQuoteIntoChatCenter(
  text: string,
  doc: Document = document
): { ok: boolean; contact: string | null; error?: string } {
  const ta = findOpportunityQuoteTextarea(doc);

  if (!ta) {
    return {
      ok: false,
      contact: readChatCenterContact(doc),
      error:
        'Abre una oportunidad en Chat Center (ventana con “Respuesta al cliente” / Cotización).',
    };
  }

  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
  if (setter) setter.call(ta, text);
  else ta.value = text;

  ta.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertFromPaste' }));
  ta.dispatchEvent(new Event('change', { bubbles: true }));
  ta.focus();
  try {
    ta.setSelectionRange(ta.value.length, ta.value.length);
  } catch {
    // ignore
  }

  return { ok: true, contact: readChatCenterContact(doc) };
}

function openIsabelaTab(): void {
  try {
    void chrome.runtime.sendMessage({ type: 'TCE_OPEN_ISABELA' });
  } catch {
    window.open(ISABELA_BACKOFFICE_URL, '_blank', 'noopener,noreferrer');
  }
}

function isabelaButtonStyle(compact: boolean): string {
  return [
    'flex-shrink:0',
    compact ? 'padding:2px 8px' : 'padding:6px 12px',
    'border-radius:99px',
    `border:1px solid ${ISABELA_BTN_BORDER}`,
    `background:${ISABELA_BTN_BG}`,
    'color:#fff',
    compact ? 'font-size:10px' : 'font-size:12px',
    'font-weight:700',
    'font-family:inherit',
    'cursor:pointer',
    'letter-spacing:0.02em',
    'line-height:1.2',
    'white-space:nowrap',
    'box-shadow:0 1px 3px rgba(219,39,119,0.25)',
  ].join(';');
}

function makeIsabelaButton(
  doc: Document,
  variant: 'badge' | 'modal' | 'chat',
  label = 'Abrir Isabela'
): HTMLButtonElement {
  const btn = doc.createElement('button');
  btn.type = 'button';
  btn.className = `${OPEN_ISABELA_BTN_CLASS} ${OPEN_ISABELA_BTN_CLASS}--${variant}`;
  btn.textContent = label;
  btn.title = 'Abrir Isabela (reservas.grupostravel.com/es/backoffice)';
  btn.style.cssText = isabelaButtonStyle(variant === 'badge');
  btn.addEventListener('mouseenter', () => {
    btn.style.background = ISABELA_BTN_BG_HOVER;
  });
  btn.addEventListener('mouseleave', () => {
    btn.style.background = ISABELA_BTN_BG;
  });
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    openIsabelaTab();
  });
  return btn;
}

/** Title node: “Oportunidad de venta #N” inside the modal header. */
function findOpportunityTitle(modal: Element): HTMLElement | null {
  const nodes = Array.from(modal.querySelectorAll('div')) as HTMLElement[];
  for (const el of nodes) {
    const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
    if (!/^(📋\s*)?(Oportunidad de venta|Cotización)\s*#\d+/i.test(text)) continue;
    if (text.length > 80) continue;
    if (el.querySelector(`.${OPEN_ISABELA_BTN_CLASS}`)) continue;
    if (el.querySelector(`.${CAR_QUOTE_REF_CLASS}`)) continue;
    return el;
  }
  return null;
}

function findRespuestaAlClienteLabel(modal: Element): HTMLElement | null {
  const nodes = Array.from(modal.querySelectorAll('div')) as HTMLElement[];
  for (const el of nodes) {
    if (el.querySelector(`.${OPEN_ISABELA_BTN_CLASS}`)) continue;
    const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
    if (!/^Respuesta al cliente$/i.test(text)) continue;
    if (el.children.length > 0) continue;
    return el;
  }
  return null;
}

/** Yellow/teal chat badges: “Oportunidad de venta #N” — Isabela on the right. */
function injectIsabelaOnOpportunityBadges(doc: Document): void {
  const nodes = Array.from(doc.querySelectorAll('div')) as HTMLElement[];
  for (const el of nodes) {
    if (el.closest('.op-modal')) continue;
    if (el.querySelector(`.${OPEN_ISABELA_BTN_CLASS}--badge`)) continue;
    const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
    if (!/^(📋|🧾)?\s*Oportunidad de venta( enviada)? #\d+/i.test(text)) continue;
    if (text.length > 90) continue;
    // Badge-like absolute pills only
    const pos = (el.style.position || '').toLowerCase();
    if (pos !== 'absolute' && !/absolute/.test(getComputedStyle(el).position)) continue;

    el.style.display = 'inline-flex';
    el.style.alignItems = 'center';
    el.style.gap = '6px';
    el.appendChild(makeIsabelaButton(doc, 'badge', 'Isabela'));
  }
}

function formatMoneyLabel(amount: number, currency: string): string {
  const cur = (currency || 'COP').toUpperCase();
  try {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: cur === 'USD' ? 'USD' : 'COP',
      maximumFractionDigits: cur === 'USD' ? 2 : 0,
    }).format(amount);
  } catch {
    return `${Math.round(amount).toLocaleString('es-CO')} ${cur}`;
  }
}

function digitsOnly(s: string): string {
  return (s || '').replace(/\D/g, '');
}

async function resolveActiveQuoteLabel(): Promise<{
  ref: string;
  amountText: string | null;
} | null> {
  let n = await loadPendingQuoteNumber();
  if (!n || n < 1) n = await peekNextQuoteNumber();
  if (!n || n < 1) return null;
  const history = await loadHistory();
  const entry = history.find((h) => h.quoteNumber === n);
  let amountText: string | null = null;
  if (entry) {
    const hasAcc =
      Boolean(entry.searchContext?.roomPlan && entry.searchContext.roomPlan.length > 0) ||
      Boolean(entry.hotelOptionGroups && entry.hotelOptionGroups.length > 0) ||
      entry.items.some(
        (it) =>
          it.type === 'hotel' &&
          ((it as { occupancyRates?: unknown }).occupancyRates ||
            (Array.isArray((it as { occupancy?: unknown[] }).occupancy) &&
              ((it as { occupancy?: unknown[] }).occupancy?.length || 0) > 0))
      );
    if (hasAcc && typeof entry.grandTotal === 'number' && entry.grandTotal > 0) {
      amountText = formatMoneyLabel(
        entry.grandTotal,
        entry.displayCurrency || entry.primaryCurrency || 'COP'
      );
    }
  }
  return { ref: formatQuoteRef(n), amountText };
}

/** CAR# to the right of “Oportunidad de venta #N” / “Cotización #N”; amount below if any. */
async function injectCarQuoteRefNearTitle(modal: Element, doc: Document): Promise<void> {
  if (modal.querySelector(`.${CAR_QUOTE_REF_CLASS}`)) {
    // refresh amount under stage if needed
    return;
  }
  const title = findOpportunityTitle(modal);
  if (!title?.parentElement) return;

  const active = await resolveActiveQuoteLabel();
  if (!active) return;

  const span = doc.createElement('span');
  span.className = CAR_QUOTE_REF_CLASS;
  span.textContent = active.ref;
  span.title = 'Nº de cotización del carrito (local / car_cotizacion)';
  span.style.cssText = [
    'display:inline-flex',
    'align-items:center',
    'margin-left:auto',
    'padding:3px 10px',
    'border-radius:99px',
    'background:#fdf2f8',
    'border:1px solid #fbcfe8',
    'color:#9d174d',
    'font-size:12px',
    'font-weight:700',
    'white-space:nowrap',
    'flex-shrink:0',
  ].join(';');

  const row = doc.createElement('div');
  row.className = 'tce-op-title-row';
  row.style.cssText =
    'display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;min-width:0;width:100%;';
  title.parentElement.insertBefore(row, title);
  row.appendChild(title);
  row.appendChild(span);

  if (active.amountText && !modal.querySelector(`.${OP_MODAL_AMOUNT_CLASS}`)) {
    const amount = doc.createElement('div');
    amount.className = OP_MODAL_AMOUNT_CLASS;
    amount.textContent = active.amountText;
    amount.title = 'Total de cotización (con acomodación)';
    amount.style.cssText = [
      'margin-top:6px',
      'font-size:20px',
      'font-weight:800',
      'color:#1a1a2e',
      'letter-spacing:-0.02em',
      'line-height:1.2',
    ].join(';');
    row.parentElement?.insertBefore(amount, row.nextSibling);
  }
}

function matchBoardLabel(
  labels: BoardQuoteLabel[],
  phone: string,
  seq: number | null
): BoardQuoteLabel | undefined {
  const phoneDig = digitsOnly(phone);
  const phoneHits = labels.filter((l) => {
    const lp = digitsOnly(l.contact_phone || '');
    if (!phoneDig || !lp) return false;
    return phoneDig.endsWith(lp) || lp.endsWith(phoneDig) || phoneDig.includes(lp) || lp.includes(phoneDig);
  });
  if (seq != null) {
    const bySeq = phoneHits.find((l) => l.sequence_number === seq) ||
      labels.find((l) => l.sequence_number === seq && (!phoneDig || digitsOnly(l.contact_phone || '').includes(phoneDig.slice(-8))));
    if (bySeq) return bySeq;
  }
  return phoneHits.find((l) => l.numero_car_ref) || phoneHits[0];
}

function makeCardQuoteLabel(doc: Document, label: BoardQuoteLabel): HTMLElement {
  const wrap = doc.createElement('div');
  wrap.className = OP_CARD_QUOTE_LABEL_CLASS;
  wrap.style.cssText =
    'display:flex;flex-direction:column;align-items:flex-end;gap:2px;margin-left:auto;text-align:right;';
  const ref = doc.createElement('span');
  ref.style.cssText =
    'font-size:11px;font-weight:800;color:#9d174d;background:#fdf2f8;border:1px solid #fbcfe8;border-radius:99px;padding:2px 8px;white-space:nowrap;';
  const car = label.numero_car_ref || (label.numero_car ? formatQuoteRef(label.numero_car) : '');
  ref.textContent = car ? `Cotización N.° ${car.replace(/^CAR/i, '')}` : 'Sin CAR';
  if (!car) ref.style.opacity = '0.55';
  wrap.appendChild(ref);
  if (
    label.has_accommodation &&
    typeof label.quote_total === 'number' &&
    label.quote_total > 0
  ) {
    const amt = doc.createElement('span');
    amt.style.cssText = 'font-size:13px;font-weight:800;color:#1a1a2e;line-height:1.15;';
    amt.textContent = formatMoneyLabel(label.quote_total, label.quote_currency || 'COP');
    wrap.appendChild(amt);
  }
  return wrap;
}

/** Per-card label + column totals + KPI “Cotización Enviada” total. */
async function injectBoardQuoteLabels(doc: Document): Promise<void> {
  if (!/\/oportunidades/i.test(location.pathname || '')) return;
  if (!(await carApiConfigured())) return;

  const res = await listBoardQuotes(250);
  if (!res.ok || !res.data.items.length) return;
  const labels = res.data.items;

  const cards = Array.from(doc.querySelectorAll('.op-card')) as HTMLElement[];
  const columnSums = new Map<string, { total: number; currency: string; count: number }>();

  for (const card of cards) {
    if (card.querySelector(`.${OP_CARD_QUOTE_LABEL_CLASS}`)) continue;
    const text = (card.textContent || '').replace(/\s+/g, ' ');
    const seqMatch = text.match(/Cotizaci[oó]n\s*#\s*(\d+)/i);
    const seq = seqMatch ? Number(seqMatch[1]) : null;
    const phoneEl = Array.from(card.querySelectorAll('div')).find((el) => {
      const t = (el.textContent || '').trim();
      return /^\d{8,15}$/.test(t) && el.children.length === 0;
    });
    const phone = phoneEl ? phoneEl.textContent!.trim() : '';
    const label = matchBoardLabel(labels, phone, Number.isFinite(seq) ? seq : null);
    if (!label?.numero_car_ref && !label?.numero_car) continue;

    const header = card.firstElementChild as HTMLElement | null;
    if (header && /justify-content:\s*space-between/i.test(header.getAttribute('style') || '')) {
      header.appendChild(makeCardQuoteLabel(doc, label));
    } else {
      const row = doc.createElement('div');
      row.style.cssText =
        'display:flex;align-items:flex-start;justify-content:flex-end;margin-bottom:6px;';
      row.appendChild(makeCardQuoteLabel(doc, label));
      card.insertBefore(row, card.firstChild);
    }

    const stage =
      label.stage_code ||
      (card.closest('[style*="min-height"]')?.querySelector('span')?.textContent || '');
    // Sum by nearest column title text
    const col = card.parentElement?.parentElement;
    const colTitle =
      col?.querySelector('span[style*="font-weight: 700"], span[style*="font-weight:700"]')
        ?.textContent ||
      col?.firstElementChild?.textContent ||
      '';
    const key = (colTitle || String(stage)).replace(/\s+/g, ' ').trim();
    if (
      label.has_accommodation &&
      typeof label.quote_total === 'number' &&
      label.quote_total > 0
    ) {
      const cur = (label.quote_currency || 'COP').toUpperCase();
      const prev = columnSums.get(key) || { total: 0, currency: cur, count: 0 };
      // Only sum same currency; prefer COP if mixed
      if (prev.count === 0 || prev.currency === cur) {
        columnSums.set(key, {
          total: prev.total + label.quote_total,
          currency: cur,
          count: prev.count + 1,
        });
      }
    }
  }

  // Column header: amount to the right of the count badge
  const colRoots = Array.from(
    doc.querySelectorAll('main div[style*="min-height"]')
  ) as HTMLElement[];
  for (const col of colRoots) {
    if (col.querySelector(`.${OP_COLUMN_TOTAL_CLASS}`)) continue;
    const head = col.firstElementChild as HTMLElement | null;
    if (!head) continue;
    const title = (head.textContent || '').replace(/\s+/g, ' ').trim();
    let sum = columnSums.get(title);
    if (!sum) {
      for (const [k, v] of columnSums) {
        if (title.includes(k.slice(0, 12)) || k.includes(title.slice(0, 12))) {
          sum = v;
          break;
        }
      }
    }
    if (!sum || sum.count < 1) continue;
    const badge = Array.from(head.querySelectorAll('span')).find((s) =>
      /^\d+$/.test((s.textContent || '').trim())
    );
    const el = doc.createElement('span');
    el.className = OP_COLUMN_TOTAL_CLASS;
    el.textContent = formatMoneyLabel(sum.total, sum.currency);
    el.title = 'Suma de cotizaciones con acomodación en esta columna';
    el.style.cssText =
      'margin-left:8px;font-size:12px;font-weight:800;color:#1a1a2e;white-space:nowrap;';
    if (badge?.parentElement) badge.parentElement.insertBefore(el, badge.nextSibling);
    else head.appendChild(el);
  }

  // Top KPI cards: under “Cotización Enviada”, large total
  const kpiCards = Array.from(
    doc.querySelectorAll('main > div > div[style*="grid-template-columns"] > div')
  ) as HTMLElement[];
  for (const kpi of kpiCards) {
    if (kpi.querySelector(`.${OP_KPI_TOTAL_CLASS}`)) continue;
    const labelText = (kpi.textContent || '').replace(/\s+/g, ' ');
    if (!/Cotizaci[oó]n\s+Enviada/i.test(labelText)) continue;
    let enviadaSum = 0;
    let currency = 'COP';
    for (const l of labels) {
      if (l.stage_code !== 'cotizacion_enviada') continue;
      if (!l.has_accommodation || !(typeof l.quote_total === 'number') || l.quote_total <= 0) {
        continue;
      }
      const cur = (l.quote_currency || 'COP').toUpperCase();
      if (enviadaSum === 0) currency = cur;
      if (cur === currency) enviadaSum += l.quote_total;
    }
    if (enviadaSum <= 0) continue;
    const amount = doc.createElement('div');
    amount.className = OP_KPI_TOTAL_CLASS;
    amount.textContent = formatMoneyLabel(enviadaSum, currency);
    amount.style.cssText =
      'margin-top:4px;font-size:18px;font-weight:800;color:#1a1a2e;letter-spacing:-0.02em;';
    const valueBox = kpi.querySelector('div[style*="min-width"]') || kpi;
    valueBox.appendChild(amount);
  }
}

/**
 * Modal: Abrir Isabela to the right of “Respuesta al cliente”.
 * Also show CAR# next to “Oportunidad de venta #N”.
 */
function injectIsabelaInOpportunityModal(doc: Document): void {
  const modal = doc.querySelector('.op-modal');
  if (!modal) return;

  // Drop legacy placements (above title / mensajes) — keep only respuesta row.
  modal.querySelectorAll(`.${OPEN_ISABELA_BTN_CLASS}--modal`).forEach((btn) => {
    if (btn.closest('.tce-op-respuesta-row')) return;
    const row = btn.closest('.tce-op-title-row, .tce-op-mensajes-row');
    if (row) {
      for (const child of Array.from(row.children)) {
        if (child === btn) continue;
        row.parentElement?.insertBefore(child, row);
      }
      row.remove();
    } else {
      btn.remove();
    }
  });

  void injectCarQuoteRefNearTitle(modal, doc);

  if (modal.querySelector(`.${OPEN_ISABELA_BTN_CLASS}--modal`)) return;

  const label = findRespuestaAlClienteLabel(modal);
  if (!label?.parentElement) return;

  const row = doc.createElement('div');
  row.className = 'tce-op-respuesta-row';
  row.style.cssText =
    'display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px;flex-wrap:wrap;';
  label.style.marginBottom = '0';
  label.style.flex = '1 1 auto';
  label.parentElement.insertBefore(row, label);
  row.appendChild(label);
  row.appendChild(makeIsabelaButton(doc, 'modal'));
}

/** Conversaciones chat header (optional quick access). */
function injectIsabelaInChatHeader(doc: Document): void {
  if (!/\/conversaciones/i.test(location.pathname || '')) return;
  if (doc.querySelector(`.${OPEN_ISABELA_BTN_CLASS}--chat`)) return;

  const verInfo = Array.from(doc.querySelectorAll('span')).find((s) =>
    /▸\s*ver info/i.test((s.textContent || '').trim())
  );
  if (!verInfo) return;

  const nameRow = verInfo.parentElement;
  const nameBlock = nameRow?.parentElement;
  const headerRow = nameBlock?.parentElement;
  if (!headerRow) {
    nameRow?.appendChild(makeIsabelaButton(doc, 'chat'));
    return;
  }

  const actions = Array.from(headerRow.children).find(
    (el) => el !== nameBlock && el instanceof HTMLElement
  ) as HTMLElement | undefined;

  const btn = makeIsabelaButton(doc, 'chat');
  if (actions) actions.insertBefore(btn, actions.firstChild);
  else headerRow.appendChild(btn);
}

/** Inject Abrir Isabela on Conversaciones (+ opportunity modal when open). */
export function injectOpenIsabelaButton(doc: Document = document): void {
  injectIsabelaOnOpportunityBadges(doc);
  injectIsabelaInChatHeader(doc);
  injectIsabelaInOpportunityModal(doc);
  void injectBoardQuoteLabels(doc);
}
