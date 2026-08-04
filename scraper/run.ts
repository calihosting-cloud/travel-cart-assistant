import { autoLogin, manualLogin } from './auth.js';
import { captureBookingMotorPage } from './capture.js';
import { scrapeAvianca, parseAviancaArgs } from './avianca.js';

const command = process.argv[2];
const urlArg = process.argv[3];
const slugArg = process.argv[4];

async function main(): Promise<void> {
  switch (command) {
    case 'login':
      await autoLogin();
      break;

    case 'login:manual':
      await manualLogin();
      break;

    case 'capture': {
      if (!urlArg) {
        console.error('Uso: npm run scrape:capture -- <url> [slug]');
        console.error(
          'Ejemplo: npm run scrape:capture -- https://reservas.grupostravel.com/es/backoffice/list-hotel/abc hotel-results'
        );
        process.exit(1);
      }
      await captureBookingMotorPage({ url: urlArg, slug: slugArg ?? 'page' });
      break;
    }

    case 'avianca': {
      // Default: CLO→MDE · 2026-07-29 / 2026-08-08 · 2 ADT · 1 CHD · 1 INF
      const params = parseAviancaArgs(process.argv.slice(3));
      await scrapeAvianca(params);
      break;
    }

    case 'avianca:analyze': {
      const { spawnSync } = await import('child_process');
      const fixture = process.argv[3] || 'Avianca.html';
      const r = spawnSync(
        process.platform === 'win32' ? 'npx.cmd' : 'npx',
        ['tsx', 'scraper/analyzeAviancaFixture.ts', fixture],
        { stdio: 'inherit', shell: false }
      );
      process.exit(r.status ?? 1);
      break;
    }

    default:
      console.log('Comandos disponibles:');
      console.log('  npm run scrape:login');
      console.log('  tsx scraper/run.ts login:manual');
      console.log('  npm run scrape:capture -- <url> [slug]');
      console.log('  npm run scrape:avianca              (live; mejor sin --headless)');
      console.log('  npm run scrape:avianca:analyze      (analiza Avianca.html guardado)');
      console.log(
        '  npm run scrape:avianca -- --origin CLO --dest MDE --depart 2026-07-29 --return 2026-08-08'
      );
      process.exit(command ? 1 : 0);
  }
}

main().catch((err) => {
  console.error('[scraper] Error:', err);
  process.exit(1);
});
