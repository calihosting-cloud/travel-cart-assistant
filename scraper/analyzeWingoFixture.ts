/**
 * Offline scan of Wingo.html for selectors useful to the CartReader.
 *   npx tsx scraper/analyzeWingoFixture.ts [Wingo.html]
 */
import * as fs from 'fs';
import * as path from 'path';
import { CAPTURES_DIR, ensureDir, timestampSlug } from './paths.js';

const fixturePath = path.resolve(process.argv[2] || 'Wingo.html');

function main(): void {
  if (!fs.existsSync(fixturePath)) {
    console.error('No existe', fixturePath);
    process.exit(1);
  }
  const html = fs.readFileSync(fixturePath, 'utf8');
  const outDir = path.join(CAPTURES_DIR, `${timestampSlug()}_wingo_fixture_scan`);
  ensureDir(outDir);

  const savedUrl = html.match(/<!-- saved from url=\([^)]*\)(https?:\/\/[^ ]+)/)?.[1] || '';
  const classHits = new Map<string, number>();
  for (const m of html.matchAll(/class="([^"]{2,160})"/g)) {
    for (const token of m[1].split(/\s+/)) {
      if (/flight|fare|journey|total|trip|price|passenger|cart|select|itiner|bound|leg/i.test(token)) {
        classHits.set(token, (classHits.get(token) || 0) + 1);
      }
    }
  }
  const topClasses = [...classHits.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50)
    .map(([name, count]) => ({ name, count }));

  const testIds = [...html.matchAll(/data-testid="([^"]+)"/g)].map((m) => m[1]);
  const uniqueTestIds = [...new Set(testIds)].slice(0, 80);

  const textHits = [
    'Tus vuelos',
    'Detalles de tu viaje',
    'Total:',
    'Viajeros',
    'Tarifa',
    'Adultos',
    'Niño',
    'Infante',
    'Tarifa Administrativa',
    'Continuar',
    'Seleccionar',
  ].map((t) => ({ text: t, present: html.includes(t) }));

  const report = {
    analyzedAt: new Date().toISOString(),
    fixtureBytes: html.length,
    savedUrl,
    topClasses,
    uniqueTestIds,
    textHits,
    hasAngular: /_nghost|ng-version/.test(html),
    hasReact: /__NEXT_DATA__|data-reactroot|react/.test(html),
  };

  fs.writeFileSync(path.join(outDir, 'fixture_scan.json'), JSON.stringify(report, null, 2), 'utf8');
  console.log(JSON.stringify(report, null, 2));
  console.log('[wingo-analyze]', outDir);
}

main();
