import type {
  CartItem,
  FlightCartItem,
  HotelCartItem,
  SearchContext,
} from '../engine/core/types';
import type { HotelCompareOptionGroup } from './quoteOptions';
import type { TaConfig, TaSelection, TaType } from './taConfig';
import { resolveTaUnitCop, suggestTaType } from './taConfig';
import {
  DisplayCurrency,
  copToUsd,
  effectiveTrm,
  usdToCop,
} from './trm';

export const MAYOR_VALOR_ID = 'mayor_valor_cobrado';
export const REDONDEO_ID = 'redondeo';

export interface FeeDefinition {
  id: string;
  label: string;
  defaultValue: number;
}

export const FEE_DEFINITIONS: FeeDefinition[] = [
  { id: MAYOR_VALOR_ID, label: 'Mayor valor cobrado', defaultValue: 0 },
  { id: REDONDEO_ID, label: 'Redondeo', defaultValue: 0 },
];

export function defaultFees(): Record<string, number> {
  const fees: Record<string, number> = {};
  for (const def of FEE_DEFINITIONS) fees[def.id] = def.defaultValue;
  return fees;
}

export function formatCartPrice(currency: string, amount: number): string {
  const cur = (currency || 'COP').toUpperCase();
  try {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: cur === 'USD' ? 'USD' : 'COP',
      maximumFractionDigits: cur === 'USD' ? 2 : 0,
    }).format(amount);
  } catch {
    return `${Math.round(amount)} ${cur}`;
  }
}

export function getEffectiveTrm(trmRate: number, trmSuplemento: number): number {
  return effectiveTrm(trmRate, trmSuplemento);
}

export function toDisplay(
  amount: number,
  fromCurrency: string,
  displayCurrency: DisplayCurrency,
  effTrm: number
): { currency: string; price: number } {
  const target = displayCurrency;
  const from = (fromCurrency || 'COP').toUpperCase();
  if (from === target) return { currency: target, price: amount };
  if (!(effTrm > 0)) return { currency: target, price: amount };
  if (from === 'USD' && target === 'COP') {
    return { currency: 'COP', price: usdToCop(amount, effTrm) };
  }
  if (from === 'COP' && target === 'USD') {
    return { currency: 'USD', price: copToUsd(amount, effTrm) };
  }
  return { currency: from, price: amount };
}

export function copAmountToDisplay(
  cop: number,
  displayCurrency: DisplayCurrency,
  effTrm: number
): number {
  if (displayCurrency === 'COP') return cop;
  if (!(effTrm > 0)) return cop;
  return copToUsd(cop, effTrm);
}

export function displayAmountToCop(
  amount: number,
  displayCurrency: DisplayCurrency,
  effTrm: number
): number {
  if (displayCurrency === 'COP') return amount;
  if (!(effTrm > 0)) return amount;
  return usdToCop(amount, effTrm);
}

export function getItemNativePrice(item: CartItem): { currency: string; price: number } {
  if (item.type === 'hotel') {
    return { currency: item.selectedRate.currency, price: item.selectedRate.price };
  }
  return { currency: item.currency, price: item.price };
}

export function getItemBasePrice(
  item: CartItem,
  displayCurrency: DisplayCurrency,
  effTrm: number
): { currency: string; price: number } {
  const native = getItemNativePrice(item);
  return toDisplay(native.price, native.currency, displayCurrency, effTrm);
}

export function getItemLineTotal(
  item: CartItem,
  displayCurrency: DisplayCurrency,
  effTrm: number
): { currency: string; price: number } {
  const base = getItemBasePrice(item, displayCurrency, effTrm);
  const mayor = copAmountToDisplay(Math.max(0, Number(item.mayorValor) || 0), displayCurrency, effTrm);
  const redondeo = copAmountToDisplay(Math.max(0, Number(item.redondeo) || 0), displayCurrency, effTrm);
  return { currency: base.currency, price: base.price + mayor + redondeo };
}

export function getTotalsByCurrency(
  items: CartItem[],
  displayCurrency: DisplayCurrency,
  effTrm: number
): Map<string, number> {
  const totals = new Map<string, number>();
  for (const item of items) {
    const { currency, price } = getItemLineTotal(item, displayCurrency, effTrm);
    totals.set(currency, (totals.get(currency) || 0) + price);
  }
  return totals;
}

export function getPrimaryCurrency(
  subtotals: Map<string, number>,
  displayCurrency: DisplayCurrency
): string {
  if (subtotals.has(displayCurrency)) return displayCurrency;
  let best: string = displayCurrency;
  let bestValue = -Infinity;
  for (const [currency, value] of subtotals) {
    if (value > bestValue) {
      bestValue = value;
      best = currency;
    }
  }
  return best || displayCurrency;
}

export function getTaPaxCount(
  items: CartItem[],
  tripGuide: SearchContext | null,
  searchContext: SearchContext | null
): number {
  const candidates: number[] = [];
  for (const item of items) {
    if (item.type === 'flight') {
      candidates.push(item.adults + item.children + item.infants);
    } else if (item.type === 'hotel') {
      candidates.push(
        item.occupancy.reduce((sum, room) => sum + room.adults + room.children, 0)
      );
    } else if (item.type === 'transfer' || item.type === 'activity') {
      candidates.push(item.adults + item.children);
    } else if (item.type === 'insurance') {
      candidates.push(item.passengers);
    }
  }
  if (tripGuide) candidates.push(tripGuide.totalAdults + tripGuide.totalChildren);
  if (searchContext) {
    candidates.push(searchContext.totalAdults + searchContext.totalChildren);
  }
  const max = Math.max(0, ...candidates);
  return max > 0 ? max : Math.max(1, items.length > 0 ? 1 : 0);
}

