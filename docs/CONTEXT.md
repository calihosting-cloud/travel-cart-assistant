# Travel Capture Engine — Contexto para desarrollo

Este documento resume el estado del proyecto para que agentes de IA o desarrolladores puedan retomar el trabajo sin releer todo el código.

**Historial de cambios:** [CHANGELOG.md](./CHANGELOG.md) (añadir entrada en cada cambio relevante).

## Objetivo

Extensión Chrome MV3 que inyecta botones **+ 🛒** en páginas de resultados de BookingMotor, extrae datos estructurados de cada producto/tarifa, y los acumula en un carrito lateral persistente.

**Proveedor actual:** BookingMotor (`reservas.grupostravel.com`)

## Estructura de archivos

```
Travel Cart Assistant/
├── public/manifest.json       # Manifest MV3 (copiado a dist/ en build)
├── src/
│   ├── background/background.ts
│   ├── content/
│   │   ├── content.ts         # Entry point: routing hotel vs transfer
│   │   └── bridge.ts          # Main-world: lee window.data
│   ├── ui/CartSidebar.ts      # Panel lateral (Shadow DOM)
│   └── engine/
│       ├── core/
│       │   ├── types.ts       # HotelProduct, TransferProduct, CartItem union
│       │   ├── Extractor.ts
│       │   ├── DOMReader.ts
│       │   ├── JSDataReader.ts
│       │   └── UIInjector.ts
│       ├── observer/PageObserver.ts
│       └── providers/bookingmotor/
│           ├── BookingMotorExtractor.ts
│           ├── BookingMotorDOMReader.ts
│           ├── BookingMotorJSReader.ts
│           ├── BookingMotorUIInjector.ts
│           ├── BookingMotorTransferExtractor.ts
│           ├── BookingMotorTransferDOMReader.ts
│           ├── BookingMotorTransferJSReader.ts
│           └── BookingMotorTransferUIInjector.ts
├── scratch/
│   ├── test_parser.ts         # Test hoteles con ejemplobusqueda.html
│   └── test_transfer_parser.ts
├── ejemplobusqueda.html       # Fixture: hoteles
├── traslados.html             # Fixture: traslados
└── dist/                      # Output del build (no commitear)
```

## Detección de tipo de página

`content.ts` → `detectPageType()`:

| Selector | Tipo | Observer target |
|----------|------|-----------------|
| `#list-hotel-items` | `hotel` | `#content` |
| `#list-transfer-items` | `transfer` | `#content` |

## Bridge (acceso a `window.data`)

BookingMotor expone `let data = JSON.parse('...')` en el main world. El content script no puede leerlo directamente (isolated world).

- `bridge.js` se inyecta como script en la página.
- Envía `postMessage` con `{ source: 'tce-bridge', type: 'TCE_BRIDGE_DATA', payload: <data> }`.
- El content script cachea el payload y re-solicita con `TCE_REQUEST_DATA` en mutaciones del DOM.

> ⚠️ **Importante (`let data` ≠ `window.data`):** `let`/`const` a nivel global crean un *binding léxico* que NO se expone como `window.data`. Por eso el bridge lee el identificador **`data` a secas** (accesible entre scripts clásicos del mismo realm), con `window.data` solo como fallback para páginas antiguas con `var data`. Confirmado en vivo: `typeof window.data === 'undefined'` pero `typeof data === 'object'` con `data.searchhotel` presente. Diagnóstico reproducible: `tsx scraper/diag.ts <url>`.

### Claves JS por producto

| Producto | Clave en `window.data` | Campos principales |
|----------|------------------------|-------------------|
| Hotel | `searchhotel` | checkin, checkout, nights, rooms, listrooms[] |
| Traslado | `searchtransfer` | from, to, pickup, dropoff, type (1=ida, 2=ida/vuelta), checkin, checkintime, adults, children |

## Hoteles — selectores DOM

| Elemento | Selector |
|----------|----------|
| Contenedor lista | `#list-hotel-items` |
| Bloque hotel | `.list-results.list-hotel` |
| ID hotel | `#original_box_hotel_{id}` o `.add-compare[data-id]` |
| Tabla tarifas | `table.list-results-rooms` |
| Fila tarifa (desktop) | `tbody tr` con `≥5 td.hidden-phone-table` |
| Botón reserva | `a.btn-success` en `td.hidden-phone-table.textcenter` y `td.show-phone-table` |
| Idempotencia inyección | `data-tce-injected` en `<tr>`, clase `.btn-tce-add-cart` |

