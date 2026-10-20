import { RoomOccupancy, SearchContext } from '../../core/types';

export type SearchFormType = 'hotel' | 'transfer' | 'activity' | 'insurance';

/** Default insurance age for adults (BM / travel policies often use 18–21). */
export const INSURANCE_ADULT_AGE = 21;
/** Default when a child has no stored age in the briefing. */
export const INSURANCE_CHILD_DEFAULT_AGE = 6;

/**
 * Reads and writes BookingMotor search forms (`#search_hotel`, `#search_transfer`,
 * `#search_activity`, `#search_insurance`).
 *
 * The class is pure DOM logic: it does not touch storage nor attach listeners.
 * A form is only usable when it's actually rendered (visible tab), which is what
 * `getVisibleForm` checks via `offsetParent`.
 */
export class BookingMotorSearchFormSync {
  private static readonly FORM_SELECTORS: Record<SearchFormType, string> = {
    hotel: '#search_hotel, form[name="search_hotel"]',
    transfer: '#search_transfer, form[name="search_transfer"]',
    activity: '#search_activity, form[name="search_activity"]',
    insurance: '#search_insurance, form[name="search_insurance"]',
  };

  getForm(doc: Document, type: SearchFormType): HTMLFormElement | null {
    return doc.querySelector<HTMLFormElement>(BookingMotorSearchFormSync.FORM_SELECTORS[type]);
  }

  /** Returns the form that is currently rendered on screen (active tab), if any. */
  getVisibleForm(doc: Document): { type: SearchFormType; form: HTMLFormElement } | null {
    const types = ['hotel', 'transfer', 'activity', 'insurance'] as SearchFormType[];
    // Prefer the BM tab pane marked active (several forms can exist in the DOM).
    for (const type of types) {
      const form = this.getForm(doc, type);
      if (!form) continue;
      const pane = form.closest('.tab-pane, [role="tabpanel"]') as HTMLElement | null;
      if (pane) {
        const active =
          pane.classList.contains('active') ||
          pane.classList.contains('in') ||
          pane.getAttribute('aria-hidden') === 'false';
        if (active) return { type, form };
        continue;
      }
    }
    for (const type of types) {
      const form = this.getForm(doc, type);
      if (form && this.isVisible(form)) return { type, form };
    }
    return null;
  }

  isVisible(el: HTMLElement): boolean {
    // offsetParent is null for display:none subtrees (BookingMotor hides
    // inactive tabs / the collapsed "Modificar Búsqueda" panel this way).
    return el.offsetParent !== null || el.getClientRects().length > 0;
  }

  // -------------------------------------------------------------------------
  // Capture
  // -------------------------------------------------------------------------

  capture(form: HTMLFormElement, type: SearchFormType): SearchContext {
    if (type === 'hotel') return this.captureHotel(form);
    if (type === 'transfer') return this.captureTransfer(form);
    if (type === 'activity') return this.captureActivity(form);
    return this.captureInsurance(form);
  }

  private captureHotel(form: HTMLFormElement): SearchContext {
    const rooms: RoomOccupancy[] = [];
    // Prefer the rooms selector — on results pages "#new-search" is display:none,
    // so visibility checks wrongly drop room 2+ and only keep habitación 1.
    const roomsSel = this.select(form, 'searchhotel[rooms]');
    const declaredRooms = roomsSel ? Math.max(1, this.num(roomsSel.value, 1)) : null;
    let roomIndex = 0;

    while (true) {
      const adultsSel = this.select(form, `searchhotel[listrooms][${roomIndex}][adults]`);
      if (!adultsSel) break;

      if (declaredRooms !== null) {
        if (roomIndex >= declaredRooms) break;
      } else {
        const roomBlock = form.querySelector<HTMLElement>(`[id="room[${roomIndex}]"]`);
        // Template slots use inline display:none on the room block itself.
        // Do NOT use isVisible() — the parent panel may be collapsed.
        if (roomBlock && this.isSelfHidden(roomBlock)) break;
      }

      const adults = this.num(adultsSel.value, 1);
      const childrenSel = this.select(form, `searchhotel[listrooms][${roomIndex}][children]`);
      const fromSelect = this.num(childrenSel?.value ?? '0', 0);
      const fromVisible = this.countVisibleHotelAgeSlots(form, roomIndex);
      const children = Math.max(fromSelect, fromVisible);
      const childrenAges: number[] = [];
      for (let a = 0; a < children; a++) {
        const ageSel = this.select(
          form,
          `searchhotel[listrooms][${roomIndex}][childrenages][${a}][age]`
        );
        if (ageSel) childrenAges.push(this.num(ageSel.value, 0));
      }

      rooms.push({ adults, children, childrenAges });
      roomIndex++;
    }

    if (rooms.length === 0) rooms.push({ adults: 0, children: 0, childrenAges: [] });

    return this.buildContext('hotel', {
      checkIn: this.value(form, 'searchhotel[checkin]'),
      checkOut: this.value(form, 'searchhotel[checkout]'),
      nights: this.optionalNum(this.value(form, 'searchhotel[nights]')),
      nationality: this.value(form, 'searchhotel[nationality]'),
      destinationText: this.value(form, 'searchhotel[destiny]'),
      rooms,
    });
  }

