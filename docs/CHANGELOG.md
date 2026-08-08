# Changelog — Travel Cart Assistant

Registro de cambios del proyecto. **Más reciente arriba.**

Formato por entrada:

```markdown
## YYYY-MM-DD — Título corto

- **Added** / **Changed** / **Fixed** / **Docs**: descripción en una línea (por qué / efecto).
```

---

## 2026-08-06 — Edades de niños en la guía

- **Changed**: si hay edades de niños (hotel/traslado/BM), la guía las muestra (`1 Chd (8)`); si no hay edades, solo el conteo de niños.
- **Docs**: `docs/CONTEXT.md` — edades enriquecen `tce_trip_guide`.

## 2026-08-06 — Opciones: habitación y alimentación

- **Changed**: en Comparar hoteles, cada opción muestra habitación y tipo de alimentación además de noches/fechas.
- **Changed**: la guía del viaje en el encabezado resalta más (negrita y tamaño).

## 2026-08-06 — Encabezado compacto del asistente

- **Changed**: panel lateral renombrado a **Asistente de cotización**; cliente en la barra azul; ruta/guía + TRM en una sola fila; anchos ampliados (700 / 900 px) para ganar espacio de productos.
- **Changed**: resumen de ruta más corto (`Bogotá · Santa Marta · fechas · 3n · 2 Adt · 1 Chd`).

## 2026-08-06 — Handoff vuelo → hotel (fechas/pax) (v1.0.34)

- **Fixed**: tras agregar **cualquier** vuelo (Avianca, Wingo, Despegar, XNet, JetSMART → guía del viaje), al abrir hotel en BookingMotor se precargan entrada/salida, noches y ocupación (`2 Adt · 1 Chd`); el destino solo se sugiere en el aviso (no se auto-escribe).
- **Docs**: `SearchSync` usa `tce_trip_guide` como fallback cuando aún no hay `tce_last_search` de hotel (independiente del proveedor aéreo).

## 2026-08-06 — Wingo, guía de viaje y opciones multi-hotel (v1.0.34)

- **Added**: Comparar hoteles con varias opciones (columnas + **Nueva opción**); un hotel puede ir en más de una; total también visible sin comparar.
- **Added**: **Guía del viaje** (`tce_trip_guide`): la primera búsqueda aérea fija fechas/pax/ruta en el encabezado; hotel solo encabeza hasta que haya vuelo.
- **Fixed**: hotel → traslado conserva check-out e abre en Ida y vuelta; aviso de precarga con ida/vuelta y pax.
- **Fixed**: Wingo lee niño (`Niño` / `w-kid-form`), ruta/fechas en pasajeros, y `$495.39 USD` sin inflar a miles; montos sin centavos.
- **Changed**: botón Wingo solo junto al Total en pasajeros/pago (no tapa la búsqueda).
- **Docs**: `docs/CONTEXT.md` — trip guide, opciones multi-hotel, sync BM.

## 2026-08-06 — Fixtures HTML en `html/`

- **Changed**: páginas de ejemplo (Avianca, Wingo, BookingMotor, etc.) movidas de la raíz a `html/` para ordenar el repo; scripts `scratch/` y `scraper/` y docs actualizados a las nuevas rutas.

## 2026-08-04 — Tablero de evolución (TODO)

- **Docs**: `docs/TODO.md` — fases y tareas del asistente de cotización (UI, API/Postgres, login opcional, admin, PDF, reglas, tool de proveedores); se marca avance ahí.
- **Docs**: Fase 1 — dual surface: lateral ampliado (captura) + panel en otra pestaña (Total / WhatsApp / Historial cómodos).
- **Docs**: Fase 1C — dashboard de stats en el panel (hoy/ayer/semana/mes; local primero, cloud después).
- **Docs**: mockup del panel fullscreen en `scratch/asistente-panel-mockup.html` (datos ficticios).

## 2026-07-31 — Comparar hoteles y ocupación por habitación (v1.0.33)

- **Changed**: el toggle «Hoteles por opción» pasa a llamarse **Comparar hoteles**.
- **Added**: con Comparar hoteles activo (≥2 hoteles), en Items y en Total se muestran Opción N con valor por pasajero y total (servicios compartidos + ese hotel + fees).
- **Added**: ocupación detallada por habitación en carrito y WhatsApp (ej. Hab 1: Doble · 2 adultos · Hab 2: Triple · 3 adultos).

