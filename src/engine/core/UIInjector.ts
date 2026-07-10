export abstract class UIInjector {
  /**
   * Scans the container and injects "Add to Cart" buttons next to product booking elements.
   * productId identifies the product; optionIndex is used for multi-rate products (e.g. hotel room rows).
   */
  abstract injectButtons(
    container: Document | HTMLElement,
    onAddClick: (productId: string, optionIndex?: number) => void
  ): void;
}
