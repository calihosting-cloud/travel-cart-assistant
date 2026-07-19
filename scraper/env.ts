import * as fs from 'fs';
import * as path from 'path';
import { SCRAPER_ROOT } from './paths.js';

let loaded = false;

/**
 * Minimal .env loader (no external dependency). Looks for .env at the project
 * root (one level above scraper/). Existing process.env values win.
 */
export function loadEnv(): void {
  if (loaded) return;
  loaded = true;

  const envPath = path.resolve(SCRAPER_ROOT, '..', '.env');
  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const eq = line.indexOf('=');
    if (eq === -1) continue;

    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) process.env[key] = value;
  }
}

export function getCredentials(): { url: string; email: string; password: string } {
  loadEnv();
  const url = process.env.BM_URL ?? 'https://reservas.grupostravel.com/es/backoffice/';
  const email = process.env.BM_EMAIL ?? '';
  const password = process.env.BM_PASSWORD ?? '';
  return { url, email, password };
}
