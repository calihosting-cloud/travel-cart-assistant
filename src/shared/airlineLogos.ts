export const AIRLINE_LOGOS_KEY = 'tce_airline_logos';

function kiwiLogoUrl(code: string): string {
  return `https://images.kiwi.com/airlines/64/${code.toUpperCase()}.png`;
}

/** Public CDN URL for cart UI (host permission required). */
export function airlineLogoUrl(code: string): string {
  return kiwiLogoUrl(code);
}

export function flightPrimaryAirlineCode(
  flight: { legs: Array<{ segments: Array<{ airlineCode?: string }> }> }
): string | undefined {
  for (const leg of flight.legs) {
    for (const seg of leg.segments) {
      const c = seg.airlineCode?.trim().toUpperCase();
      if (c) return c;
    }
  }
  return undefined;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/** Collect IATA codes from flight cart items. */
export function airlineCodesFromFlights(
  flights: Array<{ legs: Array<{ segments: Array<{ airlineCode?: string }> }> }>
): string[] {
  const set = new Set<string>();
  for (const f of flights) {
    for (const leg of f.legs) {
      for (const seg of leg.segments) {
        const c = seg.airlineCode?.trim().toUpperCase();
        if (c && c.length >= 2) set.add(c);
      }
    }
  }
  return Array.from(set);
}

/** Fetch missing logos once and cache in chrome.storage.local (data URLs). */
export async function resolveAirlineLogos(codes: string[]): Promise<Record<string, string>> {
  let cache: Record<string, string> = {};
  try {
    const stored = await chrome.storage.local.get(AIRLINE_LOGOS_KEY);
    if (stored[AIRLINE_LOGOS_KEY] && typeof stored[AIRLINE_LOGOS_KEY] === 'object') {
      cache = { ...(stored[AIRLINE_LOGOS_KEY] as Record<string, string>) };
    }
  } catch {
    // ignore
  }

  let dirty = false;
  for (const code of codes) {
    const c = code.toUpperCase();
    if (!c || cache[c]) continue;
    try {
      const res = await fetch(kiwiLogoUrl(c));
      if (!res.ok) continue;
      cache[c] = await blobToDataUrl(await res.blob());
      dirty = true;
    } catch {
      // CDN blocked or offline — skip
    }
  }

  if (dirty) {
    try {
      await chrome.storage.local.set({ [AIRLINE_LOGOS_KEY]: cache });
    } catch {
      // ignore
    }
  }
  return cache;
}
