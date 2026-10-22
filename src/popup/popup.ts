import { openAsistentePanel } from '../shared/openAsistente';
import {
  defaultQuoteLines,
  loadQuoteLines,
  newQuoteLineId,
  QuoteLine,
  QuoteLineKind,
  saveQuoteLines,
} from '../shared/quoteConfig';
import {
  defaultTaConfig,
  loadTaConfig,
  normalizeTaConfig,
  saveTaConfig,
  TaConfig,
} from '../shared/taConfig';
import {
  addOriginCity,
  loadOriginCities,
  removeOriginCity,
} from '../shared/originCities';
import {
  DEFAULT_CAR_API_BASE,
  loadCarApiBase,
  loadCarApiToken,
  pingCarApi,
  saveCarApiBase,
  saveCarApiToken,
} from '../shared/carApi';
import {
  DEFAULT_TRM_SOURCE,
  DEFAULT_TRM_SUPLEMENTO,
  loadTrmSource,
  loadTrmSuplemento,
  normalizeTrmSource,
  normalizeTrmSuplemento,
  saveTrmSource,
  saveTrmSuplemento,
  type TrmSourceId,
} from '../shared/trm';

let lines: QuoteLine[] = [];
let taConfig: TaConfig = defaultTaConfig();
let trmSuplemento = DEFAULT_TRM_SUPLEMENTO;
let trmSource: TrmSourceId = DEFAULT_TRM_SOURCE;
let originCities: string[] = [];

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

function fillTaForm(): void {
  const rt = document.getElementById('ta-nacional-rt') as HTMLInputElement | null;
  const ow = document.getElementById('ta-nacional-ow') as HTMLInputElement | null;
  const intl = document.getElementById('ta-internacional-usd') as HTMLInputElement | null;
  if (rt) rt.value = String(taConfig.nacionalRoundTripCop);
  if (ow) ow.value = String(taConfig.nacionalOneWayCop);
  if (intl) intl.value = String(taConfig.internacionalUsd);
}

function readTaForm(): TaConfig {
  const rt = document.getElementById('ta-nacional-rt') as HTMLInputElement | null;
  const ow = document.getElementById('ta-nacional-ow') as HTMLInputElement | null;
  const intl = document.getElementById('ta-internacional-usd') as HTMLInputElement | null;
  return normalizeTaConfig({
    nacionalRoundTripCop: Number(rt?.value || 0),
    nacionalOneWayCop: Number(ow?.value || 0),
    internacionalUsd: Number(intl?.value || 0),
  });
}

function fillTrmSuplementoForm(): void {
  const el = document.getElementById('trm-suplemento') as HTMLInputElement | null;
  if (el) el.value = String(trmSuplemento);
}

function fillTrmSourceForm(): void {
  const el = document.getElementById('trm-source') as HTMLSelectElement | null;
  if (el) el.value = trmSource;
}

function bindTaForm(): void {
  const persistTa = () => {
    taConfig = readTaForm();
    void saveTaConfig(taConfig);
  };
  for (const id of ['ta-nacional-rt', 'ta-nacional-ow', 'ta-internacional-usd']) {
    document.getElementById(id)?.addEventListener('change', persistTa);
    document.getElementById(id)?.addEventListener('blur', persistTa);
  }
}

function bindTrmSuplementoForm(): void {
  const persistSup = () => {
    const el = document.getElementById('trm-suplemento') as HTMLInputElement | null;
    trmSuplemento = normalizeTrmSuplemento(Number(el?.value || 0));
    void saveTrmSuplemento(trmSuplemento);
  };
  const el = document.getElementById('trm-suplemento');
  el?.addEventListener('change', persistSup);
  el?.addEventListener('blur', persistSup);
}

function bindTrmSourceForm(): void {
  const el = document.getElementById('trm-source') as HTMLSelectElement | null;
  el?.addEventListener('change', () => {
    trmSource = normalizeTrmSource(el.value);
    void saveTrmSource(trmSource);
    void chrome.runtime.sendMessage({ type: 'TCE_REFRESH_TRM', force: true });
  });
}

