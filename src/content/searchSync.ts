import { SearchContext } from '../engine/core/types';
import {
  BookingMotorSearchFormSync,
  SearchFormType,
} from '../engine/providers/bookingmotor/BookingMotorSearchFormSync';
import { TRIP_GUIDE_KEY, loadTripGuide, saveTripGuide } from '../shared/tripGuide';
import { flattenChildAges, roomsFromBriefing, adultsForKind } from '../shared/roomPlan';
import { rememberBmDestination } from '../shared/originCities';
import {
  activateBookingMotorTransferTab,
  PENDING_HOTEL_TRANSFER_KEY,
  type PendingHotelTransfer,
} from '../shared/hotelTransferKit';

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
  private pendingKit: PendingHotelTransfer | null = null;
  private isApplying = false;
  private captureTimer: number | null = null;
  private prefillTimer: number | null = null;

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
          const prev = changes[TRIP_GUIDE_KEY].oldValue as SearchContext | undefined;
          const sticky =
            next?.sourceType === 'flight' || next?.sourceType === 'briefing';
          this.tripGuide =
            sticky && next && Date.now() - next.savedAt < CONTEXT_TTL_MS ? next : null;
          if (next?.sourceType === 'briefing') {
            this.tripGuide = next;
            // Push to BM only when trip facts change (fechas / origen / destino).
            // Tweaks de acomodación no deben rebloquear el formulario de Hoteles/Seguros.
            const tripFactsChanged =
              !prev ||
              prev.checkIn !== next.checkIn ||
              prev.checkOut !== next.checkOut ||
              (prev.originText || '') !== (next.originText || '') ||
              (prev.destinationText || '') !== (next.destinationText || '');
            if (tripFactsChanged) this.forceApplyHotelFromGuide();
          } else if (
            next?.sourceType === 'flight' &&
            next.checkIn &&
            Date.now() - next.savedAt < CONTEXT_TTL_MS
          ) {
            // Flight-first: same as briefing — push dates/pax into the visible BM form
            // (tryPrefill alone skips forms that already have BM default dates).
            this.tripGuide = next;
            this.forceApplyFromFlightGuide();
          }
          dirty = true;
        }
        if (changes[PENDING_HOTEL_TRANSFER_KEY]) {
          this.pendingKit = (changes[PENDING_HOTEL_TRANSFER_KEY].newValue as
            | PendingHotelTransfer
            | undefined) || null;
          this.openTransferTabForKit();
          dirty = true;
        }
        if (dirty) this.tryPrefillVisibleForm();
      });
    } catch {
      // storage.onChanged unavailable (e.g. test harness)
    }

    const observer = new MutationObserver(() => this.schedulePrefill());
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
    this.openTransferTabForKit();
    this.tryPrefillVisibleForm();
  }

  private schedulePrefill(): void {
    if (this.prefillTimer != null) return;
    this.prefillTimer = window.setTimeout(() => {
      this.prefillTimer = null;
      this.tryPrefillVisibleForm();
    }, 200);
  }

  private openTransferTabForKit(): void {
    if (!this.pendingKit) return;
    if (!activateBookingMotorTransferTab(document)) return;
    window.setTimeout(() => this.tryPrefillVisibleForm(), 120);
  }

  private kitContext(): SearchContext | null {
    if (!this.pendingKit) return null;
    const base = this.resolvePrefillContext();
    return {
      sourceType: 'hotel',
      checkIn: this.pendingKit.checkIn || base?.checkIn,
      checkOut: this.pendingKit.checkOut || base?.checkOut,
      nights: base?.nights,
      rooms: [
        {
          adults: this.pendingKit.totalAdults,
          children: this.pendingKit.totalChildren,
          childrenAges: this.pendingKit.childrenAges,
        },
      ],
      totalAdults: this.pendingKit.totalAdults || base?.totalAdults || 0,
      totalChildren: this.pendingKit.totalChildren || base?.totalChildren || 0,
      childrenAges:
        this.pendingKit.childrenAges.length > 0
          ? this.pendingKit.childrenAges
          : base?.childrenAges || [],
      nationality: base?.nationality,
      destinationText: this.pendingKit.hotelName,
      transferHotelHint: this.pendingKit.hotelName,
      pendingHotelCartId: this.pendingKit.hotelCartId,
      savedAt: Date.now(),
    };
  }

  /**
   * Prefill: briefing / vuelo del carrito gana sobre la última búsqueda BM
   * (esa suele ser ocupación de tarifa, no el viaje).
   */
  private resolvePrefillContext(): SearchContext | null {
    const guide = this.tripGuide;
    if (guide?.sourceType === 'briefing' || guide?.sourceType === 'flight') return guide;
    return this.bmContext ?? guide;
  }

  /** After Guardar viaje: pull BM child ages if the briefing has none, then push dates/pax/ages. */
  private forceApplyHotelFromGuide(): void {
    const visible = this.sync.getVisibleForm(document);
    if (visible?.type === 'hotel') {
      visible.form.removeAttribute(PREFILLED_ATTR);
      visible.form.removeAttribute('data-tce-advisor-edited');
      this.pullHotelChildAgesIntoGuide(visible.form);
    }
    this.tryPrefillVisibleForm({ force: true });
    if (visible?.type === 'hotel') {
      this.pullHotelDestIntoGuide(visible.form);
    }
  }

  /**
   * After adding a flight (or bloqueo) first: push ida/regreso/pax into Hoteles /
   * Traslados / Seguros / Actividades even if BM already shows default dates.
   */
  private forceApplyFromFlightGuide(): void {
    const visible = this.sync.getVisibleForm(document);
    if (visible) {
      visible.form.removeAttribute(PREFILLED_ATTR);
      visible.form.removeAttribute('data-tce-advisor-edited');
      visible.form.removeAttribute('data-tce-hotel-kit');
    }
    this.tryPrefillVisibleForm({ force: true });
  }

  /**
   * BM Edad selects: `searchhotel[listrooms][r][childrenages][a][age]`.
   * If Guardar viaje has children but no real ages yet, copy those selects into the guide.
   */
  private pullHotelChildAgesIntoGuide(form: HTMLFormElement): void {
    const guide = this.tripGuide;
    if (!guide || guide.sourceType !== 'briefing') return;
    const prev = (guide.childrenAges || []).filter((a) => Number.isFinite(a) && a >= 0);
    if (prev.some((a) => a > 0)) return;

    const captured = this.sync.capture(form, 'hotel');
    const bmAges = (captured.childrenAges || []).filter(
      (a) => typeof a === 'number' && Number.isFinite(a) && a >= 0 && a <= 17
    );
    if (!bmAges.some((a) => a > 0)) return;

    const plan = roomsFromBriefing(
      guide.roomPlan,
      guide.totalAdults,
      guide.totalChildren,
      bmAges
    );
    const childrenAges = flattenChildAges(plan);
    if (childrenAges.length === 0) return;

    const updated = {
      ...guide,
      childrenAges,
      roomPlan: plan,
      rooms: plan.map((r) => ({
        adults: adultsForKind(r.kind),
        children: r.children || 0,
        childrenAges: r.childrenAges || [],
      })),
      savedAt: Date.now(),
    };
    this.tripGuide = updated;
    void saveTripGuide(updated);
  }

  private onFormMutated = (event: Event): void => {
    if (this.isApplying) return;
    const target = event.target as HTMLElement | null;
    const name = target?.getAttribute?.('name');
    if (
      !name ||
      (!name.startsWith('searchhotel[') &&
        !name.startsWith('searchtransfer[') &&
        !name.startsWith('searchinsurance[') &&
        !name.startsWith('searchactivity['))
    ) {
      return;
    }
    // Advisor is editing — stop delayed age fills that would snap values back.
    this.clearAgeFillTimers();
    const form = target?.closest?.('form') as HTMLFormElement | null;
    if (form?.getAttribute(PREFILLED_ATTR) === '1') {
      // Keep the marker so MutationObserver / tab returns do not re-apply the guide.
      form.setAttribute('data-tce-advisor-edited', '1');
    }
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
        this.persistContext(context, form);
        return;
      }
    }
  }

  private captureForm(form: HTMLFormElement, type: SearchFormType): void {
    const context = this.sync.capture(form, type);
    // Ignore empty snapshots (nothing meaningful entered yet).
    if (!context.checkIn && context.totalAdults === 0 && context.totalChildren === 0) return;
    this.persistContext(context, form);
  }

  private persistContext(context: SearchContext, form?: HTMLFormElement): void {
    if (this.pendingKit) {
      context = {
        ...context,
        transferHotelHint: this.pendingKit.hotelName,
        pendingHotelCartId: this.pendingKit.hotelCartId,
        destinationText: context.destinationText || this.pendingKit.hotelName,
      };
    }
    this.bmContext = context;
    void this.saveContext(context);
    if (context.sourceType === 'hotel' && context.destinationText) {
      void rememberBmDestination(context.destinationText);
      void this.copyBmDestIntoGuide(context.destinationText, {
        overwrite: this.hotelDestConfirmed(form),
      });
    }
  }

  /** True when BM autocomplete already picked a destination (hidden ID). */
  private hotelDestConfirmed(form?: HTMLFormElement | null): boolean {
    const f = form || this.sync.getForm(document, 'hotel');
    if (!f) return false;
    const id =
      f.querySelector<HTMLInputElement>('[name="searchhotel[destination]"]')?.value.trim() ||
      f.querySelector<HTMLInputElement>('[name="searchhotel[destiny_id]"]')?.value.trim() ||
      '';
    return id.length > 0;
  }

  private async copyBmDestIntoGuide(
    destinationText: string,
    opts?: { overwrite?: boolean }
  ): Promise<void> {
    const dest = destinationText.trim();
    if (!dest) return;
    const guide = this.tripGuide || (await loadTripGuide());
    if (!guide) return;
    if (guide.destinationPinned) return;
    const prev = guide.destinationText?.trim() || '';
    if (prev && !opts?.overwrite) return;
    if (prev === dest) return;
    const updated = { ...guide, destinationText: dest, savedAt: Date.now() };
    this.tripGuide = updated;
    await saveTripGuide(updated);
  }

  private pullHotelDestIntoGuide(form: HTMLFormElement): void {
    const dest =
      form.querySelector<HTMLInputElement>('[name="searchhotel[destiny]"]')?.value.trim() || '';
    if (dest) {
      void this.copyBmDestIntoGuide(dest, { overwrite: this.hotelDestConfirmed(form) });
    }
  }

  private lastVisibleFormType: SearchFormType | null = null;
  /** Delayed age-fill timeouts — cancelled if the advisor edits the form. */
  private ageFillTimers: number[] = [];

  private clearAgeFillTimers(): void {
    for (const id of this.ageFillTimers) window.clearTimeout(id);
    this.ageFillTimers = [];
  }

  private tryPrefillVisibleForm(opts?: { force?: boolean }): void {
    if (this.isApplying) return;
    const kit = this.kitContext();
    const context = kit || this.resolvePrefillContext();
    if (!context) return;

    const visible = this.sync.getVisibleForm(document);
    if (!visible) return;

    const { type, form } = visible;
    if (kit && type !== 'transfer') return;

    // Remember tab; do NOT clear prefilled — that was snapping dates/pax back
    // every time the advisor returned to Hoteles / Seguros after editing.
    if (this.lastVisibleFormType !== type) {
      this.lastVisibleFormType = type;
    }

    if (type === 'transfer' && (context.transferHotelHint || '').trim()) {
      this.showTransferHotelHint(form, context);
    }

    const kitMark = kit?.pendingHotelCartId || '';
    if (kit && type === 'transfer') {
      if (form.getAttribute('data-tce-hotel-kit') === kitMark) return;
    } else if (!opts?.force && form.getAttribute('data-tce-advisor-edited') === '1') {
      // Advisor changed dates/pax after prefill — never snap back.
      return;
    } else if (!opts?.force && form.getAttribute(PREFILLED_ATTR) === '1') {
      // Already prefilled: retry only if BM wiped fields (empty dates/ages).
      // Never treat an advisor edit (different date/pax) as "stale" — that was
      // snapping dates back to the precargadas.
      if (this.formAlreadySynced(form, type, context)) return;
      if (!this.formNeedsPrefillRetry(form, type, context)) return;
      form.removeAttribute(PREFILLED_ATTR);
    }

    if (!kit && !opts?.force && this.formAlreadySynced(form, type, context)) {
      form.setAttribute(PREFILLED_ATTR, '1');
      if (type === 'hotel') this.pullHotelDestIntoGuide(form);
      return;
    }
    if (!kit && !opts?.force && type !== 'hotel' && this.formHasDestination(form, type)) return;

    this.isApplying = true;
    this.clearAgeFillTimers();
    try {
      if (opts?.force) form.removeAttribute('data-tce-advisor-edited');
      const changed = this.sync.apply(form, type, context);
      form.setAttribute(PREFILLED_ATTR, '1');
      if (kit && type === 'transfer') {
        form.setAttribute('data-tce-hotel-kit', kitMark);
      }
      if (changed || kit || opts?.force || type === 'insurance') this.showBanner(form, type, context);

      if (type === 'hotel') this.pullHotelDestIntoGuide(form);

      if (type === 'transfer' && context.checkOut) {
        this.watchTransferCheckout(form, context.checkOut);
        const expectedCheckout = context.checkOut;
        window.setTimeout(() => this.reapplyTransferCheckout(form, expectedCheckout), 50);
      }

      // Age slots appear after passengers change — fill several times (BM jQuery).
      if (
        type === 'insurance' ||
        context.totalChildren > 0 ||
        (context.childrenAges || []).length > 0
      ) {
        const fillAges = (): void => {
          try {
            if (type === 'insurance') {
              this.sync.applyInsuranceAges(form, context);
            } else {
              this.sync.applyChildAges(form, type, context);
            }
          } catch {
            // ignore
          }
        };
        fillAges();
        for (const delay of [80, 200, 450, 900]) {
          this.ageFillTimers.push(window.setTimeout(fillAges, delay));
        }
        this.ageFillTimers.push(
          window.setTimeout(() => {
            this.isApplying = false;
          }, 950)
        );
      } else {
        window.setTimeout(() => {
          this.isApplying = false;
        }, 0);
      }
    } catch (err) {
      console.error('[TCE] Search prefill failed:', err);
      this.isApplying = false;
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

  /**
   * After a successful prefill, only re-run when the form looks incomplete
   * (BM cleared check-in, age slots not ready yet). A filled form that
   * differs from context means the advisor edited — leave it alone.
   */
  private formNeedsPrefillRetry(
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
    const checkIn =
      form.querySelector<HTMLInputElement>(`[name="${prefix}[checkin]"]`)?.value.trim() || '';
    if (ctx.checkIn && !checkIn) return true;

    if (type === 'insurance') {
      const pax = Number(
        form.querySelector<HTMLSelectElement>('[name="searchinsurance[passengers]"]')?.value ?? ''
      );
      if (pax <= 0) return true;
      for (let i = 0; i < pax; i++) {
        const el = form.querySelector<HTMLInputElement>(
          `[name="searchinsurance[passengerages][${i}][age]"]`
        );
        if (!el || !el.value.trim()) return true;
      }
      if (this.sync.insuranceCountryLooksUnset(form, 'searchinsurance[origin]')) return true;
      return false;
    }

    if (type === 'hotel' && (ctx.childrenAges || []).some((a) => a > 0)) {
      const captured = this.sync.capture(form, 'hotel');
      const formAges = captured.childrenAges || [];
      // Age inputs not mounted yet after changing # of children.
      if (ctx.totalChildren > 0 && formAges.length === 0) return true;
    }

    return false;
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
      if (pax <= 0) return false;
      if (this.sync.insuranceCountryLooksUnset(form, 'searchinsurance[origin]')) return false;
      const expected = this.sync.expectedInsuranceAges(ctx, pax);
      for (let i = 0; i < pax; i++) {
        const raw =
          form.querySelector<HTMLInputElement>(
            `[name="searchinsurance[passengerages][${i}][age]"]`
          )?.value.trim() ?? '';
        if (String(expected[i] ?? '') !== raw) return false;
      }
      return true;
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
    if (adults !== ctx.totalAdults || children !== ctx.totalChildren) return false;
    const captured = this.sync.capture(form, 'hotel');
    const formAges = captured.childrenAges || [];
    const ctxAges = ctx.childrenAges || [];
    if (ctxAges.length === 0) return true;
    return (
      formAges.length === ctxAges.length && formAges.every((a, i) => a === ctxAges[i])
    );
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

    form.querySelectorAll('.tce-prefill-note').forEach((el) => el.remove());

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
    const hotelHint = (ctx.transferHotelHint || '').trim();
    const destHint =
      type === 'transfer' && hotelHint
        ? ` Primero elige el origen (aeropuerto). En <strong>Hasta</strong> busca el hotel (el ID lo pone BM).`
        : type === 'transfer' && ctx.destinationText
          ? ` Escribe el destino en <strong>Desde/Hasta</strong> (búsqueda previa: ${this.escape(ctx.destinationText)}).`
          : type === 'hotel'
            ? ctx.destinationText
              ? ` Destino en BM: ${this.escape(ctx.destinationText)}.`
              : ` Escribe el <strong>Destino</strong> en el cuadro de BM (el carrito lo copiará).`
            : '';
    const sourceLabel = hotelHint
      ? `hotel ${hotelHint}`
      : ctx.sourceType === 'briefing'
        ? 'viaje guardado'
        : fromFlight
          ? 'guía del viaje (vuelo)'
          : 'búsqueda anterior';

    note.innerHTML =
      `<span><span style="color:#dc2626;font-weight:700;margin-right:4px" title="Advertencia" aria-label="Advertencia">▲</span>` +
      `Precargamos ${bits.length ? this.escape(bits.join(' · ')) : 'los datos'} de tu ${sourceLabel}.` +
      `${destHint}</span>` +
      `<button type="button" class="tce-prefill-close" aria-label="Cerrar" ` +
      `style="margin-left:auto;background:none;border:none;color:#1e3a8a;cursor:pointer;font-size:14px;line-height:1;padding:0 2px;">✕</button>`;

    note.querySelector('.tce-prefill-close')?.addEventListener('click', () => note.remove());

    form.prepend(note);
  }

  /**
   * Hotel name stays outside the BM autocomplete: the dropoff ID only exists
   * after the advisor picks a suggestion. Putting the name in «Hasta» gets wiped.
   */
  private showTransferHotelHint(form: HTMLFormElement, ctx: SearchContext): void {
    const hotelHint = (ctx.transferHotelHint || '').trim();
    if (!hotelHint) return;

    const existing = form.querySelector<HTMLElement>('.tce-transfer-hotel-hint');
    if (existing?.getAttribute('data-hotel') === hotelHint) return;

    form.querySelectorAll('.tce-transfer-hotel-hint').forEach((el) => el.remove());

    const toEl = form.querySelector<HTMLInputElement>('[name="searchtransfer[to]"]');
    const field = toEl?.closest('.col-md-6') || toEl?.parentElement;
    if (!field) return;

    const doc = form.ownerDocument;
    const hint = doc.createElement('div');
    hint.className = 'tce-transfer-hotel-hint';
    hint.setAttribute('data-hotel', hotelHint);
    hint.setAttribute(
      'style',
      [
        'display:flex',
        'align-items:center',
        'flex-wrap:wrap',
        'gap:6px',
        'margin:4px 0 0',
        'font-size:11px',
        'line-height:1.3',
        'color:#b91c1c',
        'font-weight:700',
      ].join(';')
    );
    hint.innerHTML =
      `<span>Busca este hotel: <span class="tce-transfer-hotel-name">${this.escape(hotelHint)}</span></span>` +
      `<button type="button" class="tce-copy-hotel" style="font-size:10px;font-weight:700;color:#b91c1c;` +
      `background:#fef2f2;border:1px solid #fecaca;border-radius:4px;padding:1px 6px;cursor:pointer">Copiar</button>`;

    const btn = hint.querySelector<HTMLButtonElement>('.tce-copy-hotel');
    btn?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const done = () => {
        if (btn) btn.textContent = 'Copiado';
        window.setTimeout(() => {
          if (btn) btn.textContent = 'Copiar';
        }, 1500);
      };
      if (navigator.clipboard?.writeText) {
        void navigator.clipboard.writeText(hotelHint).then(done).catch(() => this.copyFallback(hotelHint, done));
      } else {
        this.copyFallback(hotelHint, done);
      }
    });

    field.appendChild(hint);
  }

  private copyFallback(text: string, done: () => void): void {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      done();
    } catch {
      // ignore
    }
    ta.remove();
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
      const result = await chrome.storage.local.get([
        STORAGE_KEY,
        TRIP_GUIDE_KEY,
        PENDING_HOTEL_TRANSFER_KEY,
      ]);
      const stored = result[STORAGE_KEY] as SearchContext | undefined;
      if (
        stored &&
        stored.sourceType !== 'flight' &&
        Date.now() - stored.savedAt < CONTEXT_TTL_MS
      ) {
        this.bmContext = stored;
      }
      const guide = result[TRIP_GUIDE_KEY] as SearchContext | undefined;
      if (guide?.sourceType === 'briefing') {
        this.tripGuide = guide;
      } else if (
        guide &&
        guide.sourceType === 'flight' &&
        Date.now() - guide.savedAt < CONTEXT_TTL_MS
      ) {
        this.tripGuide = guide;
      }
      const pending = result[PENDING_HOTEL_TRANSFER_KEY] as PendingHotelTransfer | undefined;
      if (pending?.hotelCartId && pending.hotelName) {
        this.pendingKit = pending;
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
