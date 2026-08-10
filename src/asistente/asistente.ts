import type { CartItem, FlightCartItem, HotelCartItem, SearchContext } from '../engine/core/types';
import { buildWhatsAppQuote } from '../ui/QuoteBuilder';
import {
  FEE_DEFINITIONS,
  MAYOR_VALOR_ID,
  REDONDEO_ID,
  applyTaType,
  compareOptionTotals,
  computeRoundingExcessCop,
  copAmountToDisplay,
  defaultFees,
  displayAmountToCop,
  formatCartPrice,
  getEffectiveTrm,
  getFeesTotalDisplay,
  getItemBasePrice,
  getItemLineTotal,
  getItemNativePrice,
  getPrimaryCurrency,
  getTaPaxCount,
  getTaTotal,
  getTotalsByCurrency,
  headerSearchContext,
  itemTotalsMap,
  roundUnit,
  suggestTaFromItems,
} from '../shared/cartEngine';
import { computeDashboardStats } from '../shared/dashboardStats';
import {
  defaultQuoteLines,
  loadQuoteLines,
  newQuoteLineId,
  QUOTE_LINES_KEY,
  QuoteLine,
  QuoteLineKind,
  saveQuoteLines,
} from '../shared/quoteConfig';
import { appendAppLog } from '../shared/appLog';
import {
  CLIENT_KEY,
  HISTORY_KEY,
  HistoryEntry,
  PENDING_QUOTE_KEY,
  USD_EQUIV_KEY,
  commitQuoteNumber,
  formatQuoteRef,
  loadAdvisorName,
  loadClientName,
  loadHistory,
  loadIncludeUsdEquiv,
  loadPendingQuoteNumber,
  peekNextQuoteNumber,
  saveClientName,
  saveIncludeUsdEquiv,
  savePendingQuoteNumber,
  upsertHistory,
} from '../shared/quoteHistory';
import {
  HotelCompareOptionGroup,
  HOTEL_COMPARE_GROUPS_KEY,
  HOTELS_AS_OPTIONS_KEY,
  loadHotelCompareGroups,
  loadHotelsAsOptions,
  newHotelCompareGroupId,
  saveHotelCompareGroups,
  saveHotelsAsOptions,
} from '../shared/quoteOptions';
import {
  defaultTaConfig,
  defaultTaSelection,
  loadTaConfig,
  loadTaSelection,
  normalizeTaConfig,
  normalizeTaSelection,
  saveTaConfig,
  saveTaSelection,
  TA_CONFIG_KEY,
  TA_SELECTION_KEY,
  TaConfig,
  TaSelection,
  TaType,
  taTypeLabel,
} from '../shared/taConfig';
import {
  DEFAULT_TRM_SUPLEMENTO,
  DISPLAY_CURRENCY_KEY,
  DisplayCurrency,
  loadDisplayCurrency,
  loadTrm,
  loadTrmSuplemento,
  normalizeDisplayCurrency,
  normalizeTrmSuplemento,
  saveDisplayCurrency,
  saveTrm,
  saveTrmSuplemento,
  todayIso,
  TRM_KEY,
  TRM_SUPLEMENTO_KEY,
  TrmState,
} from '../shared/trm';
import { clearTripGuide, loadTripGuide, TRIP_GUIDE_KEY } from '../shared/tripGuide';

const STORAGE_KEY = 'tce_cart_items';
const SEARCH_KEY = 'tce_last_search';
const FEES_KEY = 'tce_fees';

let lines: QuoteLine[] = [];
let taConfig: TaConfig = defaultTaConfig();
let taSelection: TaSelection = defaultTaSelection();
let trmSuplemento = DEFAULT_TRM_SUPLEMENTO;
let displayCurrency: DisplayCurrency = 'COP';
let items: CartItem[] = [];
let fees: Record<string, number> = defaultFees();
let clientName = '';
let advisorName = '';
let searchContext: SearchContext | null = null;
let tripGuide: SearchContext | null = null;
let history: HistoryEntry[] = [];
let trmRate = 0;
let includeUsdEquiv = false;
let hotelsAsOptions = false;
let hotelOptionGroups: HotelCompareOptionGroup[] = [];
let pendingQuoteNumber: number | null = null;
let quoteCopyStatus: 'idle' | 'ok' | 'err' = 'idle';
let suppressFeeRerender = false;
let suppressItemAdjRerender = false;
let lastLocalCartWriteAt = 0;
let lastLocalFeesWriteAt = 0;

function isLocalStorageEcho(writtenAt: number, windowMs = 150): boolean {
  return writtenAt > 0 && Date.now() - writtenAt < windowMs;
}

function effTrm(): number {
  return getEffectiveTrm(trmRate, trmSuplemento);
}

function setupTabs(): void {
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const id = (tab as HTMLElement).dataset.tab;
      document.querySelectorAll('.tab').forEach((t) => {
        const active = t === tab;
        t.classList.toggle('active', active);
        t.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      document.querySelectorAll('.panel').forEach((p) => {
        p.classList.toggle('active', p.id === `panel-${id}`);
      });
      if (id === 'whatsapp') void showQuotePreview();
      if (id === 'carrito') {
        renderProductos();
        renderTotal();
      }
    });
  });
}

function formatPaxLabel(): string {
  const ctx = headerSearchContext(tripGuide, searchContext, items);
  const flight = items.find((i): i is FlightCartItem => i.type === 'flight');
  let adults = ctx?.totalAdults ?? 0;
  let children = ctx?.totalChildren ?? 0;
  let infants = flight?.infants ?? 0;
  if (adults + children === 0) {
    adults = getTaPaxCount(items, tripGuide, searchContext);
  }
  const ages = (ctx?.childrenAges || []).filter((a) => typeof a === 'number' && a >= 0);
  const parts: string[] = [];
  if (adults > 0) parts.push(`${adults} adulto${adults !== 1 ? 's' : ''}`);
  if (children > 0) {
    const agesHint = ages.length > 0 ? ` (${ages.join(', ')})` : '';
    parts.push(`${children} niño${children !== 1 ? 's' : ''}${agesHint}`);
  }
  if (infants > 0) parts.push(`${infants} bebé${infants !== 1 ? 's' : ''}`);
  return parts.length ? parts.join(' · ') : 'Sin pasajeros';
}

function formatRouteLabel(): string {
  const ctx = headerSearchContext(tripGuide, searchContext, items);
  if (!ctx) return 'Sin ruta';
  const bits = [
    ctx.originText,
    ctx.destinationText,
    ctx.checkIn && ctx.checkOut ? `${ctx.checkIn} → ${ctx.checkOut}` : ctx.checkIn,
    ctx.nights && ctx.nights > 0 ? `${ctx.nights}n` : '',
  ].filter(Boolean);
  return bits.join(' · ') || 'Sin ruta';
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}

