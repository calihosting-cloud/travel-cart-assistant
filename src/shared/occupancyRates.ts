import type {
  BriefingRoom,
  CartItem,
  FlightCartItem,
  FlightPriceBreakdownItem,
  HotelCartItem,
  Occupancy,
  TransferCartItem,
} from '../engine/core/types';
import { formatCartPrice, toDisplay, charmNineTarget } from './cartEngine';
import type { DisplayCurrency } from './trm';
import { transfersForHotel } from './hotelTransferKit';
import { wholesaleTotalFromPlan, formatRoomPlanMix, summarizeRoomPlan, normalizeRoomPlan, hasAccommodationPlan } from './roomPlan';

/**
 * Hotel occupancy-tier rates for wholesale quotes (SGL / DBL / TPL / CHD).
 * Values are hotel-stay figures; WhatsApp adds shared services per person.
 */
/** Snapshot of per-person tiers before manual edit / …9 (from BM probe). */
export interface OccupancyRatesBaseline {
  sglPp?: number;
  dblPp?: number;
  tplPp?: number;
  qplPp?: number;
  chd?: number;
  childEqualsAdult?: boolean;
}

export interface OccupancyTierRates {
  currency: string;
  /** Per person — single room total ÷ 1 */
  sglPp?: number;
  /** Per person — double room total ÷ 2 */
  dblPp?: number;
  /** Per person — triple room total ÷ 3 */
  tplPp?: number;
  /** Child stay differential (room with child − DBL room) ÷ n niños, not ÷ pax */
  chd?: number;
  /** Provider prices child as adult — omit CHD line in WhatsApp */
  childEqualsAdult?: boolean;
  dblRoomTotal?: number;
  tplRoomTotal?: number;
  sglRoomTotal?: number;
  dblWithChildTotal?: number;
  /** SGL room with child(ren) — CHD = (this − sglRoomTotal) ÷ kids */
  sglWithChildTotal?: number;
  /** TPL room with child(ren) — CHD = (this − tplRoomTotal) ÷ kids */
  tplWithChildTotal?: number;
  /** QPL / cuádruple room total (4 adultos) */
  qplRoomTotal?: number;
  /** Per person — quadruple room total ÷ 4 */
  qplPp?: number;
  /** QPL room with child(ren) — CHD = (this − qplRoomTotal) ÷ kids */
  qplWithChildTotal?: number;
  /** Children in the DBL+niño room(s) used to derive `chd` (÷ this when re-sanitizing). */
  chdRoomChildren?: number;
  /** Total mix DBL + DBL+niño (sin precios por fila). */
  comboDblAndChdTotal?: number;
  comboNDbl?: number;
  comboNSgl?: number;
  comboNChd?: number;
  comboNTpl?: number;
  comboNQpl?: number;
  comboDblTplTotal?: number;
  /** Last auto-classification label (UI hint) */
  lastProbe?: string;
  /** Values to restore with «Restablecer» (BM / pre-edit). */
  baseline?: OccupancyRatesBaseline;
}

export type ProbeKind =
  | 'sgl'
  | 'dbl'
  | 'tpl'
  | 'qpl'
  | 'sgl_with_chd'
  | 'dbl_with_chd'
  | 'tpl_with_chd'
  | 'qpl_with_chd'
  | 'mix_sgl_chd'
  | 'mix_dbl_chd'
  | 'mix_tpl_chd'
  | 'mix_qpl_chd'
  | 'mix_dbl_tpl'
  | 'unknown';

export interface OccupancyProbe {
  kind: ProbeKind;
  roomTotal: number;
  adults: number;
  children: number;
  label: string;
  nSgl?: number;
  nDbl?: number;
  nTpl?: number;
  nQpl?: number;
  nChd?: number;
}

/** Comisión aproximada sobre servicios (sin aéreos ni bloqueos). */
export type CommissionApproxKind = 'freelance' | 'agency';

export const COMMISSION_APPROX_RATES: Record<CommissionApproxKind, number> = {
  freelance: 0.1,
  agency: 0.12,
};

export function isNonCommissionableItem(item: CartItem): boolean {
  return item.type === 'flight' || (item.type === 'tour' && !!item.isBloqueo);
}

export function normalizeCommissionApproxKind(raw: unknown): CommissionApproxKind | null {
  if (raw === 'freelance' || raw === 'agency') return raw;
  return null;
}

export function approxCommissionAmount(
  commissionableTotal: number | undefined,
  kind: CommissionApproxKind | null | undefined
): number | undefined {
  if (kind == null || commissionableTotal == null || !Number.isFinite(commissionableTotal)) {
    return undefined;
  }
  if (!(commissionableTotal > 0)) return undefined;
  const rate = COMMISSION_APPROX_RATES[kind];
  return Math.round(commissionableTotal * rate);
}

export function emptyOccupancyRates(currency: string): OccupancyTierRates {
  return { currency: (currency || 'COP').toUpperCase() };
}

