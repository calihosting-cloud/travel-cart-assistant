/** Open the full-page assistant workspace in a real browser tab (not a popup). */
export function openAsistentePanel(): void {
  // Content scripts must not use window.open — Edge/ad blockers treat it as ads
  // (ERR_BLOCKED_BY_CLIENT). Always ask the service worker to chrome.tabs.create.
  try {
    void chrome.runtime.sendMessage({ type: 'TCE_OPEN_ASISTENTE' }, (response) => {
      const err = chrome.runtime.lastError;
      if (err || !response?.ok) {
        console.warn('[TCE] No se pudo abrir el panel vía background:', err?.message || response);
      }
    });
  } catch (e) {
    console.warn('[TCE] openAsistentePanel failed', e);
  }
}