  /** Age widgets live in `#ages[room-child]` and stay in the DOM (hidden with display:none). */
  private countVisibleHotelAgeSlots(form: HTMLFormElement, roomIndex: number): number {
    let n = 0;
    for (let a = 0; a < 4; a++) {
      const wrap = form.querySelector<HTMLElement>(`[id="ages[${roomIndex}-${a}]"]`);
      if (!wrap || this.isSelfHidden(wrap)) continue;
      n++;
    }
    return n;
  }

  /** True when the element itself is explicitly hidden (not via a collapsed ancestor). */
  private isSelfHidden(el: HTMLElement): boolean {
    if (el.hidden) return true;
    const inline = el.getAttribute('style') || '';
    if (/display\s*:\s*none/i.test(inline)) return true;
    return false;
  }

  private captureTransfer(form: HTMLFormElement): SearchContext {
    const adults = this.num(this.value(form, 'searchtransfer[adults]') ?? '0', 0);
    const children = this.num(this.value(form, 'searchtransfer[children]') ?? '0', 0);
    const childrenAges: number[] = [];
    for (let a = 0; a < children; a++) {
      const ageSel = this.select(form, `searchtransfer[childrenages][${a}][age]`);
      if (ageSel) childrenAges.push(this.num(ageSel.value, 0));
    }

    const room: RoomOccupancy = { adults, children, childrenAges };

    return this.buildContext('transfer', {
      checkIn: this.value(form, 'searchtransfer[checkin]'),
      checkOut: this.value(form, 'searchtransfer[checkout]'),
      nationality: this.value(form, 'searchtransfer[nationality]'),
      // "Hasta" (destination hotel) is the most useful hint for the next search.
      destinationText: this.value(form, 'searchtransfer[to]') || this.value(form, 'searchtransfer[from]'),
      rooms: [room],
    });
  }

  private captureActivity(form: HTMLFormElement): SearchContext {
    const adults = this.num(this.value(form, 'searchactivity[adults]') ?? '0', 0);
    const children = this.num(this.value(form, 'searchactivity[children]') ?? '0', 0);
    const childrenAges: number[] = [];
    for (let a = 0; a < children; a++) {
      const ageSel = this.select(form, `searchactivity[childrenages][${a}][age]`);
      if (ageSel) childrenAges.push(this.num(ageSel.value, 0));
    }

    return this.buildContext('activity', {
      checkIn: this.value(form, 'searchactivity[checkin]'),
      checkOut: this.value(form, 'searchactivity[checkout]'),
      nationality: this.value(form, 'searchactivity[nationality]'),
      destinationText: this.value(form, 'searchactivity[destiny]'),
      rooms: [{ adults, children, childrenAges }],
    });
  }

  private captureInsurance(form: HTMLFormElement): SearchContext {
    const passengers = this.num(this.value(form, 'searchinsurance[passengers]') ?? '0', 0);
    // Insurance uses ages, not adult/child split — treat all as adults for sync.
    return this.buildContext('insurance', {
      checkIn: this.value(form, 'searchinsurance[checkin]'),
      checkOut: this.value(form, 'searchinsurance[checkout]'),
      nationality: this.value(form, 'searchinsurance[nationality]'),
      destinationText:
        this.value(form, 'searchinsurance[destiny_name]') ||
        this.value(form, 'searchinsurance[origin_name]'),
      rooms: [{ adults: passengers, children: 0, childrenAges: [] }],
    });
  }

