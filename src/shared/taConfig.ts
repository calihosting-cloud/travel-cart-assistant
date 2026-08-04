/** Yearly administrative fee (TA) rates for Total / cotización. */

export const TA_CONFIG_KEY = 'tce_ta_config';
export const TA_SELECTION_KEY = 'tce_ta_selection';

export type TaType = 'nacional_rt' | 'nacional_ow' | 'internacional';

export interface TaConfig {
  /** Nacional ida y vuelta — COP per passenger. */
  nacionalRoundTripCop: number;
  /** Nacional solo ida — COP per passenger (default = half of round trip). */
  nacionalOneWayCop: number;
  /** Internacional — USD per passenger (converted with TRM). */
  internacionalUsd: number;
}

export interface TaSelection {
  type: TaType;
  /** Unit TA in COP (editable in Total). */
  unitCop: number;
}

export function defaultTaConfig(): TaConfig {
  return {
    nacionalRoundTripCop: 85_000,
    nacionalOneWayCop: 42_500,
    internacionalUsd: 30,
  };
}

export function defaultTaSelection(): TaSelection {
  return { type: 'nacional_rt', unitCop: 85_000 };
}

export function normalizeTaConfig(raw: unknown): TaConfig {
  const d = defaultTaConfig();
  if (!raw || typeof raw !== 'object') return d;
  const r = raw as Partial<TaConfig>;
  return {
    nacionalRoundTripCop:
      typeof r.nacionalRoundTripCop === 'number' && r.nacionalRoundTripCop >= 0
        ? r.nacionalRoundTripCop
        : d.nacionalRoundTripCop,
    nacionalOneWayCop:
      typeof r.nacionalOneWayCop === 'number' && r.nacionalOneWayCop >= 0
        ? r.nacionalOneWayCop
        : d.nacionalOneWayCop,
    internacionalUsd:
      typeof r.internacionalUsd === 'number' && r.internacionalUsd >= 0
        ? r.internacionalUsd
        : d.internacionalUsd,
  };
}

export function normalizeTaSelection(raw: unknown): TaSelection {
  const d = defaultTaSelection();
  if (!raw || typeof raw !== 'object') return d;
  const r = raw as Partial<TaSelection>;
  const type: TaType =
    r.type === 'nacional_ow' || r.type === 'internacional' || r.type === 'nacional_rt'
      ? r.type
      : d.type;
  return {
    type,
    unitCop: typeof r.unitCop === 'number' && r.unitCop >= 0 ? r.unitCop : d.unitCop,
  };
}

export async function loadTaConfig(): Promise<TaConfig> {
  try {
    const result = await chrome.storage.local.get(TA_CONFIG_KEY);
    return normalizeTaConfig(result[TA_CONFIG_KEY]);
  } catch {
    return defaultTaConfig();
  }
}

export async function saveTaConfig(config: TaConfig): Promise<void> {
  try {
    await chrome.storage.local.set({ [TA_CONFIG_KEY]: config });
  } catch {
    // ignore
  }
}

export async function loadTaSelection(): Promise<TaSelection> {
  try {
    const result = await chrome.storage.local.get(TA_SELECTION_KEY);
    return normalizeTaSelection(result[TA_SELECTION_KEY]);
  } catch {
    return defaultTaSelection();
  }
}

export async function saveTaSelection(sel: TaSelection): Promise<void> {
  try {
    await chrome.storage.local.set({ [TA_SELECTION_KEY]: sel });
  } catch {
    // ignore
  }
}

/** Resolve unit TA in COP from config + type + TRM (for international). */
export function resolveTaUnitCop(config: TaConfig, type: TaType, trm: number): number {
  if (type === 'nacional_ow') return Math.round(config.nacionalOneWayCop);
  if (type === 'internacional') {
    if (!(trm > 0)) return 0;
    return Math.round(config.internacionalUsd * trm);
  }
  return Math.round(config.nacionalRoundTripCop);
}

export function taTypeLabel(type: TaType): string {
  if (type === 'nacional_ow') return 'Solo ida (nacional)';
  if (type === 'internacional') return 'Internacional';
  return 'Ida y vuelta (nacional)';
}

/** Common Colombia IATA codes for nacional vs internacional TA. */
const CO_AIRPORTS = new Set([
  'BOG', 'MDE', 'CLO', 'CTG', 'ADZ', 'BAQ', 'SMR', 'PEI', 'EOH', 'AXM', 'BGA',
  'CUC', 'LET', 'UIB', 'VUP', 'NVA', 'PSO', 'PPN', 'RCH', 'TCO', 'APO', 'AUC',
  'CZU', 'EJA', 'FLA', 'GPI', 'IBE', 'IPI', 'LQG', 'MTR', 'MZL', 'NQU', 'PBE',
  'PDA', 'PUU', 'SJE', 'SVI', 'TIB', 'TLU', 'TRB', 'VGZ', 'ACD', 'ACR', 'CPB',
]);

export function suggestTaType(opts: {
  routeType?: 'oneWay' | 'roundTrip';
  originCode?: string;
  destinationCode?: string;
}): TaType {
  const origin = (opts.originCode || '').toUpperCase();
  const dest = (opts.destinationCode || '').toUpperCase();
  if (origin && dest) {
    const bothCo = CO_AIRPORTS.has(origin) && CO_AIRPORTS.has(dest);
    if (!bothCo) return 'internacional';
  }
  return opts.routeType === 'oneWay' ? 'nacional_ow' : 'nacional_rt';
}
