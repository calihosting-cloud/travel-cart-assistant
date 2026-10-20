/** Mix of DBL/TPL rooms for the real trip (briefing), not BM probe occupancy. */

import type { BriefingRoom, BriefingRoomKind } from '../engine/core/types';

export type { BriefingRoom, BriefingRoomKind };

export function adultsForKind(kind: BriefingRoomKind): number {
  if (kind === 'QPL') return 4;
  if (kind === 'TPL') return 3;
  if (kind === 'SGL') return 1;
  return 2;
}

function normalizeAges(raw: unknown, max: number): number[] {
  if (!Array.isArray(raw)) return [];
  const out: number[] = [];
  for (const item of raw) {
    const n = Math.floor(Number(item));
    if (!Number.isFinite(n) || n < 0 || n > 17) continue;
    out.push(n);
    if (out.length >= max) break;
  }
  return out;
}

export function normalizeRoomPlan(raw: unknown): BriefingRoom[] {
  if (!Array.isArray(raw)) return [];
  const out: BriefingRoom[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const rec = item as { kind?: unknown; children?: unknown; childrenAges?: unknown };
    const kindRaw = String(rec.kind || '').toUpperCase();
    if (kindRaw !== 'DBL' && kindRaw !== 'TPL' && kindRaw !== 'SGL' && kindRaw !== 'QPL') continue;
    const kind = kindRaw as BriefingRoomKind;
    const children = Math.max(0, Math.min(4, Math.floor(Number(rec.children) || 0)));
    const childrenAges = normalizeAges(rec.childrenAges, children);
    out.push({ kind, children, childrenAges });
  }
  return out;
}

export function flattenChildAges(rooms: BriefingRoom[]): number[] {
  return rooms.flatMap((r) => (r.childrenAges || []).slice(0, r.children || 0));
}

/** Fill per-room ages from a flat list when the plan has none yet. */
export function distributeChildAges(rooms: BriefingRoom[], ages?: number[]): BriefingRoom[] {
  const clean = normalizeAges(ages, 16);
  const hasPerRoom = rooms.some((r) => (r.childrenAges || []).length > 0);
  let i = 0;
  return rooms.map((r) => {
    const n = r.children || 0;
    const fromRoom = (r.childrenAges || []).slice(0, n);
    const slice = hasPerRoom ? fromRoom : clean.slice(i, i + n);
    i += n;
    return { ...r, children: n, childrenAges: slice };
  });
}

export function summarizeRoomPlan(rooms: BriefingRoom[]): { adults: number; children: number } {
  let adults = 0;
  let children = 0;
  for (const room of rooms) {
    adults += adultsForKind(room.kind);
    children += Math.max(0, room.children || 0);
  }
  return { adults, children };
}

export function formatRoomPlanSummary(rooms: BriefingRoom[]): string {
  const { adults, children } = summarizeRoomPlan(rooms);
  const adt = `${adults} adulto${adults !== 1 ? 's' : ''}`;
  if (children <= 0) return adt;
  return `${adt} + ${children} niño${children !== 1 ? 's' : ''}`;
}

/** e.g. "2 DBL · 1 TPL · 1 CHD" for wholesale totals. */
export function formatRoomPlanMix(rooms: BriefingRoom[] | undefined): string {
  const plan = normalizeRoomPlan(rooms);
  if (plan.length === 0) return '';
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
  const bits: string[] = [];
  if (sgl) bits.push(`${sgl} SGL`);
  if (dbl) bits.push(`${dbl} DBL`);
  if (tpl) bits.push(`${tpl} TPL`);
  if (qpl) bits.push(`${qpl} QPL`);
  if (chd) bits.push(`${chd} CHD`);
  return bits.join(' · ');
}

/** e.g. "1 DBL + CHD y 1 TPL" for PDF totals. */
export function formatRoomPlanMixDetailed(rooms: BriefingRoom[] | undefined): string {
  const plan = normalizeRoomPlan(rooms);
  if (plan.length === 0) return '';
  const parts = plan.map((room) => {
    const chd =
      room.children > 0
        ? ` + ${room.children} CHD`
        : '';
    return `1 ${room.kind}${chd}`;
  });
  return parts.join(' y ');
}

