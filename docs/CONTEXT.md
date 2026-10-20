# Travel Capture Engine — Contexto para desarrollo

Este documento resume el estado del proyecto para que agentes de IA o desarrolladores puedan retomar el trabajo sin releer todo el código.

**Historial de cambios:** [CHANGELOG.md](./CHANGELOG.md) (añadir entrada en cada cambio relevante).

**Roadmap / tareas:** [TODO.md](./TODO.md) — fases de evolución; marcar avances ahí.

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
│   ├── test_parser.ts         # Test hoteles con html/ejemplobusqueda.html
│   └── test_transfer_parser.ts
├── html/                      # Fixtures HTML guardados (páginas de ejemplo)
│   ├── ejemplobusqueda.html   # Hoteles
│   ├── traslados.html         # Traslados
│   └── …                      # Avianca, Wingo, JetSmart, etc.
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
- **Restaura**: al hacerse visible un formulario de otro tipo, vacío y sin `data-tce-prefilled`, precarga fechas, pasajeros, edades de niños y nacionalidad, y muestra un banner `.tce-prefill-note` (ida/vuelta + adultos/niños/edades).
- **Seguros**: fechas y `passengers` sí se copian. El select de país arranca en **Afganistán** (primera opción A–Z). Si sigue así, se elige **Colombia** por el texto de la opción (ID `13` + `origin_name` / `destiny_name`). Las edades son un campo por persona: adultos = 18, luego las edades de los niños.
- **Traslados**: si la búsqueda previa trae check-out (p. ej. hotel), se selecciona **Ida y vuelta**, se escribe el checkout del hotel y se reaplica tras el `setCheckout` de BookingMotor (check-in + 1 día).
- **Lectura/escritura DOM**: `BookingMotorSearchFormSync` (`providers/bookingmotor/`). Edades de niños: `searchhotel[listrooms][r][childrenages][a][age]` (columnas `#ages[r-a]`). Guardar viaje las copia al briefing y las vuelve a escribir en esos selects; no usa la captura 0,0 para pisar edades ya guardadas.

**Limitación de diseño:** el ID de pickup/dropoff NO se inventa. El botón de traslado del hotel no escribe el nombre en «Hasta» (BM borra ese texto al enfocar el origen, porque no hay ID). Encima de Hasta aparece en rojo **Busca este hotel** + Copiar: primero origen (aeropuerto), luego elegir el hotel en el autocomplete.

**Kit hotel + traslado (v1.0.58):** `TransferCartItem.linkedHotelId` / `linkedHotelName`. Storage `tce_pending_hotel_transfer`. El carrito agrupa hotel + sus traslados. WhatsApp/PDF muestran el nombre del hotel en el traslado.

Campos comunes mapeados: `checkin`/`checkout`, adultos (suma de habitaciones en hotel → `adults` en traslado), niños + edades (concatenadas), `nights`, `nationality`.

**Origen (v1.0.59):** lista editable `tce_origin_cities` (Bogotá, Medellín, Pereira, Cali, Bucaramanga, Cúcuta + otras). **Destino:** se puede escribir en Guardar viaje. Si hay búsqueda de hotel BM con ID de autocomplete, ese nombre oficial sustituye el texto; si no, se queda lo escrito. El autocomplete de BM no se rellena desde el carrito (hace falta su ID interno).

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

- Shadow DOM cerrado, z-index alto, panel fijo 340px derecha (ampliable a 700px; ~900px con Comparar hoteles).
- Botón **↗** en el encabezado abre el **panel fullscreen** (`asistente.html`) en otra pestaña.

### Panel fullscreen (`asistente.html`)

Espacio de trabajo amplio (misma extensión), sincronizado por `chrome.storage.onChanged`:

