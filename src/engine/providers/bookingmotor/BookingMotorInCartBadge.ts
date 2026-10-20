import type { CartItem, HotelCartItem } from '../../core/types';
import { hotelOccupancyMatchKey } from '../../../shared/occupancyRates';

const STYLE_ID = 'tce-in-cart-badge-styles';
const BADGE_CLASS = 'tce-in-cart-badge';
const HOST_CLASS = 'tce-in-cart-host';
export const BM_SELECTED_ATTR = 'data-tce-bm-selected';
export const BM_MARK_KEYS_ATTR = 'data-tce-bm-mark-keys';

export function normalizeBmMarkUrl(url?: string): string {
  if (!url) return '';
  try {
    const u = new URL(url, typeof location !== 'undefined' ? location.href : 'https://local');
    return `${u.pathname}${u.search}`;
  } catch {
    return url.split('#')[0].split('?')[0];
  }
}

function createBadge(doc: Document): HTMLElement {
  const wrap = doc.createElement('span');
  wrap.className = BADGE_CLASS;
  wrap.title = 'Agregado al carrito GT';
  wrap.setAttribute('aria-label', 'Agregado al carrito GT');
  wrap.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
    <defs>
      <linearGradient id="tce-check-fill" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#ff5252"/>
        <stop offset="45%" stop-color="#e53935"/>
        <stop offset="100%" stop-color="#b71c1c"/>
      </linearGradient>
      <filter id="tce-check-shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="1.5" stdDeviation="1.2" flood-color="#000" flood-opacity="0.35"/>
      </filter>
    </defs>
    <path filter="url(#tce-check-shadow)" fill="url(#tce-check-fill)" stroke="#8b0000" stroke-width="0.6"
      d="M6 18.5 L13.2 25.5 L26.5 8.5 L23.8 6.2 L13 18.8 L8.5 14.5 Z"/>
  </svg>`;
  return wrap;
}

export function injectInCartBadgeStyles(doc: Document): void {
  if (doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .${HOST_CLASS} {
      position: relative !important;
    }
    .${BADGE_CLASS} {
      position: absolute;
      top: 2px;
      right: 2px;
      z-index: 30;
      pointer-events: none;
      line-height: 0;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.25));
    }
    tr.${HOST_CLASS} > td:first-child,
    tr.${HOST_CLASS} > th:first-child {
      position: relative;
    }
    tr.${HOST_CLASS} .${BADGE_CLASS} {
      top: 4px;
      right: 6px;
    }
    .list-results.${HOST_CLASS} > .${BADGE_CLASS},
    .list-layout-block.${HOST_CLASS} > .${BADGE_CLASS} {
      top: 8px;
      right: 10px;
    }
    #buttonBlock.${HOST_CLASS} .${BADGE_CLASS} {
      top: -4px;
      right: -4px;
    }
  `;
  (doc.head || doc.documentElement).appendChild(style);
}

function setInCartBadge(host: Element, show: boolean, doc: Document): void {
  if (show) {
    host.classList.add(HOST_CLASS);
    if (!host.querySelector(`.${BADGE_CLASS}`)) {
      host.appendChild(createBadge(doc));
    }
  } else {
    host.classList.remove(HOST_CLASS);
    host.querySelector(`.${BADGE_CLASS}`)?.remove();
  }
}

function readHostMarkKeys(host: Element): string[] {
  const raw = host.getAttribute(BM_MARK_KEYS_ATTR);
  if (!raw) return [];
  return raw.split('|').filter(Boolean);
}

function writeHostMarkKeys(host: Element, keys: string[]): void {
  const unique = [...new Set(keys.filter(Boolean))];
  if (unique.length === 0) host.removeAttribute(BM_MARK_KEYS_ATTR);
  else host.setAttribute(BM_MARK_KEYS_ATTR, unique.join('|'));
}

function unmarkHost(host: Element, doc: Document): void {
  host.removeAttribute(BM_SELECTED_ATTR);
  host.removeAttribute(BM_MARK_KEYS_ATTR);
  setInCartBadge(host, false, doc);
}

/** Host element for a hotel/activity rate table row. */
export function badgeHostForTableRow(row: Element): Element {
  return (
    row.querySelector('td.hidden-phone-table.textcenter') ||
    row.querySelector('td:last-child') ||
    row.querySelector('td') ||
    row
  );
}

