---
name: code-conventions
description: Convenciones de código de Travel Cart Assistant (extensión Chrome MV3). Usar al escribir o modificar TypeScript en src/, scraper/ o scratch/, al nombrar storage keys, mensajes, selectores o logs, y al decidir formato, errores y comentarios.
---

# Convenciones de código

Extensión Chrome MV3 en TypeScript estricto. Identificadores de código se dejan como están; la prosa de UI y de docs va en español (es-CO).

## Nombres

- Clases y tipos de dominio en PascalCase, un archivo por clase con el mismo nombre: `CartSidebar.ts`, `BookingMotorExtractor.ts`, `HotelCartItem`.
- Módulos de funciones en camelCase: `src/shared/quoteConfig.ts`, `src/shared/trm.ts`, `src/content/searchSync.ts`.
- Prefijo de producto `tce` / `TCE`:
  - Storage: `tce_cart_items`, `tce_fees`, `tce_last_search`, `tce_trm`, `tce_quote_history`, `tce_app_log` (constantes exportadas junto a la key).
  - Mensajes `postMessage` / `chrome.runtime`: `source: 'tce-bridge' | 'tce-avianca' | 'tce-wingo'` y `type: 'TCE_BRIDGE_DATA' | 'TCE_REQUEST_DATA' | 'TCE_APP_LOG' | 'TCE_REFRESH_TRM'`.
  - DOM propio: id `tce-cart-sidebar-host`, clases `.tce-*`, atributo de idempotencia `data-tce-injected`, botón `.btn-tce-add-cart`.
- Logs de consola con prefijo `[TCE]`.
- Proveedores en `src/engine/providers/<proveedor>/`. BookingMotor usa el nombre largo (`BookingMotorDOMReader`). Vuelos externos usan el lector + injector (`DespegarFlightReader`, `WingoFlightUIInjector`).
- Unión discriminada por `type`: `'hotel' | 'transfer' | 'flight' | 'activity' | 'insurance'` en `src/engine/core/types.ts`. No añadir un producto nuevo con un campo suelto sin extender `CartItem`.

## Estructura

- `src/` es lo que compila `tsc` (`tsconfig.json`: `strict`, `rootDir: ./src`, `include: ["src/**/*"]`).
- `scraper/` y `scratch/` corren con `tsx` y quedan fuera del typecheck de `npm run build`.
- Content script: un solo IIFE sin chunks compartidos (`vite.content.config.ts`). No importar desde `content.ts` un módulo que Vite parta en otro archivo.
- Background, bridge, popup y log salen del build principal (`vite.config.ts`), `minify: false`, `sourcemap: true`, nombres `[name].js`.
- UI de carrito vive en Shadow DOM cerrado (`CartSidebar`). El popup es HTML estático en `public/popup.html` + `public/popup.css` + `src/popup/popup.ts`.

## Formato y lint

No hay ESLint, Prettier ni CI. El formato real del repo es el que ya está en `src/`:

- Comillas simples, punto y coma, indentación de 2 espacios.
- Tipos explícitos en firmas públicas. `any` solo donde el payload de la página ajena no tiene contrato (`cachedJSPayload`, `declare const data` en `src/content/bridge.ts`).
- Números de negocio con separador: `10_000`, `86_400_000`, `85_000`.
- Fechas de hotel/traslado: `DD-MM-YYYY`. Fechas de vuelo: `YYYY-MM-DD` en `FlightEndpoint.date`. TRM: `YYYY-MM-DD` vía `todayIso` en `src/shared/trm.ts`.
- Locale de dinero: `toLocaleString('es-CO', …)`.

Antes de cerrar un cambio de `src/`: `npx tsc --noEmit` (o `npm run build`). No añadir un formateador nuevo en la misma tarea de producto.

## Errores

- Fallo de `chrome.storage` o `chrome.runtime`: `try/catch` que traga el error con un comentario corto (`// storage unavailable`, `// ignore`). No romper la página del OTA.
- Extracción o inyección: `try/catch` por producto en `runExtractionAndInjection` (`src/content/content.ts`), `console.error('[TCE] …')` y seguir con el otro paso (extraer y pintar botones van separados).
- Producto no encontrado al clic: `console.warn` y `return`. No usar `alert()`.
- Vuelo ya en el carrito con el mismo `tripId`: `CartSidebar.hasFlightTrip` y `throw new Error('ALREADY_IN_CART')` en `pushFlightToCart`. Hoteles, traslados, actividades y seguros no deduplican: un segundo clic agrega otra línea.
- Init del carrito: si `new CartSidebar()` lanza, se loguea y se relanza. El content script no sigue a medias.

## Logging

- Canal de apoyo: `appendAppLog(level, message, context?)` en `src/shared/appLog.ts`. Niveles `info | warn | error`. Máximo 200 entradas en `tce_app_log`. También manda `TCE_APP_LOG` al service worker (`src/background/background.ts`).
- Visor: `public/log.html` + `src/log/log.ts` (options UI). Ahí el HTML se escapa con `escapeHtml`.
- `console.dir` del ítem al agregar (`logCartItem`) es traza de desarrollo. No loguear `.env`, cookies, `scraper/.session/state.json`, ni datos de tarjeta (hoy no hay campos de tarjeta).
- Mensajes de log en español o en la frase corta inglesa que ya usa el archivo tocado. No mezclar un estilo nuevo en el mismo módulo.

## Comentarios

- Comentario de archivo o de bloque cuando el motivo no se ve en el código: `let data` no es `window.data` (`bridge.ts`), el content script no puede ser un chunk (`vite.content.config.ts`), el destino de traslado no se autocompleta (`SearchContext` en `types.ts`).
- No comentar la línea obvia. No dejar comentarios que describan un comportamiento ya cambiado (el comentario de `FEE_DEFINITIONS` todavía habla de “siguiente thousand”; el código redondea a `10_000` COP o `10` USD en `roundUnit()`).

## Al extender

Seguir el orden de `docs/CONTEXT.md` (sección «Convenciones al extender»), actualizado a los tipos que ya existen en `types.ts`:

1. Tipo de producto y `*CartItem` en `src/engine/core/types.ts`.
2. Reader / extractor / injector bajo `src/engine/providers/<proveedor>/`.
3. Rama en `src/content/content.ts` (`detectPageType` para BookingMotor, o `is*Host` + `init*` para un OTA).
4. Render en `CartSidebar` y, si aplica, `QuoteBuilder`.
5. Script en `scratch/test_*.ts` con un HTML fixture.
6. Selectores y storage keys en `docs/CONTEXT.md` y una entrada en `docs/CHANGELOG.md` (copiar a `public/CHANGELOG.md`).

UI nueva pasa antes por el plan de Andrés el Diseñador (skill `frontend-design`) y por `baseline-ui`. Lógica de carrito y precios pasa por `checkout-and-payments`. Revisión de Ángela Calidad (`code-review`) y, si toca permisos, DOM de terceros o secretos, de Mateo Seguridad (`security-review`).
