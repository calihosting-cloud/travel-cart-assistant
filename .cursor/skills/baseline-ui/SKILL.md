---
name: baseline-ui
description: Reglas MUST, SHOULD y NEVER de UI para el carrito Shadow DOM, el popup y el log de Travel Cart Assistant. Usar al escribir o modificar HTML, CSS o render strings en src/ui, public/popup.css, public/popup.html o public/log.html.
---

# Baseline de UI

Stack real: TypeScript vainilla, sin React. Carrito en Shadow DOM cerrado (`src/ui/CartSidebar.ts`, host `#tce-cart-sidebar-host`). Popup en `public/popup.css` (variables `--blue`, `--text`, `--muted`, `--border`, `--ok`, `--danger`). Log oscuro en `public/log.html`. Implementa **Camila Frontend**. Plan visual de superficies nuevas: **Andrés el Diseñador** (`frontend-design`). Criterio de producto: **Catalina Producto UX**.

## MUST

- Escapar texto de producto, cliente, asesor, líneas de cotización y mensajes de log antes de `innerHTML` (`CartSidebar.escape`, `escapeAttr` en `src/popup/popup.ts`, `escapeHtml` en `src/log/log.ts`).
- Mantener el carrito dentro del shadow. El único CSS que sale al documento anfitrión es el del botón `.btn-tce-add-cart` y el banner de precarga.
- Conservar anchos que el asesor ya usa: panel `340px`, panel amplio `520px`, popup `380px` (`public/popup.css`).
- Mostrar código de moneda junto al monto (`formatPrice` en el carrito, `formatMoney` en `QuoteBuilder`).
- Dejar el foco dentro del input de fee o de mayor valor: actualizar solo `.tce-totals` / el nodo del ítem, no llamar a `render()` completo mientras se escribe (`suppressNumberFieldRerender`).
- Copy de UI en español. Identificadores de código en el idioma que ya tienen (`displayCurrency`, `mayorValor`).
- Botones con `type="button"` salvo los `<form class="add-form">` del popup, que sí envían.

## SHOULD

- Reusar las variables de `public/popup.css` en el popup en lugar de hex nuevos sueltos.
- En una superficie nueva, usar la paleta Mesa GT de `frontend-design` (Tinta, Manglar, Papel, Arena, Ámbar, Lacre) y no ampliar el kit `#1e40af` / `#f8fafc` / radio 8px.
- Poner `font-variant-numeric: tabular-nums` en precios y en la comparación de hoteles (ya está en `.tce-compare-option-row strong`).
- Marcar pestañas con `role="tab"` / `aria-selected` como en `public/popup.html`.
- Respetar `prefers-reduced-motion` en transiciones nuevas del panel (hoy `.tce-panel` anima `transform` 0.25s sin esa media query).
- Outline `:focus-visible` de 2px en controles nuevos. El carrito solo resalta `:focus` en cliente y fees.

## NEVER

- Añadir Inter, Roboto, fuentes de Google o un `<link>` a un CDN. El stack viejo nombra Roboto; no repetirlo en código nuevo.
- Gradientes púrpura, glow, sombras de neón, crema `#D97757`, cejas en mayúsculas sostenidas, ni una retícula de tarjetas idénticas solo decorativas.
- `alert()`, `document.write`, ni un segundo panel de carrito fuera de `#tce-cart-sidebar-host`.
- Estilos en la página del OTA que muevan el layout (el modo push está pendiente y no se improvisa con `margin` en `body`).
- Montar React, Tailwind u otro kit de componentes para una pantalla. El popup y el carrito no los usan.
- Quitar el escape de una cadena que viene del DOM del proveedor o de `chrome.storage`.
- Texto de precio en Ámbar o en `--ok` sobre un fondo que no llegue a contraste 4.5:1.

Un cambio que solo corrige un número o un selector no abre rediseño. Si el diff toca `injectStyles` o `popup.css` más allá de una línea de bug, aplica el plan de Andrés el Diseñador y la crítica final de `frontend-design`.
