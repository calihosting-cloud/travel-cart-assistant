export class PageObserver {
  private observer: MutationObserver | null = null;
  private debounceTimeout: number | null = null;

  constructor(
    private targetSelector: string,
    private callback: () => void,
    private debounceMs: number = 300
  ) {}

  /**
   * Starts observing the target selector. If it doesn't exist yet,
   * it observes the body until the selector is added, then binds to it.
   */
  start() {
    const target = document.querySelector(this.targetSelector);
    if (!target) {
      this.observer = new MutationObserver((_mutations, obs) => {
        const targetEl = document.querySelector(this.targetSelector);
        if (targetEl) {
          obs.disconnect(); // Stop body-level observation
          this.setupTargetObserver(targetEl);
        }
      });
      this.observer.observe(document.body, { childList: true, subtree: true });
      return;
    }
    this.setupTargetObserver(target);
  }

  private setupTargetObserver(target: Element) {
    this.observer = new MutationObserver(() => {
      this.triggerCallback();
    });

    this.observer.observe(target, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-loaded', 'style', 'class'] // Triggers on element loading status or visible updates
    });

    // Run an initial trigger as elements might already be present
    this.triggerCallback();
  }

  private triggerCallback() {
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }
    this.debounceTimeout = window.setTimeout(() => {
      this.callback();
    }, this.debounceMs);
  }

  /**
   * Stop observing and clean up timeouts
   */
  stop() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
      this.debounceTimeout = null;
    }
  }
}
