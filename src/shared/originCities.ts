export const ORIGIN_CITIES_KEY = 'tce_origin_cities';
export const BM_DESTINATIONS_KEY = 'tce_bm_destinations';

export const DEFAULT_ORIGIN_CITIES = [
  'Bogotá',
  'Medellín',
  'Pereira',
  'Cali',
  'Bucaramanga',
  'Cúcuta',
];

function cleanCity(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim();
}

function uniqKeepOrder(list: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of list) {
    const key = item.toLocaleLowerCase('es-CO');
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

export function normalizeOriginCities(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [...DEFAULT_ORIGIN_CITIES];
  const cleaned = raw.map((x) => (typeof x === 'string' ? cleanCity(x) : '')).filter(Boolean);
  return uniqKeepOrder(cleaned.length ? cleaned : DEFAULT_ORIGIN_CITIES);
}

export async function loadOriginCities(): Promise<string[]> {
  try {
    const result = await chrome.storage.local.get(ORIGIN_CITIES_KEY);
    if (!(ORIGIN_CITIES_KEY in result)) return [...DEFAULT_ORIGIN_CITIES];
    return normalizeOriginCities(result[ORIGIN_CITIES_KEY]);
  } catch {
    return [...DEFAULT_ORIGIN_CITIES];
  }
}

export async function saveOriginCities(cities: string[]): Promise<void> {
  try {
    await chrome.storage.local.set({ [ORIGIN_CITIES_KEY]: normalizeOriginCities(cities) });
  } catch {
    // ignore
  }
}

export async function addOriginCity(name: string): Promise<string[]> {
  const city = cleanCity(name);
  const current = await loadOriginCities();
  if (!city) return current;
  const next = uniqKeepOrder([...current, city]);
  await saveOriginCities(next);
  return next;
}

export async function removeOriginCity(name: string): Promise<string[]> {
  const key = cleanCity(name).toLocaleLowerCase('es-CO');
  const next = (await loadOriginCities()).filter((c) => c.toLocaleLowerCase('es-CO') !== key);
  const saved = next.length ? next : [...DEFAULT_ORIGIN_CITIES];
  await saveOriginCities(saved);
  return saved;
}

export function originDatalistHtml(cities: string[], listId: string): string {
  return `<datalist id="${listId}">${cities
    .map((c) => `<option value="${escapeAttr(c)}"></option>`)
    .join('')}</datalist>`;
}

export function destDatalistHtml(destinations: string[], listId: string): string {
  return originDatalistHtml(destinations, listId);
}

export async function loadBmDestinations(): Promise<string[]> {
  try {
    const result = await chrome.storage.local.get(BM_DESTINATIONS_KEY);
    const raw = result[BM_DESTINATIONS_KEY];
    if (!Array.isArray(raw)) return [];
    return uniqKeepOrder(
      raw.map((x) => (typeof x === 'string' ? cleanCity(x) : '')).filter(Boolean)
    ).slice(0, 24);
  } catch {
    return [];
  }
}

export async function rememberBmDestination(name: string): Promise<void> {
  const city = cleanCity(name);
  if (!city) return;
  const current = await loadBmDestinations();
  const next = uniqKeepOrder([city, ...current]).slice(0, 24);
  try {
    await chrome.storage.local.set({ [BM_DESTINATIONS_KEY]: next });
  } catch {
    // ignore
  }
}

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
