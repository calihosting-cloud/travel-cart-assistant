import { SearchContext } from '../engine/core/types';
import {
  BookingMotorSearchFormSync,
  SearchFormType,
} from '../engine/providers/bookingmotor/BookingMotorSearchFormSync';
import { TRIP_GUIDE_KEY } from '../shared/tripGuide';

const STORAGE_KEY = 'tce_last_search';
const PREFILLED_ATTR = 'data-tce-prefilled';
const CHECKOUT_WATCH_ATTR = 'data-tce-checkout-watch';
const CAPTURE_DEBOUNCE_MS = 500;
const CONTEXT_TTL_MS = 1000 * 60 * 60 * 12; // ignore contexts older than 12h

/**
 * Carries the passenger/date context between BookingMotor search tabs.
 *
 * - Captures the active search form whenever the advisor edits it.
 * - When a different (empty) form becomes visible, pre-fills the shared fields
 *   (dates, passengers, children ages, nationality) and shows a hint banner.
 * - If there is no BM search yet, falls back to `tce_trip_guide` (first flight)
 *   so hotel/transfer open with the same dates and pax.
 *
 * Destination is never auto-written because transfers need backend
 * pickup/dropoff IDs that can't be derived from a hotel name.
 */
export class SearchSyncController {
  private sync = new BookingMotorSearchFormSync();
  /** Last BookingMotor hotel/transfer/… capture (`tce_last_search`). */
  private bmContext: SearchContext | null = null;
  /** Sticky first-flight guide (`tce_trip_guide`) for flight → hotel handoff. */
  private tripGuide: SearchContext | null = null;
  private isApplying = false;
  private captureTimer: number | null = null;

