# Palabra clave: **restaurar**

Punto de seguridad del repo **antes de cambios grandes**. Si algo falla, di **restaurar** (o sigue esta guía) para volver a este estado.

## Qué quedó marcado

| Marca | Nombre | Uso |
|--------|--------|-----|
| Tag Git | `restaurar` | Punto fijo al commit de checkpoint |
| Rama backup | `backup/restaurar` | Misma revisión; no se mueve si `main` avanza |

Este checkpoint incluye el código sincronizado con `origin/main` más la documentación de base de datos en `docs/database/`.

## Cómo restaurar (tú o el agente)

### 1. Solo mirar el estado (seguro)

```powershell
git fetch
git checkout restaurar
```

Para volver a donde estabas después:

```powershell
git checkout main
```

### 2. Volver `main` exactamente a este checkpoint

**Cuidado:** descarta commits y cambios locales en `main` que no estén guardados en otra rama.

```powershell
git checkout main
git reset --hard restaurar
```

Si ya empujaste commits posteriores a remoto y quieres alinear el remoto (solo si lo pides explícitamente):

```powershell
git push --force-with-lease
```

### 3. Conservar el trabajo fallido y recuperar el checkpoint en una rama

```powershell
git branch salvage/intento-fallido
git checkout main
git reset --hard restaurar
```

## Comprobar que el tag existe

```powershell
git show restaurar --stat
git rev-parse restaurar
git rev-parse backup/restaurar
```

Ambos deben apuntar al mismo commit.

## Actualizar el checkpoint en el futuro

Cuando quieras un nuevo “antes de X”:

1. Commit limpio del estado bueno.
2. Mover el tag (o crear `restaurar-YYYY-MM-DD`):

```powershell
git tag -f restaurar
git branch -f backup/restaurar restaurar
```

3. Actualizar esta página si cambia el procedimiento.

## Para el agente (Cursor)

Si el usuario escribe **restaurar** (o pide volver al checkpoint), seguir `.cursor/rules/restaurar.mdc`: confirmar intención, preferir `reset --hard restaurar` solo tras confirmación, y no hacer force push sin pedirlo.
