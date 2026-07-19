import * as fs from 'fs';
import { chromium, Page } from 'playwright';
import readline from 'readline';
import { BOOKING_MOTOR_ORIGIN, ensureDir, SESSION_DIR, SESSION_FILE } from './paths.js';
import { getCredentials } from './env.js';

function waitForEnter(prompt: string): Promise<void> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(prompt, () => {
      rl.close();
      resolve();
    });
  });
}

export function hasSession(): boolean {
  return fs.existsSync(SESSION_FILE);
}

/**
 * Opens a real browser so you can log in manually once.
 * Playwright saves cookies/localStorage to scraper/.session/state.json.
 */
export async function manualLogin(): Promise<void> {
  ensureDir(SESSION_DIR);

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('\n[scraper] Abriendo BookingMotor...');
  await page.goto(`${BOOKING_MOTOR_ORIGIN}/es/backoffice/`, { waitUntil: 'domcontentloaded' });

  console.log('[scraper] Inicia sesión en el navegador.');
  console.log('[scraper] Cuando veas el backoffice cargado, vuelve aquí y pulsa Enter.\n');
  await waitForEnter('Sesión lista? Pulsa Enter para guardar... ');

  await context.storageState({ path: SESSION_FILE });
  await browser.close();

  console.log(`[scraper] Sesión guardada en ${SESSION_FILE}`);
}

/**
 * Logs in automatically using credentials from .env (BM_EMAIL / BM_PASSWORD)
 * and saves the session. Falls back to manual login if credentials are missing
 * or the automated flow can't find the login form.
 */
export async function autoLogin(): Promise<void> {
  const { url, email, password } = getCredentials();

  if (!email || !password) {
    console.log('[scraper] Faltan BM_EMAIL / BM_PASSWORD en .env. Usando login manual.');
    await manualLogin();
    return;
  }

  ensureDir(SESSION_DIR);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('[scraper] Iniciando sesión automáticamente...');
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90_000 });

    const filledEmail = await fillFirst(page, [
      'input[type="email"]',
      'input[name*="email" i]',
      'input[id*="email" i]',
      'input[name*="correo" i]',
      'input[name="LoginForm[email]"]',
      'input[name="username"]',
    ], email);

    const filledPassword = await fillFirst(page, [
      'input[type="password"]',
      'input[name*="password" i]',
      'input[id*="password" i]',
      'input[name*="pass" i]',
      'input[name="LoginForm[password]"]',
    ], password);

    if (!filledEmail || !filledPassword) {
      console.log('[scraper] No se pudo ubicar el formulario de login. Cambiando a login manual.');
      await browser.close();
      await manualLogin();
      return;
    }

    await Promise.all([
      page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => undefined),
      clickFirst(page, [
        'button[type="submit"]',
        'input[type="submit"]',
        'button:has-text("Iniciar sesión")',
        'button:has-text("Iniciar sesion")',
        'text=Iniciar sesión',
      ]),
    ]);

    await page.waitForTimeout(2500);

    if (await isLoginPage(page)) {
      console.log('[scraper] El login parece haber fallado (¿credenciales?). Revisa .env.');
      await browser.close();
      throw new Error('Login automático falló: sigue en la página de acceso.');
    }

    await context.storageState({ path: SESSION_FILE });
    console.log(`[scraper] Sesión guardada en ${SESSION_FILE}`);
  } finally {
    if (browser.isConnected()) await browser.close();
  }
}

async function fillFirst(page: Page, selectors: string[], value: string): Promise<boolean> {
  for (const sel of selectors) {
    const el = page.locator(sel).first();
    if ((await el.count()) > 0) {
      try {
        await el.fill(value, { timeout: 5000 });
        return true;
      } catch {
        // try next selector
      }
    }
  }
  return false;
}

async function clickFirst(page: Page, selectors: string[]): Promise<boolean> {
  for (const sel of selectors) {
    const el = page.locator(sel).first();
    if ((await el.count()) > 0) {
      try {
        await el.click({ timeout: 5000 });
        return true;
      } catch {
        // try next selector
      }
    }
  }
  return false;
}

async function isLoginPage(page: Page): Promise<boolean> {
  const pwd = page.locator('input[type="password"]');
  return (await pwd.count()) > 0 && (await pwd.first().isVisible().catch(() => false));
}

export async function ensureSession(): Promise<string> {
  if (!hasSession()) {
    console.log('[scraper] No hay sesión guardada. Intentando login automático...');
    await autoLogin();
  }
  return SESSION_FILE;
}
