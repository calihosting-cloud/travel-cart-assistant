---
name: architecture
description: Arquitectura real de Travel Cart Assistant. Usar al decidir dónde va un cambio, al añadir un proveedor u producto, al tocar el content script, el carrito, storage, TRM, cotización o la documentación de PostgreSQL.
---

# Arquitectura

Carrito de compras para asesores de viajes (Grupo Stravel). Es una extensión Chrome MV3 que lee resultados de OTAs, inyecta **+ 🛒 GT** y acumula una cotización en un panel lateral. No reserva ni cobra: el pago sigue en el sitio del proveedor.

Dueño de cambios de motor, providers y storage: **Leonardo el Backend**. UI: **Camila Frontend** con plan de **Andrés el Diseñador** y criterio de **Catalina Producto UX**. Esquema PostgreSQL documentado: **Gonzalo el DBA**. Build y empaquetado: **Diego DevOps**.

## Capas

```
public/manifest.json          matches, permisos, popup, service worker
src/background/background.ts  TRM (alarma 360 min) y eco de logs
src/content/content.ts        orquesta por host y tipo de página
src/content/bridge.ts         main world: lee `data` y postMessage
src/content/searchSync.ts     formulario BookingMotor entre pestañas
src/engine/core/              Extractor, DOMReader, JSDataReader, UIInjector, types
src/engine/observer/          PageObserver (MutationObserver, debounce 300 ms)
src/engine/providers/         un directorio por OTA
src/ui/CartSidebar.ts         Shadow DOM, totales, fees, WhatsApp, historial
src/ui/QuoteBuilder.ts        texto de cotización
src/shared/                   storage helpers (TRM, TA, historial, líneas, log)
src/popup/ + public/popup.*   configuración de la extensión
src/log/ + public/log.html    visor de tce_app_log
scraper/                      Playwright contra BookingMotor (Node, no va en dist/)
scratch/                      comprobaciones manuales con tsx + jsdom
docs/database/                esquema y runbook PostgreSQL (scripts Python no están en este repo)
```

`docs/CONTEXT.md` describe sobre todo BookingMotor hotel/traslado. El código ya cubre actividades, seguros y vuelos (Despegar, XNet, Avianca, Wingo, JetSMART). Si el doc y el código discrepan, manda el código y se actualiza el doc en el mismo cambio.

## Flujo de datos

1. El manifest inyecta `content.js` en `document_end` en los hosts de `public/manifest.json`.
2. `content.ts` elige un init: Despegar, XNet, Avianca, Wingo, JetSMART, o si no, BookingMotor.
3. BookingMotor: `bridge.js` (web accessible solo en Grupo Stravel, localhost, 127.0.0.1 y `file:`) lee el binding léxico `data` y envía `TCE_BRIDGE_DATA`. El extractor junta ese JSON con el DOM. `PageObserver` sobre `#content` vuelve a pedir datos e inyectar.
4. El injector pinta el botón y devuelve ids (`hotelId` + `rateIndex`, o un id de tarjeta). No parsea el precio.
5. El handler arma un `CartItem` (con `sourceUrl = location.href`) y llama `CartSidebar.addItem`.
6. El carrito persiste en `chrome.storage.local` y se repinta. Otras pestañas escuchan `chrome.storage.onChanged`.

Vuelos no usan `detectPageType()`. Cada OTA tiene `is*Host()` (hostname o, en fixtures `file://`, un selector) y un `MutationObserver` propio porque las páginas son SPA.

### BookingMotor (`detectPageType`)

| Selector | Tipo |
|---|---|
| `#list-hotel-items` | `hotel` |
| `#list-transfer-items` | `transfer` |
| `#list-activity-items`, `.list-results.list-activity` | `activity` |
| `#list-insurance-items`, `.bm-insurance-list` | `insurance` |

`SearchSyncController` guarda `tce_last_search` (TTL 12 h) desde formularios `searchhotel[...]` / `searchtransfer[...]`. No escribe el destino del traslado: `pickup` / `dropoff` salen del autocompletado del backend del OTA.