function itemTitle(item: CartItem): string {
  switch (item.type) {
    case 'hotel':
      return item.hotelName;
    case 'flight':
      return item.title || `${item.origin.code} → ${item.destination.code}`;
    case 'transfer':
      return item.name;
    case 'activity':
      return item.name;
    case 'insurance':
      return item.name;
    default:
      return 'Ítem';
  }
}

function itemMeta(item: CartItem): string {
  switch (item.type) {
    case 'hotel':
      return `${item.checkIn} → ${item.checkOut} · ${item.nights}n`;
    case 'flight':
      return `${item.provider}${item.paxSummary ? ` · ${item.paxSummary}` : ''}`;
    case 'transfer':
      return `${item.from} → ${item.to}${item.supplierName ? ` · ${item.supplierName}` : ''}`;
    case 'activity':
      return `${item.supplierName || 'Actividad'}${item.checkIn ? ` · ${item.checkIn}` : ''}`;
    case 'insurance':
      return `${item.supplierName || 'Asistencia'}${item.planLabel ? ` · ${item.planLabel}` : ''}`;
    default:
      return '';
  }
}

function setSyncOk(ok: boolean): void {
  const pill = document.getElementById('sync-pill');
  if (!pill) return;
  pill.textContent = ok ? 'Sync OK' : 'Sync…';
  pill.classList.toggle('pill--warn', !ok);
}

function renderHeader(): void {
  const clientEl = document.getElementById('header-client') as HTMLInputElement | null;
  const itemsEl = document.getElementById('meta-items');
  const routeEl = document.getElementById('meta-route');
  const paxEl = document.getElementById('header-pax');
  const trmInput = document.getElementById('header-trm-input') as HTMLInputElement | null;
  const trmEff = document.getElementById('header-trm-eff');
  const compareEl = document.getElementById('hotels-as-options') as HTMLInputElement | null;
  const addOptBtn = document.getElementById('btn-add-option');

  if (clientEl && document.activeElement !== clientEl) clientEl.value = clientName;
  if (itemsEl) {
    itemsEl.textContent = `${items.length} producto${items.length !== 1 ? 's' : ''}`;
  }
  if (routeEl) routeEl.textContent = formatRouteLabel();
  if (paxEl) paxEl.textContent = formatPaxLabel();
  if (trmInput && document.activeElement !== trmInput) {
    trmInput.value = trmRate > 0 ? String(Math.round(trmRate * 100) / 100) : '';
  }
  if (trmEff) {
    const trm = effTrm();
    trmEff.textContent =
      trmRate > 0
        ? `usada ${Math.round(trm).toLocaleString('es-CO')} (+${Math.round(trmSuplemento).toLocaleString('es-CO')})`
        : 'sin TRM';
  }
  if (compareEl) compareEl.checked = hotelsAsOptions;
  if (addOptBtn) addOptBtn.hidden = !hotelsAsOptions;

  document.querySelectorAll('.currency-btn').forEach((btn) => {
    const cur = (btn as HTMLElement).dataset.displayCurrency as DisplayCurrency;
    btn.classList.toggle('currency-btn--active', cur === displayCurrency);
    if (cur === 'USD') {
      (btn as HTMLButtonElement).disabled = !(effTrm() > 0);
    }
  });
}

function renderDashboard(): void {
  const stats = computeDashboardStats(history);
  const grid = document.getElementById('dash-stats');
  if (grid) {
    grid.innerHTML = [
      { label: 'Hoy', value: String(stats.today), sub: 'cotizaciones' },
      { label: 'Ayer', value: String(stats.yesterday), sub: 'cotizaciones' },
      { label: '7 días', value: String(stats.week), sub: 'cotizaciones' },
      { label: '30 días', value: String(stats.month), sub: 'cotizaciones' },
      {
        label: 'Ticket prom.',
        value: stats.avgTicketCop > 0 ? formatCartPrice('COP', stats.avgTicketCop) : '—',
        sub: 'COP · historial',
      },
      {
        label: 'Total mes',
        value: stats.totalQuotedCop > 0 ? formatCartPrice('COP', stats.totalQuotedCop) : '—',
        sub: 'suma COP en 30 días',
      },
    ]
      .map(
        (s) => `
        <div class="stat-card">
          <div class="label">${s.label}</div>
          <div class="value">${s.value}</div>
          <div class="sub">${s.sub}</div>
        </div>`
      )
      .join('');
  }

  const destUl = document.getElementById('dash-destinos');
  if (destUl) {
    destUl.innerHTML =
      stats.topDestinations.length === 0
        ? '<li><span>Sin datos aún</span></li>'
        : stats.topDestinations
            .map(
              (d) =>
                `<li><span>${escapeHtml(d.name)}</span><strong>${d.count}</strong></li>`
            )
            .join('');
  }

  const recentUl = document.getElementById('dash-recent');
  if (recentUl) {
    recentUl.innerHTML =
      stats.recent.length === 0
        ? '<li><span>Sin cotizaciones guardadas</span></li>'
        : stats.recent
            .map((h) => {
              const ref = formatQuoteRef(h.quoteNumber);
              const dest = h.destination || h.searchContext?.destinationText || '—';
              const total =
                typeof h.grandTotal === 'number'
                  ? formatCartPrice(h.primaryCurrency || 'COP', h.grandTotal)
                  : '—';
              return `<li><span>${escapeHtml(ref)} · ${escapeHtml(dest)}</span><strong>${escapeHtml(total)}</strong></li>`;
            })
            .join('');
  }
}

function hotelOptionChips(hotelId: string): string {
  if (!hotelsAsOptions || hotelOptionGroups.length === 0) return '';
  const chips = hotelOptionGroups
    .map((g, i) => {
      const on = g.hotelIds.includes(hotelId);
      return `<button type="button" class="opt-chip${on ? ' opt-chip--on' : ''}"
        data-action="toggle-hotel-option" data-option-id="${escapeAttr(g.id)}"
        data-hotel-id="${escapeAttr(hotelId)}">Opción ${i + 1}</button>`;
    })
    .join('');
  return `<div class="opt-chips">${chips}</div>`;
}

function renderCompareBlock(): void {
  const block = document.getElementById('compare-block');
  if (!block) return;
  if (!hotelsAsOptions || hotelOptionGroups.length === 0) {
    block.hidden = true;
    block.innerHTML = '';
    return;
  }
  block.hidden = false;
  const trm = effTrm();
  const pax = getTaPaxCount(items, tripGuide, searchContext);
  const taTotalCop = getTaTotal(taSelection, pax);
  const feesTotal = getFeesTotalDisplay(fees, taTotalCop, displayCurrency, trm);
  const opts = compareOptionTotals(items, hotelOptionGroups, feesTotal, displayCurrency, trm);
  block.innerHTML = `
    <div class="compare-columns">
      ${hotelOptionGroups
        .map((g, i) => {
          const priced = opts.find((o) => o.id === g.id);
          const hotels = g.hotelIds
            .map((id) => items.find((it) => it.id === id && it.type === 'hotel'))
            .filter((h): h is HotelCartItem => !!h);
          const names =
            hotels.length === 0
              ? `<div class="hint">Sin hoteles — marca Opción ${i + 1}</div>`
              : hotels.map((h) => `<div>${escapeHtml(h.hotelName)}</div>`).join('');
          return `
          <div class="compare-col">
            <div class="compare-col-head">
              <span>Opción ${i + 1}</span>
              ${
                hotelOptionGroups.length > 1
                  ? `<button type="button" class="btn-mini" data-action="remove-hotel-option" data-option-id="${escapeAttr(g.id)}">✕</button>`
                  : ''
              }
            </div>
            ${names}
            ${
              priced
                ? `<div class="total-row total-row--sub"><span>Por pax</span><strong>${escapeHtml(formatCartPrice(displayCurrency, priced.perPerson))}</strong></div>
                   <div class="total-row total-row--grand"><span>Total</span><span>${escapeHtml(formatCartPrice(displayCurrency, priced.total))}</span></div>`
                : ''
            }
          </div>`;
        })
        .join('')}
    </div>`;
}