## 2026-07-29 — Wingo pasajeros en /passengers (v1.0.32)

- **Fixed**: en la página de pasajeros de Wingo, el carrito ya no toma “Adulto 1” del formulario como 1 viajero; lee `Adultos N` del resumen de pago (o cuenta los formularios) y prioriza el total de `w-mo-total-purchase`.

## 2026-07-29 — Hotel multi-habitación etiquetado (v1.0.31)

- **Fixed**: al agregar un hotel de BookingMotor con varias habitaciones, el carrito etiqueta el total de la solución (`N habitaciones` + precio c/u) para no confundirlo con el valor de una sola habitación.

## 2026-07-29 — JetSMART y lectura monetaria segura (v1.0.30)

- **Added**: integración de JetSMART para agregar al carrito el itinerario seleccionado, pasajeros, tarifa, equipaje incluido, moneda y total desde el resumen de reserva.
- **Changed**: la lectura de precios de BookingMotor ahora reconoce correctamente tanto `4,083,779.45` como `4.083.779,45`, reforzando el manejo de separadores regionales.
- **Fixed**: monedas sin tasa disponible, como CLP, conservan su código y valor nativos en vez de mostrarse incorrectamente como COP o USD.

## 2026-07-27 — Enlace a búsqueda desde el ítem (v1.0.29)

- **Added**: al agregar un ítem se guarda la URL de la página (`sourceUrl`); en el carrito aparece un icono **↗** para reabrir esa búsqueda/listado y cambiar hotel u otro servicio sin rearmar el criterio a mano.

## 2026-07-27 — TRM hint en 2 líneas (panel estrecho) (v1.0.28)

- **Changed**: con el carrito en ancho normal, el texto “Vista COP · usada… · dolar-colombia.com” pasa a una segunda línea para no amontonarse.

## 2026-07-27 — Vista unificada COP | USD (v1.0.27)

- **Added**: en la barra TRM, toggle discreto **COP | USD** para ver/cotizar todo el carrito en una moneda (TRM+suplemento convierte la otra).
- **Changed**: precios, mayor/redondeo, TA, totales y WhatsApp usan la vista activa; USD requiere TRM.

## 2026-07-27 — Historial con detalle de cotización (v1.0.26)

- **Changed**: el Historial muestra origen/destino, fechas, viajeros, cada servicio con pax/fechas/valor (y mayor/redondeo), fees/TA y total — resumen de lo cotizado, sin emojis de WhatsApp.

## 2026-07-27 — Redondeo 10k por ítem (v1.0.25)

- **Added**: botón pequeño **10k** junto a Redondeo en cada ítem; redondea (base + mayor valor) a la siguiente decena de mil solo para ese servicio.

## 2026-07-27 — Header del carrito en una línea (v1.0.24)

- **Changed**: encabezado en una sola línea (`Mi Carrito · N items · asesor`) para ganar altura útil.

## 2026-07-27 — Cliente, origen, CAR### y WhatsApp USD opcional (v1.0.23)

- **Added**: campo **CLIENTE:** arriba del carrito (va al historial; no a WhatsApp).
- **Added**: en el resumen, **Origen** desde el vuelo del carrito (Medellín/Bogotá/etc.).
- **Changed**: cotizaciones con prefijo **CAR001**; el # ya no se quema al cambiar de página ni se duplica al re-copiar (upsert).
- **Changed**: conversión COP↔USD en WhatsApp es un **chulito** (apagado por defecto).
- **Changed**: Tipo TA lista **Ida y vuelta** primero; al vaciar el carrito vuelve a ida y vuelta.
- **Docs**: `docs/CONTEXT.md` — cliente, origen, `CAR###`, USD opcional.

## 2026-07-27 — Mayor valor y redondeo por ítem (v1.0.22)

- **Added**: en cada servicio del carrito (hotel, vuelo, traslado, actividad, seguro) campos **Mayor valor** y **Redondeo**; el total del ítem = base (+ TRM si aplica) + ambos.
- **Changed**: el subtotal del carrito suma esos totales por ítem; los fees del gran total (mayor valor cobrado / redondeo / TA) se mantienen.
- **Docs**: `docs/CONTEXT.md` documenta ajustes por ítem vs fees del Total.

## 2026-07-27 — Aviso visual en precarga de búsqueda (v1.0.21)

