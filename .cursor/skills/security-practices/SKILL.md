---
name: security-practices
description: Prácticas de seguridad para Travel Cart Assistant. Usar al tocar permisos del manifest, postMessage, innerHTML, .env, scraper, logs, storage, fetches o cualquier dato de asesor, cliente o pago.
---

# Prácticas de seguridad

La extensión corre dentro de sitios de terceros con permisos amplios (`file://`, `localhost`, OTAs). Dueño de la revisión: **Mateo Seguridad** (skill `security-review`). Implementación: **Leonardo el Backend** en motor y permisos; **Camila Frontend** en HTML del carrito y del popup.

## Secretos

- Nunca commitear `.env`, `.env.*`, `*.pem`, `*.crx`, `scraper/.session/` ni `scraper/captures/`. Ya están en `.gitignore`.
- Credenciales del scraper: `BM_URL`, `BM_EMAIL`, `BM_PASSWORD`, leídas por `scraper/env.ts`. `process.env` existente gana sobre el archivo. Si faltan email o password, el login automático cae a manual; no inventar defaults con una clave real.
- No imprimir esos valores en logs, PRs, fixtures ni `capture.json` de ejemplo. `capture.json` puede llevar datos de una sesión viva: no se commitea.
- No hay `gitleaks` en `package.json`. Antes de un PR que haya tocado archivos nuevos, buscar a mano los patrones de la skill `security-review`.

## Validación de entrada

- Todo payload de página (`data`, `digitalData`, fares de Wingo, HTML scrapeado) es no confiable. Normalizar con las funciones ya existentes (`normalizeTaConfig`, `normalizeTrmSuplemento`, `normalizeDisplayCurrency`, `parseLocalizedAmount`, `parseDolarColombiaRate`) en lugar de castear y usar.
- Montos: finitos, `>= 0` para fees y ajustes. `Math.max(0, Number(x) || 0)` como en `getItemAdjustments`.
- TRM aceptable: `> 100` y `< 20_000` (`parseDolarColombiaRate`, `trmFromPair`). Fuera de rango, no guardar.
- Ids de DOM (`hotelId`, `rateIndex`) solo se usan para volver a buscar el producto en el documento actual. No construir URLs con concatenación libre hacia otro origen.

## Authn y authz

- La extensión no tiene login propio. El asesor ya está autenticado en el OTA. No copiar cookies de BookingMotor a `chrome.storage` ni a logs.
- Permisos actuales (`public/manifest.json`): `storage`, `activeTab`, `scripting`, `alarms`. Host único declarado: `https://www.dolar-colombia.com/*`. Los content scripts declaran sus propios `matches`.
- No ampliar `host_permissions` ni `matches` “por si acaso”. Un host nuevo va con el injector que lo necesita y con la lista del popup.
- `scripting` + `activeTab` no se usan en `src/` para inyectar en pestañas arbitrarias. No añadir esa inyección genérica.
- PostgreSQL de `docs/database/` no se conecta desde la extensión. No embeber connection strings. TODO: confirmar con Rodrigo dónde viven las credenciales de esa base (no están en este repo).

## Inyección

- SQL: este repo no ejecuta SQL. Si un cambio propone queries, van parametrizadas en el repo de inventario, no concatenadas. Dueño de esquema: **Gonzalo el DBA**.
- Comandos: el scraper no arma shell con input del usuario. Mantenerlo así (`tsx scraper/run.ts` con argumentos de URL, no `exec` de una cadena armada).
- XSS: el carrito asigna `innerHTML` en `CartSidebar`. El texto de producto, cliente, asesor y cotización pasa por `escape()` (`textContent` → `innerHTML` de un `<span>`). Los importes ya formateados también se escapan. No interpolar `bookingUrl` o `sourceUrl` sin validar esquema `http(s)` o ruta relativa del propio OTA.
- El popup escapa atributos con `escapeAttr` en `src/popup/popup.ts`. El log usa `escapeHtml` en `src/log/log.ts`.
- `bridge.ts` hace `postMessage(..., '*')` y el listener ignora `event.source !== window`. Mantener el filtro `source` + `type`. No ejecutar funciones que vengan dentro del payload.
- `injectAviancaDigitalDataProbe` inserta un script inline en la página. No meter ahí datos del carrito ni del storage; solo lee `digitalData` y lo reenvía.

## CSRF, subidas, dependencias

- No hay servidor ni cookies de sesión propias. No añadir un endpoint que reciba el carrito sin un control que Mateo Seguridad revise.
- No hay subida de archivos. Un export PDF futuro no debe leer rutas arbitrarias del disco del asesor.
- Higiene: `package-lock.json` se commitea. Tras tocar dependencias, `npm audit`. Hoy las dependencias directas son de desarrollo (`typescript`, `vite`, `tsx`, `playwright`, `jsdom`, `@types/*`). No promoverlas a runtime de la extensión: `dist/` debe seguir siendo el bundle, sin `node_modules`.

## Logs seguros

- `appendAppLog` guarda el mensaje en claro en el perfil de Chrome. No pasar precios junto con nombre de cliente si el mensaje no hace falta para diagnosticar; nunca passwords, cookies, PAN, CVV ni el cuerpo de `.env`.
- `logCartItem` hace `console.dir` del ítem completo (nombre de hotel, documento de viaje no va hoy, pero sí nombres y precios). No ampliar ese dump con datos de pasajero que el OTA muestre en checkout (documento, fecha de nacimiento, email).

## Pagos

No hay formulario de tarjeta. Si se añade, no se loguea ni se persiste PAN, CVV, vencimiento ni track. Ver skill `checkout-and-payments`.