/**
 * Client-facing mix, e.g. "1 DBL + niño y 1 TPL".
 * Used in WhatsApp / PDF / vista cliente (not advisor breakdown).
 */
export function formatRoomPlanMixForClient(rooms: BriefingRoom[] | undefined): string {
  const plan = normalizeRoomPlan(rooms);
  if (plan.length === 0) return '';
  const parts = plan.map((room) => {
    const n = Math.max(0, room.children || 0);
    const chd =
      n <= 0
        ? ''
        : n === 1
          ? ' + niño'
          : ` + ${n} niños`;
    return `1 ${room.kind}${chd}`;
  });
  return parts.join(' y ');
}

/**
 * Lead for client total line (without amount):
 * "Valor para 5 adultos y 1 niño (En acomodación 1 DBL + niño y 1 TPL)"
 */
export function formatWholesaleClientTotalLead(
  roomPlan: BriefingRoom[] | undefined,
  fallback?: { adults?: number; children?: number }
): string | null {
  const plan = normalizeRoomPlan(roomPlan);
  let adults = 0;
  let children = 0;
  if (plan.length > 0) {
    const sum = summarizeRoomPlan(plan);
    adults = sum.adults;
    children = sum.children;
  } else {
    adults = Math.max(0, fallback?.adults || 0);
    children = Math.max(0, fallback?.children || 0);
  }
  if (adults <= 0 && children <= 0) return null;
  const paxLabel =
    children > 0
      ? `${adults} adulto${adults !== 1 ? 's' : ''} + ${children} niño${children !== 1 ? 's' : ''}`
      : `${adults} adulto${adults !== 1 ? 's' : ''}`;
  const mix = formatRoomPlanMixForClient(roomPlan);
  if (mix) return `Valor para ${paxLabel} (En acomodación ${mix})`;
  return `Valor para ${paxLabel}`;
}

/** e.g. "5 adt, 1 niño (6)" when room plan / briefing pax is set. */
export function formatBriefingPaxCompact(
  ctx: { roomPlan?: unknown; totalAdults?: number; totalChildren?: number } | null | undefined
): string {
  const plan = normalizeRoomPlan(ctx?.roomPlan);
  let adults = 0;
  let children = 0;
  if (plan.length > 0) {
    const sum = summarizeRoomPlan(plan);
    adults = sum.adults;
    children = sum.children;
  } else if (ctx?.totalAdults || ctx?.totalChildren) {
    adults = Math.max(0, ctx.totalAdults || 0);
    children = Math.max(0, ctx.totalChildren || 0);
  }
  if (adults <= 0 && children <= 0) return '';
  const paying = adults + children;
  const bits: string[] = [];
  if (adults > 0) bits.push(`${adults} adt`);
  if (children > 0) bits.push(`${children} niño${children !== 1 ? 's' : ''}`);
  return `${bits.join(', ')} (${paying})`;
}

export function hasAccommodationPlan(ctx: { roomPlan?: unknown } | null | undefined): boolean {
  return normalizeRoomPlan(ctx?.roomPlan).length > 0;
}

/** Fallback when an older briefing only has totalAdults / totalChildren. */
export function inferRoomPlan(adults: number, children: number): BriefingRoom[] {
  const rooms: BriefingRoom[] = [];
  let left = Math.max(0, Math.floor(adults) || 0);
  while (left > 0) {
    if (left === 1) {
    rooms.push({ kind: 'SGL', children: 0, childrenAges: [] });
      left = 0;
      break;
    }
    if (left === 4) {
      rooms.push({ kind: 'DBL', children: 0, childrenAges: [] }, { kind: 'DBL', children: 0, childrenAges: [] });
      left = 0;
      break;
    }
    if (left === 5) {
      rooms.push({ kind: 'DBL', children: 0, childrenAges: [] }, { kind: 'TPL', children: 0, childrenAges: [] });
      left = 0;
      break;
    }
    if (left >= 3 && left !== 2) {
      rooms.push({ kind: 'TPL', children: 0, childrenAges: [] });
      left -= 3;
      continue;
    }
    rooms.push({ kind: 'DBL', children: 0, childrenAges: [] });
    left = Math.max(0, left - 2);
  }
  if (rooms.length === 0) rooms.push({ kind: 'DBL', children: 0, childrenAges: [] });
  const kids = Math.max(0, Math.floor(children) || 0);
  if (kids > 0) {
    const dbl = rooms.find((r) => r.kind === 'DBL') || rooms[0];
    dbl.children = kids;
  }
  return rooms;
}

