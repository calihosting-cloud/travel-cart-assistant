/** Shared quote-line config for WhatsApp / future PDF cotizaciones. */

export type QuoteLineKind = 'include' | 'exclude' | 'policy';

export interface QuoteLine {
  id: string;
  kind: QuoteLineKind;
  /** Leading emoji (optional); kept separate so text stays editable. */
  emoji: string;
  text: string;
  /** When true, line is included in the generated cotización. */
  enabled: boolean;
}

export const QUOTE_LINES_KEY = 'tce_quote_lines';

export function newQuoteLineId(): string {
  return `ql_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

/** Defaults matching the GT WhatsApp cotización template. */
export function defaultQuoteLines(): QuoteLine[] {
  return [
    // TARIFA INCLUYE
    { id: 'inc_air', kind: 'include', emoji: '✈️', text: 'Tiquetes aéreos + equipaje', enabled: true },
    { id: 'inc_hotel', kind: 'include', emoji: '🏠', text: 'Alojamiento en los hoteles mencionados', enabled: true },
    { id: 'inc_food', kind: 'include', emoji: '🍴', text: 'Alimentación de acuerdo a lo especificado', enabled: true },
    { id: 'inc_transfer', kind: 'include', emoji: '🚕', text: 'Traslados Aeropuerto - hotel - aeropuerto', enabled: true },
    { id: 'inc_tours', kind: 'include', emoji: '🚞', text: 'Toures:', enabled: true },
    { id: 'inc_assist', kind: 'include', emoji: '🚑', text: 'Asistencias médicas', enabled: true },

    // PLAN NO INCLUYE
    { id: 'exc_other', kind: 'exclude', emoji: '❌', text: 'Gastos no especificados en el programa', enabled: true },
    { id: 'exc_extra', kind: 'exclude', emoji: '🚫', text: 'Excursiones adicionales', enabled: true },
    {
      id: 'exc_seat',
      kind: 'exclude',
      emoji: '🚫',
      text: 'Selección de silla (tiene costo si deseas ubicaciones juntas)',
      enabled: true,
    },

    // NOTA IMPORTANTE
    {
      id: 'pol_1',
      kind: 'policy',
      emoji: '',
      text: 'Tarifas sujetas a disponibilidad y cambios sin previo aviso.',
      enabled: true,
    },
    {
      id: 'pol_2',
      kind: 'policy',
      emoji: '',
      text: 'Cotización no garantiza reserva hasta recibir pago y confirmación escrita de la agencia.',
      enabled: true,
    },
    {
      id: 'pol_3',
      kind: 'policy',
      emoji: '',
      text: 'Tarifas no reembolsables/no endosables. Cambios solo según políticas del hotel y proveedor aéreo.',
      enabled: true,
    },
    {
      id: 'pol_4',
      kind: 'policy',
      emoji: '',
      text: 'Todos los servicios están sujetos a condiciones del proveedor: horarios, rutas, asignación de habitaciones y tours.',
      enabled: true,
    },
    { id: 'pol_5', kind: 'policy', emoji: '', text: 'Precios por persona.', enabled: true },
    {
      id: 'pol_6',
      kind: 'policy',
      emoji: '',
      text: 'El pasajero es responsable de documentos vigentes y requisitos de viaje.',
      enabled: true,
    },
    {
      id: 'pol_7',
      kind: 'policy',
      emoji: '',
      text: 'Procesos migratorios (ingreso, negaciones, demoras, requerimientos) dependen 100% de las autoridades y de la agencia de viajes responsable del trámite.',
      enabled: true,
    },
    {
      id: 'pol_8',
      kind: 'policy',
      emoji: '',
      text: 'Grupos Travel no asume responsabilidad por decisiones migratorias, costos derivados o impedimentos de viaje.',
      enabled: true,
    },
  ];
}

export function normalizeQuoteLines(stored: unknown): QuoteLine[] {
  if (!Array.isArray(stored) || stored.length === 0) return defaultQuoteLines();
  const lines: QuoteLine[] = [];
  for (const raw of stored) {
    if (!raw || typeof raw !== 'object') continue;
    const r = raw as Partial<QuoteLine>;
    if (!r.id || !r.kind || typeof r.text !== 'string') continue;
    if (r.kind !== 'include' && r.kind !== 'exclude' && r.kind !== 'policy') continue;
    lines.push({
      id: String(r.id),
      kind: r.kind,
      emoji: typeof r.emoji === 'string' ? r.emoji : '',
      text: r.text,
      enabled: r.enabled !== false,
    });
  }
  return lines.length > 0 ? lines : defaultQuoteLines();
}

export async function loadQuoteLines(): Promise<QuoteLine[]> {
  try {
    const result = await chrome.storage.local.get(QUOTE_LINES_KEY);
    return normalizeQuoteLines(result[QUOTE_LINES_KEY]);
  } catch {
    return defaultQuoteLines();
  }
}

export async function saveQuoteLines(lines: QuoteLine[]): Promise<void> {
  try {
    await chrome.storage.local.set({ [QUOTE_LINES_KEY]: lines });
  } catch {
    // storage unavailable
  }
}
