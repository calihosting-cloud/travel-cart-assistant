# Subir el proyecto a GitHub

Cuenta: **calihosting@gmail.com**

## 1. Crear el repositorio en GitHub

1. Inicia sesión en [github.com](https://github.com) con `calihosting@gmail.com`.
2. Clic en **New repository**.
3. Nombre sugerido: `travel-cart-assistant`
4. Descripción: `Chrome extension — Travel Capture Engine for BookingMotor`
5. **Private** (recomendado) o Public, según prefieras.
6. **No** marques "Add a README" (ya existe en el proyecto).
7. Clic en **Create repository**.

## 2. Conectar y subir desde tu PC

En PowerShell, desde la carpeta del proyecto:

```powershell
cd "c:\proyectos\Travel Cart Assistant"

# Si aún no hay commit inicial:
git add .
git status
git commit -m "Initial commit: Travel Capture Engine with hotels and transfers"

# Reemplaza TU_USUARIO por tu usuario de GitHub (ej. calihosting)
git remote add origin https://github.com/TU_USUARIO/travel-cart-assistant.git
git branch -M main
git push -u origin main
```

Git pedirá autenticación. Opciones:

- **HTTPS:** Personal Access Token (Settings → Developer settings → Tokens → classic, scope `repo`).
- **SSH:** Configura una clave SSH en GitHub y usa `git@github.com:TU_USUARIO/travel-cart-assistant.git`.

## 3. (Opcional) Instalar GitHub CLI

```powershell
winget install GitHub.cli
gh auth login
gh repo create travel-cart-assistant --private --source=. --remote=origin --push
```

## Qué se sube y qué no

El `.gitignore` excluye:

- `node_modules/`
- `dist/` (se genera con `npm run build`)
- `.env`, `*.pem`
- `ejemplobusqueda_files/`, `traslados_files/` (assets pesados de páginas guardadas)

Sí se incluyen: código fuente, `ejemplobusqueda.html`, `traslados.html`, documentación.

## Después del push

Quien clone el repo debe ejecutar:

```bash
npm install
npm run build
```

Y cargar la carpeta `dist/` en Chrome como extensión sin empaquetar.
