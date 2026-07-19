import { RoomOccupancy, SearchContext } from '../../core/types';

export type SearchFormType = 'hotel' | 'transfer';

/**
 * Reads and writes BookingMotor search forms (`#search_hotel`, `#search_transfer`).
 *
 * The class is pure DOM logic: it does not touch storage nor attach listeners.
 * A form is only usable when it's actually rendered (visible tab), which is what
 * `getVisibleForm` checks via `offsetParent`.
 */
export class BookingMotorSearchFormSync {
  private static readonly FORM_SELECTORS: Record<SearchFormType, string> = {
    hotel: '#search_hotel, form[name="search_hotel"]',
    transfer: '#search_transfer, form[name="search_transfer"]',
  };

  getForm(doc: Document, type: SearchFormType): HTMLFormElement | null {
    return doc.querySelector<HTMLFormElement>(BookingMotorSearchFormSync.FORM_SELECTORS[type]);
  }

  /** Returns the form that is currently rendered on screen (active tab), if any. */
  getVisibleForm(doc: Document): { type: SearchFormType; form: HTMLFormElement } | null {
    for (const type of ['hotel', 'transfer'] as SearchFormType[]) {
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
    return type === 'hotel' ? this.captureHotel(form) : this.captureTransfer(form);
  }

  private captureHotel(form: HTMLFormElement): SearchContext {
    const rooms: RoomOccupancy[] = [];
    let roomIndex = 0;

    // Iterate room blocks while an adults select exists for the index.
    while (true) {
      const adultsSel = this.select(form, `searchhotel[listrooms][${roomIndex}][adults]`);
      if (!adultsSel) break;

      const roomBlock = form.querySelector<HTMLElement>(`[id="room[${roomIndex}]"]`);
      // Only count rooms that are actually active (visible or explicitly the first one).
      const roomActive = roomIndex === 0 || (roomBlock ? this.isVisible(roomBlock) : true);
      if (!roomActive) break;

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
    return type === 'hotel' ? this.applyHotel(form, ctx) : this.applyTransfer(form, ctx);
  }

  private applyTransfer(form: HTMLFormElement, ctx: SearchContext): boolean {
    let changed = false;

    if (ctx.checkIn) {
      changed = this.setValue(form, 'searchtransfer[checkin]', ctx.checkIn) || changed;
    }

    // Only touch the return date if the form is in round-trip mode already.
    const roundTrip = this.value(form, 'searchtransfer[type]') === '2';
    if (roundTrip && ctx.checkOut) {
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
