import { APP_LOG_KEY, AppLogEntry } from '../shared/appLog';
import { refreshOfficialTrm } from '../shared/trm';

chrome.runtime.onInstalled.addListener(() => {
  console.log('[TCE] Travel Capture Engine Background Service Worker initialized.');
  void refreshOfficialTrm(true).then((trm) => {
    if (trm) console.log('[TCE] TRM dolar-colombia.com cargada:', trm.rate, trm.date);
    else console.warn('[TCE] No se pudo cargar TRM desde dolar-colombia.com');
  });
});

chrome.runtime.onStartup.addListener(() => {
  void refreshOfficialTrm(false);
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
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