function fillOriginCitiesForm(): void {
  const list = document.getElementById('origin-cities-config');
  if (!list) return;
  list.innerHTML = originCities
    .map(
      (c) => `
      <div class="line-row" data-city="${escapeAttr(c)}">
        <input type="text" value="${escapeAttr(c)}" readonly />
        <button type="button" class="btn-del" data-action="delete-origin-city" title="Quitar">✕</button>
      </div>`
    )
    .join('');
}

function bindOriginCitiesForm(): void {
  document.getElementById('form-add-origin')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const fd = new FormData(form);
    const name = String(fd.get('city') || '').trim();
    if (!name) return;
    void addOriginCity(name).then((next) => {
      originCities = next;
      fillOriginCitiesForm();
      form.reset();
    });
  });
  document.getElementById('origin-cities-config')?.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('[data-action="delete-origin-city"]');
    if (!btn) return;
    const row = (btn as HTMLElement).closest('[data-city]') as HTMLElement | null;
    const city = row?.dataset.city;
    if (!city) return;
    void removeOriginCity(city).then((next) => {
      originCities = next;
      fillOriginCitiesForm();
    });
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

async function fillCarApiForm(): Promise<void> {
  const baseEl = document.getElementById('car-api-base') as HTMLInputElement | null;
  const tokenEl = document.getElementById('car-api-token') as HTMLInputElement | null;
  if (baseEl) baseEl.value = await loadCarApiBase();
  if (tokenEl) tokenEl.value = await loadCarApiToken();
}

function bindCarApiForm(): void {
  const status = () => document.getElementById('car-api-status');
  document.getElementById('btn-car-api-save')?.addEventListener('click', () => {
    const baseEl = document.getElementById('car-api-base') as HTMLInputElement | null;
    const tokenEl = document.getElementById('car-api-token') as HTMLInputElement | null;
    const base = (baseEl?.value || DEFAULT_CAR_API_BASE).trim();
    const token = (tokenEl?.value || '').trim();
    void (async () => {
      await saveCarApiBase(base || DEFAULT_CAR_API_BASE);
      await saveCarApiToken(token);
      const el = status();
      if (el) el.textContent = token ? '✓ Guardado' : 'Guardado (sin token)';
    })();
  });
  document.getElementById('btn-car-api-test')?.addEventListener('click', () => {
    const el = status();
    if (el) el.textContent = 'Probando…';
    void (async () => {
      const baseEl = document.getElementById('car-api-base') as HTMLInputElement | null;
      const tokenEl = document.getElementById('car-api-token') as HTMLInputElement | null;
      await saveCarApiBase((baseEl?.value || DEFAULT_CAR_API_BASE).trim());
      await saveCarApiToken((tokenEl?.value || '').trim());
      const res = await pingCarApi();
      if (el) {
        el.textContent = res.ok ? '✓ Conexión OK' : `✗ ${res.error}`;
      }
    })();
  });
}

async function init(): Promise<void> {
  setupTabs();
  document.getElementById('btn-open-asistente')?.addEventListener('click', () => {
    openAsistentePanel();
  });
  lines = await loadQuoteLines();
  taConfig = await loadTaConfig();
  trmSuplemento = await loadTrmSuplemento();
  trmSource = await loadTrmSource();
  originCities = await loadOriginCities();
  fillTaForm();
  fillTrmSuplementoForm();
  fillTrmSourceForm();
  fillOriginCitiesForm();
  await fillCarApiForm();
  bindTaForm();
  bindTrmSuplementoForm();
  bindTrmSourceForm();
  bindOriginCitiesForm();
  bindCarApiForm();
  renderLists();
  bindListEvents();
  bindAddForms();
  bindReset();
  void loadChangelog();
}

void init();