export function roomsFromBriefing(
  plan: BriefingRoom[] | undefined,
  adults: number,
  children: number,
  ages?: number[]
): BriefingRoom[] {
  const saved = normalizeRoomPlan(plan);
  const rooms = saved.length > 0 ? saved : inferRoomPlan(adults, children);
  return distributeChildAges(rooms, ages);
}

export function serializeRoomPlan(rooms: BriefingRoom[]): string {
  return rooms
    .map((r) => `${r.kind}:${r.children || 0}:${(r.childrenAges || []).join(',')}`)
    .join('|');
}

/**
 * Group total from DBL/TPL/CHD pp × mix. Undefined if mix or rates are incomplete.
 */
export function wholesaleTotalFromPlan(
  rooms: BriefingRoom[] | undefined,
  rates: {
    sglPp?: number;
    dblPp?: number;
    tplPp?: number;
    qplPp?: number;
    chd?: number;
    childEqualsAdult?: boolean;
  }
): number | undefined {
  const plan = normalizeRoomPlan(rooms);
  if (plan.length === 0) return undefined;
  const needsSgl = plan.some((r) => r.kind === 'SGL');
  const needsDbl = plan.some((r) => r.kind === 'DBL');
  const needsTpl = plan.some((r) => r.kind === 'TPL');
  const needsQpl = plan.some((r) => r.kind === 'QPL');
  const needsChd = plan.some((r) => (r.children || 0) > 0) && !rates.childEqualsAdult;
  if (needsSgl && (rates.sglPp == null || !Number.isFinite(rates.sglPp))) return undefined;
  if (needsDbl && (rates.dblPp == null || !Number.isFinite(rates.dblPp))) return undefined;
  if (needsTpl && (rates.tplPp == null || !Number.isFinite(rates.tplPp))) return undefined;
  if (needsQpl && (rates.qplPp == null || !Number.isFinite(rates.qplPp))) return undefined;
  if (needsChd && (rates.chd == null || !Number.isFinite(rates.chd))) return undefined;

  let total = 0;
  for (const room of plan) {
    const adtPp =
      room.kind === 'QPL'
        ? rates.qplPp!
        : room.kind === 'TPL'
          ? rates.tplPp!
          : room.kind === 'SGL'
            ? rates.sglPp!
            : rates.dblPp!;
    total += adtPp * adultsForKind(room.kind);
    const kids = room.children || 0;
    if (kids > 0) {
      const childPp = rates.childEqualsAdult ? adtPp : Math.max(0, rates.chd!);
      total += childPp * kids;
    }
  }
  return Math.round(total);
}