**Granularidad:** una tarifa = una fila de tabla. `rateIndex` debe alinearse entre `BookingMotorDOMReader` y `BookingMotorUIInjector`.

## Traslados — selectores DOM

| Elemento | Selector |
|----------|----------|
| Contenedor lista | `#list-transfer-items` |
| Bloque traslado | `.list-results.list-transfer` |
| Nombre | `h4.name` |
| Vehículo | `p.address span` |
| Tipo (Private, etc.) | texto `(Private)` junto al nombre |
| Detalle tramos | `.list-results-content` (IN/OUT, fechas, horas) |
| Precio | `.price em.from` → `USD <span>112.84</span>` |
| Proveedor | `.list-from-generic .text-center p` |
| Botón reserva | `a.btn-success.btn-book` |
| ID traslado | último segmento URL: `/transfer-reservation/fill-data/{code}/{transferId}` |

**Granularidad:** un traslado = una tarjeta. Un solo botón por bloque.

## Sincronización de búsqueda entre pestañas (`SearchSyncController`)

Página `/es/backoffice/book/new` ("Nueva Reserva"): al cambiar de pestaña (Hoteles → Traslados) los formularios están vacíos. `SearchSyncController` (`src/content/searchSync.ts`) resuelve esto:

- **Captura**: escucha `change`/`input` en campos `searchhotel[...]`/`searchtransfer[...]` del formulario visible (debounce 500ms) y guarda un `SearchContext` en `chrome.storage.local` key `tce_last_search` (TTL 12h).
- **Restaura**: al hacerse visible un formulario de otro tipo, vacío y sin `data-tce-prefilled`, precarga fechas, pasajeros, edades de niños y nacionalidad, y muestra un banner `.tce-prefill-note`.
- **Lectura/escritura DOM**: `BookingMotorSearchFormSync` (`providers/bookingmotor/`). Detecta el formulario visible con `offsetParent`; los `<select>` numéricos (adultos/niños/habitaciones/noches) se ajustan (clamp) al máximo que ofrece la página; disparar `change` deja que el JS del sitio genere los sub-campos dinámicos (edades, habitaciones).

**Limitación de diseño:** el destino (hotel/ciudad) NO se auto-escribe. Los traslados requieren IDs de `pickup`/`dropoff` que vienen del autocompletado del backend y no se pueden derivar del nombre del hotel. Se guarda solo como `destinationText` y se muestra como pista en el banner.

Campos comunes mapeados: `checkin`/`checkout`, adultos (suma de habitaciones en hotel → `adults` en traslado), niños + edades (concatenadas), `nights`, `nationality`.

## Modelos de dominio (`types.ts`)

### `HotelProduct`

Hotel con array `rates: HotelRoomRate[]`. Cada rate tiene roomType, boardBasis, price, currency, supplierName, status, bookingUrl.

### `TransferProduct`

Traslado con `legs: TransferLeg[]` (direction in/out), from/to del contexto JS, price/currency del DOM.

### `CartItem` (unión discriminada)

```typescript
type CartItem = HotelCartItem | TransferCartItem;
// HotelCartItem.type === 'hotel'
// TransferCartItem.type === 'transfer'
```

Items antiguos en storage sin `type` se migran a `hotel` en `CartSidebar.loadFromStorage()`.

## UI Injector

Clase abstracta `UIInjector.injectButtons(container, onAddClick)`:

- Hoteles: `onAddClick(hotelId, rateIndex)`
- Traslados: `onAddClick(transferId)` (sin rateIndex)

Botón: `btn btn-xs btn-info btn-tce-add-cart`, HTML `+ 🛒`, estilos inline compactos.

## Carrito lateral (`CartSidebar`)

- Shadow DOM cerrado, z-index alto, panel fijo 340px derecha.
- Persistencia: `chrome.storage.local`:
  - `tce_cart_items` → productos del carrito.
  - `tce_last_search` → `SearchContext` (compartido con `SearchSyncController`).
  - `tce_fees` → valores de los fees (`Record<feeId, number>`).
  - `tce_client_name` → cliente de la cotización (historial; no WhatsApp).
  - `tce_pending_quote` / `tce_quote_seq` → número de cotización de la sesión (`CAR001`…).
