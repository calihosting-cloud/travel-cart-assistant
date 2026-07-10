# Travel Capture Engine — Contexto para desarrollo

Este documento resume el estado del proyecto para que agentes de IA o desarrolladores puedan retomar el trabajo sin releer todo el código.

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
- Envía `postMessage` con `{ source: 'tce-bridge', type: 'TCE_BRIDGE_DATA', payload: window.data }`.
- El content script cachea el payload y re-solicita con `TCE_REQUEST_DATA` en mutaciones del DOM.

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
- Persistencia: `chrome.storage.local` key `tce_cart_items`.
- **Pendiente:** cambiar de overlay a layout push (margin-right en body).

## Build

- Vite multi-entry: `background.js`, `content.js`, `bridge.js` → `dist/`
- `tsc` valida tipos; `rootDir: src`, `outDir: dist`
- Manifest en `public/` — verificar que Vite lo copie (si no, copiar manualmente a dist)

## Fixtures de prueba

| Archivo | URL original | Productos en página 1 |
|---------|--------------|----------------------|
| `ejemplobusqueda.html` | `/list-hotel/...` | 10 hoteles, 46 botones (23 tarifas × desktop+mobile) |
| `traslados.html` | `/list-transfer/...` | 10 traslados, 10 botones |

Tests extraen `let data = JSON.parse('...')` con regex y usan JSDOM.

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
2. **UI injection separada de extracción:** `UIInjector` no parsea productos, solo inyecta y emite IDs.
3. **Idempotencia:** `data-tce-injected` en filas/bloques para no duplicar botones en mutaciones.
4. **No alert():** feedback visual vía carrito lateral.

## Cuenta / despliegue

- Repositorio GitHub: cuenta `calihosting@gmail.com`
- Extensión cargada en modo desarrollador desde `dist/`