| Pestaña | Rol |
|---------|-----|
| **Dashboard** | Stats locales (hoy/ayer/semana/mes, destinos, últimas cotizaciones) |
| **Carrito** | Productos (izq) con ajustes por ítem + fees/TA/totales (der); comparar hoteles; vaciar; sync con lateral |
| **WhatsApp** | Preview editable + copiar / regenerar / **Descargar PDF** |
| **Config** | Fuente TRM (dolar-colombia / Wilkinson), suplemento TRM, TA, líneas incluye/no incluye/políticas, dominios (también en popup) |

Archivos: `public/asistente.html` + `public/asistente.css` + `src/asistente/asistente.ts`.

**Sync:** un solo carrito en `chrome.storage.local` (`tce_cart_items`, fees, TRM, cliente, comparar, etc.). El lateral (todas las pestañas de proveedores) y el panel escuchan `onChanged` — agregar en Avianca se ve en BookingMotor y en el panel, y al revés.

### Comparar hoteles (opciones combinadas)

Toggle `tce_hotels_as_options`. Grupos en `tce_hotel_compare_groups`: cada grupo es una columna **Opción N** con `hotelIds[]` (un hotel puede estar en varias). Servicios no-hotel son compartidos. UI: chips en cada hotel + **Nueva opción**. WhatsApp lista hoteles por opción y un total/persona por opción.
- Persistencia: `chrome.storage.local`:
  - `tce_cart_items` → productos del carrito.
  - `tce_last_search` → `SearchContext` hotel/transfer/activity/insurance (sync BM entre pestañas; no vuelos).
  - `tce_trip_guide` → primera búsqueda **aérea** del viaje o briefing **Guardar viaje** (fechas/pax/ruta + edad por niño junto a **+ niño**); encabezado **Guía**. Vaciar carrito o **Nueva búsqueda** la borra aunque no haya productos. BookingMotor no crea una guía nueva solo por el destino del hotel.
  - Bajo **Guía**: chips de cobertura `(Vuelo/Bloqueo)` `(Hotel)` `(Traslados)` `(Seguros)` `(Actividades)` — rojo si falta, verde con conteo si hay.
  - `tce_show_trm_in_quote` → si true, PDF/WhatsApp muestran **TRM del día** (nunca el suplemento). Historial guarda `trm` + `trmSuplemento`.
  - **Colchón TRM:** `factor = (trm_día + suplemento) / trm_día`. Precios de servicio en vista USD/COP = base × factor (línea a línea). COP cruzado usa TRM efectiva. Mayor valor / redondeo / TA no llevan el factor otra vez.
  - `tce_fees` → valores de los fees (`Record<feeId, number>`).
  - `tce_client_name` → cliente de la cotización (historial; no WhatsApp).
  - `tce_pending_quote` / `tce_quote_seq` → número de cotización de la sesión (`CAR001`…).
  - `tce_hotel_compare_groups` → columnas Opción N → `hotelIds[]` (Comparar hoteles).
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
- **Totales:** subtotal (ítems con sus ajustes) + mayor valor (si > 0) + redondeo (si > 0) + TA **solo si hay aéreos** (vuelo o bloqueo) → Total en moneda primaria. Sin aéreos, TA = 0.

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
- **Descargar PDF**: ver sección **Export PDF** abajo.
- Al copiar WhatsApp, descargar PDF o vaciar se guarda/actualiza el **Historial** (mismo `CAR###` no se duplica). Snapshot: ítems (incl. `occupancyRates`/baseline), fees, TA, modo, opciones, roomPlan, depósito inicial, TRM del día + suplemento, check “incluir total”. **Restaurar** reaplica esos campos al carrito/panel.
- Motor WhatsApp: `src/ui/QuoteBuilder.ts` + `src/shared/quoteHistory.ts` + defaults en `src/shared/quoteConfig.ts`.
- **Pendiente:** persistencia PostgreSQL; PDF vía microservicio si hace falta calidad fija.

### Export PDF (cotización imprimible)

Objetivo: PDF al estilo del comparativo nativo de BookingMotor (mapa + columnas de hoteles) **más** el resto de la cotización GT (vuelos, traslados, actividades, seguros, fees, totales por opción).