export function getTaTotal(taSelection: TaSelection, pax: number): number {
  if (!(taSelection.unitCop > 0)) return 0;
  return Math.round(taSelection.unitCop * pax);
}

/** Fees (mayor+redondeo+TA) converted to display currency. */
export function getFeesTotalDisplay(
  fees: Record<string, number>,
  taTotalCop: number,
  displayCurrency: DisplayCurrency,
  effTrm: number
): number {
  const base = FEE_DEFINITIONS.reduce((sum, def) => sum + (fees[def.id] || 0), 0);
  return copAmountToDisplay(base + taTotalCop, displayCurrency, effTrm);
}

export function roundUnit(displayCurrency: DisplayCurrency): number {
  return displayCurrency === 'USD' ? 10 : 10_000;
}

/** Excess to store as Redondeo (COP) to reach next round unit. */
export function computeRoundingExcessCop(
  items: CartItem[],
  fees: Record<string, number>,
  taTotalCop: number,
  displayCurrency: DisplayCurrency,
  effTrm: number
): number {
  const subtotals = getTotalsByCurrency(items, displayCurrency, effTrm);
  if (subtotals.size === 0) return 0;
  const primary = getPrimaryCurrency(subtotals, displayCurrency);
  const itemsTotal = subtotals.get(primary) || 0;
  const mayorValor = copAmountToDisplay(fees[MAYOR_VALOR_ID] || 0, displayCurrency, effTrm);
  const taTotal = copAmountToDisplay(taTotalCop, displayCurrency, effTrm);
  const base = itemsTotal + mayorValor + taTotal;
  const unit = roundUnit(displayCurrency);
  const rounded = Math.ceil(base / unit) * unit;
  const excessDisplay = Math.max(0, rounded - base);
  return displayAmountToCop(excessDisplay, displayCurrency, effTrm);
}

export function applyTaType(
  taConfig: TaConfig,
  type: TaType,
  effTrm: number
): TaSelection {
  return {
    type,
    unitCop: resolveTaUnitCop(taConfig, type, effTrm),
  };
}

export function suggestTaFromItems(items: CartItem[]): TaType | null {
  const flight = items.find((i): i is FlightCartItem => i.type === 'flight');
  if (!flight) return null;
  return suggestTaType({
    routeType: flight.routeType,
    originCode: flight.origin.code,
    destinationCode: flight.destination.code,
  });
}

function normalizeChildAges(ages?: number[]): number[] {
  if (!Array.isArray(ages)) return [];
  return ages.filter((a) => typeof a === 'number' && a >= 0);
}

/** Sticky flight guide wins; enrich ages from search/hotels when missing. */
export function headerSearchContext(
  tripGuide: SearchContext | null,
  searchContext: SearchContext | null,
  items: CartItem[]
): SearchContext | null {
  const guide = tripGuide;
  const search = searchContext;
  if (!guide) return search;

  const guideAges = normalizeChildAges(guide.childrenAges);
  if (guideAges.length > 0) return guide;

  const fromSearch = normalizeChildAges(search?.childrenAges);
  if (fromSearch.length > 0) {
    return {
      ...guide,
      childrenAges: fromSearch,
      totalChildren: Math.max(guide.totalChildren, search?.totalChildren ?? 0, fromSearch.length),
    };
  }

  const fromHotels = normalizeChildAges(
    items
      .filter((i): i is HotelCartItem => i.type === 'hotel')
      .flatMap((h) => h.occupancy.flatMap((o) => o.childrenAges ?? []))
  );
  if (fromHotels.length > 0) {
    return {
      ...guide,
      childrenAges: fromHotels,
      totalChildren: Math.max(guide.totalChildren, fromHotels.length),
    };
  }

  return guide;
}

export function itemTotalsMap(
  items: CartItem[],
  displayCurrency: DisplayCurrency,
  effTrm: number
): Record<string, number> {
  return Object.fromEntries(
    items.map((item) => [item.id, getItemLineTotal(item, displayCurrency, effTrm).price])
  );
}

/** Simple option totals when comparing hotels (shared services + hotels in group). */
export function compareOptionTotals(
  items: CartItem[],
  groups: HotelCompareOptionGroup[],
  feesTotalDisplay: number,
  displayCurrency: DisplayCurrency,
  effTrm: number
): Array<{ index: number; id: string; hotelNames: string[]; total: number; perPerson: number; pax: number }> {
  const hotels = items.filter((i): i is HotelCartItem => i.type === 'hotel');
  const shared = items.filter((i) => i.type !== 'hotel');
  const sharedSum = shared.reduce(
    (s, i) => s + getItemLineTotal(i, displayCurrency, effTrm).price,
    0
  );
  const pax = getTaPaxCount(items, null, null);

  return groups.map((g, index) => {
    const groupHotels = hotels.filter((h) => g.hotelIds.includes(h.id));
    const hotelSum = groupHotels.reduce(
      (s, h) => s + getItemLineTotal(h, displayCurrency, effTrm).price,
      0
    );
    const total = sharedSum + hotelSum + feesTotalDisplay;
    return {
      index: index + 1,
      id: g.id,
      hotelNames: groupHotels.map((h) => h.hotelName),
      total,
      perPerson: Math.round(total / Math.max(1, pax)),
      pax: Math.max(1, pax),
    };
  });
}
