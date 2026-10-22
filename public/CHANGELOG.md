# Changelog — Travel Cart Assistant

Registro de cambios del proyecto. **Más reciente arriba.**

Formato por entrada:

```markdown
## YYYY-MM-DD — Título corto

- **Added** / **Changed** / **Fixed** / **Docs**: descripción en una línea (por qué / efecto).
```

---

## 2026-10-21 — Guía de uso API (compartible)

- **Docs**: `api/GUIA_USO.md` — tokens, auth, endpoints y ejemplos para pasar al equipo.

## 2026-10-21 — API FastAPI car_* (docs; extensión intacta)

- **Added**: carpeta `api/` — FastAPI 0.1.0 + SQL `car_*` (Postgres Chat Center), auth por token, deploy/seguridad documentados. **No cambia** el código de la extensión.
- **Docs**: `api/README.md`, `api/DEPLOY.md`, `api/SECURITY.md`, `api/CHANGELOG.md`.

## 2026-10-21 — Isabela fucsia + CAR# en oportunidad (v1.1.59)

- **Changed**: **Abrir Isabela** en color fucsia suave; en el modal queda a la **derecha** de «Respuesta al cliente» (ya no debajo del título).
- **Added**: en el badge amarillo «Oportunidad de venta #N» del chat, botón **Isabela** a la derecha.
- **Added**: junto al título del modal se muestra el nº local **CAR…** del carrito (placeholder hasta tablas `car_*`).

## 2026-10-21 — Abrir Isabela en Conversaciones (v1.1.58)

