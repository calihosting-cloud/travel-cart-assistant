import { autoLogin, manualLogin } from './auth.js';
import { captureBookingMotorPage } from './capture.js';

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
        console.error('Ejemplo: npm run scrape:capture -- https://reservas.grupostravel.com/es/backoffice/list-hotel/abc hotel-results');
        process.exit(1);
      }
      await captureBookingMotorPage({ url: urlArg, slug: slugArg ?? 'page' });
      break;
    }

    default:
      console.log('Comandos disponibles:');
      console.log('  npm run scrape:login              (login automático con .env)');
      console.log('  tsx scraper/run.ts login:manual   (login manual)');
      console.log('  npm run scrape:capture -- <url> [slug]');
      process.exit(command ? 1 : 0);
  }
}

main().catch((err) => {
  console.error('[scraper] Error:', err);
  process.exit(1);
});