- **Changed**: el banner “Precargamos fecha… de tu búsqueda anterior” muestra un **▲ rojo** de advertencia (sin cambiar la precarga).

## 2026-07-27 — Suplemento TRM (v1.0.20)

- **Added**: en Config → **Suplemento TRM** (default **150** COP); se suma a la TRM del día al convertir ítems USD → COP y en TA internacional / cotización.
- **Changed**: el carrito muestra la TRM usada = día + suplemento; en Total aparece el desglose cuando hay USD.

## 2026-07-24 — Avianca: jóvenes/niños/bebés en TA (v1.0.19)

- **Fixed**: en Avianca se leen **Jóvenes** además de adultos/niños/bebés (chip `.passenger-info`); TA × pasajeros suma todos.
- **Fixed**: el chip DOM tiene prioridad sobre `digitalData` incompleto (antes solo quedaban los adultos).

## 2026-07-24 — Avianca pax + Total (valor/pax y redondeo) (v1.0.18)

- **Fixed**: Avianca lee **adultos/niños/bebés** desde `.passenger-info` (ej. “5 Adultos”); el fallback DOM ya no dejaba pax en 0.
- **Changed**: en Total, **Redondeo** queda abajo (antes del total); se muestra **Valor por pasajero** además del total del grupo.

## 2026-07-24 — TA, TRM dolar-colombia y cotización DESTINO (v1.0.17)

