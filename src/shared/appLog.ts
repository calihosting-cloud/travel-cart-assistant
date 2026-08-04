/** Lightweight app log → chrome.storage + background console (chrome://extensions). */

export const APP_LOG_KEY = 'tce_app_log';
const MAX_ENTRIES = 200;

export interface AppLogEntry {
  at: number;
  level: 'info' | 'warn' | 'error';
  message: string;
  context?: string;
}

export async function appendAppLog(
  level: AppLogEntry['level'],
  message: string,
  context?: string
): Promise<void> {
  const entry: AppLogEntry = { at: Date.now(), level, message, context };
  try {
    const result = await chrome.storage.local.get(APP_LOG_KEY);
    const prev = Array.isArray(result[APP_LOG_KEY])
      ? (result[APP_LOG_KEY] as AppLogEntry[])
      : [];
    const next = [...prev, entry].slice(-MAX_ENTRIES);
    await chrome.storage.local.set({ [APP_LOG_KEY]: next });
  } catch {
    // storage unavailable
  }

  try {
    chrome.runtime.sendMessage({ type: 'TCE_APP_LOG', entry }).catch(() => undefined);
  } catch {
    // runtime unavailable
  }
}

export async function loadAppLog(): Promise<AppLogEntry[]> {
  try {
    const result = await chrome.storage.local.get(APP_LOG_KEY);
    return Array.isArray(result[APP_LOG_KEY])
      ? (result[APP_LOG_KEY] as AppLogEntry[])
      : [];
  } catch {
    return [];
  }
}

export async function clearAppLog(): Promise<void> {
  try {
    await chrome.storage.local.remove(APP_LOG_KEY);
  } catch {
    // ignore
  }
}
