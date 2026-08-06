import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const htmlPath = path.resolve(__dirname, '..', 'html', 'Despegar.html');
const html = fs.readFileSync(htmlPath, 'utf8');

// Anchor on the CheckoutModel object and brace-match from its opening '{'.
const marker = '{"modelType":"CheckoutModel"';
const objStart = html.indexOf(marker);
if (objStart === -1) {
  console.error('No se encontró el objeto CheckoutModel en Despegar.html');
  process.exit(1);
}
let depth = 0;
let inStr = false;
let strCh = '';
let esc = false;
let end = -1;

for (let i = objStart; i < html.length; i++) {
  const c = html[i];
  if (inStr) {
    if (esc) esc = false;
    else if (c === '\\') esc = true;
    else if (c === strCh) inStr = false;
    continue;
  }
  if (c === '"' || c === "'") {
    inStr = true;
    strCh = c;
  } else if (c === '{') {
    depth++;
  } else if (c === '}') {
    depth--;
    if (depth === 0) {
      end = i;
      break;
    }
  }
}

if (end === -1) {
  console.error('No se pudo balancear el objeto JSON DATA.');
  process.exit(1);
}

const jsonStr = html.slice(objStart, end + 1);
console.log(`[extract] JSON length: ${jsonStr.length} chars`);

let data: any;
try {
  data = JSON.parse(jsonStr);
} catch (e) {
  console.error('[extract] JSON.parse falló:', (e as Error).message);
  const outRaw = path.resolve(__dirname, 'despegar_DATA.raw.txt');
  fs.writeFileSync(outRaw, jsonStr, 'utf8');
  console.error(`[extract] Volcado crudo en ${outRaw}`);
  process.exit(1);
}

const outJson = path.resolve(__dirname, 'despegar_DATA.json');
fs.writeFileSync(outJson, JSON.stringify(data, null, 2), 'utf8');
console.log(`[extract] Guardado JSON formateado en ${outJson}`);

console.log('\n[extract] Claves top-level:');
console.log(Object.keys(data).join(', '));

// Explore likely itinerary/price containers.
function preview(obj: any, keyPath: string, depthLimit = 2, d = 0): void {
  if (d > depthLimit || obj === null || typeof obj !== 'object') return;
  const keys = Array.isArray(obj) ? [`[${obj.length}]`] : Object.keys(obj);
  console.log(`${'  '.repeat(d)}${keyPath}: ${Array.isArray(obj) ? 'Array' + keys[0] : '{' + keys.slice(0, 20).join(', ') + '}'}`);
  if (!Array.isArray(obj)) {
    for (const k of Object.keys(obj).slice(0, 20)) {
      const v = obj[k];
      if (v && typeof v === 'object') preview(v, k, depthLimit, d + 1);
    }
  } else if (obj.length > 0 && typeof obj[0] === 'object') {
    preview(obj[0], '[0]', depthLimit, d + 1);
  }
}

for (const key of Object.keys(data)) {
  const v = data[key];
  if (v && typeof v === 'object') preview(v, key, 1);
  else console.log(`${key}: ${JSON.stringify(v)?.slice(0, 100)}`);
}