- **Added**: en Config → **Tarifa administrativa (TA)** anual: nacional ida-vuelta (85.000), solo ida (42.500), internacional (30 USD).
- **Added**: en Total → tipo TA, **Valor de TA**, línea **TA × pasajeros** sumada al gran total (botón “Según vuelo”).
- **Changed**: TRM se obtiene de [dolar-colombia.com](https://www.dolar-colombia.com/) (botón **TRM web**); ya no BanRep/datos.gov.
- **Fixed**: inputs TRM / fees / Valor de TA no pierden el foco al tipear (bloqueo de re-render).
- **Changed**: WhatsApp usa `🌴 DESTINO …` (sin “COTIZACIÓN”), orden: encabezado → incluye → no incluye → vuelos/servicios/hotel → notas.

## 2026-07-24 — Multi-habitación pax + input Mayor valor (v1.0.16)

- **Fixed**: búsquedas con 2+ habitaciones (ej. 5 adultos + 1 niño en 2 hab.) ya no se reducen a solo la habitación 1 cuando “Modificar Búsqueda” está colapsado.
- **Fixed**: en **Mayor valor cobrado** / Redondeo / TRM se puede escribir el número completo sin perder el foco tras cada dígito (eco de `chrome.storage` ya no re-renderiza el input).
- **Fixed**: edades de niños en `window.data` con formato `{ age: "10" }` se leen bien al armar el hotel.

## 2026-07-24 — Cotización WhatsApp: orden y secciones vacías (v1.0.15)

- **Changed**: TRM va justo debajo de la fecha de cotización; sin destino el título es solo *COTIZACIÓN* (ya no “- DESTINO”).
- **Changed**: se oculta el bloque de itinerario aéreo si no hay vuelo; depósito vacío y “hotel pendiente” ya no se muestran.
- **Changed**: orden del mensaje: **tarifa incluye** → **plan no incluye** → ítems/tarifas con valor → **nota importante** al final.
- **Docs**: `docs/CONTEXT.md` actualizado con el nuevo orden de la cotización.

## 2026-07-24 — TRM oficial BanRep vía datos.gov.co (v1.0.14)

- **Added**: el carrito carga la **TRM del día** desde el dataset oficial (BanRep en [datos.gov.co](https://www.datos.gov.co/resource/32sa-8pi3.json)); botón **BanRep** para forzar actualización; enlace a la [serie Suameca](https://suameca.banrep.gov.co/estadisticas-economicas/informacionSerie/1/tasa_cambio_peso_colombiano_trm_dolar_usd).

## 2026-07-24 — Actividades/seguros, TRM, historial y log (v1.0.13)

- **Added**: botón GT en **actividades** y **seguros** de BookingMotor (traslados ya existía); sync de fechas/pax también hacia esos formularios.
- **Added**: TRM editable arriba del carrito; si hay USD+COP en la página se infiere; cotización WhatsApp muestra equivalente COP/USD.
- **Changed**: WhatsApp con **# consecutivo + nombre de asesor** (navbar BM); se quitó el destino duplicado (queda solo en el título).
- **Added**: pestaña **Historial** (búsquedas/ítems en `chrome.storage`, base para Postgres después).
- **Added**: log de app en **Opciones de la extensión** (`chrome://extensions` → Detalles) + consola del service worker.

## 2026-07-23 — Cotización WhatsApp: destino, noches, pax y total (v1.0.12)

- **Changed**: destino en **MAYÚSCULAS**; arriba agrega **noches** y **viajeros** (ej. 4 adultos, 2 niños, 1 bebé); además de tarifa por persona muestra el **total del grupo**.

## 2026-07-23 — Un solo carrito entre pestañas (v1.0.11)

- **Fixed**: el carrito GT se sincroniza en vivo entre sitios (BookingMotor, Avianca, Wingo, etc.) vía `chrome.storage.onChanged` — ya no hace falta refrescar la página para ver lo agregado en otra pestaña.

## 2026-07-23 — WhatsApp sin hotel fantasma + ancho del carrito (v1.0.10)

- **Fixed**: la cotización WhatsApp ya no muestra hotel/tarifa de acomodación si no hay hotel en el carrito; solo “Hotel pendiente” + tarifa del total cotizado.
- **Added**: botón `‹‹` / `››` en el encabezado para **ampliar/reducir** el ancho del panel (340px ↔ 520px).

## 2026-07-23 — Carrito: colapsar ítems + reset al vaciar (v1.0.9)

- **Added**: en Productos, cada ítem (hotel/vuelo/traslado) se puede **expandir/recoger** con `+` / `−` (por defecto compacto; el recién agregado abre expandido).
- **Changed**: **Vaciar carrito** también limpia el encabezado de búsqueda y pone en **0** Mayor valor cobrado y Redondeo (nuevo cálculo).

## 2026-07-23 — Wingo: botón junto al Total del resumen (v1.0.8)

- **Changed**: el botón GT en Wingo se monta **arriba del Total** en `w-mo-total-purchase` / resumen de compra (no en el footer ni solo en el header).

## 2026-07-23 — Wingo: botón más visible (v1.0.7)

- **Fixed**: el botón GT en Wingo podía quedar oculto bajo el header/footer fijos. Ahora es **amarillo**, se monta en el header junto a Total (o top-left bajo el header), con reintentos por si Angular lo desmonta.

## 2026-07-23 — Wingo: botón en Vuelos / Tus vuelos (v1.0.6)

- **Added**: scrape live Wingo (`npm run scrape:wingo`) + análisis de `Wingo.html`; API `gateway.wingo.com/routes-api/fares`.
- **Added**: `WingoFlightReader` + botón púrpura **Agregar al Carrito GT** en `booking.wingo.com/.../search/...` (lee URL + Total del header / resumen; pide ida+vuelta si Total es 0).

## 2026-07-23 — Avianca: botón en resumen del viaje (v1.0.5)

- **Added**: integración Avianca en `/av/booking/trip?cartId=…` — `AviancaFlightReader` + botón **Agregar al Carrito GT** (usa `digitalData` o DOM `bound-displayer-pres`).
- **Added**: dominios `*.avianca.com` y `*.wingo.com` en manifest/popup; script `npm run scrape:avianca:trip`.
- **Note**: el carrito se engancha en la página de **resumen** (no en todos los pasos previos).

## 2026-07-23 — Scraper Avianca (investigación)

- **Added**: `scraper/avianca.ts` + `npm run scrape:avianca` (búsqueda default CLO→MDE, 29-jul / 08-ago 2026, 2 ADT + 1 CHD + 1 INF; captura HTML/PNG/JSON de red).
- **Added**: `npm run scrape:avianca:analyze` sobre `Avianca.html` (confirma IBE multi-paso `availability-nbfob/ib/conf`, `cartId`).
- **Docs**: headless en avianca.com suele bloquear el widget; conviene correr **sin** `--headless` en el PC. Priorizar Wingo para el carrito.

## 2026-07-21 — Pestañas en el carrito (v1.0.4)

- **Changed**: el panel del carrito se organiza en pestañas **Productos / Total / WhatsApp** para no saturar la vista; la cotización WhatsApp vive en su propia pestaña.

## 2026-07-18 — Redondeo aparte + texto WhatsApp visible (v1.0.3)

- **Changed**: campo **Redondeo** separado de **Mayor valor cobrado** (este último queda para ajustes del asesor). El botón Redondear solo llena Redondeo.
- **Changed**: cotización WhatsApp muestra el texto verde listo para pegar al abrir la sección; Copiar con fallback Ctrl+C.

## 2026-07-18 — Fix: content.js IIFE (v1.0.2)

- **Fixed**: el content script se construye como **IIFE autocontenido** (sin `import` a `quoteConfig.js`). `type: module` no bastaba en algunos Chrome; build en dos pasos (`vite` + `vite.content.config.ts`). Versión `1.0.2`.

## 2026-07-18 — Fix: extensión no cargaba en BookingMotor

- **Fixed**: `content.js` importaba `quoteConfig.js` (code-split de Vite) sin `"type": "module"` en el manifest → el content script fallaba al parsear y el carrito no aparecía. Se añade `"type": "module"` y versión `1.0.1`.

## 2026-07-18 — Cotización WhatsApp + config incluye/no incluye

- **Added**: líneas de cotización (incluye / no incluye / políticas) en `chrome.storage` con defaults GT; editables en popup **Config**.
- **Added**: sección **Cotización WhatsApp** en el carrito: checkboxes, vista previa y **Copiar** (gran total + plantilla con emojis).
- **Added**: pestaña **Cambios** en el popup (lee `CHANGELOG.md`).
- **Docs**: CONTEXT y changelog; PDF/PostgreSQL quedan para después.

## 2026-07-18 — Carrito GT: branding, dominios, mayor valor y redondeo

- **Changed**: botones de captura pasan a **Agregar al Carrito GT** (XNet/Despegar; BookingMotor muestra `+ 🛒 GT` + title).
- **Added**: popup de la extensión (`public/popup.html`) con pestaña de dominios habilitados (BookingMotor, Despegar, XNet, local).
- **Changed**: fee único **Mayor valor cobrado** (default 0); se elimina fee de ejemplo 2.
- **Added**: botón **Redondear** en el total — sube a la siguiente decena de mil (ej. 1.986.700 → 1.990.000) y escribe el excedente en Mayor valor cobrado / línea sobre el total.
- **Docs**: CONTEXT actualizado (fees + popup).

## 2026-07-18 — Log de cambios del proyecto

- **Docs**: se crea este changelog (`docs/CHANGELOG.md`) y regla de Cursor para documentar cada cambio relevante.
- **Docs**: se enlaza el changelog desde `README.md` y `docs/CONTEXT.md`.

## 2026-07-18 — WIP (sin commit): vuelos Despegar/XNet y Sync

Trabajo en curso según working tree (aún no consolidado en commit):

- **Added**: lectores/inyectores de vuelos para Despegar y XNet (`DespegarFlightReader`, `DespegarFlightUIInjector`, `XNetFlightReader`, `XNetFlightUIInjector`).
- **Added**: sincronización de búsqueda entre pestañas BookingMotor (`SearchSyncController`, `BookingMotorSearchFormSync`).
- **Added**: scraper Playwright (`scraper/`) y fixtures HTML de Despegar/Santur.
- **Changed**: `content.ts`, `bridge.ts`, `types.ts`, `CartSidebar.ts`, `manifest.json`.

## 2026-07-10 — Fase carrito, traslados, fees y scraper

Estado documentado en README/CONTEXT (post–commit inicial; parte puede estar solo en docs/working tree):

- **Added**: captura de traslados (`#list-transfer-items`) con botón por tarjeta.
- **Added**: carrito lateral Shadow DOM con persistencia `chrome.storage.local`.
- **Added**: resumen de búsqueda en encabezado del carrito (`tce_last_search`).
- **Added**: scaffold de fees editables en el total (`tce_fees`).
- **Added**: scraper Playwright para capturar páginas vivas de BookingMotor.
- **Changed**: fallback DOM si el bridge no entrega `window.data` (evita “0 noches · 0 adultos”).
- **Docs**: `docs/CONTEXT.md` como contexto operativo para agentes/devs.

## 2026-07-10 — Commit inicial

- **Added**: extensión MV3 base para BookingMotor: extracción de hoteles (JS + DOM), inyección **+ 🛒** por tarifa, build Vite, fixtures y tests scratch.
- **Docs**: README y guía de setup de GitHub.
