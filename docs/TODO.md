# TODO — Asistente de cotización de paquetes

Gestor burdo pero funcional: listamos tareas, anotamos avances y marcamos cuando terminan.

**Cómo usarlo**

- `[ ]` pendiente · `[~]` en curso · `[x]` terminado
- Avances cortos bajo cada ítem (fecha + nota).
- No reordenar historial de avances; solo agregar abajo del ítem.
- Al cerrar una fase, marcarla completa y pasar a la siguiente.

**Principios acordados**

- Extensión usable **sin login** (como hoy). Login = historial cloud + recargar cotización.
- API pública (FastAPI); Postgres **nunca** expuesto.
- Reglas de coherencia con `if`s; IA solo donde aporte (copy, ayuda a mapear proveedores).
- PDF primero en el navegador; microservicio después si hace falta.
- Markup/márgenes: no duplicar lo que BookingMotor ya trae.

---

## Fase 0 — Tablero y alineación

- [x] Crear este archivo `docs/TODO.md` y acordar el flujo por pasos
  - 2026-08-04: tablero creado; roadmap acordado en chat.

---

## Fase 1 — UI: identidad y espacio (lateral + panel en pestaña)

Objetivo: **misma extensión**, dos superficies sincronizadas por `chrome.storage`:

| Superficie | Dónde | Rol |
|------------|--------|-----|
| **Lateral** (en el dominio) | Pantalla de captura | Seguir eligiendo con **+ 🛒**; panel más ancho + push |
| **Panel en pestaña** | Otra pestaña del navegador | Vista cómoda a pantalla completa para editar / Total / WhatsApp / Historial |

Una pantalla: pestaña al lado. Dos pantallas: se arrastra la pestaña al otro monitor.

### 1A — Identidad y lateral (captura)

- [x] Rename visible: “Mi Carrito” → asistente de cotización (encabezado compacto + cliente/ruta/TRM)
- [x] Ensachar el panel lateral (~420–480px o configurable) — anchos 340 / 700 / 900 (comparar)
- [ ] Layout push: al abrir, la página se estrecha y el contenido no queda tapado
- [x] Botón **“Abrir panel en otra pestaña”** en el lateral (y popup)
- [~] Actualizar `README` / `CONTEXT` con el nombre y el flujo dual

### 1B — Panel fullscreen (otra pestaña)

- [x] Página de extensión `asistente.html` (web app a ancho completo)
- [x] Misma fuente de datos que el lateral (`tce_cart_items`, fees, TRM, cliente, etc.)
- [x] Sync en vivo vía `chrome.storage.onChanged` (editar en uno → se ve en el otro)
- [x] Pestañas **Productos / Total / WhatsApp / Historial** cómodas en el panel (Total y WhatsApp editables en v1.0.36)
- [x] Pestaña **Config** en el panel (TA, suplemento TRM, líneas WhatsApp, dominios)
- [x] El lateral puede quedar enfocado en captura + resumen; el trabajo “pesado” de Total/WhatsApp/Historial vive bien en el panel (sin quitar esas pestañas del lateral en v1 si ya están)

### 1C — Dashboard en el panel (stats)

El panel fullscreen se potencia con un resumen operativo (no va en el lateral estrecho).

**v1 (sin login, historial local `chrome.storage`)**

- [x] Pestaña o bloque **Dashboard** en el panel
- [x] Contadores: cotizaciones **hoy / ayer / esta semana / este mes** (desde historial local)
- [x] Otras stats simples útiles: total cotizado en el período, destinos más frecuentes, ticket promedio, últimas N cotizaciones

**v2 (con cloud — tras Fases 2–3)**

- [ ] Mismas métricas desde Postgres (multi-dispositivo / por asesor / por agencia)
- [ ] Filtros por usuario, cliente, destino; series en el tiempo

**Avances**

- 2026-08-04: acordado dual surface (ampliar lateral + panel en otra pestaña); Total/WhatsApp/Historial cómodos en el panel.
- 2026-08-04: dashboard de stats en el panel (local primero; cloud después).
- 2026-08-04: mockup visual descartado (era confuso vs panel real); UI en `public/asistente.html`.
- 2026-08-10: eliminado `scratch/asistente-panel-mockup.html`.
- 2026-08-10: v1.0.35 — `asistente.html` + botón ↗; Dashboard y Config reales; sync storage; layout push sigue pendiente.

**Notas de diseño**

- **Una sola extensión**, no dos.
- Push + más ancho en el lateral van juntos.
- No hace falta Side Panel nativo de Chrome: una pestaña `chrome-extension://…/asistente.html` alcanza.
- Evitar duplicar lógica a mano: extraer lo reutilizable del `CartSidebar` (render/totales/quote) para que lateral y panel compartan motor.
- Dashboard: empezar con historial local; no bloquear 1A/1B por gráficos fancy.

---

## Fase 2 — Backend: FastAPI + Postgres

Objetivo: API en el Windows Server; solo la extensión (y el admin) hablan con ella.

- [ ] Repo / carpeta del servicio (`api/` o repo aparte) + entorno Python
- [ ] Postgres: esquema mínimo (users, customers, quotes)
- [ ] Auth: registro/login → JWT (o token de sesión)
- [ ] Endpoints: crear/listar/obtener cotización (JSON del carrito + metadatos)
- [ ] Clientes: CRUD básico (persona/empresa) ligados a cotizaciones
- [ ] Seguridad: HTTPS, CORS acotado, secretos fuera del repo
- [ ] Documentar URL base, variables `.env` y cómo desplegar en el server

