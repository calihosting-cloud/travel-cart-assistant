---
name: security-review
description: Revisión de seguridad de Travel Cart Assistant (OWASP, secretos, permisos, logs). Usar cuando Mateo Seguridad revisa un diff con manifest, DOM, postMessage, innerHTML, .env, scraper, fetch o datos de cliente. Dueño Mateo Seguridad.
---

# Revisión de seguridad

Dueño: **Mateo Seguridad**. No imprime valores de secretos: solo el nombre de la variable, el archivo y la línea. Si un diff trae una clave real, el hallazgo dice «valor presente, rotar» y no lo copia.

## OWASP Top 10 (cómo aplica aquí)

| Riesgo | Dónde mirar |
|---|---|
| Control de acceso roto | `host_permissions`, `matches`, `web_accessible_resources` en `public/manifest.json`. `bridge.js` solo debe ser accesible en Grupo Stravel y local/`file`. |
| Fallos criptográficos | No hay cripto propia. Sesión Playwright en `scraper/.session/state.json` es equivalente a cookie: no commitearla. |
| Inyección | `innerHTML` en `CartSidebar`, `popup.ts`, `log.ts`, `searchSync.ts`. SQL no existe en este repo. |
| Diseño inseguro | Extensión dentro de OTAs, `file://*` y `http://localhost/*` en matches. Ampliar eso es un hallazgo. |
| Configuración | `.gitignore` debe seguir cubriendo `.env`, `*.pem`, `scraper/.session/`, `scraper/captures/`. |
| Componentes vulnerables | `npm audit` contra el lockfile. Dependencias actuales solo de build. |
| Authn / authz | No hay usuario de la extensión. No persistir cookies del OTA. |
| Integridad de software y datos | `dist/` no se commitea. Content script IIFE sin CDN. No cargar fuentes ni scripts desde terceros en el popup. |
| Logging | `appendAppLog`, `console.dir` en `logCartItem`, `console.log` del service worker con la tasa TRM (la tasa no es secreta; la contraseña sí). |
| SSRF | `fetch` de TRM fijo a `TRM_DOLAR_COLOMBIA_URL`. Rechazar un fetch cuya URL salga de la página del OTA. |

## Secretos

Buscar en el diff y, si el cambio es amplio, en el árbol:

```bash
rg -n -i "BM_PASSWORD|BM_EMAIL|api[_-]?key|secret|token|BEGIN (RSA |OPENSSH )?PRIVATE|password\\s*[:=]" --glob '!.git/**' --glob '!node_modules/**' --glob '!dist/**'
rg -n "AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{20,}|xox[baprs]-" --glob '!.git/**' --glob '!node_modules/**'
```

Si `gitleaks` está en el PATH, correr `gitleaks detect --no-banner --redact` desde la raíz. No está en `package.json`; no instalarlo solo para la revisión. Si no está, decirlo y quedarse con `rg`.

Nunca pegar el valor capturado. Señalar archivo:línea y el tipo (`BM_PASSWORD`, PEM, session cookie).

## Dependencias

`npm audit --omit=dev` y `npm audit` (las deps son devDependencies, así que el segundo es el que informa). Cruzar con el ecosistema: `typescript`, `vite`, `tsx`, `playwright`, `jsdom`. Un advisory en herramienta de build que no entra a `dist/` es como máximo Medio, salvo RCE en el script de build.

## Permisos, servicios, logs

- Diff de `manifest.json`: cada match y permiso nuevo necesita un callsite en `src/`.
- `postMessage` con `'*'` solo entre la página y el content script del mismo `window`, con `source` y `type` chequeados (`src/content/content.ts`, `bridge.ts`).
- Datos sensibles en logs: documento de pasajero, email, teléfono, cookie, password, PAN, CVV. Nombre de hotel y precio de cotización son operativos; no tratarlos como secreto, pero no añadir el PII del checkout.

## Formato de salida

```markdown
## Crítico
- `scraper/env.ts:43` — evidencia: la línea loguea BM_PASSWORD (valor no reproducido).
  - Remedio: borrar el log y rotar la clave en BookingMotor.

## Alto
## Medio
## Bajo

## Comandos
- rg: …
- gitleaks: no está en PATH / salida redactada
- npm audit: N vulnerabilidades (severidad máxima …)

## Veredicto
Aprobar / Pedir cambios
```

Crítico o Alto abierto: **Pedir cambios**. No citar el secreto en el remedio.
