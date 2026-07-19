# Travel Cart Assistant

Extensión de Chrome para asesores de viajes que captura productos turísticos desde **BookingMotor** (Grupo Stravel) y los agrega a un carrito lateral.

**Log de cambios:** [docs/CHANGELOG.md](docs/CHANGELOG.md) — documentar cada cambio relevante ahí.

## Estado actual

| Fase | Funcionalidad | Estado |
|------|---------------|--------|
| Phase 1 | Extracción de hoteles (JS + DOM) | ✅ |
| Phase 2 | Botón **+ 🛒** por tarifa de hotel | ✅ |
| Phase 2+ | Carrito lateral con persistencia | ✅ |
| Phase 3 | Captura de traslados | ✅ |
| Phase 4 | Sincronización de búsqueda entre pestañas (fechas/pasajeros) | ✅ |
| Phase 4+ | Resumen de búsqueda en encabezado del carrito | ✅ |
| Phase 4+ | Fees editables en el total (scaffold) | ✅ |
| Phase 4+ | Mayor valor cobrado + Redondear (decena de mil) | ✅ |
| Phase 4+ | Popup extensión: dominios habilitados | ✅ |
| Phase 4+ | Cotización WhatsApp + config incluye/no incluye | ✅ |
| Phase 5 | Scraper Playwright para capturar fixtures vivos | ✅ |
| Pendiente | Export PDF de cotización | 🔜 |
| Pendiente | PostgreSQL: incluye/no incluye y cotizaciones | 🔜 |
| Pendiente | Carrito que empuja la página (no overlay) | 🔜 |
| Pendiente | Fees por moneda / conversión | 🔜 |
| Pendiente | Vuelos, tours, actividades | 🔜 |

## Productos soportados

### Hoteles (`ejemplobusqueda.html` / `#list-hotel-items`)

- Un botón **+ 🛒** por cada **tarifa** (fila de habitación), no por hotel completo.
- Captura: nombre, fechas, ocupación, habitación, régimen, proveedor, precio.

### Traslados (`traslados.html` / `#list-transfer-items`)

- Un botón **+ 🛒** por cada tarjeta de traslado.
- Captura: vehículo, origen/destino, tramos IN/OUT, proveedor, precio.

## Instalación

```bash
npm install
npm run build
```

1. Abre `chrome://extensions`
2. Activa **Modo de desarrollador**
3. **Cargar descomprimida** → selecciona la carpeta `dist/`

> El manifest y los recursos estáticos se copian a `dist/` durante el build. Si cambias `public/manifest.json`, vuelve a ejecutar `npm run build`.

## Uso

### En producción

La extensión se activa en:

- `https://reservas.grupostravel.com/*`
- `http://localhost/*` y `file://*` (pruebas locales)

### Pruebas locales con HTML guardado

1. Guarda una página de resultados de BookingMotor como **Página web, completa** (HTML + carpeta `_files`).
2. Abre el `.html` en Chrome con la extensión cargada.
3. Usa **+ 🛒** junto a **Reservar** y revisa el carrito lateral.

Fixtures incluidos en el repo:

- `ejemplobusqueda.html` — búsqueda de hoteles
- `traslados.html` — búsqueda de traslados

Las carpetas `*_files/` con assets no están en Git (son muy pesadas). Para pruebas visuales completas, guarda la página completa localmente.

## Tests

```bash
npx tsx scratch/test_parser.ts          # Hoteles
npx tsx scratch/test_transfer_parser.ts # Traslados
npx tsx scratch/test_search_sync.ts     # Sincronización de búsqueda entre pestañas
```

## Arquitectura (resumen)

```
src/
├── content/          # Orquestador: bridge, observer, handlers
├── ui/               # CartSidebar (Shadow DOM)
└── engine/
    ├── core/         # Tipos, Extractor, DOMReader, JSDataReader, UIInjector
    ├── observer/     # PageObserver (MutationObserver)
    └── providers/bookingmotor/
        ├── Hotel*    # Extractor, DOMReader, JSReader, UIInjector
        └── Transfer* # Extractor, DOMReader, JSReader, UIInjector
```

Flujo:

1. `bridge.js` lee `window.data` en el main world y lo envía al content script.
2. El extractor fusiona contexto JS (`searchhotel` / `searchtransfer`) con el DOM.
3. El UI injector añade botones **+ 🛒** junto a **Reservar**.
4. Al hacer clic, se crea un `CartItem` y se muestra en el carrito lateral (`chrome.storage.local`).

Documentación detallada para agentes y desarrolladores: [`docs/CONTEXT.md`](docs/CONTEXT.md).

Guía para publicar en GitHub: [`docs/GITHUB_SETUP.md`](docs/GITHUB_SETUP.md).

## Carrito: resumen y fees

- **Encabezado:** muestra un resumen de la búsqueda actual (destino · fechas · adultos/niños), tomado de `tce_last_search` y actualizado en vivo.
- **Fees:** dos campos editables (`Fee de ejemplo 1`, `Fee de ejemplo 2`, por defecto 0) que se suman al total. Son un scaffold: para agregar un fee real (bancario, administrativo, etc.) se añade una entrada a `FEE_DEFINITIONS` en `src/ui/CartSidebar.ts`. Persisten en `tce_fees`.

## Scraper (capturar fixtures vivos de BookingMotor)

Ver detalle en [`docs/CONTEXT.md`](docs/CONTEXT.md#scraper-con-playwright-scraper).

```bash
npm install
npx playwright install chromium          # una vez por PC
# crear .env con BM_URL, BM_EMAIL, BM_PASSWORD
npm run scrape:login                      # login automático, guarda sesión
npm run scrape:capture -- "<url>" <slug>  # exporta capture.json + html + screenshot
```

> Windows/PowerShell: usa `npm.cmd`/`npx.cmd` si aparece error de ExecutionPolicy.

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Build en modo watch |
| `npm run build` | TypeScript + Vite → `dist/` |
| `npm run scrape:login` | Login automático a BookingMotor (usa `.env`) |
| `npm run scrape:capture -- <url> <slug>` | Captura una página viva |

## Roadmap

- [ ] Carrito lateral que desplace el contenido (no superpuesto)
- [ ] Fees por moneda / conversión de divisas
- [ ] Automatizar búsquedas completas con Playwright (llenar form + buscar)
- [ ] Captura de vuelos (`list-flight`)
- [ ] Captura de tours / actividades
- [ ] Exportar carrito / sincronizar con backend
- [ ] Publicar en Chrome Web Store

## Licencia

Proyecto privado — Grupo Stravel / uso interno de agencia.