### Dónde va código nuevo

- Otro producto BookingMotor: tipos + reader/extractor/injector + rama en `detectPageType` / `runExtractionAndInjection` + render en `CartSidebar`.
- Otro OTA de vuelos: `src/engine/providers/<nombre>/`, `is*Host` + `init*` en `content.ts`, match en `public/manifest.json`, y la lista visible del popup (`public/popup.html`, panel Dominios). Hoy el popup lista BookingMotor, Despegar, XNet, Avianca y Wingo; el manifest y `isJetSmartHost()` también cubren JetSMART. TODO: confirmar con Rodrigo si el popup debe mostrar JetSMART.
- Cotización (texto, líneas incluye/no incluye, historial): `src/ui/QuoteBuilder.ts` y `src/shared/quote*.ts`. No meter esa lógica en el reader del OTA.
- TRM y moneda de vista: `src/shared/trm.ts` y los métodos `toDisplay` / `getItemLineTotal` de `CartSidebar`. El service worker refresca la TRM; el content script no debe hacer `fetch` a `dolar-colombia.com` por su cuenta si ya existe `TCE_REFRESH_TRM`.

## Integraciones

- **Storage:** solo `chrome.storage.local`. No hay backend propio de la extensión. Keys de carrito y cotización están en `CartSidebar` (`tce_cart_items`, `tce_last_search`, `tce_fees`) y en `src/shared/` (`tce_trm`, `tce_trm_suplemento`, `tce_display_currency`, `tce_ta_config`, `tce_ta_selection`, `tce_quote_lines`, `tce_quote_history`, `tce_quote_seq`, `tce_pending_quote`, `tce_advisor_name`, `tce_client_name`, `tce_quote_usd_equiv`, `tce_hotels_as_options`, `tce_app_log`).
- **TRM:** `GET https://www.dolar-colombia.com/` desde el service worker (`host_permissions` solo ese origen). Suplemento por defecto `150` COP (`DEFAULT_TRM_SUPLEMENTO`). Manual del día no se pisa salvo `force`.
- **OTAs:** lectura del DOM y, en BookingMotor, del JSON de página. No hay API firmada en este repo.
- **Scraper Node:** Playwright (`scraper/`). Credenciales `BM_URL`, `BM_EMAIL`, `BM_PASSWORD` en `.env`. Sesión en `scraper/.session/` (gitignored).
- **PostgreSQL:** documentado en `docs/database/` (52 tablas, vistas `latest`, bloqueos Wingo/JetSMART, inventario). Los `python scripts/...` del runbook **no están** en este repositorio. La extensión todavía no lee ni escribe esa base. Cotizaciones en PostgreSQL figuran como pendiente en `README.md`. TODO: confirmar con Rodrigo el repo donde viven esos scripts y la cadena de conexión.

## Build

`npm run build` = `tsc` + Vite del service worker/bridge/popup/log + Vite IIFE de `content.js`. Salida `dist/` (gitignored). `npm run dev` solo hace watch del config principal: no recompila `content.js`. Para probar el content script hace falta `npm run build`.

Manifest y HTML/CSS de `public/` los copia Vite al vaciar `dist/` en el primer build. El segundo build (`emptyOutDir: false`) no debe borrar `content.js` ni los estáticos ya emitidos.

## Decisiones que no se reabren sin motivo

- Extraer (JS + DOM) e inyectar botones son pasos distintos.
- Idempotencia con `data-tce-injected`.
- Shadow DOM cerrado para que el CSS del OTA no rompa el carrito, y al revés.
- Ítems viejos sin `type` se migran a `hotel` al cargar.
- Fees y ajustes de línea se guardan en COP; la vista COP | USD solo convierte.
- Moneda sin tasa (p. ej. CLP) conserva código y monto nativos (`toDisplay`).
- Feedback visual en el carrito, nunca `alert()`.
