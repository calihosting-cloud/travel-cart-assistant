import type { CartItem } from '../engine/core/types';
import type { BriefingRoom } from './roomPlan';
import { roomsFromBriefing, summarizeRoomPlan } from './roomPlan';
import type { QuoteMode } from './quoteMode';
import { parseComboTransferName } from './hotelTransferKit';

/** Quote completion chips under Guía (asesor). */
export type QuoteCoverageKind =
  | 'accommodation'
  | 'flight_bloqueo'
  | 'hotel'
  | 'transfer'
  | 'insurance'
  | 'activity';

export interface QuoteCoverageChip {
  kind: QuoteCoverageKind;
  /** Base label without count. */
  label: string;
  count: number;
  /** Extra after label, e.g. "5A + 1N" for acomodación. */
  detail?: string;
  /** When set, drives green/red instead of count > 0. */
  ok?: boolean;
}

/** Compact pax for coverage chip: "2A", "5A + 1N". */
export function formatAccommodationChipPax(adults: number, children: number): string {
  const a = Math.max(0, Math.floor(adults) || 0);
  const c = Math.max(0, Math.floor(children) || 0);
  if (a <= 0 && c <= 0) return '2A';
  if (c > 0) return `${a}A + ${c}N`;
  return `${a}A`;
}

export interface QuoteCoverageOpts {
  quoteMode?: QuoteMode;
  /** User touched Acomodación (room plan); false/undefined → chip red. */
  accommodationConfirmed?: boolean;
  roomPlan?: BriefingRoom[];
  totalAdults?: number;
  totalChildren?: number;
  childrenAges?: number[];
}

/**
 * Counts cart services for the completeness strip.
 * Vuelo/Bloqueo = flights + circuitos marcados como bloqueo.
 * Actividades = activities + tours embebidos en combos de traslado (+ circuitos no-bloqueo).
 * Acomodación (mayorista) goes first: red until confirmed.
 */
export function quoteCoverageFromItems(
  items: CartItem[],
  opts?: QuoteCoverageOpts
): QuoteCoverageChip[] {
  let flightBloqueo = 0;
  let hotel = 0;
  let transfer = 0;
  let insurance = 0;
  let activity = 0;

  for (const item of items) {
    if (item.type === 'flight') flightBloqueo += 1;
    else if (item.type === 'tour' && item.isBloqueo) flightBloqueo += 1;
    else if (item.type === 'hotel') hotel += 1;
    else if (item.type === 'transfer') {
      transfer += 1;
      const combo = parseComboTransferName(item.name);
      if (combo?.tours.length) activity += combo.tours.length;
    } else if (item.type === 'insurance') insurance += 1;
    else if (item.type === 'activity') activity += 1;
    else if (item.type === 'tour' && !item.isBloqueo) activity += 1;
  }

  const chips: QuoteCoverageChip[] = [];

  if (opts?.quoteMode === 'wholesale') {
    const rooms = roomsFromBriefing(
      opts.roomPlan,
      opts.totalAdults ?? 2,
      opts.totalChildren ?? 0,
      opts.childrenAges
    );
    const { adults, children } = summarizeRoomPlan(rooms);
    const confirmed = opts.accommodationConfirmed === true;
    chips.push({
      kind: 'accommodation',
      label: 'Acomodación',
      count: confirmed ? 1 : 0,
      detail: formatAccommodationChipPax(adults, children),
      ok: confirmed,
    });
  }

  chips.push(
    { kind: 'flight_bloqueo', label: 'Vuelo/Bloqueo', count: flightBloqueo },
    { kind: 'hotel', label: 'Hotel', count: hotel },
    { kind: 'transfer', label: 'Traslados', count: transfer },
    { kind: 'insurance', label: 'Seguros', count: insurance },
    { kind: 'activity', label: 'Actividades', count: activity }
  );

  return chips;
}

/** Chip text: "(Hotel)", "(Hotel 2)", "(Acomodación 5A + 1N)". */
export function quoteCoverageChipText(chip: QuoteCoverageChip): string {
  if (chip.kind === 'accommodation' && chip.detail) {
    return `(${chip.label} ${chip.detail})`;
  }
  if (chip.count <= 0) return `(${chip.label})`;
  if (chip.count === 1) return `(${chip.label})`;
  return `(${chip.label} ${chip.count})`;
}

export function quoteCoverageChipOk(chip: QuoteCoverageChip): boolean {
  if (chip.ok !== undefined) return chip.ok;
  return chip.count > 0;
}
