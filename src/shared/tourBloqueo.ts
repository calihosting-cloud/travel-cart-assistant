import type { TourCartItem } from '../engine/core/types';

const WEEKDAYS_ES = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
];

const MONTHS_ES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

/** DD-MM-YYYY → "Jueves, 12 noviembre 2026". */
export function formatDdMmYyyySpanishLong(ddMmYyyy?: string): string {
  if (!ddMmYyyy) return '';
  const m = ddMmYyyy.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!m) return ddMmYyyy;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  if (!(month >= 1 && month <= 12) || !(day >= 1 && day <= 31)) return ddMmYyyy;
  const d = new Date(year, month - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) {
    return ddMmYyyy;
  }
  return `${WEEKDAYS_ES[d.getDay()]}, ${day} ${MONTHS_ES[month - 1]} ${year}`;
}

/**
 * Bloqueo aéreo lines for WhatsApp / PDF (no price — $/pp goes into acomodaciones).
 * Example:
 *   BLOQUEO JETSMART - CALI - SAN ANDRES
 *   Salida Jueves, 12 noviembre 2026
 *   Regreso Domingo, 15 noviembre 2026
 *   Incluye Articulo Personal 10 Kg.
 */
export function formatBloqueoItineraryLines(tour: TourCartItem): string[] {
  const lines: string[] = [];
  const title = (tour.name || 'BLOQUEO').replace(/\s+/g, ' ').trim();
  lines.push(title);

  const salida = (tour.departureLabel || formatDdMmYyyySpanishLong(tour.departureDate) || '').trim();
  if (salida) lines.push(`Salida ${salida}`);

  const regreso = (
    tour.returnLabel ||
    formatDdMmYyyySpanishLong(tour.returnDate) ||
    tour.returnDate ||
    ''
  ).trim();
  if (regreso) lines.push(`Regreso ${regreso}`);

  const bag = (tour.baggageNote || '').replace(/^incluye\s+/i, '').trim();
  if (bag) lines.push(`Incluye ${bag}${/[.!?]$/.test(bag) ? '' : '.'}`);

  return lines;
}

/**
 * Flat $/persona for seat-block.
 * Prefer Individual (paso 2) when known — total÷pax is wrong when BM total is
 * seats×Individual but accommodation pax ≠ seats sold.
 */
export function bloqueoPricePerPerson(
  total: number,
  payingPax: number,
  individualPp?: number
): number {
  if (individualPp != null && individualPp > 0) return individualPp;
  const pax = Math.max(1, Math.floor(payingPax) || 1);
  if (!(total > 0)) return 0;
  return total / pax;
}
