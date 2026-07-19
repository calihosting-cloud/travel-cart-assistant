import {
  defaultQuoteLines,
  loadQuoteLines,
  newQuoteLineId,
  QuoteLine,
  QuoteLineKind,
  saveQuoteLines,
} from '../shared/quoteConfig';

let lines: QuoteLine[] = [];

function setupTabs(): void {
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const id = (tab as HTMLElement).dataset.tab;
      document.querySelectorAll('.tab').forEach((t) => {
        const active = t === tab;
        t.classList.toggle('active', active);
        t.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      document.querySelectorAll('.panel').forEach((p) => {
        p.classList.toggle('active', p.id === `panel-${id}`);
      });
    });
  });
}

function renderLists(): void {
  renderKind('include', 'list-include');
  renderKind('exclude', 'list-exclude');
  renderKind('policy', 'list-policy');
}

function renderKind(kind: QuoteLineKind, listId: string): void {
  const list = document.getElementById(listId);
  if (!list) return;
  const kindLines = lines.filter((l) => l.kind === kind);
  list.innerHTML = kindLines
    .map(
      (l) => `
      <div class="line-row" data-id="${escapeAttr(l.id)}">
        <input class="emoji-input" type="text" maxlength="4" value="${escapeAttr(l.emoji)}" data-field="emoji" aria-label="Emoji" />
        <input type="text" value="${escapeAttr(l.text)}" data-field="text" aria-label="Texto" />
        <button type="button" class="btn-del" data-action="delete" title="Eliminar">✕</button>
      </div>`
    )
    .join('');
}

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function persist(): Promise<void> {
  await saveQuoteLines(lines);
}

function bindListEvents(): void {
  document.querySelectorAll('.line-list').forEach((list) => {
    list.addEventListener('input', (e) => {
      const target = e.target as HTMLElement | null;
      if (!target || target.tagName !== 'INPUT') return;
      const row = target.closest('.line-row') as HTMLElement | null;
      if (!row) return;
      const id = row.dataset.id;
      const field = (target as HTMLInputElement).dataset.field as 'emoji' | 'text' | undefined;
      if (!id || !field) return;
      const value = (target as HTMLInputElement).value;
      lines = lines.map((l) => (l.id === id ? { ...l, [field]: value } : l));
      void persist();
    });

    list.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('[data-action="delete"]') as HTMLElement | null;
      if (!btn) return;
      const row = btn.closest('.line-row') as HTMLElement | null;
      if (!row?.dataset.id) return;
      lines = lines.filter((l) => l.id !== row.dataset.id);
      renderLists();
      void persist();
    });
  });
}

function bindAddForms(): void {
  document.querySelectorAll('.add-form').forEach((form) => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const el = form as HTMLFormElement;
      const kind = el.dataset.kind as QuoteLineKind;
      const fd = new FormData(el);
      const emoji = String(fd.get('emoji') || '').trim();
      const text = String(fd.get('text') || '').trim();
      if (!text) return;
      lines = [
        ...lines,
        {
          id: newQuoteLineId(),
          kind,
          emoji,
          text,
          enabled: true,
        },
      ];
      el.reset();
      renderLists();
      void persist();
    });
  });
}

function bindReset(): void {
  document.getElementById('btn-reset-defaults')?.addEventListener('click', () => {
    if (!confirm('¿Restaurar las líneas incluye / no incluye / políticas por defecto?')) return;
    lines = defaultQuoteLines();
    renderLists();
    void persist();
  });
}

async function loadChangelog(): Promise<void> {
  const body = document.getElementById('changelog-body');
  if (!body) return;
  try {
    const url = chrome.runtime.getURL('CHANGELOG.md');
    const res = await fetch(url);
    if (!res.ok) throw new Error(String(res.status));
    body.textContent = await res.text();
  } catch {
    body.textContent = 'No se pudo cargar el changelog.';
  }
}

async function init(): Promise<void> {
  setupTabs();
  lines = await loadQuoteLines();
  renderLists();
  bindListEvents();
  bindAddForms();
  bindReset();
  void loadChangelog();
}

void init();
