# Travel Cart Assistant — agentes

Extensión Chrome MV3 para asesores de Grupo Stravel. Inyecta **+ 🛒 GT** en resultados de BookingMotor (hoteles, traslados, actividades, seguros) y en vuelos de Despegar, XNet, Avianca, Wingo y JetSMART. Arma un carrito lateral con totales, TRM, tarifa administrativa y cotización de WhatsApp (`CAR###`). No cobra tarjeta ni confirma la reserva en el OTA.

## Stack

- TypeScript estricto (`tsconfig.json`), Vite 5, dos builds: service worker / bridge / popup / log, y `content.js` como IIFE (`vite.content.config.ts`).
- UI: Shadow DOM en `src/ui/CartSidebar.ts`, popup en `public/popup.html` + `public/popup.css`, log en `public/log.html`. Sin React.
- Persistencia: `chrome.storage.local` (keys `tce_*`).
- Scraper Node: Playwright + `tsx` en `scraper/`, credenciales en `.env`.
- Pruebas: scripts `scratch/test_*.ts` con jsdom. No hay `npm test` ni CI.
- PostgreSQL: solo documentación en `docs/database/`. Los scripts Python de ese runbook no están en este repo. TODO: confirmar con Rodrigo el repo de inventario.

Detalle de módulos: `docs/CONTEXT.md` y la skill `architecture`.

## Correr, build y pruebas

```bash
npm install
npm run build          # tsc + vite + content IIFE → dist/
```

Cargar `dist/` en `chrome://extensions` (modo desarrollador). `npm run dev` solo observa el build principal y no regenera `content.js`.

```bash
npx tsc --noEmit
npx tsx scratch/test_parser.ts
npx tsx scratch/test_transfer_parser.ts
npx tsx scratch/test_search_sync.ts
npx tsx scratch/test_flight_parser.ts
npx tsx scratch/test_xnet_flight_parser.ts
npx tsx scratch/test_xnet_button_inject.ts
```

Scraper (no commitear `.env` ni `scraper/.session/`): `npm run scrape:login` y `npm run scrape:capture -- "<url>" <slug>`.

## Mapa skill → tarea

| Tarea | Skill | Dueño |
|---|---|---|
| Nombres, errores, logs, estilo TypeScript | `code-conventions` | Leonardo el Backend |
| Dónde vive un provider, storage, manifest, build | `architecture` | Leonardo el Backend |
| Parsers, fixtures, `tsc`, huecos de harness | `testing` | Ángela Calidad |
| Secretos, XSS, permisos, logs | `security-practices` | Mateo Seguridad |
| Rama, commit, plantilla de PR | `pr-guidelines` | Diego DevOps |
| Veredicto del diff | `code-review` | Ángela Calidad |
| Veredicto OWASP / secretos / audit | `security-review` | Mateo Seguridad |
| Plan visual de una pantalla nueva | `frontend-design` | Andrés el Diseñador |
| MUST / SHOULD / NEVER de CSS y HTML | `baseline-ui` | Camila Frontend |
| Totales, TRM, fees, TA, duplicados, cotización | `checkout-and-payments` | Leonardo el Backend |
| Esquema y runbook `docs/database/` | `architecture` | Gonzalo el DBA |
| Flujo del asesor, copy, qué entra a WhatsApp | `frontend-design`, `checkout-and-payments` | Catalina Producto UX |

Cada tarea va al dueño de esa fila. Un cambio de UI nueva pasa primero por el plan de Andrés el Diseñador y después por Camila Frontend. Un cambio de parser o de totales pasa por Leonardo el Backend y por la revisión de Ángela Calidad.

## Aprobaciones

- Merge a `main`: solo con aprobación de **Rodrigo**.
- Publicar o repartir `dist/` a asesores, o subir la versión de `public/manifest.json`: solo con aprobación de **Rodrigo**.
- Volver el repo al tag `restaurar` sigue `docs/RESTAURAR.md` y pide confirmación antes de cualquier `reset` destructivo. No hay force-push a `main` sin pedido explícito.
