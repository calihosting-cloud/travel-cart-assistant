---
name: frontend-design
description: Plan visual y crítica de UI para el carrito GT, el popup y el visor de log. Usar antes de maquetar o restilar pantallas. Dueño del plan Andrés el Diseñador; lo implementa Camila Frontend; Catalina Producto UX contrasta el plan con el uso del asesor.
---

# Diseño de interfaz

Adaptado de la skill pública frontend-design de Anthropic (Apache-2.0). El rol de design lead aquí es **Andrés el Diseñador**.

Esto es una herramienta de escritorio para asesores, metida como panel sobre BookingMotor, Despegar, XNet, Avianca, Wingo y JetSMART. No es una landing ni un kit SaaS.

## Lo que ya está implementado

No restilar `CartSidebar` ni el popup en un cambio funcional. Tokens vivos, por si el diff solo tiene que convivir con ellos:

- Popup (`public/popup.css`): `--blue #1e40af`, `--text #1e293b`, `--muted #64748b`, `--border #e2e8f0`, `--ok #16a34a`, `--danger #dc2626`, fondo `#f8fafc`, ancho `380px`.
- Carrito (`injectStyles` en `src/ui/CartSidebar.ts`): header `#1e40af`, fondo `#f8fafc`, borde `#e2e8f0`, badge `#f59e0b`, panel `340px` / ancho `520px`, pestaña fija a la derecha, sombra suave.
- Log (`public/log.html`): fondo `#0f172a`, texto `#e2e8f0`, monoespaciada. Es consola, no marketing.
- Familia actual: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`. Roboto está nombrado en el stack viejo. No copiarlo a superficies nuevas.

Ese azul pizarra, las tarjetas de radio 8px repetidas y Roboto son el kit genérico que esta skill no extiende.

## Plan (antes de codear)

Andrés el Diseñador escribe el plan en el PR o en el comentario de la tarea. Camila Frontend no empieza el CSS hasta contrastar el plan con este brief. Catalina Producto UX confirma que un asesor puede completar la tarea (agregar tarifa, leer total, copiar WhatsApp) sin leer el plan.

### Colores con nombre

Paleta **Mesa GT**, seis colores. Usar el nombre en una variable o en un comentario de bloque; no sembrar hex sueltos.

| Nombre | Hex | Uso |
|---|---|---|
| Tinta | `#1C2430` | Texto y header del panel |
| Manglar | `#0E6B5C` | Acción primaria (agregar, copiar) |
| Papel | `#F6F3EE` | Fondo del panel y del popup |
| Arena | `#E4DDD2` | Bordes y separadores |
| Ámbar | `#8C5A12` | Precios, badge de cantidad, TRM |
| Lacre | `#8E2F2F` | Error, agotado, fallo al copiar |

No usar gradiente púrpura, brillo, crema `#D97757`, ni el azul `#1e40af` como acento de una pantalla nueva.

### Tipos

- Cromo de UI: `ui-sans-serif, "Segoe UI", sans-serif`. Sin Inter y sin Roboto.
- Título de cotización e historial: `Georgia, "Iowan Old Style", Palatino, serif`.
- Importes, IATA y hosts: `ui-monospace, Consolas, monospace` y `font-variant-numeric: tabular-nums`.
- No cargar fuentes de un CDN. La extensión tiene que verse igual sin red.

### Wireframe del carrito (340px)

```
|  GT            3 · asesor   [=] [x] |
|  CLIENTE: [_______________]         |
|  Origen · destino · fechas · pax    |
|  [Productos|Total|WhatsApp|Historial]|
|  +--------------------------------+ |
|  | Hotel · tarifa            COP  | |
|  | mayor [    ] redondeo [  ] 10k | |
|  +--------------------------------+ |
|  Total ítems + fees + TA           |
|  [ Copiar WhatsApp ]               |
```

Pestaña vertical `GT` al borde derecho de la página anfitriona. El panel no empuja el layout (sigue siendo overlay; el push está pendiente en el README). Popup: 380px, tres pestañas ya existentes (Config, Dominios, Cambios), sin hero.

### Principios

- Una acción primaria por vista. El resto es texto o botón secundario.
- El precio muestra siempre el código de moneda (`COP`, `USD`, o el nativo).
- El Shadow DOM cerrado aísla el carrito. No estilizar el DOM del OTA salvo el botón `.btn-tce-add-cart` y el aviso `.tce-prefill-note`.
- Copy en español (es-CO), frases cortas de asesor («Mayor valor», «Redondeo», «Comparar hoteles»). Sin cejas en mayúsculas sostenidas.
- Densidad de herramienta: el header del carrito cabe en una línea, como ya hace el código.

## Piso de calidad

- Ancho usable: popup 380px, carrito 340px y modo 520px. El texto de precio no se sale.
- Foco visible en inputs y botones (`:focus-visible` con outline 2px Tinta o Manglar). Hoy solo algunos inputs tienen `:focus`.
- `prefers-reduced-motion: reduce` anula las transiciones de 0.25s del panel. El código actual no lo hace; una pantalla nueva sí.
- Contraste de texto sobre Papel y sobre Tinta al menos 4.5:1. Ámbar `#8C5A12` va sobre Papel, no como texto pequeño sobre blanco puro.

## Crítica final (antes de dar la UI por hecha)

- ¿El plan se contrastó con este brief y Catalina Producto UX no pidió otro flujo?
- ¿Hay algún gradiente, glow, tarjeta idéntica repetida como decoración, Inter, Roboto nuevo o ceja en mayúsculas?
- ¿Los hex nuevos son los seis de Mesa GT, con nombre?
- ¿Foco, reduced motion y contraste están en el CSS tocado?
- ¿El botón inyectado sigue siendo reconocible junto a Reservar del OTA y no tapa el precio?
- ¿La vista vacía explica usar **+ 🛒 GT**?

Si alguna respuesta es no, se corrige el CSS antes de pedir revisión a Ángela Calidad.