function itemAdjustmentsHtml(item: CartItem): string {
  const trm = effTrm();
  const mayor = copAmountToDisplay(Math.max(0, Number(item.mayorValor) || 0), displayCurrency, trm);
  const redondeo = copAmountToDisplay(Math.max(0, Number(item.redondeo) || 0), displayCurrency, trm);
  const line = getItemLineTotal(item, displayCurrency, trm);
  const base = getItemBasePrice(item, displayCurrency, trm);
  const native = getItemNativePrice(item);
  const id = escapeAttr(item.id);
  const step = displayCurrency === 'USD' ? '0.01' : '100';
  const roundLabel = displayCurrency === 'USD' ? '10$' : '10k';
  const nativeHint =
    native.currency.toUpperCase() !== displayCurrency
      ? `<div class="item-adj-base">Original: ${escapeHtml(formatCartPrice(native.currency, native.price))}</div>`
      : '';
  return `
    <div class="item-adj">
      <div class="item-adj-row">
        <label for="item-mayor-${id}">Mayor valor (${displayCurrency})</label>
        <input id="item-mayor-${id}" class="item-adj-input" type="number" min="0" step="${step}"
          data-item-id="${id}" data-adj="mayorValor" value="${mayor}" />
      </div>
      <div class="item-adj-row">
        <span class="item-adj-label">
          <label for="item-redondeo-${id}">Redondeo (${displayCurrency})</label>
          <button type="button" class="btn-mini" data-action="round-item" data-id="${id}"
            title="Redondear este ítem (base + mayor valor)">${roundLabel}</button>
        </span>
        <input id="item-redondeo-${id}" class="item-adj-input" type="number" min="0" step="${step}"
          data-item-id="${id}" data-adj="redondeo" value="${redondeo}" />
      </div>
      <div class="item-adj-base">Base: ${escapeHtml(formatCartPrice(base.currency, base.price))}</div>
      ${nativeHint}
      <div class="item-line-total" data-item-id="${id}">
        Total ítem: <strong>${escapeHtml(formatCartPrice(line.currency, line.price))}</strong>
      </div>
    </div>`;
}

function renderProductos(): void {
  const list = document.getElementById('productos-list');
  const clearBtn = document.getElementById('btn-clear-cart') as HTMLButtonElement | null;
  if (clearBtn) clearBtn.disabled = items.length === 0;
  if (!list) return;
  if (items.length === 0) {
    list.innerHTML =
      '<div class="empty">Carrito vacío. Agrega productos desde BookingMotor u otras OTAs con el lateral.</div>';
    renderCompareBlock();
    return;
  }
  if (suppressItemAdjRerender) {
    // Update only totals/chips outside focused inputs — skip full list rebuild
    renderCompareBlock();
    return;
  }
  const trm = effTrm();
  list.innerHTML = items
    .map((item) => {
      const line = getItemLineTotal(item, displayCurrency, trm);
      const chips = item.type === 'hotel' ? hotelOptionChips(item.id) : '';
      return `
        <article class="item-row item-row--rich" data-id="${escapeAttr(item.id)}">
          <span class="item-type">${escapeHtml(item.type)}</span>
          <div class="item-body">
            <div class="item-top">
              <div>
                <h3 class="item-title">${escapeHtml(itemTitle(item))}</h3>
                <p class="item-meta">${escapeHtml(itemMeta(item))}</p>
                ${chips}
              </div>
              <div class="item-price">${escapeHtml(formatCartPrice(line.currency, line.price))}</div>
            </div>
            ${itemAdjustmentsHtml(item)}
          </div>
        </article>`;
    })
    .join('');
  renderCompareBlock();
}

async function saveItems(): Promise<void> {
  lastLocalCartWriteAt = Date.now();
  await chrome.storage.local.set({ [STORAGE_KEY]: items });
}

async function clearCartFromPanel(): Promise<void> {
  if (items.length === 0) return;
  if (!confirm('¿Vaciar el carrito? Se guardará en el historial si hay productos.')) return;
  await archiveCurrentCart('Vaciar carrito');
  items = [];
  searchContext = null;
  tripGuide = null;
  fees = defaultFees();
  pendingQuoteNumber = null;
  clientName = '';
  taSelection = applyTaType(taConfig, 'nacional_rt', effTrm());
  hotelOptionGroups = [];
  await saveItems();
  try {
    await chrome.storage.local.remove(SEARCH_KEY);
  } catch {
    // ignore
  }
  await clearTripGuide();
  await saveFees();
  await savePendingQuoteNumber(null);
  await saveClientName('');
  void saveTaSelection(taSelection);
  void saveHotelCompareGroups([]);
  refreshViews();
}

async function applyItemRounding(itemId: string): Promise<void> {
  const item = items.find((i) => i.id === itemId);
  if (!item) return;
  const trm = effTrm();
  const base = getItemBasePrice(item, displayCurrency, trm);
  const mayor = copAmountToDisplay(Math.max(0, Number(item.mayorValor) || 0), displayCurrency, trm);
  const beforeRound = base.price + mayor;
  const unit = roundUnit(displayCurrency);
  const rounded = Math.ceil(beforeRound / unit) * unit;
  const excessDisplay = Math.max(0, rounded - beforeRound);
  items = items.map((i) =>
    i.id === itemId
      ? { ...i, redondeo: displayAmountToCop(excessDisplay, displayCurrency, trm) }
      : i
  );
  await saveItems();
  renderProductos();
  renderTotal();
}