  private buildContext(
    sourceType: SearchFormType,
    partial: Pick<SearchContext, 'checkIn' | 'checkOut' | 'nights' | 'nationality' | 'destinationText' | 'rooms'>
  ): SearchContext {
    const totalAdults = partial.rooms.reduce((s, r) => s + r.adults, 0);
    const totalChildren = partial.rooms.reduce((s, r) => s + r.children, 0);
    const childrenAges = partial.rooms.flatMap((r) => r.childrenAges);

    return {
      sourceType,
      checkIn: partial.checkIn || undefined,
      checkOut: partial.checkOut || undefined,
      nights: partial.nights,
      nationality: partial.nationality || undefined,
      destinationText: partial.destinationText || undefined,
      rooms: partial.rooms,
      totalAdults,
      totalChildren,
      childrenAges,
      savedAt: Date.now(),
    };
  }

  // -------------------------------------------------------------------------
  // Apply
  // -------------------------------------------------------------------------

  /**
   * Fills a form from a stored context. Returns true if anything was written.
   * Destination text/IDs are intentionally never written (see class docs).
   */
  apply(form: HTMLFormElement, type: SearchFormType, ctx: SearchContext): boolean {
    if (type === 'hotel') return this.applyHotel(form, ctx);
    if (type === 'transfer') return this.applyTransfer(form, ctx);
    if (type === 'activity') return this.applyActivity(form, ctx);
    return this.applyInsurance(form, ctx);
  }

  private applyTransfer(form: HTMLFormElement, ctx: SearchContext): boolean {
    let changed = false;

    // Hotel stays imply a return transfer: switch Solo ida → Ida y vuelta so
    // the checkout field is visible and BookingMotor's changeType runs.
    if (ctx.checkOut) {
      changed = this.setTransferType(form, '2') || changed;
    }

    if (ctx.checkIn) {
      changed = this.setValue(form, 'searchtransfer[checkin]', ctx.checkIn) || changed;
    }

    // Always write checkout after check-in. BookingMotor's check-in change
    // handler sets checkout = check-in + 1 day; overwrite with hotel check-out.
    if (ctx.checkOut) {
      changed = this.setValue(form, 'searchtransfer[checkout]', ctx.checkOut) || changed;
    }

    if (ctx.totalAdults > 0) {
      changed = this.setSelectClamped(form, 'searchtransfer[adults]', ctx.totalAdults) || changed;
    }

    if (ctx.totalChildren > 0) {
      const applied = this.setSelectClamped(form, 'searchtransfer[children]', ctx.totalChildren);
      changed = applied || changed;
      // Changing children count makes the site render the age selects; fill them.
      const childrenSel = this.select(form, 'searchtransfer[children]');
      const effectiveChildren = childrenSel ? this.num(childrenSel.value, 0) : 0;
      for (let a = 0; a < effectiveChildren; a++) {
        const age = ctx.childrenAges[a];
        if (age === undefined) continue;
        changed = this.setSelectClamped(form, `searchtransfer[childrenages][${a}][age]`, age) || changed;
      }
    }

    if (ctx.nationality) {
      changed = this.setValueIfOption(form, 'searchtransfer[nationality]', ctx.nationality) || changed;
    }

    const hotelHint = (ctx.transferHotelHint || '').trim();
    if (hotelHint) {
      // Do not write the hotel name into «Hasta»: without dropoff ID BM
      // treats it as invalid and clears it when focusing «Desde».
      const toEl = form.querySelector<HTMLInputElement>('[name="searchtransfer[to]"]');
      const dropoff = form.querySelector<HTMLInputElement>('[name="searchtransfer[dropoff]"]');
      if (toEl && !(dropoff?.value || '').trim() && toEl.value.trim() === hotelHint) {
        toEl.value = '';
        changed = true;
      }
    }

    return changed;
  }

