/** Must match `QUOTE_PDF_HTML_KEY` in QuotePdf.ts */
const QUOTE_PDF_HTML_KEY = 'tce_quote_pdf_html';

/**
 * Loads the HTML saved by Descargar PDF and shows it on the extension page.
 * Print only when the advisor clicks «Imprimir / Guardar PDF».
 *
 * Uses DOMParser (not document.write): extension CSP blocks inline onclick,
 * and document.write would wipe this script before we can bind the button.
 */
async function main(): Promise<void> {
  const stored = await chrome.storage.local.get(QUOTE_PDF_HTML_KEY);
  const html = stored[QUOTE_PDF_HTML_KEY];
  if (typeof html !== 'string' || !html.trim()) {
    document.body.innerHTML =
      '<p style="font-family:system-ui;padding:24px;color:#334155">No hay cotización para mostrar. Vuelve al carrito y pulsa <strong>Descargar PDF</strong>.</p>';
    return;
  }

  const parsed = new DOMParser().parseFromString(html, 'text/html');
  document.title = parsed.title || 'Cotización PDF';

  document.head.querySelectorAll('style[data-tce-quote-pdf]').forEach((el) => el.remove());
  parsed.head.querySelectorAll('style').forEach((styleEl) => {
    const clone = document.createElement('style');
    clone.setAttribute('data-tce-quote-pdf', '1');
    clone.textContent = styleEl.textContent;
    document.head.appendChild(clone);
  });

  document.body.replaceChildren(
    ...Array.from(parsed.body.childNodes).map((n) => document.importNode(n, true))
  );

  document.getElementById('tce-pdf-print')?.addEventListener('click', () => {
    window.print();
  });
}

void main();
