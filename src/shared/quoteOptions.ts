export const HOTELS_AS_OPTIONS_KEY = 'tce_hotels_as_options';
export const HOTEL_COMPARE_GROUPS_KEY = 'tce_hotel_compare_groups';

/** One compare column: shared services + these hotel cart item ids. */
export interface HotelCompareOptionGroup {
  id: string;
  hotelIds: string[];
}

export async function loadHotelsAsOptions(): Promise<boolean> {
  try {
    const result = await chrome.storage.local.get(HOTELS_AS_OPTIONS_KEY);
    return result[HOTELS_AS_OPTIONS_KEY] === true;
  } catch {
    return false;
  }
}

export async function saveHotelsAsOptions(enabled: boolean): Promise<void> {
  try {
    await chrome.storage.local.set({ [HOTELS_AS_OPTIONS_KEY]: enabled });
  } catch {
    // storage unavailable
  }
}

export async function loadHotelCompareGroups(): Promise<HotelCompareOptionGroup[]> {
  try {
    const result = await chrome.storage.local.get(HOTEL_COMPARE_GROUPS_KEY);
    const raw = result[HOTEL_COMPARE_GROUPS_KEY];
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((g): g is HotelCompareOptionGroup => !!g && typeof g.id === 'string')
      .map((g) => ({
        id: g.id,
        hotelIds: Array.isArray(g.hotelIds)
          ? g.hotelIds.filter((id): id is string => typeof id === 'string')
          : [],
      }));
  } catch {
    return [];
  }
}

export async function saveHotelCompareGroups(
  groups: HotelCompareOptionGroup[]
): Promise<void> {
  try {
    await chrome.storage.local.set({ [HOTEL_COMPARE_GROUPS_KEY]: groups });
  } catch {
    // storage unavailable
  }
}

export function newHotelCompareGroupId(): string {
  return `opt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}