- **Added**: en [Conversaciones](https://chatcrm.grupostravel.com/conversaciones), botón **Abrir Isabela** en el header del chat (junto al contacto).
- **Changed**: en el modal, el botón va a la izquierda de **Oportunidad de venta #N** (y abre `reservas.grupostravel.com/es/backoffice`).

## 2026-10-21 — Abrir Isabela en ventana de oportunidad (v1.1.57)

- **Added**: en el modal de oportunidad (Conversaciones), botón **Abrir Isabela** a la izquierda de «Mensajes de la solicitud» → abre BookingMotor (`reservas…/book/new`).
- **Fixed**: «Enviar a Chat Center» pega en **Respuesta al cliente** (no en el composer «Escribe un mensaje…») y prioriza la pestaña Conversaciones.

## 2026-10-21 — Chat Center + Contacto + tab arrastrable (v1.1.56)

- **Added**: botón **Enviar a Chat Center** (carrito y panel) pega la cotización WhatsApp en el textarea de la oportunidad abierta en `chatcrm.grupostravel.com/oportunidades`.
- **Added**: al abrir una oportunidad, el nombre de **Contacto** del modal se sincroniza al campo Contacto del carrito.
- **Changed**: el campo del header pasa de «Cliente» a **Contacto** y queda **primero** (antes de Agencia).
- **Changed**: la pestaña azul **Asistente** se puede arrastrar arriba/abajo (posición guardada).

## 2026-10-16 — Comisión sin % en WhatsApp (v1.1.55)

- **Changed**: el mensaje de comisión solo muestra el **valor** por opción (sin “10%” / “12%”).

## 2026-10-16 — Comisión en mensaje WhatsApp aparte (v1.1.54)

- **Changed**: la comisión aproximada **ya no va** en la cotización WhatsApp del pasajero ni en el PDF; aparece en un **segundo cuadro** (ámbar) con **Copiar comisión** para pegarla en otro mensaje (confidencial).

## 2026-10-16 — SGL+niño y comisión aproximada (v1.1.53)

- **Added**: sonda BM / mix **SGL + SGL+niño** (1 adulto, o 1 adulto + niño) para derivar SGL y CHD, igual que DBL/TPL/QPL+niño.
- **Added**: en Acomodación, opción **Incluir valor aproximado de comisión** (debajo del total del mix): freelance 10% o agencia 12%; base sobre el mix **sin aéreos ni bloqueos** (requiere total del mix).
- **Docs**: ayuda mayorista actualizada con la casilla de comisión.

## 2026-09-07 — Acomodación QPL / cuádruple (v1.1.52)

- **Added**: en Acomodación el tipo **QPL · 4 adultos**; totales del mix, WhatsApp/PDF y mayor valor usan `qplPp` cuando el cliente viaja en cuádruple.
- **Docs**: en combinados multi-hotel, cada opción suma hospedaje A+B (o C+D) por acomodación; aéreo/traslados/seguros siguen una sola vez (como v1.1.49).

## 2026-09-07 — Vuelo $/persona = asientos de la aerolínea (v1.1.51)

- **Fixed**: el total del vuelo (Wingo, Avianca, JetSMART, Arajet, XNet) se divide por los **asientos de esa búsqueda** (ej. 10 × $200.000 → $200.000 pp), no por el pax de Acomodación (ej. 5). Ese $/pp se suma a SGL/DBL/TPL/CHD de cada opción; el total del grupo usa el mix de acomodación. Mismo criterio en carrito, panel, WhatsApp y PDF.

## 2026-09-04 — Incluye: traslados y asistencias solo si hay ítem (v1.1.50)

- **Fixed**: en WhatsApp/PDF, «Traslados Aeropuerto…» y «Asistencias médicas» solo aparecen si el carrito tiene traslado o seguro; si el chip está en rojo, no salen en *TARIFA INCLUYE*.

## 2026-09-04 — Combinado multi-hotel: servicios una sola vez (v1.1.49)

- **Fixed**: en una opción con **varios hoteles** (combinado: p. ej. 2 noches + 2 noches), WhatsApp/PDF suman SGL/DBL/TPL/CHD de cada hotel + kits de traslado, y los servicios compartidos (vuelo, seguro, TA…) se suman **una sola vez** (antes se multiplicaban por el nº de hoteles).

## 2026-09-04 — Historial export, TA bloqueo, combos→actividades (v1.1.48)

- **Changed**: botones **Exportar historial** / **Importar historial** más claros en carrito y panel.
- **Fixed**: con **bloqueo/circuito aéreo** el chip Vuelo/Bloqueo queda en verde y la **TA = 0** (ya viene en el bloqueo); TA solo se suma con vuelo de aerolínea.
- **Fixed**: traslado **combo** con tours marca **Actividades** en verde y suma la cantidad de tours del combo a la cobertura.

## 2026-09-04 — CHD USD, destino fijar, TPL/QPL+niño, combo, bloqueo (v1.1.47)

- **Fixed**: tarifa NIÑO en WhatsApp/PDF cuando el vuelo (p. ej. Wingo) está en COP y el carrito en USD — el desglose CHD se escala con el total convertido (ya no aparece `USD 1.383.799`).
- **Added**: botón **Fijar** / **Fijado** junto al destino (carrito y panel) para que búsquedas BM posteriores no cambien Jamaica→San Andrés, etc.; al desfijar vuelve a sincronizar o se edita a mano.
- **Added**: sondas **TPL+niño** y **QPL/cuádruple+niño** (CHD = resta vs TPL/QPL ÷ niños), además de DBL+niño; fixtures `tpl+chd.html` / `QDPl+chd.html`.
- **Changed**: pestaña **Acomodación** visible en mayorista desde el inicio (sin esperar productos) para fijar el mix de personas.
- **Fixed**: combos de traslado Santa Marta / estilo `TRANSFER IN+OUT + tours` se desglosan bien (traslado vs tours/actividades).
- **Fixed**: bloqueo aéreo usa precio **Individual** del paso 2 como $/persona (no total÷pax de acomodación); en USD sigue redondeo a 2 decimales.
- **Docs**: historial — Chrome lo borra al *quitar* la extensión; usar Reload + Exportar JSON. Panel/PDF en otros PCs: recargar la pestaña BM tras Reload de la extensión.

## 2026-09-01 — Tipo habitación + panel ↗ (v1.1.46)

- **Fixed**: carrito, WhatsApp y PDF vuelven a mostrar el **tipo de habitación** BM (Estándar, Vista al Mar Queen, etc.) aunque venga con prefijo `1 x …`; «Solo habitación» / ROOM ONLY sigue como **alimentación**, no como nombre de habitación.
- **Fixed**: botón **↗ Abrir panel** — fallback por enlace directo si el service worker no responde; el popup abre la pestaña con `tabs.create` directo.

## 2026-08-31 — Carrito siempre ancho (v1.1.45)

- **Changed**: el carrito lateral abre siempre en ancho (700px); se quitó el botón de ampliar/reducir.

## 2026-08-31 — Prefill editable + CHD ÷ n niños (v1.1.44)

- **Fixed**: en Hoteles y Seguros el prefill de fechas/pax ya no se rebloquea al cambiar de pestaña ni al editar acomodación; el asesor puede cambiar fechas y personas. Solo se vuelve a empujar si cambian fechas/origen/destino del viaje (Guardar) o si el formulario quedó vacío.
- **Fixed**: sonda DBL + DBL con 2 niños: la diferencia de habitación se **divide entre el número de niños** para la tarifa CHD de 1 niño.

## 2026-08-31 — Acomodación primero + CHD con hotel $0 (v1.1.43)

- **Changed**: pestaña **Acomodación** otra vez primera en carrito y panel (mayorista).
- **Fixed**: si la sonda DBL+niño da el mismo total que DBL (CHD hotel = 0), la tarifa pp **NIÑO** sigue apareciendo en totales / WhatsApp / PDF como suma de servicios (aéreo, traslado, seguro…); el niño cuenta como persona en esos ítems.

## 2026-08-31 — Historial persistente + menú panel = carrito (v1.1.42)

- **Fixed**: historial con espejo de respaldo en storage; al actualizar se rehidrata si la clave principal quedó vacía. Errores de escritura ya no se silencian del todo.
- **Added**: Exportar / Importar JSON del historial (carrito y panel) — sobrevive a quitar y volver a cargar la extensión unpacked.
- **Changed**: panel ↗ con las mismas pestañas que el carrito: Productos, Total, WhatsApp, Acomodación, Historial (+ Dashboard y Config).
- **Docs**: WhatsApp/PDF siguen la misma base compartida (`QuoteBuilder` / `QuotePdf`) desde carrito y panel (mayor valor, redondeo, acomodación, bloqueo).

## 2026-08-31 — Ayuda mayorista y manual (v1.1.41 docs)

- **Docs**: `wholesale-help.html` reescrito — orden hotel/vuelo, chips Acomodación, bloqueo, redondeo …9 en Tarifa pp, mayor valor en WA/PDF, historial.
- **Docs**: `manual/index.html` — flujo, carrito, cotizar y FAQ alineados a v1.1.38–1.1.41.

## 2026-08-31 — Fechas vuelo → otros ítems BM (v1.1.41)

- **Fixed**: si se agrega **vuelo/bloqueo primero**, las fechas (y pax) se empujan a Hoteles/Traslados/Seguros/Actividades en BM igual que al Guardar viaje desde hotel (antes el prefill no pisaba fechas por defecto de BM).
- **Fixed**: si la guía ya existía sin fechas, el primer vuelo completa ida/regreso/origen.

## 2026-08-31 — Textos Acomodación y WhatsApp (v1.1.40)

- **Changed**: en Acomodación, etiqueta **Redondeo. Automático (Tarifa pp …9)**.
- **Changed**: incluye WhatsApp **Tiquetes aéreos** (sin “+ equipaje”); se migra la línea guardada si tenía el texto viejo.
- **Changed**: se quitó del WhatsApp la nota de vuelos comerciales / aerolínea al confirmar.

## 2026-08-31 — Bloqueo aéreo: $/pp en acomodaciones + texto WA/PDF (v1.1.39)

- **Fixed**: bloqueo (circuitos) ya no usa celdas DBL/TPL/QDP de BM como $/persona (eran totales de habitación); el share es **total ÷ pax que pagan** y se suma bien a las tarifas de acomodación.
- **Changed**: WhatsApp/PDF muestran el bloqueo como itinerario aéreo (nombre, salida, regreso, incluye artículo personal) **sin precio**.
- **Added**: lectura de maleta/artículo personal y fecha de regreso en español desde el tour-process.

## 2026-08-31 — Mayor valor en WA/PDF, panel ↗, Acomodación primero (v1.1.38)

- **Fixed**: **Mayor valor cobrado** (y redondeo de fees) ya se refleja en **WhatsApp y PDF** mayorista, igual que en Comparar opciones (antes se forzaba a 0).
- **Fixed**: botón **↗ Abrir panel** — permiso `tabs` + apertura más robusta vía service worker.
- **Changed**: pestaña **Acomodación** va primero (carrito y panel).
- **Added**: chip **(Acomodación 5A + 1N)** primero en faltantes; rojo hasta que se modifique el mix (por defecto muestra 2A); verde al tocar habitaciones/niños.

## 2026-08-31 — Avianca: botón carrito (v1.1.37)

- **Fixed**: botón **Agregar al Carrito GT** en resumen Avianca — se re-monta si Angular quita el nodo, anclas nuevas (`.direct-book-container`, `.trip-summary-block`) y fallback fijo abajo a la derecha con z-index visible.
- **Changed**: `initAvianca` reintenta inyección a 500 ms–6 s como Wingo/JetSMART.

## 2026-08-31 — Tarifa NIÑO: negativa y USD exorbitante (v1.1.36)

- **Fixed**: tarifa **NIÑO/CHD** ya no muestra valores negativos (BM a veces devuelve DBL+niño más barato que DBL).
- **Fixed**: al pasar a **USD**, el suplemento niño ya no queda en magnitud COP (ej. 519.000 mostrado como miles de USD); se convierte con TRM o se descarta si es incoherente.
- **Changed**: al cargar el carrito se reparan tarifas de hotel guardadas con CHD corrupto.

## 2026-08-29 — Totales: aumento del redondeo …9 (v1.1.35)

- **Added**: en Totales (carrito y panel) se muestra el incremento por **Redondeo …9** de cada acomodación (SGL/DBL/TPL/CHD) y opción, cuando aplica a la Tarifa pp.

## 2026-08-29 — Redondeo en Tarifa pp (paquete) (v1.1.34)

- **Changed**: el …9 aplica a la **Tarifa pp** de opciones/totales (hotel + servicios) que van a PDF y WhatsApp, no al valor solo del hotel.
- **Changed**: bajo mayor por acomodación se muestra **Sonda** (original BM) y, si hay mayor, **Hotel + mayor**; Restablecer vuelve a la sonda.
- **Changed**: **Red. Automático** (on por defecto) redondea Tarifa pp; si se apaga, solo al pulsar **Redondeo …9**.

## 2026-08-29 — Redondeo: etiqueta + Red. Automático (v1.1.33)

- **Changed**: botón de redondeo por acomodación muestra **Redondeo …9** / **…9.000** (ya no solo «…9»).
- **Changed**: control **Red. Automático** (on por defecto): con auto, las tarifas pp se redondean solas; si se apaga, solo al pulsar Redondeo.
- **Fixed**: la guía bajo mayor por acomodación muestra **Actual** (valores vivos) y, si difiere, **Sonda** (baseline BM) — antes parecía que el redondeo no aplicaba.

## 2026-08-29 — Opciones: kit traslado + mayor en subtotales (v1.1.32)

- **Fixed**: en Totales, traslado de **kit** solo suma a la opción de su hotel; traslado suelto (como vuelo/seguro) suma a todas.
- **Fixed**: **Mayor valor** / redondeo global se suman a cada subtotal de opción (antes no se veía el cambio en Vista de montos).
- **Changed**: filas «Vista de montos» y «Subtotal Opción N» en negrita (carrito y panel).

## 2026-08-29 — Briefing en una fila + total hotel con pax (v1.1.31)

- **Changed**: Origen / Destino / Ida / Regreso / Noches en **una sola fila** (campos más cortos) en carrito y panel.
- **Changed**: al expandir un hotel, el total se muestra como `pp × N personas = total` según la ocupación de esa sonda BM (también en mayorista).

## 2026-08-29 — Totales más compactos al ampliar (v1.1.30)

- **Changed**: desglose de Total (carrito y panel) con columnas fijas y `max-width` ~420px: los montos quedan tabulares a la derecha sin alejarse al ampliar el panel.

## 2026-08-29 — Advertencias en botón compacto (v1.1.29)

- **Changed**: las advertencias mayorista ya no ocupan filas bajo la cobertura: botón **⚠ N** arriba a la derecha (titila si hay avisos); al clic se abre el panel con mensaje + solución + ×.
- **Changed**: se quita el tip fijo «Destino = ciudad BM…» del briefing (sigue en la ayuda **?**).

## 2026-08-29 — Ayuda HTML alineada a historial y mayorista (v1.1.28 docs)

- **Docs**: `wholesale-help.html` — acomodación (mayor por tier, redondeo auto, checks, desglose asesor) e historial (autosave + restaurar).
- **Docs**: `manual/index.html` — sección Historial, flujo/carrito/cotizar/FAQ al día (v1.1.28+).

## 2026-08-28 — Aviso: un solo seguro para todas las opciones (v1.1.28)

- **Added**: si hay 2+ seguros en el carrito, advertencia «Debería ser solo uno para todas las opciones de hotel» con solución de dejar uno y eliminar el resto.

## 2026-08-28 — Más reglas de advertencia mayorista (v1.1.27)

- **Added**: avisos de fechas vuelo ≠ hotel/guía (ida y regreso), vuelo solo ida con hoteles de ida/vuelta, seguro/actividad con pax distinto al mix, opción con 2+ hoteles, y redondeo automático sin baseline (Restablecer inútil).

## 2026-08-28 — Advertencias con ✕, solución y más reglas (v1.1.26)

- **Added**: cada advertencia del semáforo tiene botón **×** para cerrarla (se recuerda hasta Nueva búsqueda / Vaciar) y un bloque **Solución:** con la acción recomendada.
- **Added**: más reglas de aviso mayorista (cobro doble kit+suelto, hotel sin traslado cuando otras opciones sí, opción vacía, mix de acomodación faltante, tarifas pp faltantes, USD sin TRM).

## 2026-08-28 — Vista cliente vs desglose asesor (v1.1.25)

- **Changed**: en Acomodación, la vista principal muestra solo lo que ve el cliente (tarifas pp SGL/DBL/TPL/CHD y, si está marcado, «Valor para N adultos… (En acomodación …) = $»). El desglose original / …9 / mayor / TA queda en un acordeón «Desglose asesor (no va al cliente)».
- **Changed**: WhatsApp y PDF usan el mismo texto de total del mix; no incluyen el desglose interno del asesor.

## 2026-08-28 — Historial + sync carrito ↔ panel (v1.1.24)

- **Added**: autosave en historial (debounce ~2 s) al editar carrito, fees, opciones o «Incluir total» — la cotización activa (CAR###) se puede restaurar sin copiar WA/PDF.
- **Added**: historial guarda y restaura redondeo automático, TRM en cotización y equivalente USD, además de tarifas pp (`occupancyRates` + baseline), opciones de hotel y mayor/redondeo.
- **Changed**: panel asistente refresca comparador y pestaña Acomodación cuando el carrito lateral cambia vía storage.

## 2026-08-28 — Desglose mayorista + Restablecer + advertencias traslado (v1.1.23)

- **Added**: tabla de desglose por opción (original, …9, mayor, servicios/kit, TA, total por acomodación) en pestaña **Acomodación** del carrito y panel asistente.
- **Added**: advertencias junto al semáforo de cobertura cuando un traslado fuera del kit se suma a todas las opciones (riesgo de cobro doble).
- **Added**: con **Incluir total en WA/PDF**, texto «Valor para N adultos + M niños (mix) = $…».
- **Fixed**: **Restablecer** tarifas hotel ya no re-aplica redondeo automático encima del baseline restaurado.
- **Fixed**: doble conteo en totales mayorista (`ratesDisp` antes de `adjPp`; mayor global no duplicado en pestaña Total).
- **Changed**: mayor valor global y redondeo manual ocultos en pestaña Total en modo mayorista (ya van en el desglose pp).

## 2026-08-28 — Chulito BM se quita al eliminar del carrito (v1.1.22)

- **Fixed**: al borrar un producto del carrito (sidebar o panel), desaparece también su check rojo en la página BookingMotor. Sigue limpiándose todo con **Nueva búsqueda**.

## 2026-08-28 — Chulito BM al clic + limpia en Nueva búsqueda (v1.1.21)

- **Changed**: el check rojo en BookingMotor aparece al pulsar **+ 🛒 GT** (no por cruce con el carrito). **Nueva búsqueda** quita todos los chulitos visibles en la página BM.

## 2026-08-28 — Chulito rojo en BM para ítems en carrito (v1.1.20)

- **Added**: en resultados BookingMotor (hotel, traslado, actividad, seguro, circuito), un check rojo en la esquina superior derecha del ítem ya agregado al carrito GT. Se actualiza al agregar/quitar y al filtrar la búsqueda.

## 2026-08-28 — Redondeo automático acomodación + reset suplemento TRM (v1.1.19)

- **Added**: en pestaña **Acomodación**, check **Redondeo automático** (activo por defecto). Aplica …9 a tarifas pp SGL/DBL/TPL/CHD al cargar sondas, mayor valor o edición manual; al desmarcar restaura valores base.
- **Changed**: **Nueva búsqueda** resetea el suplemento TRM a **0** (carrito y panel).

## 2026-08-28 — Colchón TRM línea a línea (v1.1.18)

- **Changed**: con suplemento TRM, los precios de servicios (ítems y tarifas pp) se inflan línea a línea: `USD_cliente = base × (día+sup)/día` (ej. 1000 → 1031.80 con +100). Equivalente en COP. Mayor valor / redondeo / TA siguen aparte (sin volver a aplicar el colchón).
- **Docs**: fórmula del colchón en CONTEXT.

## 2026-08-28 — Cobertura de cotización + TRM en PDF/WA + Mayor solo tiers (v1.1.17)

- **Added**: bajo **Guía**, chips `(Vuelo/Bloqueo)` `(Hotel)` `(Traslados)` `(Seguros)` `(Actividades)` — rojo suave si falta, verde suave con conteo si ya hay (p. ej. `Hotel 2`).
- **Added**: en Acomodación, check **Mostrar TRM del día en PDF y WhatsApp** (apagado por defecto). Nunca muestra el suplemento al cliente; historial sigue guardando TRM día + suplemento.
- **Fixed**: en Comparar, **Mayor valor** solo para acomodaciones con tarifa (si solo hay DBL, no aparecen SGL/TPL/CHD).

## 2026-08-28 — TRM: inputs un poco más anchos

- **Changed**: campos TRM / suplemento un poco más anchos en carrito y panel para que se vea completo un valor tipo `3144.28`.

## 2026-08-28 — Fechas editables sin snap-back (v1.1.16)

- **Fixed**: en formularios BM, tras precargar fechas/pax ya no se reescriben si el asesor cambia una fecha (el “stale mark” del prefill solo reintenta si BM vació campos o faltan edades).
- **Fixed**: en carrito y panel, editar Ida/Regreso (u origen/destino) ya no vuelve a la fecha precargada al llegar un eco de storage / re-render.

## 2026-08-27 — Historial: depósito, TRM y PDF (v1.1.15)

- **Fixed**: al restaurar del historial vuelven **depósito inicial**, **TRM del día**, **suplemento TRM** y el check de total de acomodación (antes no se reaplicaban).
- **Changed**: **Descargar PDF** también archiva/actualiza la cotización en historial (como Copiar WhatsApp).
- **Docs**: `CONTEXT.md` — snapshot de historial documentado.

## 2026-08-27 — Mayor valor por acomodación + desglose en totales (v1.1.14)

- **Added**: **Mayor valor por tier** (SGL / DBL / TPL / CHD) en hotel y en comparar opciones (ya no un solo campo para todos).
- **Added**: en **Total**, sección **Desglose de costos** (servicios + tarifas pp + `DBL x n` / subtotal solo si hay plan de acomodación).
- **Changed**: mayor valor / redondeo / ajuste absorbido en tarifas se listan desglosados en totales.

## 2026-08-27 — Nueva búsqueda limpia + TRM suplemento + FX USD (v1.1.13)

- **Fixed**: **Nueva búsqueda** limpia también opciones de hotel y bloquea 4s el eco de BM (`tce_last_search`) que reponía el viaje.
- **Fixed**: conversión COP→USD ya no etiqueta pesos como dólares (causa de tarifas “millones USD”); corrige tasas mal etiquetadas al mostrar.
- **Added**: **suplemento TRM** editable junto a la TRM en carrito y panel, sin perder foco al escribir.

## 2026-08-26 — Aéreos Total ítem × personas (v1.1.12)

- **Changed**: aéreos muestran `Total ítem: USD 300 x 5 personas = USD 1.500` (pp × pax).
- **Changed**: con acomodación definida, el mismo desglose aplica al Total ítem de otros servicios (traslado, actividad, etc.).

## 2026-08-26 — Aéreos, hotel acomodación y totales (v1.1.11)

- **Changed**: aéreos ya no repiten **Equipaje incluido (viaje)** ni el precio debajo; muestran **Valor por persona** y **Valor N adultos M niño = total** (maletas siguen en ida/vuelta).
- **Changed**: mayor valor / redondeo con **Restablecer** y **Valor original: $ … / USD$ …**.
- **Changed**: hotel mayorista muestra tarifas pp (original + ajuste → modificado), **DBL/TPL/CHD x n = valor**, subtotal acomodación y régimen; se quitan inputs de sonda BM.
- **Changed**: en **Total** se listan mayor valor y redondeo **por servicio** junto con TA.

## 2026-08-26 — Seguros BM: edades 21 / 6 (v1.1.10)

- **Fixed**: pestaña **Seguros** rellena **Edad** tras cambiar pasajeros (reintentos + handler jQuery de BM).
- **Changed**: adultos → **21**; niños con edad del briefing o **6** si no hay dato.

## 2026-08-26 — Mayor valor por opción en comparar + Avianca z-index (v1.1.9)

- **Changed**: en **Comparar opciones**, mayor valor y **…9** por columna (suman a DBL/TPL/CHD); **Restablecer** con guía de valores BM.
- **Changed**: etiquetas acortadas a **Tarifa pp DOBLE** (etc.) en compare y productos.
- **Fixed**: botón Avianca ya no tapa el carrito lateral (z-index + esquina inferior izquierda).

## 2026-08-26 — WhatsApp maletas, scroll, mayor valor, Avianca, seguros, actividades (v1.1.8)

- **Changed**: WhatsApp itinerario aéreo muestra **maletas en ida y en regreso** (como el PDF).
- **Fixed**: el carrito/panel **conservan el scroll** al editar o redondear productos.
- **Changed**: **Mayor valor** del hotel mayorista se **suma a SGL/DBL/TPL/CHD** al salir del campo (igual espíritu que …9).
- **Fixed**: Avianca: maletas distintas por tramo (tarifa de cada bound, sin mezclar ida/regreso).
- **Fixed**: al abrir pestaña **Seguros** en BM se reaplican fechas/edades (adultos 18; niño sin edad → 6).
- **Changed**: actividades normalizan **$/persona** vs total de grupo; panel con mismos ajustes de acomodación.
- **Docs**: manual actualizado (mayor valor, Restablecer, maletas WA, seguros).

## 2026-08-26 — Restablecer tarifas, agencia y seguros (v1.1.7)

- **Added**: botón **Restablecer** en tarifas SGL/DBL/TPL/CHD con guía en letra pequeña de los valores previos (sonda BM / antes de editar o …9).
- **Changed**: **Nueva búsqueda** también borra el nombre de la agencia.
- **Changed**: pestaña **Seguros** BM: fechas del viaje; adultos edad **18**; niños con edad del briefing o **6** si no hay dato.

## 2026-08-26 — Redondeo …9 en todas las acomodaciones + Totales PDF (v1.1.6)

- **Fixed**: botón **…9** redondea **SGL, DBL, TPL y CHD** a la vez (no solo un valor / redondeo de línea).
- **Changed**: PDF **Totales** siempre se muestra en mayorista; el total grande en negrita solo si está marcado «Incluir este total» en Acomodación.

## 2026-08-26 — Nueva opción arriba + Mayor valor en totales (v1.1.5)

- **Added**: botón **+ Nueva opción** arriba en la pestaña Productos (carrito), además del de Comparar.
- **Changed**: **Mayor valor** en la sección TA y línea en Totales que se suma a los subtotales (siempre visible).

## 2026-08-26 — Carrito: colapsado, Acomodación, mayor valor y redondeo …9 (v1.1.4)

- **Changed**: productos nuevos (traslados, hoteles, etc.) entran al carrito **colapsados**.
- **Changed**: pestaña **Acomodación** va después de WhatsApp (carrito lateral y panel asistente).
- **Changed**: **Mayor valor** vive en la sección TA de Totales (también en mayorista).
- **Changed**: botón de redondeo del hotel `…9` — COP a decena de mil − 1.000 (p. ej. 1.259.000); USD a decena − 1 (p. ej. 1349).
- **Changed**: montos en dólares se muestran como **USD** (no US$).

## 2026-08-25 — PDF mapa tamaño anterior (v1.1.3)

- **Changed**: mapa del PDF vuelve al tamaño previo (~240px) para no empujar el resto del contenido.

## 2026-08-25 — PDF Tarifas/Totales títulos en negrita (v1.1.2)

- **Changed**: en Tarifas y Totales, «Opción N» y el nombre del hotel van en negrita como en Servicios.

## 2026-08-25 — PDF mapa un poco más grande (v1.1.1)

- **Changed**: mapa de hoteles en PDF con más altura (~360px pantalla / ~320px al imprimir).

## 2026-08-25 — PDF: COTIZACIÓN centrada + Opción/hotel (v1.1.0)

- **Added**: encabezado PDF con **COTIZACIÓN** + código asesor (2 letras + nº, p. ej. RO0001) centrado entre agencia y fecha.
- **Changed**: en Tarifas y Totales, «Opción N» a la izquierda y nombre del hotel a la derecha (sin la palabra Hotel).

## 2026-08-25 — PDF Totales: título con hotel en una línea (v1.0.99)

- **Changed**: en **Totales** el encabezado queda «Opción N Hotel: Nombre» en una sola línea.

## 2026-08-25 — PDF/WhatsApp: badges, maletas, tours y anexo (v1.0.98)

- **Changed**: PDF quita el círculo numerado en Tarifas, Servicios y Totales (basta «Opción N»).
- **Changed**: maletas solo en ida/regreso del bloque Vuelo; se elimina el resumen duplicado al final.
- **Changed**: asistencia muestra «Detalle completo en anexo.» solo si el anexo PDF está activado.
- **Changed**: tours en PDF/WhatsApp con viñeta (•) por cada tour cuando hay varios.

## 2026-08-25 — Tarifas mayorista: COP↔USD correctas (v1.0.97)

- **Fixed**: tarifas SGL/DBL/TPL/NIÑO en PDF, WhatsApp y carrito convertían mal al pasar a USD (hotel en COP + servicios en USD) → montos absurdos y niño negativo.
- **Changed**: se convierten tarifas de acomodación a la moneda de vista (TRM) antes de sumar shares; USD con 2 decimales; CHD no muestra negativo.

## 2026-08-25 — PDF Totales en columnas como Tarifas (v1.0.96)

- **Changed**: sección **Totales** del PDF usa el mismo grid de columnas que **Tarifas** (opción 1 | opción 2 lado a lado), no apiladas en filas.

## 2026-08-25 — PDF: Tarifas + Totales separados (v1.0.95)

- **Changed**: PDF **Tarifas** vuelve a mostrar solo tarifas pp por opción (sin total).
- **Changed**: PDF **Totales** (antes del depósito) — cuando está marcado «Incluir total»: pasajeros + acomodación, mismas tarifas y monto total grande en negrita por opción (precios duplicados a propósito).

## 2026-08-25 — WhatsApp/PDF: viajeros y tarifas con total (v1.0.94)

- **Changed**: WhatsApp mayorista muestra **Viajeros** (adultos/niños) solo cuando hay mix en **Acomodación**; sin acomodación no se inventa pax.
- **Changed**: sin marcar «Incluir total», WhatsApp/PDF muestran solo **Tarifas** por opción (SGL/DBL/TPL/NIÑO).
- **Changed**: al marcar el total, cada opción lleva pasajeros + acomodación en una línea, tarifas debajo y **TOTAL** al final (PDF integrado en Tarifas; desaparece sección Totales duplicada).

## 2026-08-25 — Checkbox total acomodación persiste y sincroniza (v1.0.93)

- **Fixed**: «Incluir este total en WhatsApp / PDF» se guarda en `tce_occupancy_total_open` y se sincroniza entre carrito lateral, panel asistente y pestañas BM.
- **Changed**: al vaciar carrito / nueva búsqueda el check vuelve a desmarcado.

## 2026-08-25 — PDF maletas, print CSS, subtotales por opción (v1.0.92)

- **Fixed**: bloque **Vuelo** en PDF muestra equipaje (ida/regreso o viaje) con fallback a nivel tramo/viaje.
- **Fixed**: `@media print` estabiliza layout (colores, grid 2 columnas, evita saltos de página en bloques).
- **Changed**: encabezado PDF unificado — «Bogotá Cartagena · Viaje: … · 3 noches · 5 adt, 1 niño (6)» sin tarjeta duplicada ni códigos IATA.
- **Changed**: pestaña **Total** — subtotal por opción: «Subtotal COP Opción 1 (5 adt, 1 niño (6))» cuando hay acomodación.

## 2026-08-25 — PDF v2, destino ciudad, logos y depósito (v1.0.91)

- **Changed**: destino en título/WhatsApp/PDF usa **ciudad principal** (`mainCityLabel`) — no hotel ni zona (p. ej. Cartagena, no Tierra Bomba Island).
- **Changed**: nuevo orden PDF — título → mapa → incluye/no incluye (columnas enmarcadas) → tarifas → servicios por opción (Vuelo, Alojamiento, Traslado, Tour, Asistencia con miniatura) → totales verticales.
- **Added**: logos de aerolíneas en vuelos (carrito + PDF; cache en `tce_airline_logos` vía Kiwi CDN).
- **Added**: checkbox **Mostrar anexo de asistencia en PDF** (`tce_pdf_insurance_annex`); asistencia muestra intro del resumen BM.
- **Fixed**: depósito inicial solo si hay texto (PDF y WhatsApp); input de depósito ya no pierde foco al escribir.
- **Fixed**: tours/actividades aparecen en «Tarifa incluye» (`collectTourLabelsFromItems`).

## 2026-08-25 — PDF: depósito inicial e Imprimir (v1.0.90)

- **Added**: en mayorista el PDF muestra **Depósito inicial** (mismo texto que WhatsApp) y la nota del saldo tras los totales.
- **Fixed**: el botón **Imprimir / Guardar PDF** vuelve a abrir el diálogo — el CSP de la extensión bloqueaba el `onclick` inline; ahora se enlaza desde `quotePdfPage.ts` sin `document.write`.

## 2026-08-24 — PDF: nuevo orden, itinerario aéreo e origen

- **Changed**: orden del PDF — encabezado → título/origen → incluye/no incluye/notas + itinerario aéreo → hoteles → totales → mapa → anexo seguros.
- **Added**: título con origen→destino (evita asumir Bogotá) y tarjeta de viaje con estilo de columna hotel; fechas con **año** en PDF y WhatsApp.
- **Added**: itinerario aéreo en el espacio bajo «incluye / no incluye» (escalas + maletas ida/regreso por tramo).
- **Changed**: columnas de hotel ya no listan traslados (ni kit); nombres largos se resumen vía «Tarifa incluye» y parser de combos GT (TRF IN+OUT + tours).
- **Changed**: WhatsApp — equipaje por ida/regreso cuando difiere; origen en el título del destino.

## 2026-08-24 — Panel mayorista: escalas, TA pp y depósito

- **Fixed**: Avianca — escalas también cuando `digitalData` trae un solo segmento; se complementa con `.flight-detail` del DOM.
- **Changed**: Escalas en itinerario aéreo del WhatsApp/PDF y detalle de vuelos en el panel Carrito.
- **Changed**: El carrito lateral ya no se abre solo al agregar ítems (el panel en segunda pantalla muestra el avance).
- **Changed**: Mayorista — TA se muestra por persona (sumada a tarifa pp), no TA × pax.
- **Added**: Campo **Depósito inicial** (`tce_initial_deposit`) — el texto aparece tras `💰*DEPÓSITO INICIAL:*` en WhatsApp.

## 2026-08-22 — JetSMART escalas desde URL

- **Fixed**: JetSMART — el resumen a veces no muestra «Con escala»; se infieren paradas/segmentos desde `flight1`/`flight2` (`5477|5414` = 1 escala) y maletas por `bundle1`/`bundle2` (Essential/Smart/Full).

## 2026-08-22 — Avianca resumen live sin data-flight

- **Fixed**: Avianca trip summary — si no hay `data-flight`/`digitalData.product`, lee paradas (`.flight-detail`), tarifa (`Classic COP…`) y maletas por familia; total desde «Total de tu reserva» o suma de tramos.

## 2026-08-22 — Arajet live: paradas desde sessionStorage

- **Fixed**: Arajet — en paso pasajeros ya no aparece «1 Parada» en el DOM; se leen `stops` y `legs` desde `sessionStorage.booking` (validado en vivo BOG–SDQ vía PUJ Extra).

## 2026-08-22 — Vuelos: maletas y paradas por aerolínea

- **Added**: XNet — maletas por tramo desde columna Equipaje (`Incluye` / `No incluye`) y por leg ida/regreso.
- **Added**: Arajet — maletas por tramo según tarifa Basic/Comfort/Extra; paradas desde texto/DOM.
- **Added**: Wingo — maletas del resumen (`w-org-summary-detail-flight`) repartidas a cada leg.
- **Changed**: Avianca — segmento agregado CLO→CTG con paradas desde `data-flight`; maletas por tarifa CLASSIC/FLEX/LIGHT/BASIC.
- **Changed**: JetSMART — escalas del vuelo seleccionado vía `flight-fee-option` + `flight-flight-info-content`.

## 2026-08-22 — Guía mayorista, pp por ítem y vuelos ida/regreso

- **Changed**: Guía mayorista: destino = ciudad BM o vuelo/bloqueo (nunca nombre del hotel); origen editable con listado de ciudades + vuelo/bloqueo.
- **Changed**: Mayorista: mayor valor y redondeo por ítem (en Valor por persona del hotel y en cada servicio); globales ocultos en pestaña Total.
- **Changed**: Cálculo pp: ajustes del hotel se suman a SGL/DBL/TPL/CHD antes de servicios compartidos.
- **Added**: Vuelos — paradas por tramo; maletas ida/regreso separadas (Avianca, JetSMART, Wingo); botón Agregar Avianca cerca de totales.
- **Docs**: circuitos BM (`type: tour` sin bloqueo/combinado) ya entran al pp compartido como los demás servicios.

## 2026-08-22 — Manifiesto Chrome Web Store

- **Fixed**: `description` del manifest acortada a 129 caracteres (límite Chrome Web Store: 132) para permitir subida del .zip.

## 2026-08-20 — Sin aéreo vacío + opciones en columnas (v1.0.89)

- **Fixed**: WhatsApp ya no muestra *ITINERARIO AÉREO* vacío si no hay vuelo/bloqueo en el carrito (tampoco líneas Ida/Regreso en blanco).
- **Changed**: panel y asistente muestran las opciones en **columnas** (grid), con servicios repetidos por opción; misma idea que el PDF.
- **Docs**: ayuda mayorista actualizada (sin vuelo = sin texto aéreo; opciones en columnas).

## 2026-08-20 — Pestaña Acomodación (v1.0.88)

- **Added**: pestaña **Acomodación** (mayorista) con el formulario de habitaciones SGL/DBL/TPL + niños, total del mix por opción, y check **Incluir este total en WhatsApp/PDF** (opcional).
- **Changed**: el mix del cliente ya no vive en Totales → «Total por acomodación»; Totales queda para fees/TA/comparar.
- **Docs**: textos de ayuda mayorista apuntan a la pestaña Acomodación. CONTEXT actualizado.

## 2026-08-20 — Historial restaurable + opciones en columnas (v1.0.87)

- **Added**: el historial guarda la cotización **tal como se buscó/cotizó** (ítems con ocupación y tarifas, opciones de hotel, TA, fees, líneas WhatsApp, modo) y permite **Restaurar al carrito**.
- **Changed**: panel y PDF muestran cada **opción en columna** con servicios repetidos + hoteles (miniaturas) y tarifas pp; varios hoteles en una opción **suman** SGL/DBL/TPL/CHD.
- **Changed**: WhatsApp mayorista usa *Tarifa por persona en acomodación DOBLE/TRIPLE/…* (estilo agencia); traslado/asistencia no van como líneas sueltas (van en la pp y en INCLUYE). Total por acomodación sigue **opcional**.
- **Changed**: fees (TA con aéreos, mayor valor, redondeo) siguen dentro de cada valor persona por acomodación; en mayorista el historial no insiste en un gran total de grupo.

## 2026-08-15 — Mayorista: noches y total por acomodación (v1.0.86)

- **Changed**: en mayorista ya no se piden origen, destino, fechas ni mix en el briefing. Salen de la **primera búsqueda** (aéreo o hotel). Se muestran las **noches**.
- **Changed**: el mix del cliente (DBL × 2 + CHD × 1, etc.) está en Totales → **Total por acomodación**. El total de grupo solo aparece si se abre ese botón (carrito, panel, WhatsApp y PDF).
- **Docs**: ayuda mayorista y `CONTEXT.md`.

## 2026-08-15 — TA solo con aéreos y tarifa niño (v1.0.85)

- **Changed**: TA (ticket aéreo) se suma al total **solo si hay vuelo o bloqueo**. Sin aéreos queda en 0 (minorista y mayorista). Mayor valor y redondeo siguen igual.
- **Changed**: en mayorista, cada servicio (vuelo, traslado, seguro, etc.) se reparte por **pax de esa búsqueda**, no por el briefing. CHD usa tarifa niño del ítem si existe; si no, la misma del adulto.
- **Docs**: `CONTEXT.md` — TA condicionado a aéreos y pp mayorista por búsqueda.

## 2026-08-15 — Total según acomodación con mix (v1.0.84)

- **Changed**: el total mayorista indica el mix: p. ej. **Total según acomodación (2 DBL · 1 CHD)**. Igual en panel, WhatsApp y PDF.

## 2026-08-15 — Destino escrito y luego BM (v1.0.83)

- **Changed**: se puede escribir Destino en Guardar viaje. Si después hay una búsqueda de hotel BM con autocomplete (ID interno), ese nombre oficial **sustituye** el texto. Si no hay búsqueda de hotel, se queda lo escrito.
- **Docs**: ayuda mayorista — ya no pide dejar Destino vacío.

## 2026-08-15 — Mayorista: opciones con DBL/TPL/CHD (v1.0.82)

- **Fixed**: en carrito y panel, Opción N ya no divide el total BM entre pax. Muestra **Valor persona DBL/TPL/CHD** (más servicios) y el total según acomodación del viaje.
- **Changed**: no se lista «3 x ESTANDAR» como tipo de habitación en mayorista.

## 2026-08-15 — Traslado: spinner infinito (v1.0.81)

- **Fixed**: el aviso «Busca este hotel» se reinsertaba en bucle (MutationObserver + clic en la pestaña Traslados) y BM dejaba el spinner. Ahora el aviso es único y no se vuelve a clicar la pestaña si ya está activa.

## 2026-08-15 — Traslado: no rellenar Hasta sin ID (v1.0.80)

- **Changed**: 🚐 Traslado ya no pone el nombre del hotel en el autocomplete de «Hasta» (sin `dropoff` BM lo borra al clic en origen).
- **Added**: texto rojo **Busca este hotel** sobre Hasta, con botón Copiar. Primero origen (aeropuerto), luego elegir el hotel en la lista de BM.
- **Docs**: CONTEXT — ID de dropoff solo del autocomplete.

## 2026-08-15 — Mayorista: DBL+niño no es TPL; foco en tarifas (v1.0.79)

- **Fixed**: 2 adultos + 1 niño se etiqueta **DBL+niño**, no Triple (carrito, WhatsApp).
- **Fixed**: en mayorista, +🛒 de las sondas 2 / 2+niño / 3 se fusionan aunque BM cambie el nombre a Doble/Triple.
- **Fixed**: al escribir SGL/DBL/TPL/CHD a mano, el recuadro ya no pierde el foco a cada tecla.
- **Docs**: CONTEXT y ayuda mayorista — sondas vs mix del cliente; minorista sigue siendo un ítem por fila.

## 2026-08-15 — Seguros BM: Colombia por defecto (v1.0.78)

- **Fixed**: origen/destino de seguros no vienen en Colombia; el select arranca en **Afganistán**. Si sigue así, se elige **Colombia** (opción `13` + `origin_name`/`destiny_name`).
- **Docs**: CONTEXT — default Colombia en seguros.

## 2026-08-15 — Seguros BM: Colombia y edades (v1.0.77)

- **Added**: una edad por asegurado: adultos = 18, niños = edades del briefing.
- **Docs**: CONTEXT — sync de seguros.

## 2026-08-14 — Fechas: ida, regreso, noches (v1.0.76)

- **Changed**: en carrito y panel el orden es **Ida → Regreso → Noches**. Las fechas son más angostas; noches muestra solo el número.

## 2026-08-14 — Edad del niño no se borra al salir del campo (v1.0.75)

- **Fixed**: al escribir la edad en el carrito, salir del recuadro ya no recarga el viaje guardado y no deja el campo vacío.
- **Fixed**: **− niño** queda junto a los recuadros de edad (el input numérico ya no se estira como sangría).

## 2026-08-14 — Edades de niños desde el formulario BM (v1.0.74)

- **Fixed**: Guardar viaje lee y escribe las edades en `searchhotel[listrooms][n][childrenages][i][age]` (select Edad junto a cada niño). Ya no se pisan con 0,0 de la captura BM ni se omite el relleno si el número de pax ya coincidía.
- **Docs**: CONTEXT — sync de edades con el motor de hoteles.

## 2026-08-14 — Edad al lado de cada niño (v1.0.73)

- **Changed**: en Quién viaja, **+ niño** abre un recuadro **Edad** a la derecha (ya no hay lista de edades separadas por comas). Guardar viaje guarda esas edades y las copia a BM.
- **Docs**: CONTEXT — briefing con edad por niño.

## 2026-08-14 — Config: ciudades de origen más anchas (v1.0.72)

- **Fixed**: en Config, el recuadro de cada ciudad (y “Nueva ciudad…”) usaba la columna estrecha de emoji de las líneas; ahora ocupa todo el ancho.

## 2026-08-14 — Valor persona SGL (1 adulto) (v1.0.71)

- **Added**: acomodación **SGL · 1 adulto** en Quién viaja, tarifas mayoristas, carrito, panel, WhatsApp y PDF.
- **Changed**: una búsqueda BM de 1 habitación / 1 adulto llena **Valor persona SGL** (no se trata como DBL).
- **Docs**: CONTEXT y ayuda mayorista incluyen SGL.

## 2026-08-14 — Nueva búsqueda limpia el formulario (v1.0.70)

- **Fixed**: con carrito vacío, **Vaciar carrito** no hacía nada y el briefing (origen/destino/fechas/pax) seguía en caché.
- **Added**: botón **Nueva búsqueda** (panel y carrito) borra `tce_trip_guide` y `tce_last_search` aunque no haya productos.
- **Changed**: BookingMotor ya no crea un viaje nuevo solo por tener destino en el formulario de hoteles; solo rellena Destino si ya hay un viaje guardado sin destino.
- **Changed**: con carrito vacío el encabezado no muestra la última búsqueda BM; solo la guía guardada (o “Sin ruta”).
- **Docs**: CONTEXT y ayuda mayorista: Nueva búsqueda limpia el viaje guardado.

## 2026-08-14 — Hotel: Valor persona DBL (carrito y panel) (v1.0.69)

- **Changed**: en mayorista no se muestra “1 habitación DBL 2 personas”. Se ve **Valor persona DBL = …** (TPL/CHD si hay), igual en el panel.

## 2026-08-14 — Guardar viaje sin destino y llenar Hoteles BM (v1.0.68)

- **Changed**: Guardar viaje ya no exige destino. Fechas y acomodación sí se guardan; el destino se escribe en Hoteles BM.
- **Changed**: si Hoteles BM está abierto, Guardar viaje rellena fechas/pax ahí y, si el destino ya está en BM, lo copia al carrito (segunda guarda).

## 2026-08-14 — Panel abre en mayorista y alinea el carrito (v1.0.67)

- **Changed**: el panel (asistente) arranca siempre en **Mayorista** y lo guarda, para que no quede Minorista por un valor viejo en storage.
- **Changed**: en mayorista el panel muestra DBL/TPL/CHD del hotel (sin total de ítem tipo minorista) y el resumen corto del seguro, como el carrito.

## 2026-08-14 — Hotel: DBL/TPL/CHD en vez de hab. 1 / hab. 2 (v1.0.66)

- **Changed**: en mayorista el hotel ya no lista “Hab 1: 2 adultos…”. Muestra valor por persona DBL / TPL / CHD (TPL y CHD solo si hay tarifa).

## 2026-08-14 — Viajeros del briefing, no de la última búsqueda BM (v1.0.65)

- **Fixed**: WhatsApp/PDF/TA ya no toman el pax más alto de `tce_last_search` ni de la ocupación de tarifa del hotel. Cuentan quién viaja en el formulario / Guardar viaje.

## 2026-08-14 — Acomodación del cliente y anexo de seguros (v1.0.64)

- **Changed**: el briefing dice “Quién viaja (acomodación del cliente)”; en mayorista aclara que no son las hab. de tarifa BM.
- **Added**: al agregar un seguro se copian el resumen de la tarjeta (WhatsApp) y el detalle del modal (anexo del PDF, página aparte).

## 2026-08-14 — Orden mayorista, fechas y PDF (v1.0.63)

- **Changed**: PDF sin el subtítulo “Cotización mayorista” (sigue agencia + fecha de creación).
- **Changed**: ida/regreso del briefing no pueden ser anteriores a hoy.
- **Changed**: Destino no se pisa con texto suelto: se copia de la 1ª búsqueda de Hoteles BM si estaba vacío. La guía **?** explica el orden.

## 2026-08-14 — Mix BM DBL+TPL+CHD en una búsqueda (v1.0.62)

- **Added**: en hoteles BM, una búsqueda con varias habitaciones (2 adt, 3 adt, 2 adt+niño) llena DBL / TPL / CHD desde el precio de cada fila. El pax real sigue en Guardar viaje.

## 2026-08-14 — TRM con decimales y búsquedas DBL+CHD (v1.0.61)

- **Changed**: la TRM de la barra se muestra con **2 decimales**; la conversión a pesos sigue en pesos enteros. Los importes en **USD** van con 2 decimales (ya no se ven como 30.000 por formatear dólares como COP).
- **Changed**: ayuda mayorista: búsqueda 2 = 2 adt + 1 niño (CHD); TPL es la 3 y solo si hay triple.
- **Added**: una búsqueda BM de **2 hab** (DBL + DBL+niño) llena CHD = total − 2×DBL.

## 2026-08-14 — PDF, mapa e acomodación del viaje (v1.0.60)

- **Changed**: PDF sin pie “Generado con…”, sin número de cotización ni asesor; queda la **fecha de creación**.
- **Changed**: en mayorista el PDF no muestra precio de cada ítem; muestra DBL / triple / CHD por persona. Total de grupo solo si hay acomodación clara.
- **Fixed**: «Descargar PDF» abre la cotización; **Imprimir** solo al clic en el botón.
- **Changed**: mapa encuadra todos los hoteles (`spn`, sin recortar con `object-fit: cover`).
- **Changed**: traslados del hotel van bajo esa opción; vuelos y demás servicios quedan para todas las opciones.
- **Added**: briefing con habitaciones DBL/TPL y **+ niño** (niño con los padres, no TPL). `roomPlan` en `tce_trip_guide`.

## 2026-08-14 — Briefing: origen, destino BM y ayuda mayorista (v1.0.59)

- **Changed**: modo **Mayorista** sigue como predeterminado (`tce_quote_mode`).
- **Added**: Origen con lista (Bogotá, Medellín, Pereira, Cali, Bucaramanga, Cúcuta) + escribir otra; se edita en Config (`tce_origin_cities`).
- **Added**: Destino toma el **nombre exacto** de la búsqueda de Hoteles BM (no se puede clonar el autocomplete de BM). Recientes en datalist (`tce_bm_destinations`).
- **Changed**: el texto largo de mayorista pasa a un **?** que abre la guía DBL / TPL / CHD (niño = DBL+niño, no TPL).
- **Changed**: **Guardar viaje** en rosa si falta completar o hay cambios sin guardar; azul claro cuando está guardado.

## 2026-08-14 — Kit hotel + traslado (v1.0.58)

- **Added**: en cada hotel, botón **🚐 Traslado** abre BookingMotor (pestaña Traslados) con fechas/pax y el **nombre del hotel en Hasta**; hay que elegir ese hotel en el autocomplete (el ID de dropoff no se inventa).
- **Added**: el traslado se enlaza al hotel (`linkedHotelId` / `linkedHotelName`, `tce_pending_hotel_transfer`) y se muestra como kit en carrito/panel; WhatsApp y PDF llevan el nombre del hotel.

## 2026-08-12 — Mayorista: “Falta buscar DBL…” (v1.0.57)

- **Changed**: textos mayorista ya no dicen “sonda”; indican **Falta buscar DBL/TPL/CHD** con la búsqueda BM de 1 habitación que falta (2 adt / 3 adt / 2+1 niño).
- **Docs**: CONTEXT — flujo mayorista = búsquedas de 1 hab, no el mix real del cliente.

## 2026-08-12 — Textos UI en español de Colombia (v1.0.56)

- **Changed**: mensajes de briefing, PDF y estado de cotización pasan de voseo (completá/podés/elegí…) a formas de Colombia (completa/puedes/elige…).

## 2026-08-12 — Manual HTML para hosting

- **Docs**: carpeta `manual/` con `index.html` + `hero.jpg` — guía de uso para asesores (instalación, flujo, carrito, WhatsApp/PDF, Config, FAQ), lista para subir al hosting.

## 2026-08-12 — Fuente TRM seleccionable (v1.0.55)

- **Added**: en Config → **Fuente TRM** (`tce_trm_source`): `dolar-colombia.com` (default) o [dolar.wilkinsonpc.com.co](https://dolar.wilkinsonpc.com.co/) (TRM oficial “Hoy”).
- **Changed**: al actualizar TRM se usa la fuente preferida y, si falla, la otra; el botón **web** muestra el sitio activo.
- **Docs**: CONTEXT — Config lista la fuente TRM.

## 2026-08-12 — PDF abre Imprimir al clic (v1.0.54)

- **Fixed**: «Descargar PDF» vuelve a abrir el diálogo de impresión: la página ya no navega a `blob:` (Chrome bloqueaba `print()`); escribe el HTML en la pestaña de extensión y llama `window.print()`.
- **Fixed**: el fetch del mapa Yandex tiene timeout 4s (antes podía colgar el botón sin feedback).
- **Fixed**: si falta el briefing, se muestra el aviso en WhatsApp (antes el mensaje se perdía al re-render).

## 2026-08-12 — Nombre de agencia en el PDF (v1.0.53)

- **Added**: campo **Agencia** (lateral + panel) guardado en `tce_agency_name`; el encabezado del PDF usa ese nombre en lugar de “GRUPOS TRAVEL” fijo (si está vacío → “Agencia de viajes”).

## 2026-08-12 — Combinados hotel + tarifas pp (v1.0.52)

- **Added**: mismos botones en `/tour-process/` para **combinados** (ej. RIU Playa Blanca + Plaza Panamá): captura fecha, mix de habitaciones y **$/persona por acomodación** (SGL/DBL/TPL) del Paso 2.
- **Added**: si Paso 4 no tiene total (sin disponibilidad BM), el ítem se agrega con **total estimado** desde tarifas pp × pax; se marca como estimado en carrito/WhatsApp/PDF.
- **Docs**: aclarar cobertura BM — actividades sí; autos/rent-a-car aún no (sí hay traslados).

## 2026-08-12 — Bloqueos / circuitos al carrito (v1.0.51)

- **Added**: en BookingMotor `/tour-process/` (Paso 4), botón **+ 🛒 GT** junto a Cotización/Pre Reserva para agregar el circuito o bloqueo al carrito.
- **Added**: ítem `tour` con nombre, origen→destino, fecha de salida, mix de habitaciones, **precio por persona** (total ÷ pax ≥2 años) y total; los **bloqueos** sustituyen la búsqueda de vuelo en WhatsApp/PDF.
- **Docs**: CONTEXT — URL real de circuitos (`/tour/explorer`, `/tour-process/`) y regla de infantes menores de 2 años gratis.

## 2026-08-12 — Mayorista default + briefing obligatorio + historial completo (v1.0.50)

- **Changed**: modo de cotización por defecto = **Mayorista** (`tce_quote_mode`).
- **Changed**: el briefing (destino/ida/regreso/pax) es **obligatorio** en minorista y mayorista antes de WhatsApp/PDF; se puede editar y Guardar viaje sin nueva búsqueda BM.
- **Fixed**: el historial guarda un snapshot enriquecido de la búsqueda (origen/destino/fechas/noches/pax + modo) y el panel muestra esos datos; pax/fechas priorizan el briefing (no la sonda BM).

## 2026-08-12 — PDF alineado con modo mayorista (v1.0.49)

- **Changed**: el PDF en modo **Mayorista** muestra por opción tarifas pp **DOBLE / TRIPLE / CHD** (misma lógica que WhatsApp: hotel + servicios compartidos ÷ pax), alimentación, noches del briefing y nota “pp × personas = total”.
- **Docs**: Fase 6 — PDF mayorista marcado como hecho.

## 2026-08-12 — Defaults: suplemento TRM 0 + política genérica

- **Changed**: suplemento TRM por defecto pasa de 150 a **0** COP (`DEFAULT_TRM_SUPLEMENTO`); si estaba guardado el viejo default 150, se migra a 0.
- **Changed**: nota de política migratoria: “La agencia no asume…” (ya no “Grupos Travel…”); se migra al cargar líneas guardadas.

## 2026-08-12 — Briefing noches + panel mayorista paridad (v1.0.48)

- **Added**: entre Ida y Regreso se muestra **Nro noches** (regreso − ida), en carrito lateral y panel.
- **Added**: el panel tiene el mismo briefing (origen/destino/fechas/pax + Guardar viaje), edición DBL/TPL/CHD y toggle “Niño = adulto”.
- **Fixed**: en el panel, hoteles muestran **tipo de alimentación** (board) y habitación en la meta del ítem.
- **Changed**: copy mayorista aclara cotización **$/persona** (ej. DBL $100 × 4 pax = 400); WhatsApp mayorista también lista noches.
- **Docs**: CONTEXT/TODO actualizados con la regla de cotización pp × pax.

## 2026-08-12 — Modo mayorista DBL/TPL/CHD (v1.0.47)

- **Added**: modo de cotización **Minorista | Mayorista** (`tce_quote_mode`) en carrito lateral y panel.
- **Added**: briefing de viaje sticky (origen/destino/fechas/adultos/niños) vía `tce_trip_guide` con `sourceType: briefing`, para que las sondas BM no pisen el perfil real.
- **Added**: captura asistida de tarifas por acomodación — al agregar hotel en modo mayorista clasifica sonda 2 adt→DBL, 3 adt→TPL, 2+1 niño→CHD (resta vs DBL); mismo hotel/habitación/pensión se fusiona en una fila; edición manual + toggle “Niño = adulto”.
- **Changed**: WhatsApp mayorista alinea la plantilla de agencia (opciones con tarifa pp DOBLE/TRIPLE/CHD + depósito/incluye al final); suma servicios compartidos ÷ pax del briefing a las tarifas hotel.
- **Docs**: flujo mayorista en `CONTEXT.md` (decisión #5) y avance Fase 6 en `TODO.md`; PDF sigue estilo minorista por ahora.

## 2026-08-12 — Docs: Export PDF y mapa Yandex

- **Docs**: en `CONTEXT.md` — sección **Export PDF** (flujo, por qué Yandex Static vs OSM.de/BM, coords BM, archivos, cómo cambiar el mapa después). TODO Fase 5 apunta ahí.

## 2026-08-11 — Mapa en PDF cotización

- **Fixed**: el mapa del PDF usa Yandex Static (OSM.de caía en blanco), se incrusta como data URL y, si falla, SVG con pins; al generar desde BM se rellenan lat/lng desde el DOM si faltaban en el carrito.

## 2026-08-11 — Fix PDF pantalla en blanco

- **Fixed**: Descargar PDF ya no usa `window.open` (quedaba en blanco / bloqueado en content script); abre `quote-pdf.html` vía service worker y muestra el HTML con blob URL.

## 2026-08-11 — Export PDF cotización con mapa (v1.0.46)

- **Added**: botón **Descargar PDF** (lateral WhatsApp + panel) — plantilla print con mapa OSM (pins 1…N), columnas de hoteles/opciones, otros servicios del carrito, totales y líneas incluye/no incluye.
- **Added**: captura de `latitude`/`longitude` al agregar hoteles desde BookingMotor (`#latitud_*` / `#longitude_*`) para el mapa del PDF.
- **Docs**: Fase 5 (Export PDF) — plantilla HTML + print en navegador.

## 2026-08-10 — Arajet: botón bajo el resumen / Siguiente (v1.0.45)

- **Changed**: en Arajet el botón **Agregar al Carrito GT** deja de flotar a la izquierda; se inserta encima de la barra de acciones (`Siguiente` / `Continuar`) tras elegir tarifa.

## 2026-08-10 — JetSMART: botón bajo el Total y pax correctos (v1.0.44)

- **Changed**: el botón **Agregar al Carrito GT** en JetSMART ya no flota a la izquierda; se monta en el resumen de costos, encima del **Total**, tras elegir vuelos.
- **Fixed**: lectura de pax ya no toma “Niños 2-12 años” / “Adultos 13 o más” del formulario; usa el sidebar (`sidebar-pax-count` / líneas `Adulto - Pack`) o la URL. Corrige totales tipo “15 adultos · 2 niños” en búsquedas de 1 pasajero.

## 2026-08-10 — Quitar mockup del panel

- **Docs**: eliminado `scratch/asistente-panel-mockup.html` (confundía con el panel real `asistente.html`).

## 2026-08-10 — Enlace ↗ a búsqueda en el panel (v1.0.43)

- **Added**: en el panel asistente (Carrito), cada producto muestra **↗** para abrir `sourceUrl` / `bookingUrl` en otra pestaña — misma lógica que el carrito lateral.

## 2026-08-10 — JetSMART Colombia (pax + COP) (v1.0.42)

- **Changed**: `JetSmartFlightReader` distingue **adultos/niños/infantes** (URL `adt/chd/inf`, form Adultos/Niños/Infantes, o líneas del sidebar) en lugar de meter todo como adultos.
- **Changed**: moneda: `culture=es-co` o aeropuertos CO (BOG/MDE/CLO/CTG/ADZ/…) → **COP**; FullFlex marca equipaje completo si faltan alts.
- **Added**: JetSMART en popup Dominios; matches `jetsmart.com` / `www.jetsmart.com` (home CO).
- **Docs**: probes `scratch/probe_jetsmart*.ts` para booking Colombia (BOG–MDE).

## 2026-08-10 — Arajet en el carrito (v1.0.41)

- **Added**: proveedor **Arajet** (`www.arajet.com` / booking) — botón **Agregar al Carrito GT** al elegir tarifa Basic/Comfort/Extra; lee origen/destino/fechas/pax/moneda de la URL y precios del resumen seleccionado.
- **Added**: probe Playwright `scratch/probe_arajet.ts` + análisis `scratch/analyze_arajet_capture.ts` (API `pss/shop/airshop`, bundles BBAS→BHIG / Extra).
- **Docs**: dominio Arajet en popup Dominios; capturas de ejemplo en `scraper/captures/*_arajet_*`.

## 2026-08-10 — Sync bidireccional carrito ↔ panel ↔ pestañas (v1.0.40)

- **Fixed**: el lateral ahora escucha cliente, moneda, comparar hoteles, grupos, USD equiv e historial/pending — cambios del panel se reflejan al instante.
- **Fixed**: al editar fees/ajustes ya no se “tragan” cambios de otra pestaña (Avianca vs BookingMotor) ni del panel: solo se suprime el eco local; writes remotos fuerzan refresh.
- **Docs**: sync multi-pestaña vía `chrome.storage.onChanged` documentado en CONTEXT.

## 2026-08-10 — Ajustes por ítem y vaciar en el panel (v1.0.39)

- **Added**: en Carrito del panel — **Mayor valor** / **Redondeo** por ítem (con botón 10k/10$) sincronizados con el lateral.
- **Added**: botón **Vaciar carrito** en el panel (archiva en historial y limpia storage como el lateral).

## 2026-08-10 — Panel Carrito unificado + TRM/pax/comparar (v1.0.38)

- **Changed**: pestañas Productos + Total unificadas en **Carrito** (servicios a la izquierda, fees/totales a la derecha).
- **Added**: en el panel — pasajeros (adultos/niños/bebés), TRM dolar-colombia (esquina del header + botón web), toggle **Comparar hoteles** con chips y opciones.
- **Changed**: WhatsApp del panel es **editable** y más alto (layout vertical).

## 2026-08-10 — Abrir panel sin bloqueo Edge/ads (v1.0.37)

- **Fixed**: el botón ↗ ya no usa `window.open` (Edge/bloqueadores lo marcaban como publicidad → `ERR_BLOCKED_BY_CLIENT`). Abre `asistente.html` con `chrome.tabs.create` desde el service worker.

## 2026-08-10 — Total y WhatsApp editables en el panel (v1.0.36)

- **Added**: edición completa de **Total** en `asistente.html` (fees, TA, redondeo, COP/USD, totales / opciones hotel) sincronizada con el lateral.
- **Added**: edición completa de **WhatsApp** en el panel (preview, copiar, checkboxes de líneas, equiv. USD) con archivo al historial al copiar.
- **Added**: motor compartido `src/shared/cartEngine.ts` para totales/TA/redondeo reutilizable.
- **Docs**: TODO/CONTEXT — Total/WhatsApp del panel ya no son solo lectura.

## 2026-08-10 — Panel fullscreen + Config (v1.0.35)

- **Added**: página `asistente.html` (espacio de trabajo a ancho completo) con pestañas Dashboard / Productos / Total / WhatsApp / Historial / **Config**, sincronizada con `chrome.storage` del carrito lateral.
- **Added**: botón **Abrir panel** (↗) en el encabezado del lateral y en el popup de la extensión.
- **Added**: en Config del panel: TA, suplemento TRM, líneas incluye/no incluye/políticas y listado de dominios (misma info que el popup).
- **Added**: Dashboard local (hoy/ayer/semana/mes, ticket promedio, destinos, últimas cotizaciones).
- **Docs**: `docs/TODO.md` y `docs/CONTEXT.md` — flujo dual lateral + panel; layout push sigue pendiente.
- **Note**: layout push (estrechar la página al abrir el lateral) **no** implementado aún; el lateral sigue como overlay.

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
