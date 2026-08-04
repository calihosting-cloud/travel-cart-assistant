import { clearAppLog, loadAppLog } from '../shared/appLog';

async function renderLog(): Promise<void> {
  const el = document.getElementById('log');
  if (!el) return;
  const entries = await loadAppLog();
  if (entries.length === 0) {
    el.textContent = '(sin entradas)';
    return;
  }
  el.innerHTML = entries
    .map((e) => {
      const when = new Date(e.at).toLocaleString('es-CO');
      const ctx = e.context ? ` · ${escapeHtml(e.context)}` : '';
      return `<div class="${e.level}">[${when}] ${e.level.toUpperCase()}: ${escapeHtml(e.message)}${ctx}</div>`;
    })
    .join('');
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

document.getElementById('btn-refresh')?.addEventListener('click', () => {
  void renderLog();
});
document.getElementById('btn-clear')?.addEventListener('click', () => {
  void clearAppLog().then(() => renderLog());
});

void renderLog();
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.tce_app_log) void renderLog();
});
