---
name: pr-guidelines
description: Ramas, commits, plantilla de PR y checklist previo al merge de Travel Cart Assistant. Usar al abrir o actualizar un pull request, al nombrar una rama o al preparar un release de la extensión.
---

# Guías de pull request

Los merges a `main` y cualquier despliegue de producción los aprueba **Rodrigo**. Sin esa aprobación no se mergea ni se publica la extensión (Web Store o `dist/` repartido a asesores). No hay CI: la revisión humana es el control.

## Ramas

No hay convención commiteada más allá de `main`, el tag `restaurar` y la rama `backup/restaurar` (`docs/RESTAURAR.md`).

Usar:

- `cursor/<tema-corto>-f35d` cuando el cambio lo abre un agente de Cursor en este flujo.
- Para trabajo local del equipo: `<tipo>/<tema-corto>` con tipo `feat`, `fix`, `docs` o `chore`, en minúsculas y guiones.

No force-push a `main`. No mover el tag `restaurar` salvo el procedimiento de `docs/RESTAURAR.md` y confirmación explícita.

## Commits

Historial real, en español, una frase que dice el efecto:

- `Amplía el carrito con más aerolíneas, comparar hoteles y cotización CAR.`
- `docs: link GitHub setup guide from README`

Asunto imperativo y concreto. Cuerpo solo si hay una decisión de storage, selector o moneda que el diff no explica. No commitear `dist/`, `.env`, `scraper/.session/` ni `*_files/`.

Si el cambio es de comportamiento, storage keys, proveedores o docs de producto: entrada nueva arriba en `docs/CHANGELOG.md` y la misma entrada en `public/CHANGELOG.md` (el popup la muestra en Cambios).

## Plantilla de descripción

```markdown
## Qué cambia

- 

## Por qué

- 

## Cómo se probó

- `npx tsc --noEmit`
- `npx tsx scratch/test_….ts` (salida relevante)
- Extensión cargada desde `dist/` en <host o HTML fixture>, sí / no

## Riesgo

- Storage keys tocadas:
- Hosts o permisos del manifest:
- ¿Pide aprobación de Rodrigo para merge o para publicar? sí

## Checklist

- [ ] El diff no incluye secretos, `dist/` ni capturas de sesión
- [ ] Selectores y tipos nuevos están en `docs/CONTEXT.md` si cambia el contrato
- [ ] Changelog de `docs/` y `public/` alineados
```

## Checklist previo al merge

- `npm run build` termina y `dist/content.js` es un IIFE (no aparece `import` de chunks).
- `tsc` limpio en `src/`.
- Pruebas `scratch/` del área tocada ejecutadas, o dicho con claridad que no hay fixture.
- UI: plan de Andrés el Diseñador si hay superficie nueva; revisión visual de Camila Frontend.
- Carrito, TRM, fees o cotización: reglas de `checkout-and-payments` respetadas.
- Ángela Calidad dejó veredicto en la skill `code-review`.
- Si hay permisos, `innerHTML`, mensajes, `.env` o fetches: Mateo Seguridad dejó veredicto.
- Rodrigo aprobó el merge. Publicar `dist/` o subir versión del manifest (`public/manifest.json`, hoy `1.0.33`; `package.json` sigue en `1.0.0`) también pide su aprobación. TODO: confirmar con Rodrigo si la versión que ven los asesores es solo la del manifest.