  /** Selects Solo ida (1) or Ida y vuelta (2) and triggers BookingMotor's UI. */
  private setTransferType(form: HTMLFormElement, type: '1' | '2'): boolean {
    const radio = form.querySelector<HTMLInputElement>(
      `input[name="searchtransfer[type]"][value="${type}"]`
    );
    if (!radio || radio.checked) return false;

    const label = radio.closest('label');
    // Prefer clicking the label: BM listens on `.types label` click → changeType.
    if (label) {
      form.querySelectorAll('.types label').forEach((l) => l.classList.remove('active'));
      label.classList.add('active');
      radio.checked = true;
      label.click();
    } else {
      form.querySelectorAll<HTMLInputElement>('input[name="searchtransfer[type]"]').forEach((r) => {
        r.checked = r === radio;
      });
      radio.dispatchEvent(new Event('change', { bubbles: true }));
    }
    return true;
  }

  private applyActivity(form: HTMLFormElement, ctx: SearchContext): boolean {
    let changed = false;
    if (ctx.checkIn) {
      changed = this.setValue(form, 'searchactivity[checkin]', ctx.checkIn) || changed;
    }
    if (ctx.checkOut) {
      changed = this.setValue(form, 'searchactivity[checkout]', ctx.checkOut) || changed;
    }
    if (ctx.totalAdults > 0) {
      changed = this.setSelectClamped(form, 'searchactivity[adults]', ctx.totalAdults) || changed;
    }
    if (ctx.totalChildren > 0) {
      changed = this.setSelectClamped(form, 'searchactivity[children]', ctx.totalChildren) || changed;
      const childrenSel = this.select(form, 'searchactivity[children]');
      const effectiveChildren = childrenSel ? this.num(childrenSel.value, 0) : 0;
      for (let a = 0; a < effectiveChildren; a++) {
        const age = ctx.childrenAges[a];
        if (age === undefined) continue;
        changed =
          this.setSelectClamped(form, `searchactivity[childrenages][${a}][age]`, age) || changed;
      }
    }
    if (ctx.nationality) {
      changed = this.setValueIfOption(form, 'searchactivity[nationality]', ctx.nationality) || changed;
    }
    return changed;
  }

  private applyInsurance(form: HTMLFormElement, ctx: SearchContext): boolean {
    let changed = false;
    if (ctx.checkIn) {
      changed = this.setValue(form, 'searchinsurance[checkin]', ctx.checkIn) || changed;
    }
    if (ctx.checkOut) {
      changed = this.setValue(form, 'searchinsurance[checkout]', ctx.checkOut) || changed;
    }
    const pax = ctx.totalAdults + ctx.totalChildren;
    if (pax > 0) {
      changed = this.setSelectClamped(form, 'searchinsurance[passengers]', pax) || changed;
    }
    changed = this.triggerInsurancePassengersChange(form) || changed;
    // Fresh form lists countries A–Z; first option is Afganistán, not Colombia.
    // Pick Colombia by label so we get BM's country id (13) + origin_name.
    changed = this.applyDefaultColombiaCountry(form, 'searchinsurance[origin]') || changed;
    changed = this.applyDefaultColombiaCountry(form, 'searchinsurance[destiny]') || changed;
    if (ctx.nationality) {
      changed =
        this.setValueIfOption(form, 'searchinsurance[nationality]', ctx.nationality) || changed;
    }
    changed = this.applyInsuranceAges(form, ctx) || changed;
    return changed;
  }

  /**
   * One age field per insured person. Adults → 21; children → briefing age or 6.
   * BookingMotor shows/hides `.paxage` on passengers change (jQuery).
   */
  applyInsuranceAges(form: HTMLFormElement, ctx: SearchContext): boolean {
    const passengersSel = this.select(form, 'searchinsurance[passengers]');
    const pax = passengersSel
      ? this.num(passengersSel.value, 0)
      : Math.max(0, ctx.totalAdults + ctx.totalChildren);
    if (pax <= 0) return false;

    this.triggerInsurancePassengersChange(form);
    this.revealInsuranceAgeSlots(form, pax);
    const ages = this.expectedInsuranceAges(ctx, pax);
    let changed = false;
    for (let i = 0; i < pax; i++) {
      const age = ages[i];
      if (age === undefined || !Number.isFinite(age)) continue;
      changed = this.setInsuranceAge(form, i, age) || changed;
    }
    return changed;
  }