**No** reutilizamos el PDF servidor de BM (`/remember-product/pdf/...`): solo conoce hoteles recordados, no nuestro carrito.

#### Flujo al hacer clic en «Descargar PDF»

1. `openQuotePdfPrint` (`src/ui/QuotePdf.ts`) arma el HTML con la misma data que WhatsApp (`QuoteBuildInput`).
2. Si faltan coords y estamos en una lista BM, `enrichHotelCoordsFromDom` lee `#latitud_{hotelId}` / `#longitude_{hotelId}`.
3. Descarga el mapa estático → **data URL** (así la pestaña blob no bloquea la imagen).
4. Guarda el HTML en `chrome.storage.local` (`tce_quote_pdf_html`).
5. El service worker abre `quote-pdf.html` (`TCE_OPEN_QUOTE_PDF` → `chrome.tabs.create`).
6. `quotePdfPage.js` lee el HTML y lo muestra. **Imprimir** solo al clic en el botón de la página (no se abre el diálogo solo).

**Por qué no `window.open`:** desde el content script Chrome/Edge abren pestaña en blanco o la bloquean (mismo motivo que el panel asistente). Siempre pestaña de extensión vía background.

#### Mapa — qué es Yandex y por qué

- **Yandex** es una empresa rusa (buscador, mail, etc.) con su propio mapa, equivalente funcional a Google Maps / OpenStreetMap para mostrar calles y pines.
- Usamos solo su **Static Maps API** gratis: una URL HTTPS que devuelve un **PNG** con el mapa y marcadores numerados (`pm2rdm1`, `pm2rdm2`…). No hay mapa interactivo ni login.
- Endpoint: `https://static-maps.yandex.ru/1.x/?ll={lon},{lat}&spn={lonSpan},{latSpan}&size=650,450&l=map&pt=...` (varios hoteles: `spn` para encuadrar todos; un hotel: `z=14`).  
  Ojo: Yandex usa **longitud,latitud** (al revés que Leaflet/Google).
- **Por qué no el mapa de BM:** ese PDF sale del servidor BM con Google Static y su API key; no podemos meter vuelos/fees ahí.
- **Por qué no `staticmap.openstreetmap.de`:** era el primer intento; a menudo no responde → imagen rota / mapa vacío. Quedó como host_permission legado, no se usa en el código activo.
- **Fallback:** si el fetch a Yandex falla, se dibuja un **SVG** con pines relativos (siempre imprimible, menos “mapa real”).
- Permiso: `https://static-maps.yandex.ru/*` en `manifest.json`.

#### Coordenadas de hoteles

- Al agregar desde BM, `BookingMotorDOMReader` guarda `latitude` / `longitude` en el `HotelCartItem`.
- Inputs BM: `#latitud_{id}` (español, una “d”) y `#longitude_{id}`.
- Hoteles agregados **antes** de esta feature no tienen coords en storage: conviene regenerar el PDF con la **lista de hoteles BM abierta** (enrich desde DOM) o volver a agregarlos.

#### Archivos clave

| Archivo | Rol |
|---------|-----|
| `src/ui/QuotePdf.ts` | Plantilla HTML, mapa, `openQuotePdfPrint` |
| `src/ui/quotePdfPage.ts` | Loader de `quote-pdf.html` → blob |
| `public/quote-pdf.html` | Shell de la pestaña de impresión |
| `src/background/background.ts` | `TCE_OPEN_QUOTE_PDF` |
| `src/engine/providers/bookingmotor/BookingMotorDOMReader.ts` | Captura lat/lng |

#### Si hay que cambiar el mapa más adelante

1. Sustituir `buildStaticMapUrl` / `fetchMapAsDataUrl` (p. ej. Google Static con API key propia, Mapbox, tiles propios).
2. Mantener el contrato: devolver data URL o `null` → SVG.
3. Actualizar `host_permissions` y esta sección + changelog.

