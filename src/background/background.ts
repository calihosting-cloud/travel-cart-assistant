import { APP_LOG_KEY, AppLogEntry } from '../shared/appLog';
import { ensureHistorySurvivedUpdate } from '../shared/quoteHistory';
import { refreshOfficialTrm, TRM_SOURCES } from '../shared/trm';

chrome.runtime.onInstalled.addListener((details) => {
  console.log('[TCE] Travel Capture Engine Background Service Worker initialized.', details.reason);
  void ensureHistorySurvivedUpdate().then((n) => {
    if (n > 0) {
      console.log('[TCE] Historial preservado tras', details.reason + ':', n, 'cotización(es)');
    }
  });
  void refreshOfficialTrm(true).then((trm) => {
    if (trm) {
      const provider = trm.provider ? TRM_SOURCES[trm.provider].label : 'web';
      console.log('[TCE] TRM cargada desde', provider + ':', trm.rate, trm.date);
    } else {
      console.warn('[TCE] No se pudo cargar TRM desde las fuentes web configuradas');
    }
  });
});

chrome.runtime.onStartup.addListener(() => {
  void refreshOfficialTrm(false);
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'TCE_OPEN_ASISTENTE') {
    const url = chrome.runtime.getURL('asistente.html');
    try {
      chrome.tabs.create({ url, active: true }, (tab) => {
        const err = chrome.runtime.lastError;
        if (err) {
          console.error('[TCE] tabs.create asistente failed', err.message);
          sendResponse({ ok: false, error: err.message });
          return;
        }
        sendResponse({ ok: true, tabId: tab?.id });
      });
    } catch (err) {
      console.error('[TCE] tabs.create asistente failed', err);
      sendResponse({ ok: false, error: String(err) });
    }
    return true;
  }

  if (message?.type === 'TCE_OPEN_BM_TRANSFER') {
    const url = 'https://reservas.grupostravel.com/es/backoffice/book/new';
    void chrome.tabs
      .create({ url })
      .then((tab) => sendResponse({ ok: true, tabId: tab.id }))
      .catch((err) => {
        console.error('[TCE] tabs.create BM transfer failed', err);
        sendResponse({ ok: false, error: String(err) });
      });
    return true;
  }

  if (message?.type === 'TCE_OPEN_WHOLESALE_HELP') {
    const url = chrome.runtime.getURL('wholesale-help.html');
    void chrome.tabs
      .create({ url })
      .then((tab) => sendResponse({ ok: true, tabId: tab.id }))
      .catch((err) => {
        console.error('[TCE] tabs.create wholesale-help failed', err);
        sendResponse({ ok: false, error: String(err) });
      });
    return true;
  }

  if (message?.type === 'TCE_OPEN_QUOTE_PDF') {
    const url = chrome.runtime.getURL('quote-pdf.html');
    void chrome.tabs
      .create({ url })
      .then((tab) => sendResponse({ ok: true, tabId: tab.id }))
      .catch((err) => {
        console.error('[TCE] tabs.create quote-pdf failed', err);
        sendResponse({ ok: false, error: String(err) });
      });
    return true;
  }

  if (message?.type === 'TCE_APP_LOG' && message.entry) {
    const entry = message.entry as AppLogEntry;
    const prefix = `[TCE][${entry.level}]`;
    const ctx = entry.context ? ` (${entry.context})` : '';
    if (entry.level === 'error') console.error(prefix, entry.message + ctx);
    else if (entry.level === 'warn') console.warn(prefix, entry.message + ctx);
    else console.log(prefix, entry.message + ctx);
    sendResponse({ ok: true });
    return true;
  }

  if (message?.type === 'TCE_REFRESH_TRM') {
    void refreshOfficialTrm(Boolean(message.force))
      .then((trm) => sendResponse({ ok: !!trm, trm }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }

  return false;
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !changes[APP_LOG_KEY]) return;
  const next = changes[APP_LOG_KEY].newValue as AppLogEntry[] | undefined;
  const last = Array.isArray(next) ? next[next.length - 1] : undefined;
  if (!last) return;
  console.log('[TCE][storage-log]', last.level, last.message, last.context || '');
});

// Refresh TRM a few times a day while the worker is alive.
chrome.alarms?.create?.('tce-trm-daily', { periodInMinutes: 360 });
chrome.alarms?.onAlarm?.addListener((alarm) => {
  if (alarm.name === 'tce-trm-daily') void refreshOfficialTrm(false);
});