- **Pestañas internas** (con items): **Productos** · **Total** · **WhatsApp** · **Historial**.
- **Encabezado:** resumen (origen desde vuelo si hay + destino/fechas/pax) y campo **CLIENTE:**.
- Cada ítem puede tener `sourceUrl` (página al agregar) y un icono **↗** para reabrir esa búsqueda.
- **Pendiente:** cambiar de overlay a layout push (margin-right en body).

### Ajustes por ítem (Productos)

Cada `CartItem` puede guardar `mayorValor` y `redondeo` (internamente COP). **Total del ítem** = precio base convertido a la **vista** activa (COP|USD con TRM) + ajustes. En la barra TRM hay toggle **COP | USD** para unificar el carrito.

### Fees (cargos adicionales)

Bloque de cargos editables en la pestaña **Total** (gran total; no sustituye los ajustes por ítem).

- Definición en `CartSidebar.ts`:
  ```ts
  const FEE_DEFINITIONS: FeeDefinition[] = [
    { id: 'mayor_valor_cobrado', label: 'Mayor valor cobrado', defaultValue: 0 },
  ];
  ```
- **Redondear:** calcula el excedente de `(subtotal items + mayor valor cobrado)` hasta la siguiente decena de mil y lo guarda en el campo **Redondeo** (no modifica Mayor valor cobrado). Ej.: items `1.950.000` + mayor `36.700` = `1.986.700` → redondeo `3.300` → total `1.990.000`.
- **Mayor valor cobrado:** ajuste manual del asesor (ítems faltantes / extras).
- **Redondeo:** solo el excedente del botón Redondear (editable también a mano).
- Cada fee es un `<input type="number">` (mín. 0). Al editar, se guarda en `tce_fees` y se actualiza **solo** `.tce-totals` (para no perder el foco del input).
- **Totales:** subtotal (ítems con sus ajustes) + mayor valor (si > 0) + redondeo (si > 0) + TA → Total en moneda primaria.

### Popup de la extensión

`public/popup.html` + `src/popup/popup.ts`:

| Pestaña | Contenido |
|---------|-----------|
| **Config** | CRUD de líneas *incluye / no incluye / políticas* (`tce_quote_lines`). Defaults GT; se pueden restaurar. |
| **Dominios** | Hosts donde corre el carrito GT. |
| **Cambios** | Contenido de `CHANGELOG.md` (copia en `public/` para el popup). |

### Cotización WhatsApp

Pestaña **WhatsApp** del carrito:

- Checkboxes de las líneas habilitadas (sincronizadas con Config).
- Chulito **Incluir conversión COP ↔ USD** (apagado por defecto).
- **Copiar WhatsApp** / **Actualizar texto**: genera texto (`DESTINO …`, incluye/no incluye, vuelos/servicios/hotel, notas). Ref `CAR###`.
- Al copiar o vaciar se guarda/actualiza el **Historial** (mismo `CAR###` no se duplica; cliente sí se guarda ahí).
- Motor: `src/ui/QuoteBuilder.ts` + `src/shared/quoteHistory.ts` + defaults en `src/shared/quoteConfig.ts`.
- **Pendiente:** export PDF; persistencia PostgreSQL.

## Build

- Vite multi-entry: `background.js`, `content.js`, `bridge.js`, `popup.js` → `dist/`
- `tsc` valida tipos; `rootDir: src`, `outDir: dist`
- Manifest en `public/` — verificar que Vite lo copie (si no, copiar manualmente a dist)

## Fixtures de prueba

| Archivo | URL original | Productos en página 1 |
|---------|--------------|----------------------|
| `ejemplobusqueda.html` | `/list-hotel/...` | 10 hoteles, 46 botones (23 tarifas × desktop+mobile) |
| `traslados.html` | `/list-transfer/...` | 10 traslados, 10 botones |

Tests extraen `let data = JSON.parse('...')` con regex y usan JSDOM.

## Scraper con Playwright (`scraper/`)

Para capturar páginas **vivas** de BookingMotor (mejor que "Guardar como", porque corre el JS y expone `window.data`, selects dinámicos, hidden inputs).

### Setup (una vez, en cada PC nuevo)

```bash
npm install
npx playwright install chromium   # descarga el navegador (obligatorio por PC)
```

En Windows/PowerShell, si `npm` da error de ExecutionPolicy, usa `npm.cmd` / `npx.cmd`
o ejecuta una vez: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.

### Credenciales (`.env` en la raíz, NO se commitea)

```
BM_URL=https://reservas.grupostravel.com/es/backoffice/
BM_EMAIL=<usuario>
BM_PASSWORD=<password>
```

