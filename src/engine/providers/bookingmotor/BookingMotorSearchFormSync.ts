import { RoomOccupancy, SearchContext } from '../../core/types';

export type SearchFormType = 'hotel' | 'transfer' | 'activity' | 'insurance';

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
    for (const type of ['hotel', 'transfer', 'activity', 'insurance'] as SearchFormType[]) {
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
      const children = this.num(childrenSel?.value ?? '0', 0);
      const childrenAges: number[] = [];
      for (let a = 0; a < children; a++) {
        const ageSel = this.select(form, `searchhotel[listrooms][${roomIndex}][childrenages][${a}][age]`);
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
    if (ctx.nationality) {
      changed =
        this.setValueIfOption(form, 'searchinsurance[nationality]', ctx.nationality) || changed;
    }
    return changed;
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
      if (room.children > 0) {
        this.setSelectClamped(form, `searchhotel[listrooms][${r}][children]`, room.children);
        const childrenSel = this.select(form, `searchhotel[listrooms][${r}][children]`);
        const effChildren = childrenSel ? this.num(childrenSel.value, 0) : 0;
        for (let a = 0; a < effChildren; a++) {
          const age = room.childrenAges[a];
          if (age === undefined) continue;
          this.setSelectClamped(form, `searchhotel[listrooms][${r}][childrenages][${a}][age]`, age);
        }
        changed = true;
      }
    }

    if (ctx.nationality) {
      changed = this.setValueIfOption(form, 'searchhotel[nationality]', ctx.nationality) || changed;
    }

    return changed;
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