## Build

- Vite multi-entry: `background.js`, `content.js`, `bridge.js`, `popup.js`, `asistente.js` → `dist/`
- `tsc` valida tipos; `rootDir: src`, `outDir: dist`
- Manifest en `public/` — verificar que Vite lo copie (si no, copiar manualmente a dist)

## Fixtures de prueba

| Archivo | URL original | Productos en página 1 |
|---------|--------------|----------------------|
| `html/ejemplobusqueda.html` | `/list-hotel/...` | 10 hoteles, 46 botones (23 tarifas × desktop+mobile) |
| `html/traslados.html` | `/list-transfer/...` | 10 traslados, 10 botones |

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
- Circuitos / bloqueos:
  - Explorer: `/es/backoffice/tour/explorer/...`
  - Cotización (Pasos 1–4): `/es/backoffice/tour-process/{periodo}/{tourId}`
  - Captura al carrito: Paso 4 (`#buttonBlock`, `#dateOutput`, `#quotationDetail`, `select#roomSelected-*`, edades `input.age`)
  - Bloqueo = cupo aéreo negociado (reemplaza vuelo suelto); precio igual para todos excepto infantes menores de 2 años (gratis)
  - Combinado = paquete hotelero; Paso 2 muestra $/persona por acomodación; si no hay total BM, se estima desde esas tarifas

### Productos BM ya cableados al carrito

| Producto BM | ¿En carrito? | Notas |
|-------------|--------------|--------|
| Hoteles | Sí | list-hotel |
| Traslados | Sí | list-transfer (no es rent-a-car) |
| Actividades | Sí | list-activity |
| Seguros | Sí | list-insurance |
| Circuitos / bloqueos / combinados | Sí (v1.0.51+) | tour-process |
| Autos / rent-a-car | No | pendiente |

## Decisiones de diseño

1. **Extractor fusiona JS + DOM:** fechas y pasajeros vienen de `window.data`; nombres, precios y tarifas del HTML.
   - **Fallback DOM (content.ts):** si `window.data` no llegó (bridge falló), al agregar al carrito se leen fechas/noches/ocupación (hotel) o fechas/pasajeros (traslado) desde el formulario `#search_hotel`/`#search_transfer` vía `BookingMotorSearchFormSync` (`resolveHotelSearchFields` / `resolveTransferSearchFields`). Esto evita items con "0 noches · 0 adultos".
   - Las **noches** se calculan de `checkIn`/`checkOut` (`DD-MM-YYYY`) si no vienen explícitas.
2. **UI injection separada de extracción:** `UIInjector` no parsea productos, solo inyecta y emite IDs.
3. **Idempotencia:** `data-tce-injected` en filas/bloques para no duplicar botones en mutaciones.
4. **No alert():** feedback visual vía carrito lateral.
5. **Modo mayorista (v1.0.47+ / v1.0.88):** `tce_quote_mode` = `retail` | `wholesale`. Origen/destino/fechas = primera búsqueda aéreo u hotel (no se llenan en el carrito). Noches = regreso − ida. Mix del cliente en la pestaña **Acomodación** (check opcional para total en WhatsApp/PDF). En **wholesale**, las búsquedas 2 adt / 2 adt+niño / 3 adt son sondas de tarifa (DBL pp = hab÷2, CHD = hab niño − DBL, TPL = hab 3 adt÷3). 2+niño es **DBL+niño**, no Triple. +🛒 fusiona en la misma fila. Servicios no-hotel: adulto pp = total ÷ pax de esa búsqueda; CHD = tarifa niño si existe. TA solo con aéreos. En **retail**, cada fila de tarifa es un ítem. Keys: `shared/quoteMode.ts`, `shared/occupancyRates.ts`.

## Cuenta / despliegue

- Repositorio GitHub: cuenta `calihosting@gmail.com`
- Extensión cargada en modo desarrollador desde `dist/`