export function roomPlanHtml(rooms: BriefingRoom[], opts?: { compact?: boolean }): string {
  const compact = opts?.compact;
  const rows = rooms
    .map((room, idx) => {
      const n = room.children || 0;
      const ages = room.childrenAges || [];
      const ageFields = Array.from({ length: n }, (_, i) => {
        const age = ages[i];
        const val = typeof age === 'number' && Number.isFinite(age) ? String(age) : '';
        return `
        <label class="${compact ? 'tce-room-child-age' : 'room-child-age'}">Edad
          <input type="number" min="0" max="17" step="1" inputmode="numeric" data-child-age
            placeholder="años" value="${val}" title="Edad del niño ${i + 1}" />
        </label>`;
      }).join('');
      return `
      <div class="${compact ? 'tce-room-row' : 'room-row'}" data-room-idx="${idx}" data-children="${n}">
        <label>Tipo hab.
          <select data-room-kind>
            <option value="SGL"${room.kind === 'SGL' ? ' selected' : ''}>SGL · 1 adulto</option>
            <option value="DBL"${room.kind === 'DBL' ? ' selected' : ''}>DBL · 2 adultos</option>
            <option value="TPL"${room.kind === 'TPL' ? ' selected' : ''}>TPL · 3 adultos</option>
            <option value="QPL"${room.kind === 'QPL' ? ' selected' : ''}>QPL · 4 adultos</option>
          </select>
        </label>
        <span class="${compact ? 'tce-room-kids' : 'room-kids'}">
        <button type="button" class="${compact ? 'tce-room-btn' : 'room-btn'}" data-action="room-add-child" title="Niño con los padres (no es TPL)">+ niño</button>
        ${ageFields}
        <button type="button" class="${compact ? 'tce-room-btn' : 'room-btn'}" data-action="room-remove-child" title="Quitar niño">− niño</button>
        </span>
        ${
          rooms.length > 1
            ? `<button type="button" class="${compact ? 'tce-room-btn tce-room-btn--del' : 'room-btn room-btn--del'}" data-action="room-remove" title="Quitar habitación">✕</button>`
            : ''
        }
      </div>`;
    })
    .join('');
  return `
    <div class="${compact ? 'tce-room-plan' : 'room-plan'}" id="${compact ? 'tce-brief-rooms' : 'brief-rooms'}">
      ${rows}
      <div class="${compact ? 'tce-room-actions' : 'room-actions'}">
        <button type="button" class="${compact ? 'tce-room-btn' : 'room-btn'}" data-action="room-add">+ Habitación</button>
        <span class="${compact ? 'tce-room-sum' : 'room-sum'}">${formatRoomPlanSummary(rooms)}</span>
      </div>
    </div>`;
}

export function readRoomPlanFromRoot(root: ParentNode): BriefingRoom[] {
  const rows = Array.from(root.querySelectorAll('[data-room-idx]'));
  if (rows.length === 0) return [];
  return rows.map((row) => {
    const el = row as HTMLElement;
    const kindRaw = (el.querySelector('[data-room-kind]') as HTMLSelectElement | null)?.value;
    const kind: BriefingRoomKind =
      kindRaw === 'QPL'
        ? 'QPL'
        : kindRaw === 'TPL'
          ? 'TPL'
          : kindRaw === 'SGL'
            ? 'SGL'
            : 'DBL';
    const ageInputs = Array.from(el.querySelectorAll<HTMLInputElement>('[data-child-age]'));
    const childrenAges = ageInputs
      .map((inp) => {
        const raw = inp.value.trim();
        if (raw === '') return NaN;
        return Math.floor(Number(raw));
      })
      .filter((n) => Number.isFinite(n) && n >= 0 && n <= 17);
    const children = Math.max(
      ageInputs.length,
      Math.max(0, Number(el.dataset.children || '0') || 0)
    );
    return { kind, children: Math.min(4, children), childrenAges: childrenAges.slice(0, 4) };
  });
}

export function mutateRoomPlan(
  rooms: BriefingRoom[],
  action: string,
  index: number
): BriefingRoom[] {
  const next = rooms.map((r) => ({ ...r, childrenAges: [...(r.childrenAges || [])] }));
  if (action === 'room-add') {
    next.push({ kind: 'DBL', children: 0, childrenAges: [] });
    return next;
  }
  const room = next[index];
  if (!room) return next;
  if (action === 'room-remove') {
    if (next.length <= 1) return next;
    next.splice(index, 1);
    return next;
  }
  if (action === 'room-add-child') {
    room.children = Math.min(4, (room.children || 0) + 1);
    return next;
  }
  if (action === 'room-remove-child') {
    room.children = Math.max(0, (room.children || 0) - 1);
    room.childrenAges = (room.childrenAges || []).slice(0, room.children);
    return next;
  }
  return next;
}