export function hotelUrlMarkKey(bookingUrl?: string): string | null {
  const url = normalizeBmMarkUrl(bookingUrl);
  return url ? `hotel:url:${url}` : null;
}

export function hotelRowMarkKeys(row: Element, hotelId: string, rateIndex: number): string[] {
  const link = row.querySelector('a.btn-success') as HTMLAnchorElement | null;
  const urlKey = hotelUrlMarkKey(link?.href);
  return urlKey ? [urlKey] : [`hotel:fallback:${hotelId}:${rateIndex}`];
}

export function transferMarkKey(transferId: string): string {
  return `transfer:${transferId}`;
}

export function activityMarkKey(activityId: string, bookingUrl?: string): string {
  const url = normalizeBmMarkUrl(bookingUrl);
  return url ? `activity:${activityId}:${url}` : `activity:${activityId}`;
}

export function insuranceMarkKey(insuranceId: string): string {
  return `insurance:${insuranceId}`;
}

export function tourMarkKey(tourId: string): string {
  return `tour:${tourId}`;
}

/** Mark keys still represented by at least one cart row. */
export function cartItemMarkKeys(item: CartItem): string[] {
  switch (item.type) {
    case 'hotel': {
      const keys = new Set<string>([`hotel:merge:${hotelOccupancyMatchKey(item)}`]);
      const u1 = hotelUrlMarkKey(item.bookingUrl);
      const u2 = hotelUrlMarkKey(item.selectedRate?.bookingUrl);
      if (u1) keys.add(u1);
      if (u2) keys.add(u2);
      return [...keys];
    }
    case 'transfer':
      return [transferMarkKey(item.transferId)];
    case 'activity':
      return [activityMarkKey(item.activityId, item.bookingUrl)];
    case 'insurance':
      return [insuranceMarkKey(item.insuranceId)];
    case 'tour':
      return [tourMarkKey(item.tourId)];
    default:
      return [];
  }
}

/** Mark a BM result after clicking + 🛒 GT. */
export function markBmItemSelected(host: Element, doc: Document, markKeys: string[]): void {
  injectInCartBadgeStyles(doc);
  setInCartBadge(host, true, doc);
  host.setAttribute(BM_SELECTED_ATTR, 'true');
  writeHostMarkKeys(host, markKeys);
}

/** Link hotel row marks to merge key (wholesale DBL/TPL probes on same cart row). */
export function registerHotelMarkMergeKey(doc: Document, item: HotelCartItem): void {
  const mergeKey = `hotel:merge:${hotelOccupancyMatchKey(item)}`;
  const urlKeys = new Set<string>();
  const u1 = hotelUrlMarkKey(item.bookingUrl);
  const u2 = hotelUrlMarkKey(item.selectedRate?.bookingUrl);
  if (u1) urlKeys.add(u1);
  if (u2) urlKeys.add(u2);

  for (const host of doc.querySelectorAll(`[${BM_SELECTED_ATTR}]`)) {
    const keys = readHostMarkKeys(host);
    if (keys.some((k) => urlKeys.has(k))) {
      writeHostMarkKeys(host, [...keys, mergeKey]);
    }
  }
}

/** Drop marks whose keys no longer exist in the cart (manual remove). */
export function syncBmMarksWithCart(doc: Document, items: CartItem[]): void {
  injectInCartBadgeStyles(doc);
  const active = new Set<string>();
  for (const item of items) {
    for (const key of cartItemMarkKeys(item)) active.add(key);
  }
  for (const host of doc.querySelectorAll(`[${BM_SELECTED_ATTR}]`)) {
    const keys = readHostMarkKeys(host);
    const still = keys.some((k) => active.has(k));
    if (!still) unmarkHost(host, doc);
  }
}

/** Remove all selection marks (Nueva búsqueda). */
export function clearAllBmSelectedMarks(doc: Document): void {
  for (const host of doc.querySelectorAll(`[${BM_SELECTED_ATTR}]`)) {
    unmarkHost(host, doc);
  }
}

export function wireBmAddButton(
  btn: HTMLButtonElement,
  host: Element,
  doc: Document,
  markKeys: string[],
  onAdd: () => void
): void {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    markBmItemSelected(host, doc, markKeys);
    onAdd();
  });
}
