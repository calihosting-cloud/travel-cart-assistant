export const HOTELS_AS_OPTIONS_KEY = 'tce_hotels_as_options';

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