**Modelo tentativo**

| Tabla | Rol |
|-------|-----|
| `users` | Asesores que se loguean en la extensión |
| `customers` | Cliente final (persona/empresa) de la cotización |
| `quotes` | Snapshot JSON + destino/fechas/`CAR###`/user/customer |

**Avances**

- _(vacío)_

---

## Fase 3 — Extensión ↔ cloud (login opcional)

Objetivo: sin login = igual que hoy; con login = historial remoto y “cargar cotización”.

- [ ] UI login / logout en el asistente (o popup)
- [ ] Guardar token de forma segura (`chrome.storage.session` / local según decisión)
- [ ] Al copiar / cerrar cotización: upsert remoto si hay sesión
- [ ] Pestaña Historial: local + remoto (o solo remoto cuando hay sesión)
- [ ] Acción “Cargar cotización” → repoblar el carrito desde el JSON
- [ ] Seguir funcionando 100% offline / sin cuenta

**Avances**

- _(vacío)_

---

## Fase 4 — Panel de administración

Objetivo: gestionar usuarios (y luego clientes/configs) sin tocar la BD a mano.

- [ ] App admin mínima (web) autenticada
- [ ] Crear / desactivar usuarios de asesores
- [ ] Listar cotizaciones (filtro por asesor, cliente, fechas)
- [ ] (Opcional) CRUD incluye/no incluye por agencia/usuario

**Avances**

- _(vacío)_

---

## Fase 5 — Export PDF

Objetivo: cotización descargable sin depender de un servicio al inicio.

- [x] Plantilla HTML de cotización (misma info que WhatsApp / Total)
- [x] Generar PDF en el navegador (print o librería)
- [ ] (Después) Endpoint FastAPI + Chromium/WeasyPrint si hace falta calidad fija

**Avances**

- 2026-08-11: `QuotePdf.ts` — HTML print + pestaña `quote-pdf.html` (no `window.open`); mapa Yandex Static embebido como data URL (fallback SVG); coords desde BM (`#latitud_*` / `#longitude_*`) + enrich al generar. Detalle en `docs/CONTEXT.md` → **Export PDF**.

---

## Fase 6 — Reglas de paquete y escenarios A/B

Objetivo: avisos claros y comparar paquetes, sin agente IA vigilando.

- [ ] Motor de warnings (`if`s): fechas hotel vs vuelo, pax, origen/destino
- [ ] UI de avisos en el asistente (no bloqueantes al inicio)
- [ ] Extender A/B más allá de hoteles (ej. dos vuelos + servicios compartidos)
- [ ] (Opcional) Botón “Revisar con IA” / ayuda de copy — modelo barato, bajo demanda
- [x] PDF mayorista con DBL/TPL/CHD (v1.0.49; WhatsApp desde v1.0.47)
- [ ] (Opcional) Prefill / guía de búsquedas sonda en BM

**Avances**

- 2026-08-12: modo **Minorista | Mayorista** + briefing sticky + captura asistida DBL/TPL/CHD + plantilla WhatsApp mayorista (v1.0.47).
- 2026-08-12: **Nro noches** en briefing; panel con paridad (briefing, alimentación, edición DBL/TPL/CHD); cotización pp × pax documentada (v1.0.48).
- 2026-08-12: PDF mayorista alineado con WhatsApp (DBL/TPL/CHD) (v1.0.49).

---

## Fase 7 — Herramienta interna: mapear proveedor

Objetivo: acelerar onboarding de sitios nuevos (HTML/fixture → propuesta de selectores/código). **No** auto-publicar en producción sin revisión.

- [ ] Definir input: HTML guardado y/o captura Playwright + URL
- [ ] Script/API que con IA proponga selectores y forma de `CartItem`
- [ ] Salida: borrador + fixture + checklist de tests
- [ ] Proceso: humano revisa → código en `providers/` → dominio en lista

**Avances**

- _(vacío)_

---

## Fase 8 — Más proveedores / profundizar existentes

Objetivo: cobertura real del día a día (después de tener tool y cloud estables).

- [ ] Listar proveedores prioritarios (los que usás a diario)
- [ ] Por cada uno: fixture, reader, injector, tests, dominio
- [ ] Educar edge cases (pasajeros, monedas, páginas intermedias)

**Avances**

- _(vacío)_

---

## Ideas aparcadas (no ahora)

- Markup/márgenes propios donde BM ya lo trae
- Agente IA vigilando el carrito en cada cambio
- App móvil
- Exponer Postgres a internet

---

## Log rápido de sesión

| Fecha | Qué |
|-------|-----|
| 2026-08-04 | Tablero creado; orden de fases acordado. |
| 2026-08-04 | Fase 1 ampliada: lateral más ancho + push, y panel en otra pestaña (misma extensión). |
| 2026-08-04 | Fase 1C: dashboard de cotizaciones (hoy/ayer/semana/mes + stats); local → cloud. |
| 2026-08-10 | v1.0.35: panel `asistente.html` + Config/Dashboard; botón abrir panel. Layout push pendiente. |
| 2026-08-10 | v1.0.38: Carrito unificado (productos+total); TRM/pax/comparar en panel; WhatsApp editable. |
