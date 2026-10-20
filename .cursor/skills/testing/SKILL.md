---
name: testing
description: Cómo comprobar Travel Cart Assistant. Usar al correr o escribir pruebas del parser, de inyección de botones, de sync de búsqueda o de precios, y cuando no exista un harness automatizado para el cambio.
---

# Pruebas

No hay Vitest, Jest, Playwright Test ni script `npm test`. No hay carpeta de cobertura ni CI (no existe `.github/`). La comprobación del repo son scripts `tsx` en `scratch/` contra HTML fixture, más `tsc` en `src/`. Dueña del criterio de calidad: **Ángela Calidad**. Quién deja el comando reproducible en el PR: quien toca el código (**Leonardo el Backend** o **Camila Frontend**).

## Qué hay hoy

| Comando | Qué hace | Fixture |
|---|---|---|
| `npx tsx scratch/test_parser.ts` | Extrae hoteles e inyecta botones | `ejemplobusqueda.html` |
| `npx tsx scratch/test_transfer_parser.ts` | Extrae traslados | `traslados.html` |
| `npx tsx scratch/test_search_sync.ts` | Sync de búsqueda entre formularios | HTML del propio script / fixtures de formulario |
| `npx tsx scratch/test_flight_parser.ts` | Parser de vuelo | `Despegar.html` |
| `npx tsx scratch/test_xnet_flight_parser.ts` | Tarifa XNet | `santur.html` / `santur_vuelo_seleccionado.html` |
| `npx tsx scratch/test_xnet_button_inject.ts` | Botón XNet | mismos HTML |

El `README.md` solo cita los tres primeros. Los de vuelo y XNet también son parte del flujo. Salida: `console.log` / `console.error`. `test_parser.ts` hace `process.exit(1)` si no encuentra `let data = JSON.parse(...)`. El resto no afirma conteos: un proceso que termina en 0 no demuestra que el número de tarifas siga siendo el de `docs/CONTEXT.md` (10 hoteles, 46 botones; 10 traslados).

`npx tsc --noEmit` cubre `src/**/*` y no cubre `scratch/` ni `scraper/`.

## Cómo escribir una prueba de parser (unidad / fixture)

1. Guardar el HTML de la página (sin la carpeta `*_files/`, que está en `.gitignore`).
2. Crear `scratch/test_<producto>_parser.ts` en ESM, con `__dirname` vía `fileURLToPath(import.meta.url)`, igual que `scratch/test_parser.ts`.
3. Sacar el JSON embebido con el regex del binding real (`let data = JSON.parse('...')` en BookingMotor). No asumir `window.data`.
4. `new JSDOM(html, { url: '<url original>' })` para que los `href` del botón Reservar resuelvan.
5. Llamar al extractor o reader público. Imprimir conteos, ids y el primer precio con moneda.
6. Si el cambio es de inyección, instanciar el `UIInjector`, pasar un callback y comprobar que aparece `.btn-tce-add-cart` y `data-tce-injected` sin duplicar en una segunda pasada.
7. Fallar con `process.exit(1)` cuando el contrato se rompa (0 productos, id vacío, precio NaN, moneda vacía en una fila que sí muestra precio). No dejar la prueba solo en logs.

Casos que el fixture debe cubrir si el diff los toca: separadores `4,083,779.45` y `4.083.779,45` (`parseLocalizedAmount` en `BookingMotorDOMReader.ts`), solución multi-habitación, `soldOut` / `onRequest`, vuelo sin `tripId`, moneda distinta de COP/USD.

## Integración

No hay suite de integración. Lo más cercano:

- Content + storage no se puede montar en jsdom sin un mock de `chrome`. No existe ese mock en el repo. No simular `chrome.storage` con un objeto global improvisado dentro de `src/`.
- Scraper vivo: `npm run scrape:login` y `npm run scrape:capture -- "<url>" <slug>` (ver `README.md`). Exige `.env`, `npx playwright install chromium` y red. Las capturas quedan en `scraper/captures/` y no se commitean. No usar esto como prueba por defecto de un PR.

## E2E

No hay Playwright Test contra la extensión. Cargar `dist/` en `chrome://extensions` (modo desarrollador) después de `npm run build` y probar el host real o un HTML local (`file://` está en el manifest). `npm run dev` no regenera `content.js`.

## Si falta el harness

Proponer, solo en documentación del PR, este mínimo (no añadirlo como dependencia sin que Rodrigo lo pida):

- Un script `npm test` que ejecute en serie los `scratch/test_*.ts` ya existentes con `tsx`.
- Aserciones de conteo y de no-duplicar botones en los tres scripts que el README ya trata como prueba.
- Dejar cobertura y jsdom-de-extensión para después: hoy no hay umbral.

Hasta que eso exista, el PR debe pegar la salida de los `tsx` que el diff toca y de `npx tsc --noEmit`.

## Cobertura

No hay número objetivo. Ángela Calidad pide pruebas del contrato que el diff cambia (precio, id, idempotencia, moneda, dedupe de `tripId`), no un porcentaje.
