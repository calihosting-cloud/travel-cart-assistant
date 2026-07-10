import { DOMReader } from './DOMReader';
import { JSDataReader } from './JSDataReader';

export abstract class Extractor<TJS, TDOM, TProduct> {
  protected jsReader: JSDataReader<TJS>;
  protected domReader: DOMReader<TDOM>;

  constructor(jsReader: JSDataReader<TJS>, domReader: DOMReader<TDOM>) {
    this.jsReader = jsReader;
    this.domReader = domReader;
  }

  /**
   * Orchestrates extraction from both memory data (JS) and physical UI structure (DOM)
   * to compile the final unified domain products list.
   */
  abstract extract(rawJSPayload: any, domContainer: Document | HTMLElement): TProduct[];
}
