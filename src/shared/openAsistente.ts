/** Open the full-page assistant workspace in a real browser tab (not a popup). */

function extensionPageUrl(page: string): string {

  return chrome.runtime.getURL(page);

}



/** Fallback when the service worker is asleep or sendMessage fails. */

function openExtensionPageViaAnchor(url: string): boolean {

  try {

    const root = document.body || document.documentElement;

    if (!root) return false;

    const a = document.createElement('a');

    a.href = url;

    a.target = '_blank';

    a.rel = 'noopener noreferrer';

    root.appendChild(a);

    a.click();

    a.remove();

    return true;

  } catch {

    return false;

  }

}



/** Open the full-page assistant workspace in a real browser tab (not a popup). */

export function openAsistentePanel(): void {

  // Content scripts must not use window.open — Edge/ad blockers treat it as ads

  // (ERR_BLOCKED_BY_CLIENT). Prefer the service worker; fall back to anchor click.

  try {

    if (!chrome?.runtime?.id) {

      console.warn('[TCE] openAsistentePanel: extensión no disponible (recarga la página)');

      return;

    }

    const url = extensionPageUrl('asistente.html');



    // Popup / extension pages have tabs permission directly.

    if (typeof chrome.tabs?.create === 'function' && location.protocol === 'chrome-extension:') {

      void chrome.tabs.create({ url, active: true });

      return;

    }



    void chrome.runtime.sendMessage({ type: 'TCE_OPEN_ASISTENTE' }, (response) => {

      const err = chrome.runtime.lastError;

      if (err || !response?.ok) {

        console.warn(

          '[TCE] No se pudo abrir el panel vía background:',

          err?.message || response,

          '— intentando enlace directo'

        );

        if (!openExtensionPageViaAnchor(url)) {

          console.warn('[TCE] Tampoco se pudo abrir asistente.html por enlace directo');

        }

      }

    });

  } catch (e) {

    console.warn('[TCE] openAsistentePanel failed', e);

    try {

      const url = chrome.runtime.getURL('asistente.html');

      openExtensionPageViaAnchor(url);

    } catch {

      /* ignore */

    }

  }

}