  expectedInsuranceAges(ctx: SearchContext, paxOverride?: number): number[] {
    let adults = Math.max(0, ctx.totalAdults || 0);
    let children = Math.max(0, ctx.totalChildren || 0);
    const pax = paxOverride ?? adults + children;
    // Passengers select may show N while briefing only has dates — treat extras as adults.
    if (pax > adults + children) {
      adults += pax - adults - children;
    } else if (pax > 0 && adults + children === 0) {
      adults = pax;
      children = 0;
    }
    const ages: number[] = [];
    for (let i = 0; i < adults; i++) ages.push(INSURANCE_ADULT_AGE);
    const childAges = ctx.childrenAges || [];
    for (let i = 0; i < children; i++) {
      const age = childAges[i];
      ages.push(
        age !== undefined && Number.isFinite(age) && age > 0
          ? age
          : INSURANCE_CHILD_DEFAULT_AGE
      );
    }
    // Safety: if split still short (edge context), pad with adult age.
    while (ages.length < pax) ages.push(INSURANCE_ADULT_AGE);
    return ages.slice(0, pax);
  }

  /** Fire BM's passenger→age-slot handler even when the count did not change. */
  triggerInsurancePassengersChange(form: HTMLFormElement): boolean {
    const sel = this.select(form, 'searchinsurance[passengers]');
    if (!sel) return false;
    const win = form.ownerDocument?.defaultView as
      | (Window & { jQuery?: (el: Element) => { trigger: (ev: string) => void } })
      | null;
    if (win?.jQuery) {
      try {
        win.jQuery(sel).trigger('change');
        return true;
      } catch {
        // fall through
      }
    }
    this.dispatch(sel);
    return true;
  }

  private setInsuranceAge(form: HTMLFormElement, index: number, age: number): boolean {
    const name = `searchinsurance[passengerages][${index}][age]`;
    const el = form.querySelector<HTMLInputElement>(`[name="${name}"]`);
    if (!el) return false;
    const val = String(Math.round(age));
    if (el.value.trim() === val) return false;
    el.value = val;
    this.dispatch(el);
    el.dispatchEvent(new Event('keyup', { bubbles: true }));
    el.dispatchEvent(new Event('blur', { bubbles: true }));
    return true;
  }

  private revealInsuranceAgeSlots(form: HTMLFormElement, count: number): void {
    for (let i = 0; i < 10; i++) {
      const wrap = form.querySelector<HTMLElement>(`[id="ages[${i}]"]`);
      if (!wrap) continue;
      if (i < count) {
        wrap.style.display = '';
        wrap.classList.remove('hidden');
      } else {
        wrap.style.display = 'none';
      }
    }
    // BM uses jQuery .show() on .paxage — mirror for slots without jQuery.
    form.querySelectorAll<HTMLElement>('.paxage').forEach((el, idx) => {
      el.style.display = idx < count ? '' : 'none';
    });
  }

  insuranceCountryLooksUnset(form: HTMLFormElement, selectName: string): boolean {
    const sel = this.select(form, selectName);
    if (!sel) return false;
    const text = sel.selectedOptions[0]?.text.replace(/\s+/g, ' ').trim() || '';
    if (!text) return true;
    if (/^afganist[aá]n$/i.test(text) || /^afghanistan$/i.test(text)) return true;
    return false;
  }

  /** Sets origin/destiny to Colombia only while BM still shows the A–Z default (Afganistán). */
  private applyDefaultColombiaCountry(form: HTMLFormElement, selectName: string): boolean {
    const sel = this.select(form, selectName);
    if (!sel) return false;
    if (!this.insuranceCountryLooksUnset(form, selectName)) return false;

    const colombia = Array.from(sel.options).find(
      (o) => o.text.replace(/\s+/g, ' ').trim().toLowerCase() === 'colombia'
    );
    if (!colombia) return false;
    if (sel.value === colombia.value) {
      this.syncInsuranceCountryUi(form, selectName, colombia.text.trim());
      return false;
    }

    sel.value = colombia.value;
    colombia.selected = true;
    this.dispatch(sel);
    this.syncInsuranceCountryUi(form, selectName, colombia.text.trim());
    return true;
  }