function renderTotal(): void {
  const feesEl = document.getElementById('total-fees');
  const totalsEl = document.getElementById('total-totals');
  const trm = effTrm();
  const pax = getTaPaxCount(items, tripGuide, searchContext);
  const taTotalCop = getTaTotal(taSelection, pax);
  const feeStep = displayCurrency === 'USD' ? '0.01' : '100';

  if (items.length === 0) {
    if (feesEl) feesEl.innerHTML = '<p class="hint">Agrega productos al carrito para editar Total.</p>';
    if (totalsEl) totalsEl.innerHTML = '';
    return;
  }

  if (feesEl && !suppressFeeRerender) {
    const feeRows = FEE_DEFINITIONS.map(
      (def) => `
      <div class="fee-row">
        <label for="fee-${def.id}">${escapeHtml(def.label)} (${displayCurrency})</label>
        <input type="number" min="0" step="${feeStep}" id="fee-${def.id}" data-fee-id="${def.id}"
          class="fee-input" value="${copAmountToDisplay(fees[def.id] ?? 0, displayCurrency, trm)}" />
      </div>`
    ).join('');

    const type = taSelection.type;
    feesEl.innerHTML = `
      ${feeRows}
      <div class="ta-block">
        <div class="fee-row">
          <label for="ta-type">Tipo TA</label>
          <select id="ta-type" class="ta-type">
            <option value="nacional_rt" ${type === 'nacional_rt' ? 'selected' : ''}>Ida y vuelta (nacional)</option>
            <option value="nacional_ow" ${type === 'nacional_ow' ? 'selected' : ''}>Solo ida (nacional)</option>
            <option value="internacional" ${type === 'internacional' ? 'selected' : ''}>Internacional (USD)</option>
          </select>
        </div>
        <div class="fee-row">
          <label for="ta-unit">Valor de TA (${displayCurrency})</label>
          <input type="number" min="0" step="${feeStep}" id="ta-unit" class="ta-unit"
            value="${copAmountToDisplay(taSelection.unitCop || 0, displayCurrency, trm)}" />
        </div>
        <div class="ta-summary" id="ta-summary">
          TA × ${pax} pasajero${pax !== 1 ? 's' : ''} =
          <strong>${escapeHtml(formatCartPrice(displayCurrency, copAmountToDisplay(taTotalCop, displayCurrency, trm)))}</strong>
          <button type="button" class="btn-mini" data-action="ta-from-flight">Según vuelo</button>
        </div>
        <div class="ta-hint">${escapeHtml(taTypeLabel(type))}${
          type === 'internacional' && trm > 0
            ? ` · ${taConfig.internacionalUsd} USD × TRM ${Math.round(trm).toLocaleString('es-CO')}`
            : ''
        }</div>
      </div>
    `;
  }

  if (totalsEl) {
    const subtotals = getTotalsByCurrency(items, displayCurrency, trm);
    const feesTotal = getFeesTotalDisplay(fees, taTotalCop, displayCurrency, trm);
    const primary = getPrimaryCurrency(subtotals, displayCurrency);
    const mayorValor = copAmountToDisplay(fees[MAYOR_VALOR_ID] || 0, displayCurrency, trm);
    const redondeo = copAmountToDisplay(fees[REDONDEO_ID] || 0, displayCurrency, trm);
    const taDisplay = copAmountToDisplay(taTotalCop, displayCurrency, trm);
    const paxForRate = Math.max(1, pax);
    const rows: string[] = [];

    for (const [currency, value] of subtotals) {
      rows.push(`
        <div class="total-row total-row--sub">
          <span>Subtotal ${escapeHtml(currency)}</span>
          <span>${escapeHtml(formatCartPrice(currency, value))}</span>
        </div>`);
    }
    if (mayorValor > 0) {
      rows.push(`
        <div class="total-row total-row--sub">
          <span>Mayor valor cobrado</span>
          <span>${escapeHtml(formatCartPrice(primary, mayorValor))}</span>
        </div>`);
    }
    if (taDisplay > 0) {
      rows.push(`
        <div class="total-row total-row--sub">
          <span>TA × ${pax} pax</span>
          <span>${escapeHtml(formatCartPrice(primary, taDisplay))}</span>
        </div>`);
    }

    const roundLabel = displayCurrency === 'USD' ? 'decena de USD' : 'decena de mil';
    rows.push(`
      <div class="rounding-row">
        <div>Redondeo: <strong>${escapeHtml(formatCartPrice(primary, redondeo))}</strong></div>
        <button type="button" class="btn-round" data-action="round"
          title="Excedente hasta la siguiente ${roundLabel}">Redondear</button>
      </div>`);

    if (hotelsAsOptions && hotelOptionGroups.length > 0) {
      const opts = compareOptionTotals(items, hotelOptionGroups, feesTotal, displayCurrency, trm);
      for (const opt of opts) {
        rows.push(`
          <div class="total-row total-row--grand">
            <span>Opción ${opt.index}${opt.hotelNames.length ? ` · ${escapeHtml(opt.hotelNames.join(', '))}` : ''}</span>
            <span>${escapeHtml(formatCartPrice(displayCurrency, opt.total))}</span>
          </div>
          <div class="total-row total-row--sub">
            <span>Por pasajero (${opt.pax})</span>
            <span>${escapeHtml(formatCartPrice(displayCurrency, opt.perPerson))}</span>
          </div>`);
      }
    } else {
      for (const [currency, value] of subtotals) {
        const total = currency === primary ? value + feesTotal : value;
        const perPerson = Math.round(total / paxForRate);
        rows.push(`
          <div class="total-row total-row--sub">
            <span>Valor por pasajero (${escapeHtml(currency)})</span>
            <span>${escapeHtml(formatCartPrice(currency, perPerson))}</span>
          </div>
          <div class="total-row total-row--grand">
            <span>Total ${escapeHtml(currency)} (${paxForRate} pax)</span>
            <span>${escapeHtml(formatCartPrice(currency, total))}</span>
          </div>`);
      }
    }

    totalsEl.innerHTML = rows.join('');
  }
}

function renderWhatsApp(): void {
  const el = document.getElementById('whatsapp-view');
  if (!el) return;

  if (items.length === 0) {
    el.innerHTML =
      '<div class="empty">Agrega productos al carrito para generar la cotización WhatsApp.</div>';
    return;
  }

  const group = (kind: QuoteLine['kind'], title: string) => {
    const kindLines = lines.filter((l) => l.kind === kind);
    if (kindLines.length === 0) return '';
    return `
      <div class="quote-group-title">${title}</div>
      ${kindLines
        .map(
          (l) => `
        <label class="quote-line">
          <input type="checkbox" class="quote-check" data-line-id="${escapeAttr(l.id)}" ${l.enabled ? 'checked' : ''} />
          <span>${escapeHtml((l.emoji ? l.emoji + ' ' : '') + l.text)}</span>
        </label>`
        )
        .join('')}`;
  };

  const status =
    quoteCopyStatus === 'ok'
      ? '<div class="quote-status">✓ Copiado — pégalo en WhatsApp</div>'
      : quoteCopyStatus === 'err'
        ? '<div class="quote-status quote-status--err">No se pudo copiar automático: selecciona el texto verde y Ctrl+C</div>'
        : '<div class="quote-status"></div>';

  el.innerHTML = `
    <div class="card">
      <h2>Texto para pegar (editable)</h2>
      ${status}
      <textarea class="quote-preview" id="quote-preview" spellcheck="true"></textarea>
      <div class="quote-actions">
        <button type="button" class="btn-primary" data-action="copy-quote">Copiar WhatsApp</button>
        <button type="button" class="btn-ghost" data-action="preview-quote">Regenerar desde carrito</button>
      </div>
      <label class="quote-opt">
        <input type="checkbox" id="usd-equiv-check" ${includeUsdEquiv ? 'checked' : ''} />
        Incluir conversión COP ↔ USD (TRM) en el mensaje
      </label>
    </div>
    <div class="card">
      <h2>Qué incluir</h2>
      <p class="hint" style="margin-top:0">Editar catálogo en Config. Aquí solo marcas cuáles van al regenerar.</p>
      ${group('include', 'Tarifa incluye')}
      ${group('exclude', 'Plan no incluye')}
      ${group('policy', 'Nota importante')}
    </div>
  `;

  void showQuotePreview();
}