### Comandos

```bash
npm run scrape:login                                   # login AUTOMÁTICO con .env
tsx scraper/run.ts login:manual                        # login manual (fallback)
npm run scrape:capture -- <url> <slug>                 # captura una página
```

- `scrape:login` (`autoLogin`): abre Chromium headless, llena email/password desde `.env`, guarda la sesión en `scraper/.session/state.json`. Si faltan credenciales o no encuentra el form, cae a login manual.
- `scrape:capture` (`captureBookingMotorPage`): reutiliza la sesión, navega, espera `window.data` (hasta 15s), y exporta a `scraper/captures/<timestamp>_<slug>/`:
  - `capture.json` → url, `pageKind`, `windowData`, inventario de campos `searchhotel[...]`/`searchtransfer[...]` (name, id, type, value, options, visible), `selectorHints`.
  - `screenshot.png`, y opcionalmente `form.html` (`#search_hotel`/`#search_transfer`) y `results.html` (`#list-*-items`).

### Módulos

| Archivo | Rol |
|---------|-----|
| `scraper/env.ts` | Cargador `.env` sin dependencias |
| `scraper/paths.ts` | Rutas de sesión/capturas, timestamp slug |
| `scraper/auth.ts` | `autoLogin` / `manualLogin` / `ensureSession` |
| `scraper/capture.ts` | Navegación + extracción DOM/JS + artefactos |
| `scraper/run.ts` | CLI (`login`, `login:manual`, `capture`) |
| `scraper/types.ts` | Tipos de la captura |

### Nota técnica (tsx + Playwright)

`tsx`/esbuild envuelve los callbacks de `page.evaluate()` con un helper `__name`
que no existe en el navegador. Se define como no-op vía
`page.addInitScript('window.__name = window.__name || (f => f)')` en `capture.ts`.

### Capturas de referencia ya tomadas

Ambas de la misma reserva (San Andrés, 16-07-2026, 2 adultos):

| Producto | Campos clave capturados |
|----------|-------------------------|
| Hotel (`list-hotel`) | `checkin=16-07-2026`, `nights=3`, `listrooms[0][adults]=2`, destino ciudad `6024028` |
| Traslado (`list-transfer`) | `from`=Aeropuerto ADZ (`pickup=1033386`), `to`=Hotel Isla Bonita (`dropoff=493123`), `checkin=16-07-2026`, `adults` |

Confirman el mapeo de `SearchSyncController`: fechas y pasajeros se transfieren;
el destino de traslado usa IDs `pickup`/`dropoff` del backend (no derivables del nombre de hotel).

## Convenciones al extender

Para un nuevo producto (ej. vuelos):

1. Añadir tipos en `types.ts` (`FlightProduct`, `FlightCartItem`).
2. Crear `BookingMotorFlightJSReader`, `DOMReader`, `Extractor`, `UIInjector`.
3. Extender `detectPageType()` y handlers en `content.ts`.
4. Añadir render en `CartSidebar`.
5. Crear `scratch/test_flight_parser.ts` con HTML fixture.
6. Documentar selectores en este archivo.

URLs esperadas de BookingMotor:

- Hoteles: `/list-hotel/`
- Traslados: `/list-transfer/`
- Vuelos: `/list-flight/` (por confirmar)
- Tours: `/list-tour/` (por confirmar)

## Decisiones de diseño

1. **Extractor fusiona JS + DOM:** fechas y pasajeros vienen de `window.data`; nombres, precios y tarifas del HTML.
   - **Fallback DOM (content.ts):** si `window.data` no llegó (bridge falló), al agregar al carrito se leen fechas/noches/ocupación (hotel) o fechas/pasajeros (traslado) desde el formulario `#search_hotel`/`#search_transfer` vía `BookingMotorSearchFormSync` (`resolveHotelSearchFields` / `resolveTransferSearchFields`). Esto evita items con "0 noches · 0 adultos".
   - Las **noches** se calculan de `checkIn`/`checkOut` (`DD-MM-YYYY`) si no vienen explícitas.
2. **UI injection separada de extracción:** `UIInjector` no parsea productos, solo inyecta y emite IDs.
3. **Idempotencia:** `data-tce-injected` en filas/bloques para no duplicar botones en mutaciones.
4. **No alert():** feedback visual vía carrito lateral.

## Cuenta / despliegue

- Repositorio GitHub: cuenta `calihosting@gmail.com`
- Extensión cargada en modo desarrollador desde `dist/`
