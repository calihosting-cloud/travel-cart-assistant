export type PageKind = 'hotel_results' | 'transfer_results' | 'hotel_form' | 'transfer_form' | 'unknown';

export interface SelectOptionSnapshot {
  value: string;
  text: string;
  selected: boolean;
}

export interface FieldSnapshot {
  name: string;
  id: string;
  tag: string;
  type: string;
  value: string;
  placeholder: string;
  visible: boolean;
  selector: string;
  options?: SelectOptionSnapshot[];
}

export interface FormSnapshot {
  id: string;
  name: string;
  action: string;
  visible: boolean;
  fields: FieldSnapshot[];
  outerHtml: string;
}

export interface SelectorHints {
  hotelResults?: string;
  transferResults?: string;
  hotelForm?: string;
  transferForm?: string;
}

export interface CaptureArtifacts {
  screenshot: string;
  captureJson: string;
  formHtml?: string;
  resultsHtml?: string;
}

export interface PageCapture {
  capturedAt: string;
  url: string;
  title: string;
  pageKind: PageKind;
  windowData: unknown;
  forms: FormSnapshot[];
  selectorHints: SelectorHints;
  artifacts: CaptureArtifacts;
}