  private syncInsuranceCountryUi(form: HTMLFormElement, selectName: string, label: string): void {
    const hiddenName = selectName.includes('[destiny]')
      ? 'searchinsurance[destiny_name]'
      : 'searchinsurance[origin_name]';
    const hidden = this.field(form, hiddenName);
    if (hidden && hidden.value !== label) hidden.value = label;

    const sel = this.select(form, selectName);
    if (!sel?.id) return;
    const s2 = form.querySelector(`#select2-${sel.id}-container`);
    if (s2) {
      s2.textContent = label;
      s2.setAttribute('title', label);
    }
    const chosen = sel.parentElement?.querySelector('.chosen-single span');
    if (chosen) chosen.textContent = label;
  }

  private applyHotel(form: HTMLFormElement, ctx: SearchContext): boolean {
    let changed = false;

    if (ctx.checkIn) changed = this.setValue(form, 'searchhotel[checkin]', ctx.checkIn) || changed;
    if (ctx.checkOut) changed = this.setValue(form, 'searchhotel[checkout]', ctx.checkOut) || changed;
    if (ctx.nights !== undefined) {
      changed = this.setSelectClamped(form, 'searchhotel[nights]', ctx.nights) || changed;
    }

    const rooms = ctx.rooms.length > 0 ? ctx.rooms : [{ adults: ctx.totalAdults, children: ctx.totalChildren, childrenAges: ctx.childrenAges }];

    // Set the number of rooms first so the site renders each room block.
    changed = this.setSelectClamped(form, 'searchhotel[rooms]', rooms.length) || changed;
    const roomsSel = this.select(form, 'searchhotel[rooms]');
    const effectiveRooms = roomsSel ? this.num(roomsSel.value, 1) : rooms.length;

    for (let r = 0; r < effectiveRooms; r++) {
      const room = rooms[r];
      if (!room) continue;
      if (room.adults > 0) {
        changed = this.setSelectClamped(form, `searchhotel[listrooms][${r}][adults]`, room.adults) || changed;
      }
      changed = this.applyHotelRoomChildren(form, r, room, ctx, r === 0 ? 0 : this.ageOffset(rooms, r)) || changed;
    }

    if (ctx.nationality) {
      changed = this.setValueIfOption(form, 'searchhotel[nationality]', ctx.nationality) || changed;
    }

    return changed;
  }

  private ageOffset(rooms: { children: number }[], roomIndex: number): number {
    let n = 0;
    for (let i = 0; i < roomIndex; i++) n += rooms[i]?.children || 0;
    return n;
  }

  /**
   * Writes BM `searchhotel[listrooms][r][children]` and
   * `...[childrenages][a][age]` (the Edad selects next to each child).
   */
  private applyHotelRoomChildren(
    form: HTMLFormElement,
    roomIndex: number,
    room: { children: number; childrenAges?: number[] },
    ctx: SearchContext,
    ageOffset: number
  ): boolean {
    const kids = Math.max(0, room.children || 0);
    let changed = this.setSelectClamped(
      form,
      `searchhotel[listrooms][${roomIndex}][children]`,
      kids
    );
    if (kids <= 0) return changed;

    const fromRoom = room.childrenAges || [];
    const fromCtx = (ctx.childrenAges || []).slice(ageOffset, ageOffset + kids);
    const ages = fromRoom.length > 0 ? fromRoom : fromCtx;

    for (let a = 0; a < kids; a++) {
      const age = ages[a];
      if (age === undefined || !Number.isFinite(age)) continue;
      changed =
        this.setSelectClamped(
          form,
          `searchhotel[listrooms][${roomIndex}][childrenages][${a}][age]`,
          age
        ) || changed;
    }
    return changed;
  }