/** Strip BM quantity prefix: "1 x Estándar" → "Estándar". */
export function stripBmRoomQuantityPrefix(roomType?: string): string {
  return (roomType || '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\d+\s*[x×]\s*/i, '')
    .trim();
}

/** BM often puts “1 habitación DBL 2 personas” in roomType — not a product name. */
export function isGenericOccupancyRoomType(roomType?: string): boolean {
  const s = stripBmRoomQuantityPrefix(roomType);
  if (!s) return true;
  if (/^\d+\s*habitacion/i.test(s)) return true;
  if (/\b(dbl|doble|tpl|triple|sgl|single)\b/i.test(s) && /\b(adulto|persona|pax|niñ)/i.test(s)) {
    return true;
  }
  return false;
}

export function displayHotelRoomType(roomType?: string): string {
  const s = stripBmRoomQuantityPrefix(roomType);
  if (!s || isGenericOccupancyRoomType(roomType)) return '';
  return s;
}

/** Normalize board labels (ROOM ONLY → Solo habitación). Meal type, not room name. */
export function displayHotelBoardBasis(board?: string): string {
  const s = (board || '').replace(/\s+/g, ' ').trim();
  if (!s) return '';
  const key = s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (key === 'room only' || key === 'solo habitacion') return 'Solo habitación';
  return s;
}

/** Agency / WhatsApp wording for occupancy tiers. */
export function occupancyTierAgencyLabel(
  tier: 'sgl' | 'dbl' | 'tpl' | 'qpl' | 'chd'
): string {
  if (tier === 'sgl') return 'SENCILLA';
  if (tier === 'dbl') return 'DOBLE';
  if (tier === 'tpl') return 'TRIPLE';
  if (tier === 'qpl') return 'CUÁDRUPLE';
  return 'NIÑO';
}

/** Excess rows from package …9 (Tarifa pp), for Totals desglose. */
export function packageRoundUpliftEntries(
  uplift:
    | {
        sglPp?: number;
        dblPp?: number;
        tplPp?: number;
        qplPp?: number;
        chd?: number;
      }
    | undefined
): Array<{ code: 'sgl' | 'dbl' | 'tpl' | 'qpl' | 'chd'; label: string; amount: number }> {
  if (!uplift) return [];
  const out: Array<{ code: 'sgl' | 'dbl' | 'tpl' | 'qpl' | 'chd'; label: string; amount: number }> = [];
  if (uplift.sglPp != null && uplift.sglPp > 0) {
    out.push({ code: 'sgl', label: 'SGL', amount: uplift.sglPp });
  }
  if (uplift.dblPp != null && uplift.dblPp > 0) {
    out.push({ code: 'dbl', label: 'DBL', amount: uplift.dblPp });
  }
  if (uplift.tplPp != null && uplift.tplPp > 0) {
    out.push({ code: 'tpl', label: 'TPL', amount: uplift.tplPp });
  }
  if (uplift.qplPp != null && uplift.qplPp > 0) {
    out.push({ code: 'qpl', label: 'QPL', amount: uplift.qplPp });
  }
  if (uplift.chd != null && uplift.chd > 0) {
    out.push({ code: 'chd', label: 'CHD', amount: uplift.chd });
  }
  return out;
}

/** Lines like “Tarifa pp DOBLE: $…” for cart, panel, compare. */
export function formatWholesalePersonValues(rates?: OccupancyTierRates): string[] {
  const fixed = rates ? coerceOccupancyRateCurrency(rates) : undefined;
  const cur = fixed?.currency || 'COP';
  const lines: string[] = [];
  if (fixed?.sglPp != null && Number.isFinite(fixed.sglPp)) {
    lines.push(
      `Tarifa pp ${occupancyTierAgencyLabel('sgl')}: ${formatCartPrice(cur, fixed.sglPp)}`
    );
  }
  if (fixed?.dblPp != null && Number.isFinite(fixed.dblPp)) {
    lines.push(
      `Tarifa pp ${occupancyTierAgencyLabel('dbl')}: ${formatCartPrice(cur, fixed.dblPp)}`
    );
  }
  if (fixed?.tplPp != null && Number.isFinite(fixed.tplPp)) {
    lines.push(
      `Tarifa pp ${occupancyTierAgencyLabel('tpl')}: ${formatCartPrice(cur, fixed.tplPp)}`
    );
  }
  if (fixed?.qplPp != null && Number.isFinite(fixed.qplPp)) {
    lines.push(
      `Tarifa pp ${occupancyTierAgencyLabel('qpl')}: ${formatCartPrice(cur, fixed.qplPp)}`
    );
  }
  if (fixed?.childEqualsAdult) {
    lines.push('Tarifa pp NIÑO = tarifa adulto');
  } else {
    // Package or hotel CHD: show when probed, including 0 hotel + services > 0.
    const chd =
      fixed?.chd != null && Number.isFinite(fixed.chd)
        ? Math.max(0, fixed.chd)
        : undefined;
    if (chd != null) {
      lines.push(
        `Tarifa pp ${occupancyTierAgencyLabel('chd')}: ${formatCartPrice(cur, chd)}`
      );
    }
  }
  return lines;
}

export type OccupancyTierCode = 'sgl' | 'dbl' | 'tpl' | 'qpl' | 'chd';

/** Per-tier original (baseline) vs current, for hotel card display. */
export function wholesaleTierWithOriginal(
  rates?: OccupancyTierRates
): Array<{
  tier: OccupancyTierCode;
  label: string;
  currency: string;
  original?: number;
  current: number;
}> {
  if (!rates) return [];
  const cur = rates.currency || 'COP';
  const b = rates.baseline;
  const out: Array<{
    tier: OccupancyTierCode;
    label: string;
    currency: string;
    original?: number;
    current: number;
  }> = [];
  const push = (tier: OccupancyTierCode, current?: number, original?: number) => {
    if (current == null || !Number.isFinite(current)) return;
    // Never surface negative child differentials in UI.
    if (tier === 'chd' && current < 0) current = 0;
    const origRaw =
      original != null && Number.isFinite(original) && original !== current
        ? original
        : undefined;
    const orig =
      tier === 'chd' && origRaw != null && origRaw < 0 ? 0 : origRaw;
    out.push({
      tier,
      label: occupancyTierAgencyLabel(tier),
      currency: cur,
      original: orig !== current ? orig : undefined,
      current,
    });
  };
  push('sgl', rates.sglPp, b?.sglPp);
  push('dbl', rates.dblPp, b?.dblPp);
  push('tpl', rates.tplPp, b?.tplPp);
  push('qpl', rates.qplPp, b?.qplPp);
  if (rates.childEqualsAdult) {
    // shown as note elsewhere; skip numeric CHD
  } else {
    // Include CHD 0 when BM probe found DBL+niño = DBL (still probed).
    const chdPp = hotelChdTierPp(rates);
    push('chd', chdPp, b?.chd != null ? Math.max(0, b.chd) : undefined);
  }
  return out;
}

/**
 * Mix lines from briefing room plan: "DBL x 1 = $…", "CHD x 1 = $…".
 * Counts rooms (or children), value = pp × adults-in-room × rooms (or pp × children).
 */
export function accommodationMixBreakdown(
  rooms: BriefingRoom[] | undefined,
  rates: OccupancyTierRates | undefined
): { lines: Array<{ code: string; count: number; total: number }>; subtotal?: number } {
  const plan = normalizeRoomPlan(rooms);
  if (!rates || plan.length === 0) return { lines: [] };
  let sgl = 0;
  let dbl = 0;
  let tpl = 0;
  let qpl = 0;
  let chd = 0;
  for (const room of plan) {
    if (room.kind === 'SGL') sgl += 1;
    else if (room.kind === 'TPL') tpl += 1;
    else if (room.kind === 'QPL') qpl += 1;
    else dbl += 1;
    chd += Math.max(0, room.children || 0);
  }
  const cur = rates.currency || 'COP';
  const lines: Array<{ code: string; count: number; total: number }> = [];
  const add = (code: string, count: number, pp: number | undefined, adultsPer: number) => {
    if (count <= 0 || pp == null || !Number.isFinite(pp)) return;
    lines.push({ code, count, total: Math.round(pp * adultsPer * count) });
  };
  add('SGL', sgl, rates.sglPp, 1);
  add('DBL', dbl, rates.dblPp, 2);
  add('TPL', tpl, rates.tplPp, 3);
  add('QPL', qpl, rates.qplPp, 4);
  if (chd > 0) {
    if (rates.childEqualsAdult) {
      // children priced as adult of their room — approximate with DBL/TPL already in room totals;
      // only add explicit CHD line when a child rate exists.
    } else if (rates.chd != null && Number.isFinite(rates.chd)) {
      const chdPp = displayChdTierPp(rates) ?? 0;
      if (chdPp > 0) lines.push({ code: 'CHD', count: chd, total: Math.round(chdPp * chd) });
    }
  }
  const subtotal = wholesaleTotalFromPlan(plan, rates);
  void cur;
  return {
    lines,
    subtotal: subtotal != null && Number.isFinite(subtotal) ? subtotal : undefined,
  };
}

/** Sum SGL/DBL/TPL/CHD pp across hotels in the same option. */
export function sumPackageTier(
  pkgs: Array<{
    currency?: string;
    sglPp?: number;
    dblPp?: number;
    tplPp?: number;
    qplPp?: number;
    chd?: number;
    childEqualsAdult?: boolean;
  }>
): {
  currency: string;
  sglPp?: number;
  dblPp?: number;
  tplPp?: number;
  qplPp?: number;
  chd?: number;
  childEqualsAdult?: boolean;
} {
  if (pkgs.length === 0) return { currency: 'COP' };
  const currency = (pkgs.find((p) => p.currency)?.currency || 'COP').toUpperCase();
  const sum = (pick: (p: (typeof pkgs)[0]) => number | undefined): number | undefined => {
    let total = 0;
    let any = false;
    for (const p of pkgs) {
      const n = pick(p);
      if (n != null && Number.isFinite(n)) {
        total += n;
        any = true;
      }
    }
    return any ? roundMoney(total, currency) : undefined;
  };
  const childEqualsAdult = pkgs.every((p) => p.childEqualsAdult);
  const anyChildEq = pkgs.some((p) => p.childEqualsAdult);
  const chd = childEqualsAdult ? undefined : sum((p) => (p.childEqualsAdult ? undefined : p.chd));
  return {
    currency,
    sglPp: sum((p) => p.sglPp),
    dblPp: sum((p) => p.dblPp),
    tplPp: sum((p) => p.tplPp),
    qplPp: sum((p) => p.qplPp),
    chd,
    childEqualsAdult: anyChildEq && childEqualsAdult ? true : undefined,
  };
}

/** Adults define SGL/DBL/TPL. A child in a double is DBL+niño, not Triple. */
export function commercialRoomLabel(adults: number, children = 0): string {
  const kids = Math.max(0, children);
  if (adults <= 1) return kids > 0 ? 'SGL+niño' : 'Sencilla';
  if (adults === 2) return kids > 0 ? 'DBL+niño' : 'Doble';
  if (adults === 3) return kids > 0 ? 'TPL+niño' : 'Triple';
  if (adults === 4) return kids > 0 ? 'QPL+niño' : 'Cuádruple';
  return `${adults + kids} personas`;
}

function roomTypeMatchKey(roomType?: string): string {
  const s = stripBmRoomQuantityPrefix(roomType).toLowerCase();
  if (!s || /^\d+\s*habitaciones/.test(s)) return '';
  return s;
}

/**
 * Room name without occupancy words so DBL / DBL+niño / TPL probes of the
 * same category still merge (BM often relabels the row as Triple).
 */
export function occupancyAgnosticRoomKey(roomType?: string): string {
  const s = stripBmRoomQuantityPrefix(roomType).toLowerCase();
  if (!s || isGenericOccupancyRoomType(roomType)) return '';
  return s
    .replace(
      /\b(sencilla|doble|triple|cuadruple|cuádruple|sgl|dbl|tpl|qpl|single|double|twin|niñ\w*)\b/gi,
      ''
    )
    .replace(/\s+/g, ' ')
    .trim();
}

/** Stable key to merge probe adds into the same hotel option. */
export function hotelOccupancyMatchKey(item: HotelCartItem): string {
  return [
    item.hotelId,
    occupancyAgnosticRoomKey(item.selectedRate.roomType) ||
      roomTypeMatchKey(item.selectedRate.roomType),
    (item.selectedRate.boardBasis || '').trim().toLowerCase(),
    item.checkIn,
    item.checkOut,
  ].join('|');
}

export function findHotelMergeTarget(
  items: CartItem[],
  incoming: HotelCartItem
): HotelCartItem | undefined {
  const inKey = occupancyAgnosticRoomKey(incoming.selectedRate.roomType);
  const inBoard = (incoming.selectedRate.boardBasis || '').trim().toLowerCase();
  return items.find((i): i is HotelCartItem => {
    if (i.type !== 'hotel' || i.hotelId !== incoming.hotelId) return false;
    if (i.checkIn !== incoming.checkIn || i.checkOut !== incoming.checkOut) return false;
    const board = (i.selectedRate.boardBasis || '').trim().toLowerCase();
    if (board !== inBoard) return false;
    const tKey = occupancyAgnosticRoomKey(i.selectedRate.roomType);
    if (!inKey || !tKey) return true;
    return tKey === inKey;
  });
}

function roundMoney(amount: number, currency: string): number {
  if ((currency || 'COP').toUpperCase() === 'USD') {
    return Math.round(amount * 100) / 100;
  }
  return Math.round(amount);
}

/**
 * Convert hotel occupancy tiers to the cart display currency (COP↔USD via TRM).
 * Shared services / itemTotals are already in display currency — mix only after this.
 */
function snapshotOccupancyBaseline(rates: OccupancyTierRates): OccupancyRatesBaseline {
  return {
    sglPp: rates.sglPp,
    dblPp: rates.dblPp,
    tplPp: rates.tplPp,
    qplPp: rates.qplPp,
    chd: rates.childEqualsAdult ? undefined : rates.chd,
    childEqualsAdult: rates.childEqualsAdult,
  };
}

function baselineHasAny(b?: OccupancyRatesBaseline): boolean {
  if (!b) return false;
  return (
    (b.sglPp != null && Number.isFinite(b.sglPp)) ||
    (b.dblPp != null && Number.isFinite(b.dblPp)) ||
    (b.tplPp != null && Number.isFinite(b.tplPp)) ||
    (b.qplPp != null && Number.isFinite(b.qplPp)) ||
    (b.chd != null && Number.isFinite(b.chd)) ||
    !!b.childEqualsAdult
  );
}

/** True when Restablecer can restore original tiers. */
export function occupancyHasBaseline(rates?: OccupancyTierRates): boolean {
  return baselineHasAny(rates?.baseline);
}

/** After BM probe / room-price derive: store current tiers as restore target. */
export function refreshOccupancyBaseline(rates: OccupancyTierRates): OccupancyTierRates {
  const baseline = snapshotOccupancyBaseline(rates);
  if (!baselineHasAny(baseline)) return rates;
  return { ...rates, baseline };
}

/** Before manual edit / …9: keep first snapshot if missing. */
export function ensureOccupancyBaseline(rates: OccupancyTierRates): OccupancyTierRates {
  if (baselineHasAny(rates.baseline)) return rates;
  return refreshOccupancyBaseline(rates);
}

export function restoreOccupancyFromBaseline(
  rates: OccupancyTierRates
): OccupancyTierRates | null {
  const b = rates.baseline;
  if (!baselineHasAny(b)) return null;
  const next: OccupancyTierRates = { ...rates, baseline: b };
  if (b!.sglPp != null && Number.isFinite(b!.sglPp)) next.sglPp = b!.sglPp;
  else delete next.sglPp;
  if (b!.dblPp != null && Number.isFinite(b!.dblPp)) next.dblPp = b!.dblPp;
  else delete next.dblPp;
  if (b!.tplPp != null && Number.isFinite(b!.tplPp)) next.tplPp = b!.tplPp;
  else delete next.tplPp;
  if (b!.qplPp != null && Number.isFinite(b!.qplPp)) next.qplPp = b!.qplPp;
  else delete next.qplPp;
  if (b!.childEqualsAdult) {
    next.childEqualsAdult = true;
    delete next.chd;
  } else {
    delete next.childEqualsAdult;
    if (b!.chd != null && Number.isFinite(b!.chd)) next.chd = b!.chd;
    else delete next.chd;
  }
  return next;
}

/** Small guide text next to Restablecer, e.g. "DBL 339 · TPL 309 · CHD 179". */
export function formatOccupancyBaselineGuide(
  rates: OccupancyTierRates | undefined
): string | null {
  const b = rates?.baseline;
  if (!baselineHasAny(b)) return null;
  const usd = (rates?.currency || 'COP').toUpperCase() === 'USD';
  const fmt = (n: number) => (usd ? n.toFixed(2) : String(Math.round(n)));
  const parts: string[] = [];
  if (b!.sglPp != null && Number.isFinite(b!.sglPp)) parts.push(`SGL ${fmt(b!.sglPp)}`);
  if (b!.dblPp != null && Number.isFinite(b!.dblPp)) parts.push(`DBL ${fmt(b!.dblPp)}`);
  if (b!.tplPp != null && Number.isFinite(b!.tplPp)) parts.push(`TPL ${fmt(b!.tplPp)}`);
  if (b!.qplPp != null && Number.isFinite(b!.qplPp)) parts.push(`QPL ${fmt(b!.qplPp)}`);
  if (b!.childEqualsAdult) parts.push('CHD=adt');
  else if (b!.chd != null && Number.isFinite(b!.chd)) {
    parts.push(`CHD ${fmt(Math.max(0, b!.chd))}`);
  }
  return parts.length ? parts.join(' · ') : null;
}

/** Current tier pp (after mayor / …9), for UI that must show live values. */
export function formatOccupancyCurrentGuide(
  rates: OccupancyTierRates | undefined
): string | null {
  if (!rates) return null;
  const usd = (rates.currency || 'COP').toUpperCase() === 'USD';
  const fmt = (n: number) =>
    usd
      ? n.toFixed(2)
      : Math.round(n).toLocaleString('es-CO');
  const parts: string[] = [];
  if (rates.sglPp != null && Number.isFinite(rates.sglPp)) parts.push(`SGL ${fmt(rates.sglPp)}`);
  if (rates.dblPp != null && Number.isFinite(rates.dblPp)) parts.push(`DBL ${fmt(rates.dblPp)}`);
  if (rates.tplPp != null && Number.isFinite(rates.tplPp)) parts.push(`TPL ${fmt(rates.tplPp)}`);
  if (rates.qplPp != null && Number.isFinite(rates.qplPp)) parts.push(`QPL ${fmt(rates.qplPp)}`);
  if (rates.childEqualsAdult) parts.push('CHD=adt');
  else {
    const chd = hotelChdTierPp(rates);
    if (chd != null) parts.push(`CHD ${fmt(chd)}`);
  }
  return parts.length ? parts.join(' · ') : null;
}

export function occupancyRatesToCurrency(
  rates: OccupancyTierRates | undefined,
  targetCurrency: string,
  effTrm: number,
  trmDia?: number
): OccupancyTierRates | undefined {
  if (!rates) return undefined;
  const fixed = sanitizeOccupancyRates(rates, { effTrm, trmDia, displayCurrency: (targetCurrency === 'USD' ? 'USD' : 'COP') as DisplayCurrency });
  const from = (fixed.currency || 'COP').toUpperCase();
  const to = (targetCurrency || 'COP').toUpperCase();
  // Even same currency: apply FX cushion when trmDia is set.
  const needsConv = from !== to || (trmDia != null && trmDia > 0 && effTrm > trmDia);
  if (!needsConv) {
    return sanitizeOccupancyRates({ ...fixed, currency: to }, { effTrm, trmDia, displayCurrency: (to === 'USD' ? 'USD' : 'COP') as DisplayCurrency });
  }
  // Keep native currency + magnitudes when TRM is missing (never stamp USD on COP).
  if (!(effTrm > 0) && from !== to) return { ...fixed, currency: from };
  if (!(effTrm > 0)) return { ...fixed, currency: from };
  const target = (to === 'USD' ? 'USD' : 'COP') as DisplayCurrency;
  const conv = (n?: number): number | undefined => {
    if (n == null || !Number.isFinite(n)) return undefined;
    return toDisplay(n, from, target, effTrm, trmDia).price;
  };
  const baseline = fixed.baseline
    ? {
        sglPp: conv(fixed.baseline.sglPp),
        dblPp: conv(fixed.baseline.dblPp),
        tplPp: conv(fixed.baseline.tplPp),
        qplPp: conv(fixed.baseline.qplPp),
        chd: fixed.baseline.childEqualsAdult
          ? undefined
          : conv(fixed.baseline.chd),
        childEqualsAdult: fixed.baseline.childEqualsAdult,
      }
    : undefined;
  return sanitizeOccupancyRates(
    {
      ...fixed,
      currency: to,
      sglPp: conv(fixed.sglPp),
      dblPp: conv(fixed.dblPp),
      tplPp: conv(fixed.tplPp),
      chd: fixed.childEqualsAdult ? undefined : conv(fixed.chd),
      sglRoomTotal: conv(fixed.sglRoomTotal),
      dblRoomTotal: conv(fixed.dblRoomTotal),
      tplRoomTotal: conv(fixed.tplRoomTotal),
      qplRoomTotal: conv(fixed.qplRoomTotal),
      qplPp: conv(fixed.qplPp),
      dblWithChildTotal: conv(fixed.dblWithChildTotal),
      sglWithChildTotal: conv(fixed.sglWithChildTotal),
      tplWithChildTotal: conv(fixed.tplWithChildTotal),
      qplWithChildTotal: conv(fixed.qplWithChildTotal),
      baseline,
    },
    { effTrm, trmDia, displayCurrency: target }
  );
}

/**
 * USD per-person hotel stay above this is almost certainly mislabeled COP
 * (e.g. after …9/mayor valor stamped displayCurrency without converting).
 */
const USD_PP_ABSURD = 50_000;
/** Child differential this large in USD is a COP leftover mixed into USD tiers. */
const USD_CHD_ABSURD = 5_000;
const COP_CHD_ABSURD = 50_000_000;

/** Clamp child differential; BM sometimes yields DBL+niño < DBL → negative. */
export function normalizeChdDifferential(chd: number | undefined): number | undefined {
  if (chd == null || !Number.isFinite(chd)) return undefined;
  return Math.max(0, chd);
}

function chdAbsurdForCurrency(
  chd: number,
  currency: string,
  dblPp?: number
): boolean {
  const cur = (currency || 'COP').toUpperCase();
  if (!(chd > 0)) return false;
  if (cur === 'USD') {
    if (chd >= USD_CHD_ABSURD) return true;
    if (dblPp != null && dblPp > 0 && dblPp < USD_PP_ABSURD && chd > dblPp * 20) return true;
    return false;
  }
  if (chd >= COP_CHD_ABSURD) return true;
  if (dblPp != null && dblPp > 0 && chd > dblPp * 20) return true;
  return false;
}

/**
 * Hotel CHD differential when probed (includes 0: DBL+niño = DBL).
 * Undefined only if never probed / childEqualsAdult.
 */
export function hotelChdTierPp(rates: OccupancyTierRates | undefined): number | undefined {
  if (!rates || rates.childEqualsAdult) return undefined;
  const fixed = sanitizeOccupancyRates(rates);
  if (fixed.chd == null || !Number.isFinite(fixed.chd)) return undefined;
  return Math.max(0, fixed.chd);
}

/**
 * Hotel CHD for hotel-only labels. Hides pure-zero hotel differential
 * (package totals use {@link hotelChdTierPp} + services instead).
 */
export function displayChdTierPp(rates: OccupancyTierRates | undefined): number | undefined {
  const n = hotelChdTierPp(rates);
  if (n == null || !(n > 0)) return undefined;
  return n;
}

function roomTotalsConsistent(
  childRoomTotal: number,
  dblRoomTotal: number
): boolean {
  if (!(dblRoomTotal > 0) || !Number.isFinite(childRoomTotal)) return false;
  const ratio = childRoomTotal / dblRoomTotal;
  return ratio >= 0 && ratio <= 3;
}

function setChdFromRoomDiff(
  next: OccupancyTierRates,
  childRoomTotal: number,
  dblRoomTotal: number,
  childCount = 1
): void {
  if (next.childEqualsAdult || !roomTotalsConsistent(childRoomTotal, dblRoomTotal)) return;
  const cur = (next.currency || 'COP').toUpperCase();
  const kids = Math.max(1, Math.floor(childCount) || 1);
  next.chdRoomChildren = kids;
  // DBL+2 niños: (hab con niños − DBL) ÷ 2 = tarifa de 1 niño.
  next.chd = normalizeChdDifferential(
    roundMoney((childRoomTotal - dblRoomTotal) / kids, cur === 'USD' ? 'USD' : 'COP')
  );
}

export type SanitizeOccupancyFx = {
  effTrm?: number;
  trmDia?: number;
  displayCurrency?: DisplayCurrency;
};

/**
 * Fix negative / absurd CHD and COP magnitudes wrongly labeled as USD.
 * With TRM, tries to recover CHD written in COP inside a USD tier set.
 */
export function sanitizeOccupancyRates(
  rates: OccupancyTierRates,
  fx?: SanitizeOccupancyFx
): OccupancyTierRates {
  let next: OccupancyTierRates = { ...rates };
  const cur0 = (next.currency || 'COP').toUpperCase();
  const dbl = next.dblPp;
  let chd = next.chd;

  if (chd != null && Number.isFinite(chd) && chd < 0) chd = 0;
  if (next.baseline?.chd != null && next.baseline.chd < 0) {
    next = { ...next, baseline: { ...next.baseline, chd: 0 } };
  }

  // Adult tiers in USD scale but CHD still in COP magnitude (519119 as "USD").
  if (
    chd != null &&
    chd > 0 &&
    cur0 === 'USD' &&
    dbl != null &&
    dbl > 0 &&
    dbl < USD_PP_ABSURD &&
    chd >= USD_CHD_ABSURD &&
    fx?.effTrm &&
    fx.effTrm > 0
  ) {
    chd = normalizeChdDifferential(
      toDisplay(chd, 'COP', 'USD', fx.effTrm, fx.trmDia).price
    );
    next = { ...next, chd };
  }

  if (
    next.dblWithChildTotal != null &&
    next.dblRoomTotal != null &&
    !next.childEqualsAdult &&
    roomTotalsConsistent(next.dblWithChildTotal, next.dblRoomTotal)
  ) {
    const kids = Math.max(1, next.chdRoomChildren || 1);
    const fromRooms = normalizeChdDifferential(
      roundMoney(
        (next.dblWithChildTotal - next.dblRoomTotal) / kids,
        cur0 === 'USD' ? 'USD' : 'COP'
      )
    );
    if (chd == null || chdAbsurdForCurrency(chd, cur0, dbl)) {
      chd = fromRooms;
      next = { ...next, chd, chdRoomChildren: kids };
    }
  }

  if (chd != null && chdAbsurdForCurrency(chd, cur0, dbl)) {
    const { chd: _c, dblWithChildTotal: _d, ...rest } = next;
    next = { ...rest, currency: next.currency };
    if (next.baseline) {
      const { chd: _bc, ...bRest } = next.baseline;
      next = { ...next, baseline: { ...bRest } };
    }
  } else if (chd != null) {
    next = { ...next, chd: normalizeChdDifferential(chd) };
  }

  const cur = (next.currency || 'COP').toUpperCase();
  if (cur !== 'USD') return next;
  const samples = [next.sglPp, next.dblPp, next.tplPp, next.chd].filter(
    (n): n is number => n != null && Number.isFinite(n) && n > 0
  );
  if (samples.length === 0) return next;
  if (!samples.some((n) => n >= USD_PP_ABSURD)) return next;
  return { ...next, currency: 'COP' };
}

/** @deprecated alias — prefer {@link sanitizeOccupancyRates}. */
export function coerceOccupancyRateCurrency(rates: OccupancyTierRates): OccupancyTierRates {
  return sanitizeOccupancyRates(rates);
}

/**
 * Add a display-currency bump to occupancy tiers.
 * Pass a single number to bump every filled tier, or per-tier amounts
 * `{ sgl?, dbl?, tpl?, chd? }` so each acomodación can have its own mayor valor.
 */
export type MayorValorByTier = {
  sgl?: number;
  dbl?: number;
  tpl?: number;
  qpl?: number;
  chd?: number;
};

export function applyMayorValorToOccupancyRates(
  rates: OccupancyTierRates | undefined,
  mayorDisplay: number | MayorValorByTier,
  displayCurrency: DisplayCurrency,
  effTrm: number,
  trmDia?: number
): OccupancyTierRates | undefined {
  if (!rates) return rates;
  const bumps: MayorValorByTier =
    typeof mayorDisplay === 'number'
      ? {
          sgl: mayorDisplay,
          dbl: mayorDisplay,
          tpl: mayorDisplay,
          qpl: mayorDisplay,
          chd: mayorDisplay,
        }
      : mayorDisplay;
  const anyBump = (['sgl', 'dbl', 'tpl', 'qpl', 'chd'] as const).some(
    (k) => bumps[k] != null && Number.isFinite(bumps[k]!) && bumps[k]! > 0
  );
  if (!anyBump) return rates;
  const withBase = ensureOccupancyBaseline(coerceOccupancyRateCurrency(rates));
  const from = (withBase.currency || 'COP').toUpperCase();
  const converted = occupancyRatesToCurrency(withBase, displayCurrency, effTrm, trmDia);
  // If we cannot convert to the display currency, bump in native currency only.
  const working =
    converted && (converted.currency || '').toUpperCase() === displayCurrency
      ? converted
      : { ...withBase, currency: from };
  const cur = (working.currency || from).toUpperCase() as DisplayCurrency;
  const add = (n: number | undefined, bump: number | undefined): number | undefined => {
    if (n == null || !Number.isFinite(n)) return undefined;
    const b = bump != null && Number.isFinite(bump) && bump > 0 ? bump : 0;
    if (!(b > 0)) return n;
    return roundMoney(n + b, cur === 'USD' ? 'USD' : 'COP');
  };
  return {
    ...working,
    currency: working.currency || from,
    sglPp: add(working.sglPp, bumps.sgl),
    dblPp: add(working.dblPp, bumps.dbl),
    tplPp: add(working.tplPp, bumps.tpl),
    qplPp: add(working.qplPp, bumps.qpl),
    chd: working.childEqualsAdult ? undefined : add(working.chd, bumps.chd),
    baseline: working.baseline || withBase.baseline,
  };
}

/** Per-tier uplift vs baseline (display currency), for totals desglose. */
export function occupancyTierUpliftFromBaseline(
  rates: OccupancyTierRates | undefined
): Array<{ tier: OccupancyTierCode; label: string; uplift: number; currency: string }> {
  const tiers = wholesaleTierWithOriginal(rates);
  return tiers
    .filter((t) => t.original != null && t.current !== t.original)
    .map((t) => ({
      tier: t.tier,
      label: t.label,
      uplift: t.current - (t.original as number),
      currency: t.currency,
    }));
}

/**
 * Round every accommodation tier (SGL / DBL / TPL / CHD) to charm-9
 * in the active display currency (COP …9.000 / USD …9).
 * Prefer {@link charmNinePackageTiers} for quote Tarifa pp (hotel + servicios).
 */
export function charmNineOccupancyRates(
  rates: OccupancyTierRates | undefined,
  displayCurrency: DisplayCurrency,
  effTrm: number,
  trmDia?: number
): OccupancyTierRates | undefined {
  if (!rates) return undefined;
  const withBase = ensureOccupancyBaseline(coerceOccupancyRateCurrency(rates));
  const from = (withBase.currency || 'COP').toUpperCase();
  const converted = occupancyRatesToCurrency(withBase, displayCurrency, effTrm, trmDia);
  const working =
    converted && (converted.currency || '').toUpperCase() === displayCurrency
      ? converted
      : { ...withBase, currency: from };
  const cur = (working.currency || from).toUpperCase() as DisplayCurrency;
  const round = (n?: number): number | undefined => {
    if (n == null || !Number.isFinite(n)) return undefined;
    return charmNineTarget(n, cur === 'USD' ? 'USD' : 'COP');
  };
  return {
    ...working,
    currency: working.currency || from,
    sglPp: round(working.sglPp),
    dblPp: round(working.dblPp),
    tplPp: round(working.tplPp),
    qplPp: round(working.qplPp),
    chd: working.childEqualsAdult ? undefined : round(working.chd),
    baseline: working.baseline || withBase.baseline,
  };
}

/** Round package Tarifa pp (combined hotel + services) to …9 / …9.000. */
export function charmNinePackageTiers<
  T extends {
    currency?: string;
    sglPp?: number;
    dblPp?: number;
    tplPp?: number;
    qplPp?: number;
    chd?: number;
    childEqualsAdult?: boolean;
  },
>(pkg: T, displayCurrency: DisplayCurrency): T {
  const cur = (displayCurrency === 'USD' ? 'USD' : 'COP') as DisplayCurrency;
  const round = (n?: number): number | undefined => {
    if (n == null || !Number.isFinite(n)) return undefined;
    return charmNineTarget(n, cur);
  };
  return {
    ...pkg,
    sglPp: round(pkg.sglPp),
    dblPp: round(pkg.dblPp),
    tplPp: round(pkg.tplPp),
    qplPp: round(pkg.qplPp),
    chd: pkg.childEqualsAdult ? pkg.chd : round(pkg.chd),
  };
}

/** Apply …9 to tier pp when auto-round is on; otherwise leave rates as-is. */
export function maybeAutoRoundOccupancyRates(
  rates: OccupancyTierRates | undefined,
  displayCurrency: DisplayCurrency,
  effTrm: number,
  trmDia: number | undefined,
  autoRound: boolean
): OccupancyTierRates | undefined {
  if (!rates) return undefined;
  if (!autoRound) return rates;
  return charmNineOccupancyRates(rates, displayCurrency, effTrm, trmDia) ?? rates;
}

/** Restore tier pp from baseline (undo …9 / mayor on tiers). */
export function unroundOccupancyRates(
  rates: OccupancyTierRates | undefined
): OccupancyTierRates | undefined {
  if (!rates) return undefined;
  return restoreOccupancyFromBaseline(rates) ?? rates;
}

/**
 * Peel legacy hotel-level …9 while keeping mayor vs sonda when possible.
 * Quote rounding now targets package Tarifa pp, not hotel-only rates.
 */
export function stripHotelCharmNineKeepMayor(
  rates: OccupancyTierRates | undefined
): OccupancyTierRates | undefined {
  if (!rates) return undefined;
  const withBase = ensureOccupancyBaseline(coerceOccupancyRateCurrency(rates));
  const b = withBase.baseline;
  if (!b) return withBase;
  const cur = ((withBase.currency || 'COP').toUpperCase() === 'USD' ? 'USD' : 'COP') as DisplayCurrency;
  const peel = (current?: number, orig?: number): number | undefined => {
    if (current == null || !Number.isFinite(current)) return current;
    if (orig == null || !Number.isFinite(orig)) return current;
    const roundedOrig = charmNineTarget(orig, cur);
    if (Math.abs(current - roundedOrig) < 0.001) return orig;
    if (Math.abs(current - orig) < 0.001) return orig;
    // current ≈ charmNine(orig + mayor) → recover mayor ≈ current − charmNine(orig)
    if (current > roundedOrig) return orig + (current - roundedOrig);
    return current;
  };
  const next: OccupancyTierRates = {
    ...withBase,
    sglPp: peel(withBase.sglPp, b.sglPp),
    dblPp: peel(withBase.dblPp, b.dblPp),
    tplPp: peel(withBase.tplPp, b.tplPp),
    chd: withBase.childEqualsAdult ? withBase.chd : peel(withBase.chd, b.chd),
    baseline: b,
  };
  if (JSON.stringify(next) === JSON.stringify(withBase)) return withBase;
  return next;
}

/**
 * Strip legacy hotel-level …9 from cart hotels.
 * Package …9 is applied in {@link summarizeWholesaleOption} via `roundCharmNine`.
 */
export function applyAutoRoundToHotelItems(
  items: CartItem[],
  _autoRound: boolean,
  _displayCurrency: DisplayCurrency,
  _effTrm: number,
  _trmDia: number | undefined
): { items: CartItem[]; changed: boolean } {
  let changed = false;
  const next = items.map((item) => {
    if (item.type !== 'hotel' || !item.occupancyRates) return item;
    const updated = stripHotelCharmNineKeepMayor(item.occupancyRates as OccupancyTierRates);
    if (!updated) return item;
    if (JSON.stringify(updated) === JSON.stringify(item.occupancyRates)) return item;
    changed = true;
    return { ...item, occupancyRates: updated, redondeo: 0 };
  });
  return { items: changed ? next : items, changed };
}

/** One-time repair of stored hotel tier rates (negative / mixed-currency CHD). */
export function repairHotelOccupancyInItems(
  items: CartItem[],
  fx?: SanitizeOccupancyFx
): { items: CartItem[]; changed: boolean } {
  let changed = false;
  const next = items.map((item) => {
    if (item.type !== 'hotel' || !item.occupancyRates) return item;
    const sanitized = sanitizeOccupancyRates(item.occupancyRates as OccupancyTierRates, fx);
    if (JSON.stringify(sanitized) === JSON.stringify(item.occupancyRates)) return item;
    changed = true;
    return { ...item, occupancyRates: sanitized };
  });
  return { items: changed ? next : items, changed };
}

function isSglRoom(r: Occupancy): boolean {
  return r.adults === 1 && (r.children || 0) === 0;
}

/** SGL with one or more children — CHD = (hab − SGL) ÷ n niños. */
function isSglWithChildRoom(r: Occupancy): boolean {
  return r.adults === 1 && (r.children || 0) >= 1;
}

function isDblRoom(r: Occupancy): boolean {
  return r.adults === 2 && (r.children || 0) === 0;
}

/** DBL with one or more children (tarifa niño = (hab − DBL) ÷ n niños). */
function isDblWithChildRoom(r: Occupancy): boolean {
  return r.adults === 2 && (r.children || 0) >= 1;
}

function isTplRoom(r: Occupancy): boolean {
  return r.adults === 3 && (r.children || 0) === 0;
}

/** TPL with one or more children — CHD = (hab − TPL) ÷ n niños. */
function isTplWithChildRoom(r: Occupancy): boolean {
  return r.adults === 3 && (r.children || 0) >= 1;
}

function isQplRoom(r: Occupancy): boolean {
  return r.adults === 4 && (r.children || 0) === 0;
}

/** QPL / cuádruple with children — CHD = (hab − QPL) ÷ n niños. */
function isQplWithChildRoom(r: Occupancy): boolean {
  return r.adults === 4 && (r.children || 0) >= 1;
}

function avg(xs: number[]): number {
  return xs.reduce((s, n) => s + n, 0) / xs.length;
}

function mixCounts(occupancy: Occupancy[]): {
  nSgl: number;
  nDbl: number;
  nTpl: number;
  nQpl: number;
  nSglChd: number;
  nDblChd: number;
  nTplChd: number;
  nQplChd: number;
  other: number;
} {
  let nSgl = 0;
  let nDbl = 0;
  let nTpl = 0;
  let nQpl = 0;
  let nSglChd = 0;
  let nDblChd = 0;
  let nTplChd = 0;
  let nQplChd = 0;
  let other = 0;
  for (const r of occupancy) {
    if (isSglRoom(r)) nSgl += 1;
    else if (isDblRoom(r)) nDbl += 1;
    else if (isTplRoom(r)) nTpl += 1;
    else if (isQplRoom(r)) nQpl += 1;
    else if (isSglWithChildRoom(r)) nSglChd += 1;
    else if (isDblWithChildRoom(r)) nDblChd += 1;
    else if (isTplWithChildRoom(r)) nTplChd += 1;
    else if (isQplWithChildRoom(r)) nQplChd += 1;
    else other += 1;
  }
  return { nSgl, nDbl, nTpl, nQpl, nSglChd, nDblChd, nTplChd, nQplChd, other };
}

/**
 * Precios de las filas 1 hab que BM lista antes del total de la solución.
 */
export function collectSolutionRoomPrices(
  rates: { price: number; roomsCount?: number }[],
  solutionIndex: number
): number[] | undefined {
  const selected = rates[solutionIndex];
  if (!selected) return undefined;
  const n = selected.roomsCount && selected.roomsCount > 1 ? selected.roomsCount : 0;
  if (n < 2) return undefined;
  const prices: number[] = [];
  for (let i = solutionIndex - 1; i >= 0 && prices.length < n; i--) {
    const r = rates[i];
    if ((r.roomsCount || 0) > 1) break;
    if (!(r.price > 0)) continue;
    prices.unshift(r.price);
  }
  return prices.length === n ? prices : undefined;
}

function applyFromRoomPrices(
  occupancy: Occupancy[],
  prices: number[],
  currency: string,
  previous?: OccupancyTierRates
): OccupancyTierRates | null {
  if (prices.length !== occupancy.length || occupancy.length < 2) return null;
  const cur = (currency || previous?.currency || 'COP').toUpperCase();
  const next: OccupancyTierRates = {
    ...(previous || emptyOccupancyRates(cur)),
    currency: cur,
  };
  const sgls: number[] = [];
  const dbls: number[] = [];
  const tpls: number[] = [];
  const qpls: number[] = [];
  const sglChdRooms: Array<{ price: number; children: number }> = [];
  const dblChdRooms: Array<{ price: number; children: number }> = [];
  const tplChdRooms: Array<{ price: number; children: number }> = [];
  const qplChdRooms: Array<{ price: number; children: number }> = [];
  for (let i = 0; i < occupancy.length; i++) {
    const o = occupancy[i];
    const p = prices[i];
    if (isSglRoom(o)) sgls.push(p);
    else if (isDblRoom(o)) dbls.push(p);
    else if (isTplRoom(o)) tpls.push(p);
    else if (isQplRoom(o)) qpls.push(p);
    else if (isSglWithChildRoom(o)) {
      sglChdRooms.push({ price: p, children: Math.max(1, o.children || 1) });
    } else if (isDblWithChildRoom(o)) {
      dblChdRooms.push({ price: p, children: Math.max(1, o.children || 1) });
    } else if (isTplWithChildRoom(o)) {
      tplChdRooms.push({ price: p, children: Math.max(1, o.children || 1) });
    } else if (isQplWithChildRoom(o)) {
      qplChdRooms.push({ price: p, children: Math.max(1, o.children || 1) });
    } else return null;
  }
  const bits: string[] = [];
  if (sgls.length) {
    next.sglRoomTotal = roundMoney(avg(sgls), cur);
    next.sglPp = roundMoney(next.sglRoomTotal, cur);
    bits.push(`SGL×${sgls.length}`);
  }
  if (dbls.length) {
    next.dblRoomTotal = roundMoney(avg(dbls), cur);
    next.dblPp = roundMoney(next.dblRoomTotal / 2, cur);
    bits.push(`DBL×${dbls.length}`);
  }
  if (tpls.length) {
    next.tplRoomTotal = roundMoney(avg(tpls), cur);
    next.tplPp = roundMoney(next.tplRoomTotal / 3, cur);
    bits.push(`TPL×${tpls.length}`);
  }
  if (qpls.length) {
    next.qplRoomTotal = roundMoney(avg(qpls), cur);
    next.qplPp = roundMoney(next.qplRoomTotal / 4, cur);
    bits.push(`QPL×${qpls.length}`);
  }
  if (sglChdRooms.length) {
    next.sglWithChildTotal = roundMoney(avg(sglChdRooms.map((r) => r.price)), cur);
    const kidsAvg = avg(sglChdRooms.map((r) => r.children));
    next.chdRoomChildren = Math.max(1, Math.round(kidsAvg));
    if (next.sglRoomTotal != null && !next.childEqualsAdult) {
      const perChild = sglChdRooms.map((r) => (r.price - next.sglRoomTotal!) / r.children);
      next.chd = normalizeChdDifferential(roundMoney(avg(perChild), cur));
    }
    const kidsLabel = sglChdRooms.reduce((s, r) => s + r.children, 0);
    bits.push(`SGL+CHD×${kidsLabel}`);
  }
  if (dblChdRooms.length) {
    next.dblWithChildTotal = roundMoney(avg(dblChdRooms.map((r) => r.price)), cur);
    const kidsAvg = avg(dblChdRooms.map((r) => r.children));
    next.chdRoomChildren = Math.max(1, Math.round(kidsAvg));
    if (next.dblRoomTotal != null && !next.childEqualsAdult) {
      const perChild = dblChdRooms.map((r) => (r.price - next.dblRoomTotal!) / r.children);
      next.chd = normalizeChdDifferential(roundMoney(avg(perChild), cur));
    }
    const kidsLabel = dblChdRooms.reduce((s, r) => s + r.children, 0);
    bits.push(`DBL+CHD×${kidsLabel}`);
  }
  if (tplChdRooms.length) {
    next.tplWithChildTotal = roundMoney(avg(tplChdRooms.map((r) => r.price)), cur);
    const kidsAvg = avg(tplChdRooms.map((r) => r.children));
    next.chdRoomChildren = Math.max(1, Math.round(kidsAvg));
    if (next.tplRoomTotal != null && !next.childEqualsAdult) {
      const perChild = tplChdRooms.map((r) => (r.price - next.tplRoomTotal!) / r.children);
      next.chd = normalizeChdDifferential(roundMoney(avg(perChild), cur));
    }
    const kidsLabel = tplChdRooms.reduce((s, r) => s + r.children, 0);
    bits.push(`TPL+CHD×${kidsLabel}`);
  }
  if (qplChdRooms.length) {
    next.qplWithChildTotal = roundMoney(avg(qplChdRooms.map((r) => r.price)), cur);
    const kidsAvg = avg(qplChdRooms.map((r) => r.children));
    next.chdRoomChildren = Math.max(1, Math.round(kidsAvg));
    if (next.qplRoomTotal != null && !next.childEqualsAdult) {
      const perChild = qplChdRooms.map((r) => (r.price - next.qplRoomTotal!) / r.children);
      next.chd = normalizeChdDifferential(roundMoney(avg(perChild), cur));
    }
    const kidsLabel = qplChdRooms.reduce((s, r) => s + r.children, 0);
    bits.push(`QPL+CHD×${kidsLabel}`);
  }
  next.lastProbe = `Mix ${occupancy.length} hab · ${bits.join(' ')}`;
  return refreshOccupancyBaseline(next);
}

/**
 * Classify a BookingMotor probe from search occupancy.
 * El pax real del viaje está en Guardar viaje; aquí solo importa el mix de la búsqueda BM.
 */
export function classifyOccupancyProbe(
  occupancy: Occupancy[],
  roomTotal: number
): OccupancyProbe {
  const total = Number.isFinite(roomTotal) ? roomTotal : 0;
  const adults = occupancy.reduce((s, o) => s + o.adults, 0);
  const children = occupancy.reduce((s, o) => s + (o.children || 0), 0);

  if (occupancy.length >= 1 && occupancy.every(isSglRoom)) {
    return {
      kind: 'sgl',
      roomTotal: occupancy.length > 0 ? total / occupancy.length : total,
      adults,
      children,
      label:
        occupancy.length === 1
          ? 'SGL · 1 adulto'
          : `SGL · ${occupancy.length} hab iguales`,
    };
  }
  if (occupancy.length >= 1 && occupancy.every(isDblRoom)) {
    return {
      kind: 'dbl',
      roomTotal: occupancy.length > 0 ? total / occupancy.length : total,
      adults,
      children,
      label:
        occupancy.length === 1
          ? 'DBL · 2 adultos'
          : `DBL · ${occupancy.length} hab iguales`,
    };
  }
  if (occupancy.length >= 1 && occupancy.every(isTplRoom)) {
    return {
      kind: 'tpl',
      roomTotal: occupancy.length > 0 ? total / occupancy.length : total,
      adults,
      children,
      label:
        occupancy.length === 1
          ? 'TPL · 3 adultos'
          : `TPL · ${occupancy.length} hab iguales`,
    };
  }
  if (occupancy.length >= 1 && occupancy.every(isQplRoom)) {
    return {
      kind: 'qpl',
      roomTotal: occupancy.length > 0 ? total / occupancy.length : total,
      adults,
      children,
      label:
        occupancy.length === 1
          ? 'QPL · 4 adultos'
          : `QPL · ${occupancy.length} hab iguales`,
    };
  }
  if (occupancy.length >= 1 && occupancy.every(isSglWithChildRoom)) {
    const kids = Math.max(
      1,
      Math.round(avg(occupancy.map((o) => Math.max(1, o.children || 1))))
    );
    return {
      kind: 'sgl_with_chd',
      roomTotal: occupancy.length > 0 ? total / occupancy.length : total,
      adults: 1,
      children: kids,
      label:
        occupancy.length === 1
          ? kids === 1
            ? 'SGL+CHD · 1 adt + 1 niño'
            : `SGL+CHD · 1 adt + ${kids} niños`
          : `SGL+CHD · ${occupancy.length} hab iguales`,
    };
  }
  if (occupancy.length === 1 && isDblWithChildRoom(occupancy[0])) {
    const kids = Math.max(1, occupancy[0].children || 1);
    return {
      kind: 'dbl_with_chd',
      roomTotal: total,
      adults: 2,
      children: kids,
      label:
        kids === 1
          ? 'DBL+CHD · 2 adt + 1 niño'
          : `DBL+CHD · 2 adt + ${kids} niños`,
    };
  }
  if (occupancy.length === 1 && isTplWithChildRoom(occupancy[0])) {
    const kids = Math.max(1, occupancy[0].children || 1);
    return {
      kind: 'tpl_with_chd',
      roomTotal: total,
      adults: 3,
      children: kids,
      label:
        kids === 1
          ? 'TPL+CHD · 3 adt + 1 niño'
          : `TPL+CHD · 3 adt + ${kids} niños`,
    };
  }
  if (occupancy.length === 1 && isQplWithChildRoom(occupancy[0])) {
    const kids = Math.max(1, occupancy[0].children || 1);
    return {
      kind: 'qpl_with_chd',
      roomTotal: total,
      adults: 4,
      children: kids,
      label:
        kids === 1
          ? 'QPL+CHD · 4 adt + 1 niño'
          : `QPL+CHD · 4 adt + ${kids} niños`,
    };
  }

  const { nSgl, nDbl, nTpl, nQpl, nSglChd, nDblChd, nTplChd, nQplChd, other } =
    mixCounts(occupancy);
  if (
    other === 0 &&
    nSglChd >= 1 &&
    nSgl >= 1 &&
    nDbl === 0 &&
    nTpl === 0 &&
    nQpl === 0 &&
    nDblChd === 0 &&
    nTplChd === 0 &&
    nQplChd === 0
  ) {
    return {
      kind: 'mix_sgl_chd',
      roomTotal: total,
      adults,
      children,
      nSgl,
      nChd: nSglChd,
      label: `${nSgl + nSglChd} hab · SGL×${nSgl} + SGL+niño×${nSglChd}`,
    };
  }
  if (other === 0 && nDblChd >= 1 && nTpl === 0 && nQpl === 0 && nTplChd === 0 && nQplChd === 0 && nSgl === 0 && nSglChd === 0 && nDbl >= 1) {
    return {
      kind: 'mix_dbl_chd',
      roomTotal: total,
      adults,
      children,
      nDbl,
      nChd: nDblChd,
      label: `${nDbl + nDblChd} hab · DBL×${nDbl} + DBL+niño×${nDblChd}`,
    };
  }
  if (
    other === 0 &&
    nTplChd >= 1 &&
    nDbl === 0 &&
    nQpl === 0 &&
    nSgl === 0 &&
    nSglChd === 0 &&
    nDblChd === 0 &&
    nQplChd === 0 &&
    nTpl >= 1
  ) {
    return {
      kind: 'mix_tpl_chd',
      roomTotal: total,
      adults,
      children,
      nTpl,
      nChd: nTplChd,
      label: `${nTpl + nTplChd} hab · TPL×${nTpl} + TPL+niño×${nTplChd}`,
    };
  }
  if (
    other === 0 &&
    nQplChd >= 1 &&
    nDbl === 0 &&
    nTpl === 0 &&
    nSgl === 0 &&
    nSglChd === 0 &&
    nDblChd === 0 &&
    nTplChd === 0 &&
    nQpl >= 1
  ) {
    return {
      kind: 'mix_qpl_chd',
      roomTotal: total,
      adults,
      children,
      nQpl,
      nChd: nQplChd,
      label: `${nQpl + nQplChd} hab · QPL×${nQpl} + QPL+niño×${nQplChd}`,
    };
  }
  if (
    other === 0 &&
    nTpl >= 1 &&
    nDblChd === 0 &&
    nTplChd === 0 &&
    nQplChd === 0 &&
    nSglChd === 0 &&
    nSgl === 0 &&
    nDbl >= 1
  ) {
    return {
      kind: 'mix_dbl_tpl',
      roomTotal: total,
      adults,
      children,
      nDbl,
      nTpl,
      label: `${nDbl + nTpl} hab · DBL×${nDbl} + TPL×${nTpl}`,
    };
  }

  return {
    kind: 'unknown',
    roomTotal: total,
    adults,
    children,
    label:
      other === 0 &&
      (nTplChd >= 1 || nQplChd >= 1 || nSglChd >= 1 || (nTpl >= 1 && nDblChd >= 1))
        ? 'Mix con niño: usa precios por habitación de BM (filas antes del total) o sonda SGL/TPL/QPL y luego SGL+niño / TPL+niño / QPL+niño'
        : 'Arma en BM hab 1/2/3/4 adt y 1/2/3/4 adt+niño (juntas o aparte) y +🛒',
  };
}

function applyChdFromSglCombo(next: OccupancyTierRates, totalChildrenInChdRooms?: number): void {
  const nSgl = next.comboNSgl ?? 1;
  const nChd = next.comboNChd ?? 1;
  if (
    next.comboDblAndChdTotal == null ||
    next.sglRoomTotal == null ||
    next.childEqualsAdult ||
    !Number.isFinite(next.comboDblAndChdTotal) ||
    !Number.isFinite(next.sglRoomTotal) ||
    nChd < 1
  ) {
    return;
  }
  const kids = Math.max(1, totalChildrenInChdRooms || nChd);
  next.chdRoomChildren = Math.max(1, Math.round(kids / nChd));
  next.chd = normalizeChdDifferential(
    roundMoney(
      (next.comboDblAndChdTotal - (nSgl + nChd) * next.sglRoomTotal) / kids,
      next.currency
    )
  );
  if (next.chd != null && chdAbsurdForCurrency(next.chd, next.currency || 'COP', next.sglPp)) {
    delete next.chd;
    return;
  }
  if (next.chd != null) {
    next.sglWithChildTotal = roundMoney(
      next.sglRoomTotal + next.chd * next.chdRoomChildren,
      next.currency
    );
  }
}

function applyChdFromCombo(next: OccupancyTierRates, totalChildrenInChdRooms?: number): void {
  const nDbl = next.comboNDbl ?? 1;
  const nChd = next.comboNChd ?? 1;
  if (
    next.comboDblAndChdTotal == null ||
    next.dblRoomTotal == null ||
    next.childEqualsAdult ||
    !Number.isFinite(next.comboDblAndChdTotal) ||
    !Number.isFinite(next.dblRoomTotal) ||
    nChd < 1
  ) {
    return;
  }
  // Prefer total children (DBL+2 niños → ÷2), fall back to # of DBL+niño rooms.
  const kids = Math.max(1, totalChildrenInChdRooms || nChd);
  next.chdRoomChildren = Math.max(1, Math.round(kids / nChd));
  next.chd = normalizeChdDifferential(
    roundMoney(
      (next.comboDblAndChdTotal - (nDbl + nChd) * next.dblRoomTotal) / kids,
      next.currency
    )
  );
  if (next.chd != null && chdAbsurdForCurrency(next.chd, next.currency || 'COP', next.dblPp)) {
    delete next.chd;
    return;
  }
  if (next.chd != null) {
    next.dblWithChildTotal = roundMoney(
      next.dblRoomTotal + next.chd * next.chdRoomChildren,
      next.currency
    );
  }
}

function applyChdFromTplCombo(next: OccupancyTierRates, totalChildrenInChdRooms?: number): void {
  const nTpl = next.comboNTpl ?? 1;
  const nChd = next.comboNChd ?? 1;
  if (
    next.comboDblAndChdTotal == null ||
    next.tplRoomTotal == null ||
    next.childEqualsAdult ||
    !Number.isFinite(next.comboDblAndChdTotal) ||
    !Number.isFinite(next.tplRoomTotal) ||
    nChd < 1
  ) {
    return;
  }
  // Reuse comboDblAndChdTotal field for TPL+CHD mix total (same shape).
  const kids = Math.max(1, totalChildrenInChdRooms || nChd);
  next.chdRoomChildren = Math.max(1, Math.round(kids / nChd));
  next.chd = normalizeChdDifferential(
    roundMoney(
      (next.comboDblAndChdTotal - (nTpl + nChd) * next.tplRoomTotal) / kids,
      next.currency
    )
  );
  if (next.chd != null && chdAbsurdForCurrency(next.chd, next.currency || 'COP', next.tplPp)) {
    delete next.chd;
    return;
  }
  if (next.chd != null) {
    next.tplWithChildTotal = roundMoney(
      next.tplRoomTotal + next.chd * next.chdRoomChildren,
      next.currency
    );
  }
}

function applyChdFromQplCombo(next: OccupancyTierRates, totalChildrenInChdRooms?: number): void {
  const nQpl = next.comboNQpl ?? 1;
  const nChd = next.comboNChd ?? 1;
  if (
    next.comboDblAndChdTotal == null ||
    next.qplRoomTotal == null ||
    next.childEqualsAdult ||
    !Number.isFinite(next.comboDblAndChdTotal) ||
    !Number.isFinite(next.qplRoomTotal) ||
    nChd < 1
  ) {
    return;
  }
  const kids = Math.max(1, totalChildrenInChdRooms || nChd);
  next.chdRoomChildren = Math.max(1, Math.round(kids / nChd));
  next.chd = normalizeChdDifferential(
    roundMoney(
      (next.comboDblAndChdTotal - (nQpl + nChd) * next.qplRoomTotal) / kids,
      next.currency
    )
  );
  if (next.chd != null && chdAbsurdForCurrency(next.chd, next.currency || 'COP', next.qplPp)) {
    delete next.chd;
    return;
  }
  if (next.chd != null) {
    next.qplWithChildTotal = roundMoney(
      next.qplRoomTotal + next.chd * next.chdRoomChildren,
      next.currency
    );
  }
}

function applyTplFromCombo(next: OccupancyTierRates): void {
  const nDbl = next.comboNDbl ?? 1;
  const nTpl = next.comboNTpl ?? 1;
  if (
    next.comboDblTplTotal == null ||
    next.dblRoomTotal == null ||
    !Number.isFinite(next.comboDblTplTotal) ||
    !Number.isFinite(next.dblRoomTotal) ||
    nTpl < 1
  ) {
    return;
  }
  next.tplRoomTotal = roundMoney(
    (next.comboDblTplTotal - nDbl * next.dblRoomTotal) / nTpl,
    next.currency
  );
  next.tplPp = roundMoney(next.tplRoomTotal / 3, next.currency);
}

export function applyOccupancyProbe(
  current: OccupancyTierRates | undefined,
  probe: OccupancyProbe,
  currency: string,
  fx?: { effTrm?: number; trmDia?: number }
): OccupancyTierRates {
  const cur = (currency || current?.currency || 'COP').toUpperCase();
  let aligned = current;
  if (aligned && (aligned.currency || 'COP').toUpperCase() !== cur) {
    const trm = fx?.effTrm && fx.effTrm > 0 ? fx.effTrm : 0;
    if (trm > 0) {
      aligned =
        occupancyRatesToCurrency(aligned, cur, trm, fx?.trmDia) ||
        ({ ...aligned, currency: cur } as OccupancyTierRates);
    } else {
      // Without TRM, do not mix room totals across currencies for CHD math.
      aligned = {
        currency: cur,
        childEqualsAdult: aligned.childEqualsAdult,
        lastProbe: aligned.lastProbe,
      };
    }
  }
  const next: OccupancyTierRates = {
    ...(aligned || emptyOccupancyRates(cur)),
    currency: cur,
    lastProbe: probe.label,
  };

  if (probe.kind === 'sgl') {
    next.sglRoomTotal = probe.roomTotal;
    next.sglPp = roundMoney(probe.roomTotal, cur);
    if (
      next.sglWithChildTotal != null &&
      !next.childEqualsAdult &&
      Number.isFinite(next.sglWithChildTotal) &&
      next.sglRoomTotal != null &&
      Number.isFinite(next.sglRoomTotal)
    ) {
      setChdFromRoomDiff(
        next,
        next.sglWithChildTotal,
        next.sglRoomTotal,
        next.chdRoomChildren || 1
      );
    }
    applyChdFromSglCombo(next);
  } else if (probe.kind === 'dbl') {
    next.dblRoomTotal = probe.roomTotal;
    next.dblPp = roundMoney(probe.roomTotal / 2, cur);
    if (
      next.dblWithChildTotal != null &&
      !next.childEqualsAdult &&
      Number.isFinite(next.dblWithChildTotal) &&
      next.dblRoomTotal != null &&
      Number.isFinite(next.dblRoomTotal)
    ) {
      setChdFromRoomDiff(
        next,
        next.dblWithChildTotal,
        next.dblRoomTotal,
        next.chdRoomChildren || 1
      );
    }
    applyChdFromCombo(next);
    applyTplFromCombo(next);
  } else if (probe.kind === 'tpl') {
    next.tplRoomTotal = probe.roomTotal;
    next.tplPp = roundMoney(probe.roomTotal / 3, cur);
    if (
      next.tplWithChildTotal != null &&
      !next.childEqualsAdult &&
      Number.isFinite(next.tplWithChildTotal) &&
      next.tplRoomTotal != null
    ) {
      setChdFromRoomDiff(
        next,
        next.tplWithChildTotal,
        next.tplRoomTotal,
        next.chdRoomChildren || 1
      );
    }
  } else if (probe.kind === 'qpl') {
    next.qplRoomTotal = probe.roomTotal;
    next.qplPp = roundMoney(probe.roomTotal / 4, cur);
    if (
      next.qplWithChildTotal != null &&
      !next.childEqualsAdult &&
      Number.isFinite(next.qplWithChildTotal) &&
      next.qplRoomTotal != null
    ) {
      setChdFromRoomDiff(
        next,
        next.qplWithChildTotal,
        next.qplRoomTotal,
        next.chdRoomChildren || 1
      );
    }
  } else if (probe.kind === 'sgl_with_chd') {
    next.sglWithChildTotal = probe.roomTotal;
    if (next.sglRoomTotal != null && Number.isFinite(next.sglRoomTotal)) {
      setChdFromRoomDiff(
        next,
        probe.roomTotal,
        next.sglRoomTotal,
        probe.children || 1
      );
    }
  } else if (probe.kind === 'dbl_with_chd') {
    next.dblWithChildTotal = probe.roomTotal;
    if (next.dblRoomTotal != null && Number.isFinite(next.dblRoomTotal)) {
      setChdFromRoomDiff(
        next,
        probe.roomTotal,
        next.dblRoomTotal,
        probe.children || 1
      );
    }
  } else if (probe.kind === 'tpl_with_chd') {
    next.tplWithChildTotal = probe.roomTotal;
    if (next.tplRoomTotal != null && Number.isFinite(next.tplRoomTotal)) {
      setChdFromRoomDiff(
        next,
        probe.roomTotal,
        next.tplRoomTotal,
        probe.children || 1
      );
    }
  } else if (probe.kind === 'qpl_with_chd') {
    next.qplWithChildTotal = probe.roomTotal;
    if (next.qplRoomTotal != null && Number.isFinite(next.qplRoomTotal)) {
      setChdFromRoomDiff(
        next,
        probe.roomTotal,
        next.qplRoomTotal,
        probe.children || 1
      );
    }
  } else if (probe.kind === 'mix_sgl_chd') {
    next.comboDblAndChdTotal = probe.roomTotal;
    next.comboNSgl = probe.nSgl ?? 1;
    next.comboNChd = probe.nChd ?? 1;
    applyChdFromSglCombo(next, probe.children);
  } else if (probe.kind === 'mix_dbl_chd') {
    next.comboDblAndChdTotal = probe.roomTotal;
    next.comboNDbl = probe.nDbl ?? 1;
    next.comboNChd = probe.nChd ?? 1;
    applyChdFromCombo(next, probe.children);
  } else if (probe.kind === 'mix_tpl_chd') {
    next.comboDblAndChdTotal = probe.roomTotal;
    next.comboNTpl = probe.nTpl ?? 1;
    next.comboNChd = probe.nChd ?? 1;
    applyChdFromTplCombo(next, probe.children);
  } else if (probe.kind === 'mix_qpl_chd') {
    next.comboDblAndChdTotal = probe.roomTotal;
    next.comboNQpl = probe.nQpl ?? 1;
    next.comboNChd = probe.nChd ?? 1;
    applyChdFromQplCombo(next, probe.children);
  } else if (probe.kind === 'mix_dbl_tpl') {
    next.comboDblTplTotal = probe.roomTotal;
    next.comboNDbl = probe.nDbl ?? 1;
    next.comboNTpl = probe.nTpl ?? 1;
    applyTplFromCombo(next);
  }

  return sanitizeOccupancyRates(refreshOccupancyBaseline(next), {
    effTrm: fx?.effTrm,
    trmDia: fx?.trmDia,
    displayCurrency: (cur === 'USD' ? 'USD' : 'COP') as DisplayCurrency,
  });
}

/** Attach / refresh occupancyRates from the cart item's search occupancy + rate total. */
export function deriveOccupancyRatesFromItem(
  item: HotelCartItem,
  previous?: OccupancyTierRates,
  fx?: { effTrm?: number; trmDia?: number }
): OccupancyTierRates {
  const fromRows = applyFromRoomPrices(
    item.occupancy,
    item.occupancyRoomPrices || [],
    item.selectedRate.currency,
    previous
  );
  if (fromRows) return coerceOccupancyRateCurrency(fromRows);
  const probe = classifyOccupancyProbe(item.occupancy, item.selectedRate.price);
  return applyOccupancyProbe(previous, probe, item.selectedRate.currency, fx);
}

export function occupancyRatesStatus(rates?: OccupancyTierRates): {
  hasSgl: boolean;
  hasDbl: boolean;
  hasTpl: boolean;
  hasQpl: boolean;
  hasChd: boolean;
  missing: string[];
} {
  const hasSgl = rates?.sglPp != null && Number.isFinite(rates.sglPp);
  const hasDbl = rates?.dblPp != null && Number.isFinite(rates.dblPp);
  const hasTpl = rates?.tplPp != null && Number.isFinite(rates.tplPp);
  const hasQpl = rates?.qplPp != null && Number.isFinite(rates.qplPp);
  const hasChd =
    !!rates?.childEqualsAdult ||
    (rates?.chd != null && Number.isFinite(rates.chd));
  const missing: string[] = [];
  if (!hasSgl) missing.push('SGL');
  if (!hasDbl) missing.push('DBL');
  if (!hasTpl) missing.push('TPL');
  if (!hasQpl) missing.push('QPL');
  if (!hasChd) missing.push('CHD');
  return { hasSgl, hasDbl, hasTpl, hasQpl, hasChd, missing };
}

export function occupancyHintOptsFromPlan(plan?: BriefingRoom[] | null): {
  requireSgl: boolean;
  requireDbl: boolean;
  requireTpl: boolean;
  requireQpl: boolean;
  requireChd: boolean;
} {
  const rooms = plan || [];
  if (rooms.length === 0) {
    return {
      requireSgl: false,
      requireDbl: true,
      requireTpl: false,
      requireQpl: false,
      requireChd: true,
    };
  }
  return {
    requireSgl: rooms.some((r) => r.kind === 'SGL'),
    requireDbl: rooms.some((r) => r.kind === 'DBL'),
    requireTpl: rooms.some((r) => r.kind === 'TPL'),
    requireQpl: rooms.some((r) => r.kind === 'QPL'),
    requireChd: rooms.some((r) => (r.children || 0) > 0),
  };
}

/** UI hint: what BM search is still needed. SGL/TPL/QPL/CHD only if the trip mix uses them. */
export function occupancyMissingHint(
  rates?: OccupancyTierRates,
  opts?: {
    requireSgl?: boolean;
    requireDbl?: boolean;
    requireTpl?: boolean;
    requireQpl?: boolean;
    requireChd?: boolean;
  }
): string | null {
  const { hasSgl, hasDbl, hasTpl, hasQpl, hasChd } = occupancyRatesStatus(rates);
  const requireDbl = opts?.requireDbl ?? true;
  const requireChd = opts?.requireChd ?? true;
  const need: string[] = [];
  if (opts?.requireSgl && !hasSgl) need.push('SGL');
  if (requireDbl && !hasDbl) need.push('DBL');
  if (opts?.requireTpl && !hasTpl) need.push('TPL');
  if (opts?.requireQpl && !hasQpl) need.push('QPL');
  if (requireChd && !hasChd) need.push('CHD');
  if (need.length === 0) return null;
  const how: Record<string, string> = {
    SGL: 'busca 1 hab · 1 adulto y +🛒',
    DBL: 'busca 1 hab · 2 adultos y +🛒',
    TPL: 'en BM: hab de 3 adultos (sola o en el mismo mix) y +🛒',
    QPL: 'en BM: hab de 4 adultos (sola o en el mismo mix) y +🛒',
    CHD: hasDbl
      ? 'en BM: hab 2 adt + 1 niño (sola o junto a DBL/TPL/QPL) y +🛒'
      : hasSgl
        ? 'en BM: hab 1 adt + 1 niño (sola o junto a SGL) y +🛒'
        : 'primero una hab DBL o SGL; luego adt+niño (o el mix) y +🛒',
  };
  return need.map((m) => `Falta buscar ${m}: ${how[m]}`).join(' · ');
}

/** Short how-to for mayorista (briefing / empty state). */
export const WHOLESALE_PROBE_HOWTO =
  'En BM arma las hab de tarifa (1 adt SGL, 1 adt+niño, 2–4 adt, 2 adt+niño) juntas o aparte; +🛒. Origen/fechas = primera búsqueda. Mix del cliente: pestaña Acomodación.';

function itemPayingPax(item: CartItem): number {
  switch (item.type) {
    case 'hotel': {
      const occ = item.occupancy || [];
      const n = occ.reduce((s, o) => s + (o.adults || 0) + (o.children || 0), 0);
      return Math.max(1, n);
    }
    case 'flight':
      return flightSearchPayingSeats(item);
    case 'transfer':
    case 'activity':
      return Math.max(1, (item.adults || 0) + (item.children || 0));
    case 'insurance':
      return Math.max(1, item.passengers || 1);
    case 'tour':
      return Math.max(1, item.payingPax || item.adults + item.children);
    default:
      return 1;
  }
}

/**
 * Seats from the airline search (Wingo/Avianca/…), never acomodación del cliente.
 * Example: 10 pax × $200.000 = $2.000.000 → $/persona = total ÷ 10.
 */
export function flightSearchPayingSeats(item: FlightCartItem): number {
  const direct = (item.adults || 0) + (item.children || 0);
  if (direct > 0) return direct;
  const s = (item.paxSummary || '').replace(/\s+/g, ' ');
  const adt = s.match(/(\d+)\s*adulto/i);
  const chd = s.match(/(\d+)\s*(?:niñ|menor|child|chd)/i);
  const fromSummary = (adt ? Number(adt[1]) : 0) + (chd ? Number(chd[1]) : 0);
  if (fromSummary > 0) return fromSummary;
  return 1;
}

/**
 * Pax for «Total ítem: $pp × N».
 * Hotel → sonda BM; vuelo/seguro/traslado/… → pax de esa búsqueda;
 * solo si el ítem no trae pax propio se usa acomodación / briefing.
 */
export function serviceItemBreakdownPax(
  item: CartItem | undefined,
  briefing?: {
    roomPlan?: BriefingRoom[];
    totalAdults?: number;
    totalChildren?: number;
  } | null
): { pax: number; breakdown: boolean } {
  if (item?.type === 'hotel') {
    const occ = item.occupancy || [];
    const adults = occ.reduce((s, o) => s + (o.adults || 0), 0);
    const children = occ.reduce((s, o) => s + (o.children || 0), 0);
    const pax = adults + children;
    if (pax > 0) return { pax, breakdown: true };
  }
  if (item?.type === 'flight') {
    const pax = flightSearchPayingSeats(item);
    return { pax, breakdown: pax > 0 };
  }
  if (item?.type === 'insurance') {
    const pax = Math.max(0, item.passengers || 0);
    if (pax > 0) return { pax, breakdown: true };
  }
  if (item && item.type !== 'hotel') {
    const pax = itemPayingPax(item);
    // itemPayingPax floors at 1 — only trust when the item actually recorded pax.
    if (item.type === 'transfer' || item.type === 'activity') {
      const raw = (item.adults || 0) + (item.children || 0);
      if (raw > 0) return { pax: raw, breakdown: true };
    }
    if (item.type === 'tour') {
      const raw = item.payingPax || item.adults + item.children;
      if (raw > 0) return { pax: Math.max(1, raw), breakdown: true };
    }
  }
  if (briefing && hasAccommodationPlan(briefing)) {
    const mix = summarizeRoomPlan(briefing.roomPlan || []);
    const pax = mix.adults + mix.children;
    if (pax > 0) return { pax, breakdown: true };
  }
  const adults = briefing?.totalAdults || 0;
  const children = briefing?.totalChildren || 0;
  const pax = adults + children;
  return { pax: Math.max(0, pax), breakdown: pax > 0 };
}

function isInfantBreakdown(row: FlightPriceBreakdownItem): boolean {
  const t = `${row.code || ''} ${row.description || ''}`.toLowerCase();
  return /\binf(ant)?\b|\bbeb[eé]/.test(t);
}

function isChildBreakdown(row: FlightPriceBreakdownItem): boolean {
  if (isInfantBreakdown(row)) return false;
  const t = `${row.code || ''} ${row.description || ''}`.toLowerCase();
  return /\b(chd|cnn|child|niñ|menor|pax.?ch)\b/.test(t);
}

function flightChildPersonRate(item: FlightCartItem, adultPp: number): number | undefined {
  const n = item.children || 0;
  if (n <= 0) return undefined;
  const rows = (item.priceBreakdown || []).filter(isChildBreakdown);
  if (rows.length === 0) return undefined;
  const sum = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  if (!(sum > 0)) return undefined;
  const per = sum / n;
  if (per > adultPp * 1.5 && n > 1) return sum / n;
  if (sum > adultPp * 1.5 && sum <= item.price * 0.95) return sum / n;
  return Math.min(per, sum);
}

  /** Adult / child unit from this search (not briefing pax). Child = item tariff or adult. */
export function itemPersonRates(item: CartItem, linePrice: number): { adult: number; child: number } {
  const total = Number.isFinite(linePrice) ? linePrice : 0;
  if (item.type === 'hotel' || !(total > 0)) return { adult: 0, child: 0 };

  // Bloqueo: Individual (pricePerPerson) is the seat $/pp — not total÷accommodation pax.
  if (item.type === 'tour' && item.isBloqueo) {
    const nativePp =
      (item.pricePerPerson != null && item.pricePerPerson > 0
        ? item.pricePerPerson
        : item.occupancyRates?.sgl) || 0;
    if (nativePp > 0) {
      const nativeTotal = Number(item.price) || 0;
      const scale = nativeTotal > 0 ? total / nativeTotal : 1;
      const adult = nativePp * scale;
      return { adult, child: adult };
    }
    const pax = itemPayingPax(item);
    const adult = total / pax;
    return { adult, child: adult };
  }

  if (item.type === 'tour' && item.occupancyRates) {
    const r = item.occupancyRates;
    const adult = r.dbl || r.tpl || r.sgl || r.qdp || item.pricePerPerson || total / itemPayingPax(item);
    return { adult, child: adult };
  }

  if (item.type === 'activity' && item.pricePerPerson != null && Number.isFinite(item.pricePerPerson)) {
    return { adult: item.pricePerPerson, child: item.pricePerPerson };
  }

  // Flight / transfer / etc.: always ÷ seats of THAT product search (e.g. 10),
  // never ÷ acomodación (e.g. 5). That $/pp is what joins hotel tiers.
  const pax = itemPayingPax(item);
  const adult = total / pax;
  if (item.type === 'flight') {
    // priceBreakdown amounts are in the flight's native currency; linePrice is display.
    const nativeTotal = Number(item.price) || 0;
    const nativeAdult = nativeTotal > 0 ? nativeTotal / pax : 0;
    const childNative = flightChildPersonRate(item, nativeAdult || adult);
    const scale = nativeTotal > 0 ? total / nativeTotal : 1;
    return {
      adult,
      child: childNative != null ? childNative * scale : adult,
    };
  }
  return { adult, child: adult };
}

/** Pax de la sonda BM del hotel (para repartir mayor valor / redondeo del ítem). */
export function hotelProbePax(hotel: HotelCartItem): number {
  return itemPayingPax(hotel);
}

/** Mayor valor + redondeo del ítem hotel repartido entre pax de la sonda. */
export function hotelItemAdjustmentPp(
  hotel: HotelCartItem,
  linePrice: number,
  basePrice: number
): number {
  const adj = Math.max(0, (Number.isFinite(linePrice) ? linePrice : 0) - (Number.isFinite(basePrice) ? basePrice : 0));
  if (!(adj > 0)) return 0;
  return adj / hotelProbePax(hotel);
}

function applyHotelAdjToRates(
  rates: OccupancyTierRates | undefined,
  adjPp: number
): OccupancyTierRates | undefined {
  if (!rates || !(adjPp > 0)) return rates;
  const bump = (n?: number) =>
    n != null && Number.isFinite(n) ? roundMoney(n + adjPp, rates.currency || 'COP') : undefined;
  return {
    ...rates,
    sglPp: bump(rates.sglPp),
    dblPp: bump(rates.dblPp),
    tplPp: bump(rates.tplPp),
    qplPp: bump(rates.qplPp),
    chd: rates.childEqualsAdult ? undefined : bump(rates.chd),
  };
}

export function wholesaleFeePax(pax: number, roomPlan?: BriefingRoom[]): number {
  const mix = summarizeRoomPlan(normalizeRoomPlan(roomPlan));
  const n = mix.adults + mix.children;
  return Math.max(1, n > 0 ? n : pax);
}

function linkedTransferIdsForHotels(
  hotels: HotelCartItem[],
  allItems: CartItem[]
): { transfers: TransferCartItem[]; linked: Set<string> } {
  const transfers = allItems.filter((i): i is TransferCartItem => i.type === 'transfer');
  const linked = new Set<string>();
  for (const h of hotels) {
    for (const t of transfersForHotel(h, transfers)) linked.add(t.id);
  }
  return { transfers, linked };
}

function addPersonRates(
  a: { adult: number; child: number },
  b: { adult: number; child: number }
): { adult: number; child: number } {
  return { adult: a.adult + b.adult, child: a.child + b.child };
}

/** Shared services (not hotel, not kit transfers) + mayor/redondeo pp + TA unit. */
export function wholesaleServiceShares(
  hotels: HotelCartItem[],
  allItems: CartItem[],
  linePrice: (item: CartItem) => number,
  feesMayorRedondeo: number,
  feePax: number,
  taUnit: number,
  opts?: { excludeNonCommissionable?: boolean }
): { adultShare: number; childShare: number } {
  const { linked } = linkedTransferIdsForHotels(hotels, allItems);
  let shares = { adult: 0, child: 0 };
  for (const item of allItems) {
    if (item.type === 'hotel' || linked.has(item.id)) continue;
    if (opts?.excludeNonCommissionable && isNonCommissionableItem(item)) continue;
    shares = addPersonRates(shares, itemPersonRates(item, linePrice(item)));
  }
  const feePp = (Number.isFinite(feesMayorRedondeo) ? feesMayorRedondeo : 0) / Math.max(1, feePax);
  // TA is linked to aéreos / bloqueos — not commissionable.
  const ta =
    opts?.excludeNonCommissionable || !Number.isFinite(taUnit) ? 0 : taUnit;
  return { adultShare: shares.adult + feePp + ta, childShare: shares.child + feePp + ta };
}

export function kitPersonRates(
  hotel: HotelCartItem,
  allItems: CartItem[],
  linePrice: (item: CartItem) => number
): { adult: number; child: number } {
  const transfers = allItems.filter((i): i is TransferCartItem => i.type === 'transfer');
  let shares = { adult: 0, child: 0 };
  for (const t of transfersForHotel(hotel, transfers)) {
    shares = addPersonRates(shares, itemPersonRates(t, linePrice(t)));
  }
  return shares;
}

/**
 * Kit transfers for every hotel in an option, without double-counting the same
 * transfer if it matches more than one hotel name.
 */
export function optionKitPersonRates(
  hotels: HotelCartItem[],
  allItems: CartItem[],
  linePrice: (item: CartItem) => number
): { adult: number; child: number } {
  const transfers = allItems.filter((i): i is TransferCartItem => i.type === 'transfer');
  const seen = new Set<string>();
  let shares = { adult: 0, child: 0 };
  for (const hotel of hotels) {
    for (const t of transfersForHotel(hotel, transfers)) {
      if (seen.has(t.id)) continue;
      seen.add(t.id);
      shares = addPersonRates(shares, itemPersonRates(t, linePrice(t)));
    }
  }
  return shares;
}

/**
 * Package per-person figures: hotel tier + adult/child service shares.
 * CHD = hotel child tariff (0 if DBL+niño = DBL) + child share of other services
 * (aéreo, traslado, seguro…). Child counts as another person for those services.
 */
export function packageTierPrices(
  rates: OccupancyTierRates | undefined,
  adultShare: number,
  childShare?: number
): {
  currency: string;
  sglPp?: number;
  dblPp?: number;
  tplPp?: number;
  qplPp?: number;
  chd?: number;
  childEqualsAdult?: boolean;
} {
  const currency = (rates?.currency || 'COP').toUpperCase();
  const adult = Number.isFinite(adultShare) ? adultShare : 0;
  const child = childShare != null && Number.isFinite(childShare) ? childShare : adult;
  if (!rates) return { currency };
  // Include hotel CHD = 0 (same room total as DBL): still add child service share.
  const chdHotel = rates.childEqualsAdult ? undefined : hotelChdTierPp(rates);
  const chdRaw =
    chdHotel == null ? undefined : roundMoney(chdHotel + child, currency);
  return {
    currency,
    sglPp:
      rates.sglPp != null && Number.isFinite(rates.sglPp)
        ? roundMoney(rates.sglPp + adult, currency)
        : undefined,
    dblPp:
      rates.dblPp != null && Number.isFinite(rates.dblPp)
        ? roundMoney(rates.dblPp + adult, currency)
        : undefined,
    tplPp:
      rates.tplPp != null && Number.isFinite(rates.tplPp)
        ? roundMoney(rates.tplPp + adult, currency)
        : undefined,
    qplPp:
      rates.qplPp != null && Number.isFinite(rates.qplPp)
        ? roundMoney(rates.qplPp + adult, currency)
        : undefined,
    // Never show a negative child package line (BM probe quirks / FX mix).
    chd: chdRaw == null ? undefined : Math.max(0, chdRaw),
    childEqualsAdult: rates.childEqualsAdult,
  };
}

/** Compare-column figures for mayorista: DBL/TPL/CHD pp (hotel + servicios), not total÷pax. */
export function summarizeWholesaleOption(
  hotels: HotelCartItem[],
  allItems: CartItem[],
  feesMayorRedondeo: number,
  pax: number,
  roomPlan: BriefingRoom[] | undefined,
  linePrice: (item: CartItem) => number,
  taUnit = 0,
  baseLinePrice?: (item: CartItem) => number,
  opts?: { displayCurrency?: string; effTrm?: number; trmDia?: number; roundCharmNine?: boolean }
): {
  personLines: string[];
  groupTotal?: number;
  /** Total del mix sin aéreos ni bloqueos (base de comisión aproximada). */
  commissionableGroupTotal?: number;
  mixLabel: string;
  currency: string;
  missingHint: string | null;
  combined: {
    currency: string;
    sglPp?: number;
    dblPp?: number;
    tplPp?: number;
    qplPp?: number;
    chd?: number;
    childEqualsAdult?: boolean;
  };
  /** Package tiers before …9 (when roundCharmNine). */
  combinedRaw?: {
    currency: string;
    sglPp?: number;
    dblPp?: number;
    tplPp?: number;
    qplPp?: number;
    chd?: number;
    childEqualsAdult?: boolean;
  };
  /** Excess added by package …9 per tier (only > 0). */
  roundUplift?: {
    sglPp?: number;
    dblPp?: number;
    tplPp?: number;
    qplPp?: number;
    chd?: number;
  };
} {
  const displayCurrency = (opts?.displayCurrency || 'COP').toUpperCase();
  const effTrm = opts?.effTrm && opts.effTrm > 0 ? opts.effTrm : 0;
  const trmDia = opts?.trmDia && opts.trmDia > 0 ? opts.trmDia : undefined;
  const feePax = wholesaleFeePax(pax, roomPlan);
  const shared = wholesaleServiceShares(
    hotels,
    allItems,
    linePrice,
    feesMayorRedondeo,
    feePax,
    taUnit
  );
  const commissionableShared = wholesaleServiceShares(
    hotels,
    allItems,
    linePrice,
    feesMayorRedondeo,
    feePax,
    taUnit,
    { excludeNonCommissionable: true }
  );
  const kit = optionKitPersonRates(hotels, allItems, linePrice);

  // Hotel tiers only (no shared/TA). Combinado: sum stay A + stay B, then add services once.
  const hotelOnlyPkgs = hotels.map((hotel) => {
    const base = baseLinePrice
      ? baseLinePrice(hotel)
      : hotel.selectedRate?.price ?? 0;
    const ratesDisp = occupancyRatesToCurrency(
      hotel.occupancyRates as OccupancyTierRates | undefined,
      displayCurrency,
      effTrm,
      trmDia
    );
    const adjPp =
      ratesDisp &&
      (ratesDisp.dblPp != null ||
        ratesDisp.tplPp != null ||
        ratesDisp.qplPp != null ||
        ratesDisp.sglPp != null ||
        ratesDisp.chd != null)
        ? 0
        : hotelItemAdjustmentPp(hotel, linePrice(hotel), base);
    const rates = applyHotelAdjToRates(ratesDisp, adjPp);
    return packageTierPrices(rates, 0, 0);
  });
  const hotelSum = sumPackageTier(hotelOnlyPkgs);
  let combinedRaw = packageTierPrices(
    {
      currency: hotelSum.currency || displayCurrency,
      sglPp: hotelSum.sglPp,
      dblPp: hotelSum.dblPp,
      tplPp: hotelSum.tplPp,
      qplPp: hotelSum.qplPp,
      chd: hotelSum.chd,
      childEqualsAdult: hotelSum.childEqualsAdult,
    },
    shared.adultShare + kit.adult,
    shared.childShare + kit.child
  );
  const dispCur = (displayCurrency === 'USD' ? 'USD' : 'COP') as DisplayCurrency;
  let combined = combinedRaw;
  let roundUplift:
    | {
        sglPp?: number;
        dblPp?: number;
        tplPp?: number;
        qplPp?: number;
        chd?: number;
      }
    | undefined;
  if (opts?.roundCharmNine) {
    combined = charmNinePackageTiers(combinedRaw, dispCur);
    const delta = (a?: number, b?: number): number | undefined => {
      if (a == null || b == null || !Number.isFinite(a) || !Number.isFinite(b)) return undefined;
      const d = a - b;
      return d > 0.0001 ? d : undefined;
    };
    roundUplift = {
      sglPp: delta(combined.sglPp, combinedRaw.sglPp),
      dblPp: delta(combined.dblPp, combinedRaw.dblPp),
      tplPp: delta(combined.tplPp, combinedRaw.tplPp),
      qplPp: delta(combined.qplPp, combinedRaw.qplPp),
      chd: combined.childEqualsAdult
        ? undefined
        : delta(combined.chd, combinedRaw.chd),
    };
    if (
      roundUplift.sglPp == null &&
      roundUplift.dblPp == null &&
      roundUplift.tplPp == null &&
      roundUplift.qplPp == null &&
      roundUplift.chd == null
    ) {
      roundUplift = undefined;
    }
  }
  const currency = (combined.currency || displayCurrency || 'COP').toUpperCase();
  const personLines =
    hotels.length === 0 ? [] : formatWholesalePersonValues({ ...combined, currency });
  const groupTotal =
    hotels.length === 0 ? undefined : wholesaleTotalFromPlan(roomPlan, combined) ?? undefined;

  let commissionableCombined = packageTierPrices(
    {
      currency: hotelSum.currency || displayCurrency,
      sglPp: hotelSum.sglPp,
      dblPp: hotelSum.dblPp,
      tplPp: hotelSum.tplPp,
      qplPp: hotelSum.qplPp,
      chd: hotelSum.chd,
      childEqualsAdult: hotelSum.childEqualsAdult,
    },
    commissionableShared.adultShare + kit.adult,
    commissionableShared.childShare + kit.child
  );
  if (opts?.roundCharmNine) {
    commissionableCombined = charmNinePackageTiers(commissionableCombined, dispCur);
  }
  const commissionableGroupTotal =
    hotels.length === 0
      ? undefined
      : wholesaleTotalFromPlan(roomPlan, commissionableCombined) ?? undefined;

  const mergedRates: OccupancyTierRates = {
    currency,
    sglPp: combined.sglPp,
    dblPp: combined.dblPp,
    tplPp: combined.tplPp,
    qplPp: combined.qplPp,
    chd: combined.chd,
    childEqualsAdult: combined.childEqualsAdult,
  };
  const missingHint =
    hotels.length === 0
      ? null
      : occupancyMissingHint(mergedRates, occupancyHintOptsFromPlan(roomPlan));

  return {
    personLines,
    groupTotal,
    commissionableGroupTotal,
    mixLabel: formatRoomPlanMix(roomPlan),
    currency,
    missingHint,
    combined: { ...combined, currency },
    combinedRaw: { ...combinedRaw, currency },
    roundUplift,
  };
}