function renderHistorial(): void {
  const list = document.getElementById('historial-list');
  if (!list) return;
  if (history.length === 0) {
    list.innerHTML = '<div class="empty">Aún no hay cotizaciones en el historial local.</div>';
    return;
  }
  list.innerHTML = history
    .map((h) => {
      const dest = h.destination || h.searchContext?.destinationText || '—';
      const client = h.clientName || '—';
      const total =
        typeof h.grandTotal === 'number'
          ? formatCartPrice(h.primaryCurrency || 'COP', h.grandTotal)
          : '—';
      const when = new Date(h.createdAt).toLocaleString('es-CO');
      return `
        <article class="item-row">
          <span class="item-type">${escapeHtml(formatQuoteRef(h.quoteNumber))}</span>
          <div>
            <h3 class="item-title">${escapeHtml(dest)}</h3>
            <p class="item-meta">${escapeHtml(client)} · ${escapeHtml(when)} · ${h.items.length} ítem(s)</p>
          </div>
          <div class="item-price">${escapeHtml(total)}</div>
        </article>`;
    })
    .join('');
}

function renderLists(): void {
  renderKind('include', 'list-include');
  renderKind('exclude', 'list-exclude');
  renderKind('policy', 'list-policy');
}

function renderKind(kind: QuoteLineKind, listId: string): void {
  const list = document.getElementById(listId);
  if (!list) return;
  const kindLines = lines.filter((l) => l.kind === kind);
  list.innerHTML = kindLines
    .map(
      (l) => `
      <div class="line-row" data-id="${escapeAttr(l.id)}">
        <input class="emoji-input" type="text" maxlength="4" value="${escapeAttr(l.emoji)}" data-field="emoji" aria-label="Emoji" />
        <input type="text" value="${escapeAttr(l.text)}" data-field="text" aria-label="Texto" />
        <button type="button" class="btn-del" data-action="delete" title="Eliminar">✕</button>
      </div>`
    )
    .join('');
}

async function persistLines(): Promise<void> {
  await saveQuoteLines(lines);
}

async function saveFees(): Promise<void> {
  lastLocalFeesWriteAt = Date.now();
  await chrome.storage.local.set({ [FEES_KEY]: fees });
}

async function ensurePendingQuoteNumber(): Promise<number> {
  if (pendingQuoteNumber !== null) return pendingQuoteNumber;
  const stored = await loadPendingQuoteNumber();
  if (stored !== null) {
    pendingQuoteNumber = stored;
    return stored;
  }
  const peek = await peekNextQuoteNumber();
  pendingQuoteNumber = peek;
  await savePendingQuoteNumber(peek);
  return peek;
}

async function archiveCurrentCart(reason: string): Promise<void> {
  if (items.length === 0) return;
  if (
    reason === 'Vaciar carrito' &&
    pendingQuoteNumber !== null &&
    history[0]?.quoteNumber === pendingQuoteNumber
  ) {
    return;
  }

  const quoteNumber = await ensurePendingQuoteNumber();
  await commitQuoteNumber(quoteNumber);
  const trm = effTrm();
  const subtotals = getTotalsByCurrency(items, displayCurrency, trm);
  const primaryCurrency = getPrimaryCurrency(subtotals, displayCurrency) || 'COP';
  const itemsTotal = subtotals.get(primaryCurrency) || 0;
  const pax = getTaPaxCount(items, tripGuide, searchContext);
  const taTotalCop = getTaTotal(taSelection, pax);
  const feesTotal = getFeesTotalDisplay(fees, taTotalCop, displayCurrency, trm);
  const ctx = headerSearchContext(tripGuide, searchContext, items);
  const entry: HistoryEntry = {
    id: `hist_${quoteNumber}_${Date.now()}`,
    quoteNumber,
    advisorName,
    clientName: clientName.trim() || undefined,
    destination: ctx?.destinationText,
    searchContext: ctx,
    items: [...items],
    fees: { ...fees },
    taTotal: taTotalCop || undefined,
    trm: trm || undefined,
    grandTotal: itemsTotal + feesTotal,
    primaryCurrency,
    createdAt: Date.now(),
  };
  await upsertHistory(entry);
  history = await loadHistory();
  void appendAppLog('info', `Historial: ${reason} ${formatQuoteRef(quoteNumber)}`);
}

async function buildCurrentQuote(): Promise<string> {
  await ensurePendingQuoteNumber();
  const trm = effTrm();
  const subtotals = getTotalsByCurrency(items, displayCurrency, trm);
  const pax = getTaPaxCount(items, tripGuide, searchContext);
  const taTotalCop = getTaTotal(taSelection, pax);
  const feesTotal = getFeesTotalDisplay(fees, taTotalCop, displayCurrency, trm);
  const primaryCurrency = getPrimaryCurrency(subtotals, displayCurrency) || 'COP';
  return buildWhatsAppQuote({
    items,
    searchContext: headerSearchContext(tripGuide, searchContext, items),
    subtotals,
    feesTotal,
    primaryCurrency,
    quoteLines: lines,
    quoteNumber: pendingQuoteNumber ?? undefined,
    advisorName,
    trm: trm > 0 ? trm : undefined,
    includeUsdEquiv,
    hotelsAsOptions,
    hotelOptionGroups: hotelsAsOptions ? hotelOptionGroups : undefined,
    itemTotals: itemTotalsMap(items, displayCurrency, trm),
  });
}

async function showQuotePreview(): Promise<void> {
  const preview = document.getElementById('quote-preview') as HTMLTextAreaElement | null;
  if (!preview || items.length === 0) return;
  // Don't clobber user edits while focused
  if (document.activeElement === preview && preview.value.trim()) return;
  preview.value = await buildCurrentQuote();
}