  /** Re-apply only child ages after BM has shown the Edad columns. */
  applyChildAges(form: HTMLFormElement, type: SearchFormType, ctx: SearchContext): boolean {
    if (type === 'hotel') {
      const rooms =
        ctx.rooms.length > 0
          ? ctx.rooms
          : [
              {
                adults: ctx.totalAdults,
                children: ctx.totalChildren,
                childrenAges: ctx.childrenAges,
              },
            ];
      let changed = false;
      let offset = 0;
      for (let r = 0; r < rooms.length; r++) {
        const room = rooms[r];
        if (!room) continue;
        changed = this.applyHotelRoomChildren(form, r, room, ctx, offset) || changed;
        offset += room.children || 0;
      }
      return changed;
    }
    if (type === 'transfer' && ctx.totalChildren > 0) {
      let changed = false;
      for (let a = 0; a < ctx.totalChildren; a++) {
        const age = ctx.childrenAges[a];
        if (age === undefined) continue;
        changed =
          this.setSelectClamped(form, `searchtransfer[childrenages][${a}][age]`, age) || changed;
      }
      return changed;
    }
    if (type === 'activity' && ctx.totalChildren > 0) {
      let changed = false;
      for (let a = 0; a < ctx.totalChildren; a++) {
        const age = ctx.childrenAges[a];
        if (age === undefined) continue;
        changed =
          this.setSelectClamped(form, `searchactivity[childrenages][${a}][age]`, age) || changed;
      }
      return changed;
    }
    if (type === 'insurance') {
      return this.applyInsuranceAges(form, ctx);
    }
    return false;
  }

  // -------------------------------------------------------------------------
  // Low-level field helpers
  // -------------------------------------------------------------------------

  private field(form: HTMLFormElement, name: string): HTMLInputElement | HTMLSelectElement | null {
    // Field names contain brackets but no quotes, so a quoted attribute
    // selector is valid without escaping.
    return form.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="${name}"]`);
  }

  private select(form: HTMLFormElement, name: string): HTMLSelectElement | null {
    const el = this.field(form, name);
    return el && el.tagName === 'SELECT' ? (el as HTMLSelectElement) : null;
  }

  private value(form: HTMLFormElement, name: string): string | undefined {
    // Radios: return the checked one.
    const els = form.querySelectorAll<HTMLInputElement>(`[name="${name}"]`);
    if (els.length > 1 && els[0].type === 'radio') {
      const checked = Array.from(els).find((e) => e.checked);
      return checked?.value;
    }
    const el = this.field(form, name);
    return el ? el.value : undefined;
  }

  private setValue(form: HTMLFormElement, name: string, value: string): boolean {
    const el = this.field(form, name);
    if (!el || el.value === value) return false;
    el.value = value;
    this.dispatch(el);
    return true;
  }

  /** Sets a value only if the select actually offers it as an option. */
  private setValueIfOption(form: HTMLFormElement, name: string, value: string): boolean {
    const sel = this.select(form, name);
    if (!sel) return this.setValue(form, name, value);
    const hasOption = Array.from(sel.options).some((o) => o.value === value);
    if (!hasOption || sel.value === value) return false;
    sel.value = value;
    this.dispatch(sel);
    return true;
  }

  /** Sets a numeric select to `desired`, clamped to the max option it offers. */
  private setSelectClamped(form: HTMLFormElement, name: string, desired: number): boolean {
    const sel = this.select(form, name);
    if (!sel) return false;

    const numericOptions = Array.from(sel.options)
      .map((o) => Number(o.value))
      .filter((n) => Number.isFinite(n));
    if (numericOptions.length === 0) return false;

    const max = Math.max(...numericOptions);
    const min = Math.min(...numericOptions);
    const clamped = Math.max(min, Math.min(desired, max));
    const target = String(clamped);

    const hasOption = Array.from(sel.options).some((o) => o.value === target);
    if (!hasOption || sel.value === target) return false;

    sel.value = target;
    this.dispatch(sel);
    return true;
  }

  private dispatch(el: HTMLElement): void {
    // Use the element's own window so this works both in the extension and in
    // JSDOM tests (where Event isn't a Node global).
    const view = el.ownerDocument?.defaultView as (Window & typeof globalThis) | null;
    const EventCtor = view?.Event ?? (typeof Event !== 'undefined' ? Event : null);
    if (!EventCtor) return;
    el.dispatchEvent(new EventCtor('input', { bubbles: true }));
    el.dispatchEvent(new EventCtor('change', { bubbles: true }));
  }

  private num(raw: string | undefined, fallback: number): number {
    const n = Number(raw);
    return Number.isFinite(n) ? n : fallback;
  }

  private optionalNum(raw: string | undefined): number | undefined {
    if (raw === undefined || raw === '') return undefined;
    const n = Number(raw);
    return Number.isFinite(n) ? n : undefined;
  }
}
