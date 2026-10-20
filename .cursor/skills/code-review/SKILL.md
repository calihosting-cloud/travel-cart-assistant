---
name: code-review
description: Revisión de código de Travel Cart Assistant. Usar cuando Ángela Calidad revisa un diff, un PR o un cambio de parser, carrito, cotización, storage o UI antes del merge. Dueña Ángela Calidad.
---

# Revisión de código

Dueña: **Ángela Calidad**. No aprueba el merge a `main` ni un despliegue: eso es de Rodrigo. El veredicto de esta skill es aprobar el diff o pedir cambios.

Leer el diff completo y los archivos vecinos que el diff llama (`types.ts`, `content.ts`, `CartSidebar.ts`, el provider tocado). No revisar solo el fragmento pegado en el chat.

## Lista

- **Correctitud.** El `type` del `CartItem` coincide con el reader. `rateIndex` del injector y del DOM reader cuentan las mismas filas (`td.hidden-phone-table` ≥ 5). Un vuelo sin datos no se empuja vacío. `tripId` duplicado no crea otra línea; el resto de productos sí puede duplicarse y el diff debe decirlo si cambia esa regla.
- **Bordes.** Precio `0`, moneda vacía, CLP u otra sin TRM, `soldOut` / `onRequest`, ocupación vacía, puente de `window.data` ausente (fallback al formulario), HTML fixture sin `let data`, segunda pasada del `MutationObserver`, ítem viejo sin `type`.
- **Errores.** Storage lleno o ausente no tira la página. Un extractor que falla no impide inyectar botones (hoy van en `try` separados). No aparece `alert()`. `ALREADY_IN_CART` se traduce a feedback en el carrito si el diff toca ese camino; hoy solo se lanza.
- **Pruebas.** Hay script `scratch/` o salida pegada para el contrato que cambia. Un `console.log` sin `process.exit(1)` no cuenta como prueba nueva de un parser. `tsc` cubre `src/` y no cubre `scratch/`.
- **Estilo.** Nombres `tce_` / `TCE_` / `.tce-*`, comillas simples, español en UI, sin formateador nuevo metido en el diff. Comentarios viejos que contradicen `roundUnit()` se corrigen si el diff los toca.
- **Rendimiento.** No observar `document.body` con `attributes: true` sin filtro si el provider ya tiene un debounce. El carrito no reescribe todo el shadow mientras `suppressNumberFieldRerender` está activo por un input de fee. `appendAppLog` no crece de más de 200.
- **Lectura.** Funciones nuevas grandes van al provider o a `src/shared/`, no a otro bloque de 200 líneas en `content.ts` si ya existe un reader.
- **Contratos.** Storage keys y forma de `CartItem` / `SearchContext` / `TrmState` no cambian en silencio. Si cambian, changelog + `docs/CONTEXT.md`. Manifest, popup Dominios y `is*Host()` cuentan la misma lista de OTAs o el PR explica el hueco (JetSMART está en manifest y no en el popup).

## Formato de salida

Hallazgos ordenados por gravedad. Cada uno con archivo y línea, por qué importa y un arreglo concreto. Cerrar con un veredicto.

```markdown
## Bloqueante
- `src/engine/providers/bookingmotor/BookingMotorDOMReader.ts:174` — …
  - Por qué: …
  - Arreglo: …

## Importante
- …

## Sugerencia
- …

## Veredicto
Aprobar
```

o `Pedir cambios`.

Sin hallazgos: decirlo y **Aprobar**. Bloqueante o Importante abierto implica **Pedir cambios**. Sugerencia sola puede ir con **Aprobar**.