async function copyQuoteToClipboard(): Promise<void> {
  const preview = document.getElementById('quote-preview') as HTMLTextAreaElement | null;
  const text =
    preview && preview.value.trim()
      ? preview.value
      : await buildCurrentQuote();
  if (preview && !preview.value.trim()) preview.value = text;

  let ok = false;
  try {
    await navigator.clipboard.writeText(text);
    ok = true;
  } catch {
    if (preview) {
      preview.focus();
      preview.select();
      try {
        ok = document.execCommand('copy');
      } catch {
        ok = false;
      }
    }
  }

  if (ok) await archiveCurrentCart('Copiar WhatsApp');
  quoteCopyStatus = ok ? 'ok' : 'err';
  const status = document.querySelector('.quote-status');
  if (status) {
    status.className = 'quote-status' + (ok ? '' : ' quote-status--err');
    status.textContent = ok
      ? '✓ Copiado — pégalo en WhatsApp'
      : 'No se pudo copiar automático: selecciona el texto y Ctrl+C';
  }
  window.setTimeout(() => {
    quoteCopyStatus = 'idle';
    const s = document.querySelector('.quote-status');
    if (s) s.textContent = '';
  }, 4000);
}

function bindListEvents(): void {
  document.querySelectorAll('.line-list').forEach((list) => {
    list.addEventListener('input', (e) => {
      const target = e.target as HTMLElement | null;
      if (!target || target.tagName !== 'INPUT') return;
      const row = target.closest('.line-row') as HTMLElement | null;
      if (!row) return;
      const id = row.dataset.id;
      const field = (target as HTMLInputElement).dataset.field as 'emoji' | 'text' | undefined;
      if (!id || !field) return;
      lines = lines.map((l) =>
        l.id === id ? { ...l, [field]: (target as HTMLInputElement).value } : l
      );
      void persistLines();
    });

    list.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('[data-action="delete"]') as HTMLElement | null;
      if (!btn) return;
      const row = btn.closest('.line-row') as HTMLElement | null;
      if (!row?.dataset.id) return;
      lines = lines.filter((l) => l.id !== row.dataset.id);
      renderLists();
      void persistLines();
    });
  });
}

function bindAddForms(): void {
  document.querySelectorAll('.add-form').forEach((form) => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const el = form as HTMLFormElement;
      const kind = el.dataset.kind as QuoteLineKind;
      const fd = new FormData(el);
      const emoji = String(fd.get('emoji') || '').trim();
      const text = String(fd.get('text') || '').trim();
      if (!text) return;
      lines = [...lines, { id: newQuoteLineId(), kind, emoji, text, enabled: true }];
      el.reset();
      renderLists();
      void persistLines();
    });
  });
}

function bindReset(): void {
  document.getElementById('btn-reset-defaults')?.addEventListener('click', () => {
    if (!confirm('¿Restaurar las líneas incluye / no incluye / políticas por defecto?')) return;
    lines = defaultQuoteLines();
    renderLists();
    void persistLines();
  });
}

function fillTaForm(): void {
  const rt = document.getElementById('ta-nacional-rt') as HTMLInputElement | null;
  const ow = document.getElementById('ta-nacional-ow') as HTMLInputElement | null;
  const intl = document.getElementById('ta-internacional-usd') as HTMLInputElement | null;
  if (rt) rt.value = String(taConfig.nacionalRoundTripCop);
  if (ow) ow.value = String(taConfig.nacionalOneWayCop);
  if (intl) intl.value = String(taConfig.internacionalUsd);
}

function readTaForm(): TaConfig {
  const rt = document.getElementById('ta-nacional-rt') as HTMLInputElement | null;
  const ow = document.getElementById('ta-nacional-ow') as HTMLInputElement | null;
  const intl = document.getElementById('ta-internacional-usd') as HTMLInputElement | null;
  return normalizeTaConfig({
    nacionalRoundTripCop: Number(rt?.value || 0),
    nacionalOneWayCop: Number(ow?.value || 0),
    internacionalUsd: Number(intl?.value || 0),
  });
}

function fillTrmSuplementoForm(): void {
  const el = document.getElementById('trm-suplemento') as HTMLInputElement | null;
  if (el) el.value = String(trmSuplemento);
}

function bindTaForm(): void {
  const persistTa = () => {
    taConfig = readTaForm();
    void saveTaConfig(taConfig);
  };
  for (const id of ['ta-nacional-rt', 'ta-nacional-ow', 'ta-internacional-usd']) {
    document.getElementById(id)?.addEventListener('change', persistTa);
    document.getElementById(id)?.addEventListener('blur', persistTa);
  }
}

function bindTrmSuplementoForm(): void {
  const persistSup = () => {
    const el = document.getElementById('trm-suplemento') as HTMLInputElement | null;
    trmSuplemento = normalizeTrmSuplemento(Number(el?.value || 0));
    void saveTrmSuplemento(trmSuplemento);
    renderTotal();
  };
  const el = document.getElementById('trm-suplemento');
  el?.addEventListener('change', persistSup);
  el?.addEventListener('blur', persistSup);
}

function syncHotelOptionGroups(): void {
  const hotelIds = new Set(
    items.filter((i): i is HotelCartItem => i.type === 'hotel').map((h) => h.id)
  );
  hotelOptionGroups = hotelOptionGroups.map((g) => ({
    ...g,
    hotelIds: g.hotelIds.filter((id) => hotelIds.has(id)),
  }));
  if (hotelsAsOptions && hotelOptionGroups.length === 0) {
    hotelOptionGroups = [{ id: newHotelCompareGroupId(), hotelIds: [] }];
  }
}

