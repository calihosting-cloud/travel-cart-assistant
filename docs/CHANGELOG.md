# Changelog — Travel Cart Assistant

Registro de cambios del proyecto. **Más reciente arriba.**

Formato por entrada:

```markdown
## YYYY-MM-DD — Título corto

- **Added** / **Changed** / **Fixed** / **Docs**: descripción en una línea (por qué / efecto).
```

---

## 2026-07-18 — Redondeo aparte + texto WhatsApp visible (v1.0.3)

- **Changed**: campo **Redondeo** separado de **Mayor valor cobrado** (este último queda para ajustes del asesor). El botón Redondear solo llena Redondeo.
- **Changed**: cotización WhatsApp muestra el texto verde listo para pegar al abrir la sección; Copiar con fallback Ctrl+C.

## 2026-07-18 — Fix: content.js IIFE (v1.0.2)

- **Fixed**: el content script se construye como **IIFE autocontenido** (sin `import` a `quoteConfig.js`). `type: module` no bastaba en algunos Chrome; build en dos pasos (`vite` + `vite.content.config.ts`). Versión `1.0.2`.

## 2026-07-18 — Fix: extensión no cargaba en BookingMotor

- **Fixed**: `content.js` importaba `quoteConfig.js` (code-split de Vite) sin `"type": "module"` en el manifest → el content script fallaba al parsear y el carrito no aparecía. Se añade `"type": "module"` y versión `1.0.1`.

## 2026-07-18 — Cotización WhatsApp + config incluye/no incluye

- **Added**: líneas de cotización (incluye / no incluye / políticas) en `chrome.storage` con defaults GT; editables en popup **Config**.
- **Added**: sección **Cotización WhatsApp** en el carrito: checkboxes, vista previa y **Copiar** (gran total + plantilla con emojis).
- **Added**: pestaña **Cambios** en el popup (lee `CHANGELOG.md`).
- **Docs**: CONTEXT y changelog; PDF/PostgreSQL quedan para después.

## 2026-07-18 — Carrito GT: branding, dominios, mayor valor y redondeo

- **Changed**: botones de captura pasan a **Agregar al Carrito GT** (XNet/Despegar; BookingMotor muestra `+ 🛒 GT` + title).
- **Added**: popup de la extensión (`public/popup.html`) con pestaña de dominios habilitados (BookingMotor, Despegar, XNet, local).
- **Changed**: fee único **Mayor valor cobrado** (default 0); se elimina fee de ejemplo 2.
- **Added**: botón **Redondear** en el total — sube a la siguiente decena de mil (ej. 1.986.700 → 1.990.000) y escribe el excedente en Mayor valor cobrado / línea sobre el total.
- **Docs**: CONTEXT actualizado (fees + popup).

## 2026-07-18 — Log de cambios del proyecto

- **Docs**: se crea este changelog (`docs/CHANGELOG.md`) y regla de Cursor para documentar cada cambio relevante.
- **Docs**: se enlaza el changelog desde `README.md` y `docs/CONTEXT.md`.

## 2026-07-18 — WIP (sin commit): vuelos Despegar/XNet y Sync

Trabajo en curso según working tree (aún no consolidado en commit):

- **Added**: lectores/inyectores de vuelos para Despegar y XNet (`DespegarFlightReader`, `DespegarFlightUIInjector`, `XNetFlightReader`, `XNetFlightUIInjector`).
- **Added**: sincronización de búsqueda entre pestañas BookingMotor (`SearchSyncController`, `BookingMotorSearchFormSync`).
- **Added**: scraper Playwright (`scraper/`) y fixtures HTML de Despegar/Santur.
- **Changed**: `content.ts`, `bridge.ts`, `types.ts`, `CartSidebar.ts`, `manifest.json`.

## 2026-07-10 — Fase carrito, traslados, fees y scraper

Estado documentado en README/CONTEXT (post–commit inicial; parte puede estar solo en docs/working tree):

- **Added**: captura de traslados (`#list-transfer-items`) con botón por tarjeta.
- **Added**: carrito lateral Shadow DOM con persistencia `chrome.storage.local`.
- **Added**: resumen de búsqueda en encabezado del carrito (`tce_last_search`).
- **Added**: scaffold de fees editables en el total (`tce_fees`).
- **Added**: scraper Playwright para capturar páginas vivas de BookingMotor.
- **Changed**: fallback DOM si el bridge no entrega `window.data` (evita “0 noches · 0 adultos”).
- **Docs**: `docs/CONTEXT.md` como contexto operativo para agentes/devs.

## 2026-07-10 — Commit inicial

- **Added**: extensión MV3 base para BookingMotor: extracción de hoteles (JS + DOM), inyección **+ 🛒** por tarifa, build Vite, fixtures y tests scratch.
- **Docs**: README y guía de setup de GitHub.
