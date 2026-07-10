# Travel Cart Assistant

Extensión de Chrome para asesores de viajes que captura productos turísticos desde **BookingMotor** (Grupo Stravel) y los agrega a un carrito lateral.

## Estado actual

| Fase | Funcionalidad | Estado |
|------|---------------|--------|
| Phase 1 | Extracción de hoteles (JS + DOM) | ✅ |
| Phase 2 | Botón **+ 🛒** por tarifa de hotel | ✅ |
| Phase 2+ | Carrito lateral con persistencia | ✅ |
| Phase 3 | Captura de traslados | ✅ |
| Pendiente | Carrito que empuja la página (no overlay) | 🔜 |
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

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Build en modo watch |
| `npm run build` | TypeScript + Vite → `dist/` |

## Roadmap

- [ ] Carrito lateral que desplace el contenido (no superpuesto)
- [ ] Captura de vuelos (`list-flight`)
- [ ] Captura de tours / actividades
- [ ] Exportar carrito / sincronizar con backend
- [ ] Publicar en Chrome Web Store

## Licencia

Proyecto privado — Grupo Stravel / uso interno de agencia.