function bindWorkspaceEvents(): void {
  document.addEventListener('click', (e) => {
    const target = (e.target as HTMLElement).closest(
      '[data-action], [data-display-currency]'
    ) as HTMLElement | null;
    if (!target) return;

    const cur = target.dataset.displayCurrency as DisplayCurrency | undefined;
    if (cur === 'COP' || cur === 'USD') {
      if (cur === 'USD' && !(effTrm() > 0)) return;
      displayCurrency = cur;
      void saveDisplayCurrency(cur);
      renderHeader();
      renderProductos();
      renderTotal();
      return;
    }

    const action = target.dataset.action;
    if (action === 'refresh-trm') {
      void chrome.runtime.sendMessage({ type: 'TCE_REFRESH_TRM', force: true }, (res) => {
        if (res?.ok && res.trm?.rate) {
          trmRate = res.trm.rate;
          renderHeader();
          renderProductos();
          renderTotal();
        }
      });
      return;
    }
    if (action === 'round') {
      const excess = computeRoundingExcessCop(
        items,
        fees,
        getTaTotal(taSelection, getTaPaxCount(items, tripGuide, searchContext)),
        displayCurrency,
        effTrm()
      );
      fees = { ...fees, [REDONDEO_ID]: excess };
      void saveFees();
      renderTotal();
      return;
    }
    if (action === 'ta-from-flight') {
      const suggested = suggestTaFromItems(items);
      if (!suggested) return;
      taSelection = applyTaType(taConfig, suggested, effTrm());
      void saveTaSelection(taSelection);
      renderTotal();
      return;
    }
    if (action === 'copy-quote') {
      void copyQuoteToClipboard();
      return;
    }
    if (action === 'clear-cart') {
      void clearCartFromPanel();
      return;
    }
    if (action === 'round-item') {
      const id = target.dataset.id;
      if (id) void applyItemRounding(id);
      return;
    }
    if (action === 'preview-quote') {
      const preview = document.getElementById('quote-preview') as HTMLTextAreaElement | null;
      if (preview) preview.blur();
      void buildCurrentQuote().then((text) => {
        if (preview) preview.value = text;
      });
      return;
    }
    if (action === 'add-hotel-option') {
      hotelOptionGroups = [...hotelOptionGroups, { id: newHotelCompareGroupId(), hotelIds: [] }];
      void saveHotelCompareGroups(hotelOptionGroups);
      renderProductos();
      renderTotal();
      return;
    }
    if (action === 'remove-hotel-option') {
      const optionId = target.dataset.optionId;
      if (!optionId || hotelOptionGroups.length <= 1) return;
      hotelOptionGroups = hotelOptionGroups.filter((g) => g.id !== optionId);
      void saveHotelCompareGroups(hotelOptionGroups);
      renderProductos();
      renderTotal();
      return;
    }
    if (action === 'toggle-hotel-option') {
      const optionId = target.dataset.optionId;
      const hotelId = target.dataset.hotelId;
      if (!optionId || !hotelId) return;
      hotelOptionGroups = hotelOptionGroups.map((g) => {
        if (g.id !== optionId) return g;
        const has = g.hotelIds.includes(hotelId);
        return {
          ...g,
          hotelIds: has ? g.hotelIds.filter((id) => id !== hotelId) : [...g.hotelIds, hotelId],
        };
      });
      void saveHotelCompareGroups(hotelOptionGroups);
      renderProductos();
      renderTotal();
    }
  });

  document.addEventListener('focusin', (e) => {
    const t = e.target as HTMLElement | null;
    if (
      t?.classList.contains('fee-input') ||
      t?.classList.contains('ta-unit') ||
      t?.classList.contains('item-adj-input')
    ) {
      if (t.classList.contains('item-adj-input')) suppressItemAdjRerender = true;
      else suppressFeeRerender = true;
    }
  });
  document.addEventListener('focusout', (e) => {
    const t = e.target as HTMLElement | null;
    if (t?.classList.contains('fee-input') || t?.classList.contains('ta-unit')) {
      window.setTimeout(() => {
        suppressFeeRerender = false;
        renderTotal();
      }, 0);
    }
    if (t?.classList.contains('item-adj-input')) {
      window.setTimeout(() => {
        suppressItemAdjRerender = false;
        renderProductos();
        renderTotal();
      }, 0);
    }
  });

  document.addEventListener('change', (e) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;

    if (target.id === 'hotels-as-options') {
      hotelsAsOptions = (target as HTMLInputElement).checked;
      void saveHotelsAsOptions(hotelsAsOptions);
      if (hotelsAsOptions) {
        syncHotelOptionGroups();
        void saveHotelCompareGroups(hotelOptionGroups);
      }
      renderHeader();
      renderProductos();
      renderTotal();
      return;
    }

    if (target.id === 'ta-type') {
      const type = (target as HTMLSelectElement).value as TaType;
      taSelection = applyTaType(taConfig, type, effTrm());
      void saveTaSelection(taSelection);
      renderTotal();
      return;
    }

    if (target.id === 'usd-equiv-check') {
      includeUsdEquiv = (target as HTMLInputElement).checked;
      void saveIncludeUsdEquiv(includeUsdEquiv);
      void buildCurrentQuote().then((text) => {
        const preview = document.getElementById('quote-preview') as HTMLTextAreaElement | null;
        if (preview) preview.value = text;
      });
      return;
    }

    if (target.classList.contains('quote-check')) {
      const lineId = (target as HTMLInputElement).dataset.lineId;
      if (!lineId) return;
      const enabled = (target as HTMLInputElement).checked;
      lines = lines.map((l) => (l.id === lineId ? { ...l, enabled } : l));
      void persistLines();
      void buildCurrentQuote().then((text) => {
        const preview = document.getElementById('quote-preview') as HTMLTextAreaElement | null;
        if (preview) preview.value = text;
      });
    }
  });

  document.addEventListener('input', (e) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;

    if (target.id === 'header-client') {
      clientName = (target as HTMLInputElement).value;
      void saveClientName(clientName);
      return;
    }

    if (target.id === 'header-trm-input') {
      const parsed = parseFloat((target as HTMLInputElement).value);
      trmRate = Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
      if (trmRate > 0) {
        const state: TrmState = {
          rate: trmRate,
          date: todayIso(),
          source: 'manual',
          updatedAt: Date.now(),
        };
        void saveTrm(state);
      }
      renderHeader();
      renderProductos();
      renderTotal();
      return;
    }

    if (target.classList.contains('item-adj-input')) {
      const input = target as HTMLInputElement;
      const itemId = input.dataset.itemId;
      const adj = input.dataset.adj as 'mayorValor' | 'redondeo' | undefined;
      if (!itemId || (adj !== 'mayorValor' && adj !== 'redondeo')) return;
      const parsed = parseFloat(input.value);
      const displayVal = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
      const value = displayAmountToCop(displayVal, displayCurrency, effTrm());
      items = items.map((item) => (item.id === itemId ? { ...item, [adj]: value } : item));
      void saveItems();
      const lineItem = items.find((i) => i.id === itemId);
      if (lineItem) {
        const line = getItemLineTotal(lineItem, displayCurrency, effTrm());
        const totalEl = document.querySelector(
          `.item-line-total[data-item-id="${CSS.escape(itemId)}"]`
        );
        if (totalEl) {
          totalEl.innerHTML = `Total ítem: <strong>${escapeHtml(formatCartPrice(line.currency, line.price))}</strong>`;
        }
        const priceEl = document.querySelector(
          `.item-row[data-id="${CSS.escape(itemId)}"] .item-price`
        );
        if (priceEl) priceEl.textContent = formatCartPrice(line.currency, line.price);
      }
      const keep = suppressItemAdjRerender;
      suppressItemAdjRerender = true;
      renderTotal();
      suppressItemAdjRerender = keep;
      return;
    }

    if (target.classList.contains('fee-input')) {
      const feeId = (target as HTMLInputElement).dataset.feeId;
      if (!feeId) return;
      const parsed = parseFloat((target as HTMLInputElement).value);
      const displayVal = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
      fees = {
        ...fees,
        [feeId]: displayAmountToCop(displayVal, displayCurrency, effTrm()),
      };
      void saveFees();
      const keep = suppressFeeRerender;
      suppressFeeRerender = true;
      renderTotal();
      suppressFeeRerender = keep;
      return;
    }

    if (target.classList.contains('ta-unit')) {
      const parsed = parseFloat((target as HTMLInputElement).value);
      const displayVal = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
      taSelection = {
        ...taSelection,
        unitCop: displayAmountToCop(displayVal, displayCurrency, effTrm()),
      };
      void saveTaSelection(taSelection);
      const keep = suppressFeeRerender;
      suppressFeeRerender = true;
      renderTotal();
      suppressFeeRerender = keep;
      const summary = document.getElementById('ta-summary');
      if (summary) {
        const pax = getTaPaxCount(items, tripGuide, searchContext);
        const taDisplay = copAmountToDisplay(
          getTaTotal(taSelection, pax),
          displayCurrency,
          effTrm()
        );
        summary.innerHTML = `
          TA × ${pax} pasajero${pax !== 1 ? 's' : ''} =
          <strong>${escapeHtml(formatCartPrice(displayCurrency, taDisplay))}</strong>
          <button type="button" class="btn-mini" data-action="ta-from-flight">Según vuelo</button>
        `;
      }
    }
  });
}

