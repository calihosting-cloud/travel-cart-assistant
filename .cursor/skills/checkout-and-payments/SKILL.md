---
name: checkout-and-payments
description: Estado del carrito, precios, moneda, disponibilidad y flujo de cotización de Travel Cart Assistant. Usar al modificar CartSidebar, QuoteBuilder, TRM, fees, TA, historial o al agregar un ítem desde un provider. No hay cobro con tarjeta.
---

# Carrito, precios y cotización

No hay pasarela ni campos de tarjeta. «Checkout» aquí es armar la cotización (total + texto WhatsApp + historial `CAR###`). El asesor sigue reservando en el OTA. Dueño de las reglas de cálculo: **Leonardo el Backend**. Copy y flujo del asesor: **Catalina Producto UX**. UI: **Camila Frontend**.

Nunca loguear PAN, CVV, vencimiento ni titular. Hoy no existen esos campos; un diff que los añada se rechaza en revisión (Mateo Seguridad) salvo pedido explícito de Rodrigo, y aun así no se persisten en `chrome.storage` ni en `appendAppLog`.

## Estado

`CartSidebar` (`src/ui/CartSidebar.ts`) guarda:

| Key | Contenido |
|---|---|
| `tce_cart_items` | `CartItem[]` |
| `tce_last_search` | `SearchContext`, TTL 12 h lo aplica `SearchSyncController`, no el carrito |
| `tce_fees` | `mayor_valor_cobrado` y `redondeo` (COP) |
| `tce_display_currency` | `COP` (default) o `USD` |
| `tce_trm` / `tce_trm_suplemento` | tasa del día y colchón (default 150) |
| `tce_ta_config` / `tce_ta_selection` | TA anual y tipo elegido |
| `tce_pending_quote` / `tce_quote_seq` | número de la sesión, formato `CAR001` |
| `tce_client_name` | solo historial, no entra al WhatsApp |
| `tce_quote_history` | hasta 50 entradas (`MAX_HISTORY`) |

`addItem` hace push, abre la pestaña Productos y persiste. No hay hold de cupo contra el OTA.

## Precio y moneda

- Base del ítem: `selectedRate.price` + `currency` (hotel) o `price` + `currency` (resto). Ver `getItemPrice`.
- Vista activa (`displayCurrency`): COP↔USD con `effectiveTrm` = tasa + suplemento (`usdToCop` redondea a peso; `copToUsd` a 2 decimales). Sin TRM, el botón USD queda `disabled`.
- Otra moneda (CLP y similares): se queda en código y monto nativos. No relabelar a COP.
- Ajustes de línea `mayorValor` y `redondeo` se guardan en COP y se convierten solo para pintar (`getItemAdjustments` / `getItemAdjustmentsDisplay`).
- Total de línea = base en vista + mayor + redondeo (`getItemLineTotal`).
- Fees globales, también en COP: `FEE_DEFINITIONS` (`mayor_valor_cobrado`, `redondeo`) + TA. `getFeesTotal` los pasa a la vista.
- TA: `unitCop * getTaPaxCount()`. El unitario sale de `resolveTaUnitCop` (`src/shared/taConfig.ts`): nacional ida y vuelta default `85_000` COP, solo ida `42_500`, internacional `30` USD × TRM. Pax = el máximo entre vuelos (adultos+niños+bebés), hotel (suma de ocupación), traslado/actividad, seguro (`passengers`) y el contexto de búsqueda. Si todo es 0 y hay ítems, cuenta 1.
- Redondeo de gran total (`applyRounding`): `ceil((ítems + mayor valor + TA) / unidad) * unidad − base`. Unidad `10_000` en COP y `10` en USD (`roundUnit`). El excedente se guarda en el fee `redondeo`, no pisa el mayor valor. El botón **10k** del ítem (`applyItemRounding`) hace lo mismo con base + mayor de esa línea.
- Comparar hoteles (`tce_hotels_as_options`, ≥ 2 hoteles): cada opción = servicios no-hotel + ese hotel + fees, y el por-pasajero divide por `getTaPaxCount()` (mínimo 1).
- Lectura de texto de BookingMotor: `parseLocalizedAmount` acepta `4,083,779.45` y `4.083.779,45`. No reemplazar por `parseFloat` directo.
- WhatsApp (`QuoteBuilder.formatMoney`): USD con código; COP como `$` sin decimales. El equivalente COP↔USD solo si el chulito `tce_quote_usd_equiv` está prendido (apagado por defecto).

## Disponibilidad

`HotelRoomRate.status` es `available | onRequest | soldOut`, leído del texto de la celda (`disponible`, `agotado`, `no disponible`) en `BookingMotorDOMReader`. `handleAddHotelToCart` no rechaza agotados ni on-request: si el botón está en la fila, el ítem entra. TODO: confirmar con Rodrigo si un `soldOut` debe bloquear el alta.

No hay hold ni vencimiento de tarifa dentro de la extensión. La página del OTA puede cambiar el precio después de agregar: el carrito conserva el número capturado en el clic. `sourceUrl` permite reabrir la búsqueda; no refresca el precio solo.

`tce_last_search` más viejo de 12 h no se restaura (`CONTEXT_TTL_MS` en `src/content/searchSync.ts`). La TRM manual vale para `todayIso()`; al día siguiente `refreshOfficialTrm` puede sustituirla.

## Flujo

1. Clic en **+ 🛒 GT** → handler en `content.ts` re-extrae y arma el `CartItem`.
2. Vuelos: `hasFlightTrip(tripId)` evita un segundo ítem con el mismo id. Sin `tripId` el guard no aplica. El duplicado lanza `ALREADY_IN_CART` (no hay toast todavía).
3. Hoteles, traslados, actividades y seguros: cada clic agrega una línea (`cart_item_<id>_<Date.now()>`). Doble submit = dos líneas. No hay token de idempotencia.
4. Pestaña Total: editar fees y TA, botón Redondear, toggle COP | USD.
5. Pestaña WhatsApp: `buildWhatsAppQuote`. Copiar no avanza el secuencia si el `CAR###` ya está archivado (`upsertHistory` por número).
6. Vaciar: archiva en historial salvo que ese `CAR###` ya sea la entrada más reciente (evita duplicar tras copiar y vaciar), limpia ítems, fees, cliente, contexto y vuelve la TA a ida y vuelta nacional. El número pendiente se anula.

## Fallos parciales

- Extractor lanza y el injector igual puede pintar botones (catches separados en `runExtractionAndInjection`). El clic posterior no encuentra producto: `console.warn` y no se agrega.
- Puente sin `data`: el hotel/traslado rellena fechas y pax desde el formulario (`resolveHotelSearchFields` / `resolveTransferSearchFields`). Si el formulario tampoco está, pueden guardarse 0 noches o 0 adultos.
- `chrome.storage` falla: el ítem queda en memoria y se pierde al recargar. El `catch` no reintenta.
- TRM no descarga: se conserva la última `tce_trm`. Sin ninguna tasa, la vista USD no se ofrece y el internacional de TA queda en 0 (`resolveTaUnitCop`).
- Copiar al portapapeles falla: `quoteCopyStatus = 'err'` en el carrito. La cotización no se pierde.

No hay transacción entre storage keys. Un crash a mitad de `clearCart` puede dejar ítems vacíos y fees viejos, o al revés. Al tocar ese método, escribir ítems, fees y número pendiente en un orden que deje el carrito usable si el segundo `set` falla, y no dejar la secuencia `tce_quote_seq` adelantada sin historial (`commitQuoteNumber` solo dentro de `archiveCurrentCart`).
