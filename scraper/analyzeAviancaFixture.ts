/**
 * Offline analysis of a saved Avianca booking HTML (Angular IBE).
 * Extracts structure hints for a future CartReader — no browser needed.
 *
 *   npx tsx scraper/analyzeAviancaFixture.ts [path/to/Avianca.html]
 */

import * as fs from 'fs';
import * as path from 'path';
import { CAPTURES_DIR, ensureDir, timestampSlug } from './paths.js';

const fixturePath = path.resolve(process.argv[2] || 'Avianca.html');

function main(): void {
  if (!fs.existsSync(fixturePath)) {
    console.error(`No existe: ${fixturePath}`);
    process.exit(1);
  }

  const html = fs.readFileSync(fixturePath, 'utf8');
  const outDir = path.join(CAPTURES_DIR, `${timestampSlug()}_avianca_fixture_scan`);
  ensureDir(outDir);

  const savedUrlMatch = html.match(/<!-- saved from url=\([^)]*\)(https?:\/\/[^ ]+)/);
  const savedUrl = savedUrlMatch?.[1]?.replace(/--?>.*/, '') || '';
  const croPag = html.match(/cro-pag="([^"]+)"/)?.[1] || null;
  const cartId =
    savedUrl.match(/cartId=([^&]+)/)?.[1] ||
    html.match(/cartId[=:"'\s]+([A-Z0-9]{8,})/i)?.[1] ||
    null;

  const classHits = new Map<string, number>();
  for (const m of html.matchAll(/class="([^"]{3,120})"/g)) {
    for (const token of m[1].split(/\s+/)) {
      if (
        /bound|fare|flight|journey|price|cabin|passenger|cart|avail|ibe|select|airport/i.test(
          token
        )
      ) {
        classHits.set(token, (classHits.get(token) || 0) + 1);
      }
    }
  }
  const topClasses = [...classHits.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 40)
    .map(([name, count]) => ({ name, count }));

  const textSnippets: string[] = [];
  for (const re of [
    /Cali[^<]{0,40}/gi,
    /Medell[^<]{0,40}/gi,
    /CLO[^A-Z]/gi,
    /MDE[^A-Z]/gi,
    /\$\s?[\d.]+/g,
    /COP[^<]{0,30}/gi,
  ]) {
    const found = html.match(re);
    if (found) textSnippets.push(...found.slice(0, 8));
  }

  const steps = [
    'availability-nbfob',
    'availability-nbfib',
    'availability-nbfconf',
    'ancillary-nbfaas',
    'seat',
    'payment',
    'confirmation',
  ].filter((s) => html.toLowerCase().includes(s.toLowerCase()));

  const apiHints = [
    ...new Set(
      [...html.matchAll(/https?:\/\/[^"'\\\s]*avianca[^"'\\\s]*/gi)]
        .map((m) => m[0])
        .filter((u) => /api|booking|static|avail|cart/i.test(u))
        .slice(0, 30)
    ),
  ];

  const report = {
    analyzedAt: new Date().toISOString(),
    fixturePath,
    fixtureBytes: html.length,
    savedUrl,
    croPag,
    cartId,
    bookingEngine: 'booking.avianca.com (Angular IBE)',
    multiStepPages: steps,
    integrationDifficulty: 'high',
    reasons: [
      'Flujo multi-paso (ida → vuelta → confirmación → ancillaries → sillas → pago)',
      'SPA Angular con cartId de sesión (no URL de búsqueda estable como Wingo)',
      'HTML guardado suele ser un snapshot de un paso; sin la API JSON viva faltan tarifas completas',
      'Automatización headless en avianca.com suele fallar (widget / bot detection)',
    ],
    recommendation:
      'Para el carrito GT priorizar Wingo (URL de search clara). Avianca: solo si se captura JSON de red en modo headed o se integra en el paso availability-nbfconf con botón único.',
    topClasses,
    textSnippets: [...new Set(textSnippets)].slice(0, 40),
    apiHints,
  };

  const jsonPath = path.join(outDir, 'fixture_scan.json');
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf8');

  // Keep a short markdown summary for humans
  const md = `# Avianca fixture scan

- **Archivo:** \`${path.basename(fixturePath)}\` (${html.length} bytes)
- **URL guardada:** ${savedUrl || 'n/d'}
- **Paso (cro-pag):** ${croPag || 'n/d'}
- **cartId:** ${cartId || 'n/d'}
- **Pasos detectados:** ${steps.join(', ') || 'n/d'}

## Veredicto
Dificultad **alta** para el carrito GT (muchos pasos + cartId). Wingo es mejor candidato inicial.

## Clases DOM frecuentes (pista para reader)
${topClasses
  .slice(0, 15)
  .map((c) => `- \`${c.name}\` × ${c.count}`)
  .join('\n')}
`;
  fs.writeFileSync(path.join(outDir, 'SUMMARY.md'), md, 'utf8');

  console.log(md);
  console.log(`\n[analyze] Guardado en ${outDir}`);
}

main();