function refreshViews(): void {
  renderHeader();
  renderDashboard();
  renderProductos();
  renderTotal();
  renderWhatsApp();
  renderHistorial();
}

async function loadAll(): Promise<void> {
  setSyncOk(false);
  const stored = await chrome.storage.local.get([STORAGE_KEY, FEES_KEY, SEARCH_KEY, CLIENT_KEY]);
  items = Array.isArray(stored[STORAGE_KEY]) ? (stored[STORAGE_KEY] as CartItem[]) : [];
  fees =
    stored[FEES_KEY] && typeof stored[FEES_KEY] === 'object'
      ? { ...defaultFees(), ...(stored[FEES_KEY] as Record<string, number>) }
      : defaultFees();
  searchContext = (stored[SEARCH_KEY] as SearchContext) || null;
  clientName = typeof stored[CLIENT_KEY] === 'string' ? stored[CLIENT_KEY] : await loadClientName();
  advisorName = await loadAdvisorName();
  tripGuide = await loadTripGuide();
  history = await loadHistory();
  lines = await loadQuoteLines();
  taConfig = await loadTaConfig();
  taSelection = await loadTaSelection();
  trmSuplemento = await loadTrmSuplemento();
  displayCurrency = await loadDisplayCurrency();
  includeUsdEquiv = await loadIncludeUsdEquiv();
  hotelsAsOptions = await loadHotelsAsOptions();
  hotelOptionGroups = await loadHotelCompareGroups();
  pendingQuoteNumber = await loadPendingQuoteNumber();
  const trm = await loadTrm();
  trmRate = trm?.rate && trm.rate > 0 ? trm.rate : 0;
  if (displayCurrency === 'USD' && !(effTrm() > 0)) displayCurrency = 'COP';
  fillTaForm();
  fillTrmSuplementoForm();
  renderLists();
  refreshViews();
  setSyncOk(true);
}

function watchStorage(): void {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    let dirty = false;
    let forceFull = false;

    if (changes[STORAGE_KEY]) {
      items = Array.isArray(changes[STORAGE_KEY].newValue)
        ? (changes[STORAGE_KEY].newValue as CartItem[])
        : [];
      const echo = isLocalStorageEcho(lastLocalCartWriteAt) && suppressItemAdjRerender;
      if (echo) {
        renderTotal();
      } else {
        suppressItemAdjRerender = false;
        dirty = true;
        forceFull = true;
      }
    }
    if (changes[FEES_KEY]) {
      fees =
        changes[FEES_KEY].newValue && typeof changes[FEES_KEY].newValue === 'object'
          ? { ...defaultFees(), ...(changes[FEES_KEY].newValue as Record<string, number>) }
          : defaultFees();
      const echo = isLocalStorageEcho(lastLocalFeesWriteAt) && suppressFeeRerender;
      if (echo) {
        const keep = suppressFeeRerender;
        suppressFeeRerender = true;
        renderTotal();
        suppressFeeRerender = keep;
      } else {
        suppressFeeRerender = false;
        dirty = true;
        forceFull = true;
      }
    }
    if (changes[SEARCH_KEY]) {
      searchContext = (changes[SEARCH_KEY].newValue as SearchContext) || null;
      dirty = true;
    }
    if (changes[TRIP_GUIDE_KEY]) {
      tripGuide = (changes[TRIP_GUIDE_KEY].newValue as SearchContext) || null;
      dirty = true;
    }
    if (changes[CLIENT_KEY]) {
      clientName =
        typeof changes[CLIENT_KEY].newValue === 'string' ? changes[CLIENT_KEY].newValue : '';
      dirty = true;
    }
    if (changes[TRM_KEY]) {
      const v = changes[TRM_KEY].newValue as { rate?: number } | undefined;
      trmRate = v?.rate && v.rate > 0 ? v.rate : 0;
      dirty = true;
    }
    if (changes[TRM_SUPLEMENTO_KEY]) {
      trmSuplemento = normalizeTrmSuplemento(changes[TRM_SUPLEMENTO_KEY].newValue);
      fillTrmSuplementoForm();
      dirty = true;
    }
    if (changes[DISPLAY_CURRENCY_KEY]) {
      displayCurrency = normalizeDisplayCurrency(changes[DISPLAY_CURRENCY_KEY].newValue);
      dirty = true;
    }
    if (changes[TA_SELECTION_KEY]) {
      taSelection = normalizeTaSelection(changes[TA_SELECTION_KEY].newValue);
      dirty = true;
    }
    if (changes[HOTELS_AS_OPTIONS_KEY]) {
      hotelsAsOptions = changes[HOTELS_AS_OPTIONS_KEY].newValue === true;
      dirty = true;
    }
    if (changes[HOTEL_COMPARE_GROUPS_KEY]) {
      void loadHotelCompareGroups().then((g) => {
        hotelOptionGroups = g;
        renderProductos();
        renderTotal();
      });
    }
    if (changes[USD_EQUIV_KEY]) {
      includeUsdEquiv = changes[USD_EQUIV_KEY].newValue === true;
      dirty = true;
    }
    if (changes[PENDING_QUOTE_KEY]) {
      const n = changes[PENDING_QUOTE_KEY].newValue;
      pendingQuoteNumber = typeof n === 'number' && n > 0 ? n : null;
      dirty = true;
    }

    if (dirty) {
      if (forceFull) {
        suppressFeeRerender = false;
        suppressItemAdjRerender = false;
      }
      refreshViews();
      setSyncOk(true);
    }

    if (changes[QUOTE_LINES_KEY] || changes[HISTORY_KEY] || changes[TA_CONFIG_KEY]) {
      void (async () => {
        if (changes[QUOTE_LINES_KEY]) lines = await loadQuoteLines();
        if (changes[HISTORY_KEY]) history = await loadHistory();
        if (changes[TA_CONFIG_KEY]) {
          taConfig = await loadTaConfig();
          fillTaForm();
        }
        renderLists();
        refreshViews();
      })();
    }
  });
}

async function init(): Promise<void> {
  setupTabs();
  bindListEvents();
  bindAddForms();
  bindReset();
  bindTaForm();
  bindTrmSuplementoForm();
  bindWorkspaceEvents();
  watchStorage();
  await loadAll();
}

void init();