  async init(): Promise<void> {
    await this.loadContext();

    document.addEventListener('change', this.onFormMutated, true);
    document.addEventListener('input', this.onFormMutated, true);
    document.addEventListener('submit', this.onFormSubmit, true);

    try {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local') return;
        let dirty = false;
        if (changes[STORAGE_KEY]) {
          const next = changes[STORAGE_KEY].newValue as SearchContext | undefined;
          if (!next || next.sourceType === 'flight') {
            this.bmContext = null;
          } else if (Date.now() - next.savedAt < CONTEXT_TTL_MS) {
            this.bmContext = next;
          }
          dirty = true;
        }
        if (changes[TRIP_GUIDE_KEY]) {
          const next = changes[TRIP_GUIDE_KEY].newValue as SearchContext | undefined;
          this.tripGuide =
            next?.sourceType === 'flight' && Date.now() - next.savedAt < CONTEXT_TTL_MS
              ? next
              : null;
          dirty = true;
        }
        if (dirty) this.tryPrefillVisibleForm();
      });
    } catch {
      // storage.onChanged unavailable (e.g. test harness)
    }

    const observer = new MutationObserver(() => this.tryPrefillVisibleForm());
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class', 'hidden'],
    });

    // Seed from a form that already has a destination (advisor searched or typed).
    // Do NOT capture bare site defaults (empty transfer with a default check-in),
    // or they would overwrite a good hotel→transfer context.
    this.captureBestAvailableForm({ requireDestination: true });
    this.tryPrefillVisibleForm();
  }

  /**
   * Prefill source: newer BM search wins; otherwise the sticky flight guide
   * (flight → hotel / transfer handoff).
   */
  private resolvePrefillContext(): SearchContext | null {
    const bm = this.bmContext;
    const guide = this.tripGuide;
    if (bm && guide) {
      return (bm.savedAt ?? 0) >= (guide.savedAt ?? 0) ? bm : guide;
    }
    return bm ?? guide;
  }

  private onFormMutated = (event: Event): void => {
    if (this.isApplying) return;
    const target = event.target as HTMLElement | null;
    const name = target?.getAttribute?.('name');
    if (!name || (!name.startsWith('searchhotel[') && !name.startsWith('searchtransfer['))) return;
    this.scheduleCapture();
  };

  private onFormSubmit = (event: Event): void => {
    if (this.isApplying) return;
    const form = (event.target as HTMLElement | null)?.closest?.('form') as HTMLFormElement | null;
    if (!form) return;
    const id = form.id || form.getAttribute('name') || '';
    if (id !== 'search_hotel' && id !== 'search_transfer') return;
    // Flush immediately so the query isn't lost if the page navigates away.
    this.captureForm(form, id === 'search_hotel' ? 'hotel' : 'transfer');
  };

  private scheduleCapture(): void {
    if (this.captureTimer !== null) clearTimeout(this.captureTimer);
    this.captureTimer = window.setTimeout(() => this.captureBestAvailableForm(), CAPTURE_DEBOUNCE_MS);
  }

  /** Prefer the visible tab; otherwise pull data from any form that has dates/pax. */
  private captureBestAvailableForm(opts?: { requireDestination?: boolean }): void {
    const visible = this.sync.getVisibleForm(document);
    if (visible) {
      if (opts?.requireDestination && !this.formHasDestination(visible.form, visible.type)) return;
      this.captureForm(visible.form, visible.type);
      return;
    }

    for (const type of ['hotel', 'transfer'] as SearchFormType[]) {
      const form = this.sync.getForm(document, type);
      if (!form) continue;
      if (opts?.requireDestination && !this.formHasDestination(form, type)) continue;
      const context = this.sync.capture(form, type);
      if (context.checkIn || context.totalAdults > 0 || context.totalChildren > 0) {
        this.persistContext(context);
        return;
      }
    }
  }

  private captureForm(form: HTMLFormElement, type: SearchFormType): void {
    const context = this.sync.capture(form, type);
    // Ignore empty snapshots (nothing meaningful entered yet).
    if (!context.checkIn && context.totalAdults === 0 && context.totalChildren === 0) return;
    this.persistContext(context);
  }

  private persistContext(context: SearchContext): void {
    this.bmContext = context;
    void this.saveContext(context);
  }

  private tryPrefillVisibleForm(): void {
    if (this.isApplying) return;
    const context = this.resolvePrefillContext();
    if (!context) return;

    const visible = this.sync.getVisibleForm(document);
    if (!visible) return;

    const { type, form } = visible;
    if (form.getAttribute(PREFILLED_ATTR) === '1') return;

    // BookingMotor often pre-fills a default check-in date on empty transfer
    // forms, so "has a date" is NOT the same as "advisor already filled this".
    // Only skip when the form already matches our stored context, or the
    // advisor already typed a destination (hotel name / pickup / dropoff).
    if (this.formAlreadySynced(form, type, context)) {
      form.setAttribute(PREFILLED_ATTR, '1');
      return;
    }
    if (this.formHasDestination(form, type)) return;

    this.isApplying = true;
    try {
      const changed = this.sync.apply(form, type, context);
      form.setAttribute(PREFILLED_ATTR, '1');
      if (changed) this.showBanner(form, type, context);

      if (type === 'transfer' && context.checkOut) {
        this.watchTransferCheckout(form, context.checkOut);
        // BookingMotor may overwrite checkout = check-in + 1 after our apply.
        const expectedCheckout = context.checkOut;
        window.setTimeout(() => this.reapplyTransferCheckout(form, expectedCheckout), 50);
      }

      // Age selects are rendered after the children count changes — fill on next tick.
      if (context.totalChildren > 0 || context.childrenAges.length > 0) {
        window.setTimeout(() => {
          try {
            this.sync.apply(form, type, context);
          } catch {
            // ignore
          }
        }, 150);
      }
    } catch (err) {
      console.error('[TCE] Search prefill failed:', err);
    } finally {
      // Allow the site's own change handlers to run before re-enabling capture.
      window.setTimeout(() => {
        this.isApplying = false;
      }, 0);
    }
  }

  /**
   * When the advisor switches Solo ida → Ida y vuelta, BookingMotor may call
   * setCheckout() (check-in + 1). Re-apply the hotel check-out afterwards.
   */
  private watchTransferCheckout(form: HTMLFormElement, expectedCheckout: string): void {
    if (form.getAttribute(CHECKOUT_WATCH_ATTR) === '1') return;
    form.setAttribute(CHECKOUT_WATCH_ATTR, '1');

    const reapply = (): void => {
      const typeVal = form.querySelector<HTMLInputElement>(
        'input[name="searchtransfer[type]"]:checked'
      )?.value;
      if (typeVal !== '2') return;
      window.setTimeout(() => this.reapplyTransferCheckout(form, expectedCheckout), 50);
    };

    form.querySelectorAll<HTMLInputElement>('input[name="searchtransfer[type]"]').forEach((radio) => {
      radio.addEventListener('change', reapply);
    });
    form.querySelectorAll('.types label').forEach((label) => {
      label.addEventListener('click', reapply);
    });
  }

  private reapplyTransferCheckout(form: HTMLFormElement, expectedCheckout: string): void {
    const el = form.querySelector<HTMLInputElement>('[name="searchtransfer[checkout]"]');
    if (!el || el.value.trim() === expectedCheckout) return;
    const prev = this.isApplying;
    this.isApplying = true;
    try {
      el.value = expectedCheckout;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    } finally {
      window.setTimeout(() => {
        this.isApplying = prev;
      }, 0);
    }
  }

  /** True when dates + passengers already match the stored context. */
  private formAlreadySynced(
    form: HTMLFormElement,
    type: SearchFormType,
    ctx: SearchContext
  ): boolean {
    const prefixMap: Record<SearchFormType, string> = {
      hotel: 'searchhotel',
      transfer: 'searchtransfer',
      activity: 'searchactivity',
      insurance: 'searchinsurance',
    };
    const prefix = prefixMap[type];
    const checkIn = form.querySelector<HTMLInputElement>(`[name="${prefix}[checkin]"]`)?.value.trim();
    if (!ctx.checkIn || !checkIn || checkIn !== ctx.checkIn) return false;

    if (type === 'transfer' || type === 'activity') {
      const adults = Number(
        form.querySelector<HTMLSelectElement>(`[name="${prefix}[adults]"]`)?.value ?? ''
      );
      const children = Number(
        form.querySelector<HTMLSelectElement>(`[name="${prefix}[children]"]`)?.value ?? ''
      );
      return adults === ctx.totalAdults && children === ctx.totalChildren;
    }

    if (type === 'insurance') {
      const pax = Number(
        form.querySelector<HTMLSelectElement>('[name="searchinsurance[passengers]"]')?.value ?? ''
      );
      return pax === ctx.totalAdults + ctx.totalChildren;
    }

    // Multi-room: compare totals, not only habitación 1 (room[0]).
    let adults = 0;
    let children = 0;
    for (let r = 0; ; r++) {
      const adultsSel = form.querySelector<HTMLSelectElement>(
        `[name="searchhotel[listrooms][${r}][adults]"]`
      );
      if (!adultsSel) break;
      const roomsSel = form.querySelector<HTMLSelectElement>('[name="searchhotel[rooms]"]');
      const declared = roomsSel ? Number(roomsSel.value || '1') : null;
      if (declared !== null && r >= declared) break;
      adults += Number(adultsSel.value || '0');
      children += Number(
        form.querySelector<HTMLSelectElement>(`[name="searchhotel[listrooms][${r}][children]"]`)
          ?.value ?? '0'
      );
    }
    return adults === ctx.totalAdults && children === ctx.totalChildren;
  }

  /**
   * Destination / pickup fields signal the advisor already started this form —
   * never overwrite those flows. Dates alone do not count (site defaults).
   */
  private formHasDestination(form: HTMLFormElement, type: SearchFormType): boolean {
    if (type === 'hotel') {
      const destiny = form.querySelector<HTMLInputElement>('[name="searchhotel[destiny]"]')?.value.trim();
      const destinyId = form.querySelector<HTMLInputElement>('[name="searchhotel[destiny_id]"]')?.value.trim();
      return !!destiny || !!destinyId;
    }
    if (type === 'activity') {
      const destiny = form.querySelector<HTMLInputElement>('[name="searchactivity[destiny]"]')?.value.trim();
      const destination = form
        .querySelector<HTMLInputElement>('[name="searchactivity[destination]"]')
        ?.value.trim();
      return !!destiny || !!destination;
    }
    if (type === 'insurance') {
      // Origin/destiny country selects usually have defaults — don't block prefill.
      return false;
    }
    const from = form.querySelector<HTMLInputElement>('[name="searchtransfer[from]"]')?.value.trim();
    const to = form.querySelector<HTMLInputElement>('[name="searchtransfer[to]"]')?.value.trim();
    const pickup = form.querySelector<HTMLInputElement>('[name="searchtransfer[pickup]"]')?.value.trim();
    const dropoff = form.querySelector<HTMLInputElement>('[name="searchtransfer[dropoff]"]')?.value.trim();
    return !!from || !!to || !!pickup || !!dropoff;
  }

  // -------------------------------------------------------------------------
  // Banner
  // -------------------------------------------------------------------------

  private showBanner(form: HTMLFormElement, type: SearchFormType, ctx: SearchContext): void {
    const doc = form.ownerDocument;
    const existing = form.querySelector('.tce-prefill-note');
    if (existing) existing.remove();

    const pax: string[] = [];
    if (ctx.totalAdults > 0) pax.push(`${ctx.totalAdults} Adt`);
    if (ctx.totalChildren > 0) {
      const ages =
        ctx.childrenAges.length > 0 ? ` (${ctx.childrenAges.join(', ')})` : '';
      pax.push(`${ctx.totalChildren} Chd${ages}`);
    }

    const bits: string[] = [];
    if (type === 'hotel' && ctx.checkIn && ctx.checkOut) {
      bits.push(`entrada ${ctx.checkIn}`);
      bits.push(`salida ${ctx.checkOut}`);
    } else if (ctx.checkIn && ctx.checkOut) {
      bits.push(`ida ${ctx.checkIn}`);
      bits.push(`vuelta ${ctx.checkOut}`);
    } else if (ctx.checkIn) {
      bits.push(type === 'hotel' ? `entrada ${ctx.checkIn}` : `ida ${ctx.checkIn}`);
    } else if (ctx.checkOut) {
      bits.push(type === 'hotel' ? `salida ${ctx.checkOut}` : `vuelta ${ctx.checkOut}`);
    }
    if (ctx.nights && ctx.nights > 0 && type === 'hotel') {
      bits.push(`${ctx.nights} noche${ctx.nights !== 1 ? 's' : ''}`);
    }
    if (pax.length) bits.push(pax.join(' · '));

    const note = doc.createElement('div');
    note.className = 'tce-prefill-note';
    note.setAttribute('style', [
      'display:flex',
      'align-items:flex-start',
      'gap:8px',
      'margin:0 0 12px',
      'padding:8px 10px',
      'border:1px solid #bfdbfe',
      'border-left:3px solid #2563eb',
      'border-radius:6px',
      'background:#eff6ff',
      'color:#1e3a8a',
      'font-size:12px',
      'line-height:1.4',
    ].join(';'));

    const fromFlight = ctx.sourceType === 'flight';
    const destHint =
      type === 'transfer' && ctx.destinationText
        ? ` Escribe el destino en <strong>Desde/Hasta</strong> (búsqueda previa: ${this.escape(ctx.destinationText)}).`
        : type === 'hotel' && ctx.destinationText
          ? ` Escribe el <strong>Destino</strong> (guía: ${this.escape(ctx.destinationText)}).`
          : '';
    const sourceLabel = fromFlight ? 'guía del viaje (vuelo)' : 'búsqueda anterior';

    note.innerHTML =
      `<span><span style="color:#dc2626;font-weight:700;margin-right:4px" title="Advertencia" aria-label="Advertencia">▲</span>` +
      `Precargamos ${bits.length ? this.escape(bits.join(' · ')) : 'los datos'} de tu ${sourceLabel}.` +
      `${destHint}</span>` +
      `<button type="button" class="tce-prefill-close" aria-label="Cerrar" ` +
      `style="margin-left:auto;background:none;border:none;color:#1e3a8a;cursor:pointer;font-size:14px;line-height:1;padding:0 2px;">✕</button>`;

    note.querySelector('.tce-prefill-close')?.addEventListener('click', () => note.remove());

    form.prepend(note);
  }

  private escape(text: string): string {
    const el = document.createElement('span');
    el.textContent = text;
    return el.innerHTML;
  }

  // -------------------------------------------------------------------------
  // Storage
  // -------------------------------------------------------------------------

  private async loadContext(): Promise<void> {
    try {
      const result = await chrome.storage.local.get([STORAGE_KEY, TRIP_GUIDE_KEY]);
      const stored = result[STORAGE_KEY] as SearchContext | undefined;
      if (
        stored &&
        stored.sourceType !== 'flight' &&
        Date.now() - stored.savedAt < CONTEXT_TTL_MS
      ) {
        this.bmContext = stored;
      }
      const guide = result[TRIP_GUIDE_KEY] as SearchContext | undefined;
      if (
        guide &&
        guide.sourceType === 'flight' &&
        Date.now() - guide.savedAt < CONTEXT_TTL_MS
      ) {
        this.tripGuide = guide;
      }
    } catch {
      // storage unavailable (e.g. test harness)
    }
  }

  private async saveContext(context: SearchContext): Promise<void> {
    try {
      await chrome.storage.local.set({ [STORAGE_KEY]: context });
    } catch {
      // storage unavailable
    }
  }
}
