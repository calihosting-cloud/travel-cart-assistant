import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const SCRAPER_ROOT = path.resolve(__dirname);
export const SESSION_DIR = path.join(SCRAPER_ROOT, '.session');
export const SESSION_FILE = path.join(SESSION_DIR, 'state.json');
export const CAPTURES_DIR = path.join(SCRAPER_ROOT, 'captures');

export const BOOKING_MOTOR_ORIGIN = 'https://reservas.grupostravel.com';

export function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

export function timestampSlug(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}
