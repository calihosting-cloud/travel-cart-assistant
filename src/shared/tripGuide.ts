import { SearchContext } from '../engine/core/types';

/** Sticky trip guide from the first flight search (header dates/pax). */
export const TRIP_GUIDE_KEY = 'tce_trip_guide';

export async function loadTripGuide(): Promise<SearchContext | null> {
  try {
    const result = await chrome.storage.local.get(TRIP_GUIDE_KEY);
    const stored = result[TRIP_GUIDE_KEY] as SearchContext | undefined;
    if (!stored || stored.sourceType !== 'flight') return null;
    return stored;
  } catch {
    return null;
  }
}

export async function saveTripGuide(ctx: SearchContext): Promise<void> {
  try {
    await chrome.storage.local.set({ [TRIP_GUIDE_KEY]: { ...ctx, sourceType: 'flight' } });
  } catch {
    // storage unavailable
  }
}

export async function clearTripGuide(): Promise<void> {
  try {
    await chrome.storage.local.remove(TRIP_GUIDE_KEY);
  } catch {
    // storage unavailable
  }
}
