import type {
  ActivityCartItem,
  CartItem,
  FlightCartItem,
  HotelCartItem,
  InsuranceCartItem,
  TransferCartItem,
} from '../engine/core/types';
import type { HotelCompareOptionGroup } from './quoteOptions';
import { transfersForHotel } from './hotelTransferKit';
import {
  occupancyHasBaseline,
  occupancyHintOptsFromPlan,
  occupancyMissingHint,
  occupancyRatesToCurrency,
  type OccupancyTierRates,
} from './occupancyRates';
import { hasAccommodationPlan, normalizeRoomPlan, summarizeRoomPlan } from './roomPlan';
import { parseTripDate } from './tripGuide';
import type { DisplayCurrency } from './trm';

export const DISMISSED_WARNINGS_KEY = 'tce_dismissed_warnings';

export type QuoteWarningSeverity = 'warn' | 'info';

export interface QuoteWarning {
  /** Stable id for dismiss (same issue → same id until cart changes). */
  id: string;
  severity: QuoteWarningSeverity;
  message: string;
  /** What the advisor should do. */
  solution: string;
}

export async function loadDismissedWarnings(): Promise<string[]> {
  try {
    const result = await chrome.storage.local.get(DISMISSED_WARNINGS_KEY);
    const raw = result[DISMISSED_WARNINGS_KEY];
    return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export async function dismissWarning(id: string): Promise<void> {
  if (!id) return;
  try {
    const prev = await loadDismissedWarnings();
    if (prev.includes(id)) return;
    await chrome.storage.local.set({
      [DISMISSED_WARNINGS_KEY]: [...prev, id].slice(-80),
    });
  } catch {
    // ignore
  }
}

export async function clearDismissedWarnings(): Promise<void> {
  try {
    await chrome.storage.local.remove(DISMISSED_WARNINGS_KEY);
  } catch {
    // ignore
  }
}

function hotelsInGroups(items: CartItem[]): HotelCartItem[] {
  return items.filter((i): i is HotelCartItem => i.type === 'hotel');
}

function formatDayLabel(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}-${mm}-${d.getFullYear()}`;
}

function dayDiff(a: Date, b: Date): number {
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((utcA - utcB) / 86_400_000);
}

function mixPayingPax(
  roomPlan: unknown,
  fallback?: { adults?: number; children?: number }
): number | null {
  const plan = normalizeRoomPlan(roomPlan);
  if (plan.length > 0) {
    const sum = summarizeRoomPlan(plan);
    const n = sum.adults + sum.children;
    return n > 0 ? n : null;
  }
  const adults = Math.max(0, fallback?.adults || 0);
  const children = Math.max(0, fallback?.children || 0);
  const n = adults + children;
  return n > 0 ? n : null;
}

/** Wholesale quote warnings (shown near coverage chips). */
export function quoteWholesaleWarnings(
  items: CartItem[],
  hotelOptionGroups: HotelCompareOptionGroup[],
  opts?: {
    roomPlan?: unknown;
    displayCurrency?: DisplayCurrency;
    effTrm?: number;
    trmDia?: number;
    occupancyTotalOpen?: boolean;
    autoRoundOccupancy?: boolean;
    tripCheckIn?: string;
    tripCheckOut?: string;
    tripAdults?: number;
    tripChildren?: number;
  }
): QuoteWarning[] {
  const warnings: QuoteWarning[] = [];
  const hotels = hotelsInGroups(items);
  const transfers = items.filter((i): i is TransferCartItem => i.type === 'transfer');
  const flights = items.filter((i): i is FlightCartItem => i.type === 'flight');
  const activities = items.filter((i): i is ActivityCartItem => i.type === 'activity');
  const insurances = items.filter((i): i is InsuranceCartItem => i.type === 'insurance');
  const multiOptions = hotelOptionGroups.length > 1;
  const roomPlan = opts?.roomPlan;
  const hasPlan = hasAccommodationPlan({ roomPlan });

  // --- Transfers outside kit ---
  for (const t of transfers) {
    if (t.linkedHotelId) continue;
    const touches = hotels.filter((h) => transfersForHotel(h, [t]).length > 0);
    if (touches.length > 0) continue;

    if (multiOptions) {
      warnings.push({
        id: `xfer-shared-all:${t.id}`,
        severity: 'warn',
        message: `Traslado «${t.name}» no está en kit de un hotel: se suma a TODAS las opciones (riesgo de cobro doble si no corresponde).`,
        solution:
          'Usa el botón 🚐 Traslado del hotel (kit) para enlazarlo solo a esa opción, o elimina el traslado suelto si cada hotel ya trae el suyo.',
      });
    } else if (hotels.length === 0) {
      warnings.push({
        id: `xfer-no-hotel:${t.id}`,
        severity: 'warn',
        message: `Traslado «${t.name}» sin hotel en el carrito — verifica que aplique al viaje.`,
        solution: 'Agrega el hotel primero o quita el traslado si aún no cotizas hospedaje.',
      });
    }
  }

  // Shared transfer + some hotels already have kit → double charge on those options
  const sharedTransfers = transfers.filter((t) => {
    if (t.linkedHotelId) return false;
    return !hotels.some((h) => transfersForHotel(h, [t]).length > 0);
  });
  if (multiOptions && sharedTransfers.length > 0) {
    for (const h of hotels) {
      const kitXfers = transfersForHotel(h, transfers);
      if (kitXfers.length === 0) continue;
      const optIdx = hotelOptionGroups.findIndex((g) => g.hotelIds.includes(h.id)) + 1;
      for (const shared of sharedTransfers) {
        warnings.push({
          id: `xfer-double:${shared.id}:${h.id}`,
          severity: 'warn',
          message: `Opción ${optIdx > 0 ? optIdx : '?'} (${h.hotelName}) tiene traslado en kit y además el traslado suelto «${shared.name}» se suma a todas las opciones → cobro doble de traslado en esa opción.`,
          solution:
            'Quita el traslado suelto del carrito, o desenlaza/quita el kit de ese hotel si el traslado compartido es el correcto para todas las opciones.',
        });
      }
    }
  }

  // Orphan kit link + info when kit only hits one option
  for (const t of transfers) {
    if (!t.linkedHotelId) continue;
    const hotel = hotels.find((h) => h.id === t.linkedHotelId);
    if (!hotel) {
      warnings.push({
        id: `xfer-orphan:${t.id}`,
        severity: 'warn',
        message: `Traslado «${t.name}» enlazado a un hotel que ya no está en el carrito.`,
        solution:
          'Elimina el traslado o vuelve a agregarlo con 🚐 Traslado desde el hotel que sí esté en la cotización.',
      });
      continue;
    }
    if (multiOptions) {
      const optWithHotel = hotelOptionGroups.filter((g) => g.hotelIds.includes(hotel.id));
      if (optWithHotel.length === 1) {
        const idx = hotelOptionGroups.indexOf(optWithHotel[0]) + 1;
        warnings.push({
          id: `xfer-kit-one-opt:${t.id}`,
          severity: 'info',
          message: `Traslado kit «${t.name}» solo suma en Opción ${idx} (${hotel.hotelName}).`,
          solution:
            'Es correcto si cada opción tiene su propio traslado. Si quieres el mismo traslado en todas, agrégalo suelto (fuera de kit) o enlázalo a cada hotel.',
        });
      }
    }
  }

  // Hotels without any transfer while others have kit (uneven)
  if (multiOptions && hotels.length > 1) {
    const withKit = hotels.filter((h) => transfersForHotel(h, transfers).length > 0);
    const withoutKit = hotels.filter((h) => transfersForHotel(h, transfers).length === 0);
    if (withKit.length > 0 && withoutKit.length > 0) {
      for (const h of withoutKit) {
        const idx = hotelOptionGroups.findIndex((g) => g.hotelIds.includes(h.id)) + 1;
        warnings.push({
          id: `hotel-no-kit-xfer:${h.id}`,
          severity: 'info',
          message: `Opción ${idx > 0 ? idx : '?'} (${h.hotelName}) no tiene traslado en kit; otras opciones sí.`,
          solution:
            'Agrega traslado con 🚐 Traslado en ese hotel, o un traslado suelto (se sumará a todas las opciones — revisa cobro doble).',
        });
      }
    }
  }

  // Empty option groups / multi-hotel options
  if (hotelOptionGroups.length > 0) {
    hotelOptionGroups.forEach((g, i) => {
      if (g.hotelIds.length === 0) {
        warnings.push({
          id: `opt-empty:${g.id}`,
          severity: 'warn',
          message: `Opción ${i + 1} no tiene hoteles asignados.`,
          solution: 'Asigna un hotel a esa opción o elimínala con ✕.',
        });
      } else if (g.hotelIds.length > 1) {
        const names = g.hotelIds
          .map((id) => hotels.find((h) => h.id === id)?.hotelName)
          .filter(Boolean)
          .join(' · ');
        warnings.push({
          id: `opt-multi-hotel:${g.id}`,
          severity: 'info',
          message: `Opción ${i + 1} tiene ${g.hotelIds.length} hoteles${names ? ` (${names})` : ''}. Las tarifas pp se suman como un paquete.`,
          solution:
            'Si era comparación 1 hotel por opción, mueve cada hotel a su propia opción. Si es un combo intencional (varios hoteles en el mismo viaje), puedes cerrar este aviso.',
        });
      }
    });
  }

  // Missing room plan when hotels exist
  if (hotels.length > 0 && !hasPlan) {
    warnings.push({
      id: 'room-plan-missing',
      severity: 'warn',
      message: 'No hay acomodación del viaje real (DBL / TPL / niños) en la pestaña Acomodación.',
      solution:
        'Define el mix de habitaciones en Acomodación para poder calcular el total por opción y las tarifas que verá el cliente.',
    });
  }

  // Occupancy total open but no plan
  if (opts?.occupancyTotalOpen && !hasPlan) {
    warnings.push({
      id: 'occ-total-no-plan',
      severity: 'warn',
      message: '«Incluir valor total del mix» está activo, pero no hay mix de acomodación.',
      solution: 'Arma las habitaciones en Acomodación o desmarca la casilla hasta tener el mix.',
    });
  }

  // Missing tier rates per option vs room plan
  if (hasPlan && hotels.length > 0) {
    const groups =
      hotelOptionGroups.length > 0
        ? hotelOptionGroups
        : [{ id: 'all', hotelIds: hotels.map((h) => h.id) }];
    const hintOpts = occupancyHintOptsFromPlan(normalizeRoomPlan(roomPlan));
    groups.forEach((g, i) => {
      const optHotels = g.hotelIds
        .map((id) => hotels.find((h) => h.id === id))
        .filter((h): h is HotelCartItem => !!h);
      if (optHotels.length === 0) return;
      for (const h of optHotels) {
        const rates = occupancyRatesToCurrency(
          h.occupancyRates as OccupancyTierRates | undefined,
          opts?.displayCurrency || 'COP',
          opts?.effTrm || 0,
          opts?.trmDia
        );
        const hint = occupancyMissingHint(rates, hintOpts);
        if (!hint) continue;
        warnings.push({
          id: `rates-missing:${h.id}:${hint}`,
          severity: 'warn',
          message: `Opción ${i + 1} · ${h.hotelName}: ${hint}`,
          solution:
            'Busca en BookingMotor la sonda con esa ocupación (ej. 1 hab · 2 adultos para DBL) y pulsa +🛒, o edita la tarifa pp en el carrito / Restablecer si quedó mal.',
        });
      }
    });
  }

  // USD without TRM
  if ((opts?.displayCurrency || '').toUpperCase() === 'USD' && !(opts?.effTrm && opts.effTrm > 0)) {
    warnings.push({
      id: 'usd-no-trm',
      severity: 'warn',
      message: 'Moneda en USD pero no hay TRM cargada.',
      solution: 'Actualiza la TRM del día en la barra superior o cambia la moneda a COP.',
    });
  }

  // --- Flight dates vs hotel / trip ---
  const tripIn = parseTripDate(opts?.tripCheckIn);
  const tripOut = parseTripDate(opts?.tripCheckOut);
  for (const flight of flights) {
    const dep = parseTripDate(flight.departureDate);
    const ret = parseTripDate(flight.returnDate);
    const title = flight.title || 'Vuelo';

    const hotelRefs =
      tripIn || tripOut
        ? [
            {
              id: 'trip',
              name: 'viaje (guía)',
              checkIn: opts?.tripCheckIn,
              checkOut: opts?.tripCheckOut,
            },
          ]
        : hotels.map((h) => ({
            id: h.id,
            name: h.hotelName,
            checkIn: h.checkIn,
            checkOut: h.checkOut,
          }));

    for (const ref of hotelRefs) {
      const hin = parseTripDate(ref.checkIn);
      const hout = parseTripDate(ref.checkOut);
      if (dep && hin && dayDiff(dep, hin) !== 0) {
        warnings.push({
          id: `flight-in:${flight.id}:${ref.id}`,
          severity: 'warn',
          message: `Fechas: ida del vuelo (${formatDayLabel(dep)}) ≠ check-in ${ref.name} (${formatDayLabel(hin)}).`,
          solution:
            'Alinea la búsqueda de vuelo o hotel a las mismas fechas del viaje, o actualiza origen/fechas en la guía / Acomodación.',
        });
      }
      if (ret && hout && dayDiff(ret, hout) !== 0) {
        warnings.push({
          id: `flight-out:${flight.id}:${ref.id}`,
          severity: 'warn',
          message: `Fechas: regreso del vuelo (${formatDayLabel(ret)}) ≠ check-out ${ref.name} (${formatDayLabel(hout)}).`,
          solution:
            'Ajusta el vuelo de regreso o la noche de salida del hotel para que coincidan (o confirma si el desfase es intencional y cierra el aviso).',
        });
      }
    }

    if (dep && !ret && hotels.some((h) => !!h.checkOut)) {
      warnings.push({
        id: `flight-oneway:${flight.id}`,
        severity: 'info',
        message: `Vuelo «${title}» parece solo ida; los hoteles tienen check-out.`,
        solution: 'Agrega el tramo de regreso al carrito si el viaje es ida y vuelta.',
      });
    }
  }

  // --- Insurance / activity pax vs mix ---
  const mixPax = mixPayingPax(roomPlan, {
    adults: opts?.tripAdults,
    children: opts?.tripChildren,
  });
  if (mixPax != null) {
    for (const ins of insurances) {
      const pax = Math.max(0, Number(ins.passengers) || 0);
      if (pax > 0 && pax !== mixPax) {
        warnings.push({
          id: `ins-pax:${ins.id}`,
          severity: 'warn',
          message: `Seguro «${ins.name}» cotizado para ${pax} pasajero${pax !== 1 ? 's' : ''}, pero el mix del viaje es ${mixPax}.`,
          solution:
            'Vuelve a buscar el seguro en BookingMotor con el mismo número de personas del mix (Acomodación) y reemplázalo en el carrito.',
        });
      }
    }
    for (const act of activities) {
      const pax = Math.max(0, (Number(act.adults) || 0) + (Number(act.children) || 0));
      if (pax > 0 && pax !== mixPax) {
        warnings.push({
          id: `act-pax:${act.id}`,
          severity: 'warn',
          message: `Actividad «${act.name}» cotizada para ${pax} persona${pax !== 1 ? 's' : ''}, pero el mix del viaje es ${mixPax}.`,
          solution:
            'Repite la búsqueda de la actividad con los pax del mix, o verifica si solo parte del grupo la toma (entonces el aviso se puede cerrar).',
        });
      }
    }
  }

  // --- Multiple insurances: should be one shared across all hotel options ---
  if (insurances.length > 1) {
    const names = insurances.map((i) => i.name).filter(Boolean).join(' · ');
    warnings.push({
      id: `ins-multi:${insurances.map((i) => i.id).sort().join('+')}`,
      severity: 'warn',
      message: `Tienes ${insurances.length} seguros${names ? ` (${names})` : ''}. Debería ser solo uno para todas las opciones de hotel.`,
      solution:
        'Deja un solo seguro en el carrito (se suma a todas las opciones). Elimina los demás para evitar cobro doble o confusión en la cotización.',
    });
  }

  // --- Auto-round ON but no baseline (Restablecer hotel won't work) ---
  if (opts?.autoRoundOccupancy === true) {
    for (const h of hotels) {
      const rates = h.occupancyRates as OccupancyTierRates | undefined;
      if (!rates) continue;
      const hasTier =
        rates.sglPp != null ||
        rates.dblPp != null ||
        rates.tplPp != null ||
        rates.chd != null ||
        !!rates.childEqualsAdult;
      if (!hasTier) continue;
      if (occupancyHasBaseline(rates)) continue;
      warnings.push({
        id: `no-baseline:${h.id}`,
        severity: 'warn',
        message: `Hotel «${h.hotelName}»: no hay tarifa original (sonda) guardada; Restablecer no podrá volver al valor BM.`,
        solution:
          'Vuelve a agregar el hotel con +🛒 (o edita y guarda una sonda limpia) para fijar el baseline.',
      });
    }
  }

  // Deduplicate by id
  const seen = new Set<string>();
  return warnings.filter((w) => {
    if (seen.has(w.id)) return false;
    seen.add(w.id);
    return true;
  });
}

/** Active (not yet dismissed) warnings. */
export function activeQuoteWarnings(
  warnings: QuoteWarning[],
  dismissedIds: ReadonlySet<string> | string[]
): QuoteWarning[] {
  const dismissed = dismissedIds instanceof Set ? dismissedIds : new Set(dismissedIds);
  return warnings.filter((w) => !dismissed.has(w.id));
}

/** Compact bell in the header; pulses while closed and count &gt; 0. */
export function renderWarningsBellHtml(
  count: number,
  open: boolean,
  opts?: { prefix?: string }
): string {
  if (count <= 0) return '';
  const p = opts?.prefix ?? '';
  const pulse = !open ? ` ${p}warn-bell--pulse` : '';
  const openCls = open ? ` ${p}warn-bell--open` : '';
  return `<button type="button" class="${p}warn-bell${pulse}${openCls}" data-action="toggle-warnings"
    title="Advertencias (${count}) — clic para ver" aria-expanded="${open ? 'true' : 'false'}"
    aria-label="Advertencias: ${count}">⚠&nbsp;<span class="${p}warn-bell-count">${count}</span></button>`;
}

/** HTML for dismissible warning banners (list body). */
export function renderQuoteWarningsHtml(
  warnings: QuoteWarning[],
  dismissedIds: ReadonlySet<string> | string[],
  escape: (s: string) => string,
  opts?: { prefix?: string }
): string {
  const p = opts?.prefix ?? '';
  return activeQuoteWarnings(warnings, dismissedIds)
    .map((w) => {
      const sev = w.severity === 'info' ? `${p}coverage-warn--info` : `${p}coverage-warn--warn`;
      return `<div class="${p}coverage-warn ${sev}" data-warn-id="${escape(w.id)}" role="status">
        <button type="button" class="${p}coverage-warn-close" data-action="dismiss-warning"
          data-warn-id="${escape(w.id)}" title="Cerrar advertencia" aria-label="Cerrar">×</button>
        <div class="${p}coverage-warn-msg">${escape(w.message)}</div>
        <div class="${p}coverage-warn-fix"><strong>Solución:</strong> ${escape(w.solution)}</div>
      </div>`;
    })
    .join('');
}

/** Panel that opens under the bell (empty if closed or no warnings). */
export function renderWarningsPanelHtml(
  warnings: QuoteWarning[],
  dismissedIds: ReadonlySet<string> | string[],
  escape: (s: string) => string,
  open: boolean,
  opts?: { prefix?: string }
): string {
  if (!open) return '';
  const body = renderQuoteWarningsHtml(warnings, dismissedIds, escape, opts);
  if (!body) return '';
  const p = opts?.prefix ?? '';
  return `<div class="${p}warn-panel" role="region" aria-label="Advertencias de la cotización">${body}</div>`;
}
