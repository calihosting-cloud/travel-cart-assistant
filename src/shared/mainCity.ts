/** Zone / island labels that are not the main destination city. */
const ZONE_HINT =
  /\b(island|isla|islas|zona|zone|barrio|sector|pen[ií]nsula|archipi[eé]lago|playa|beach|resort)\b/i;

/**
 * Main city for quote titles — not hotel name, island or zone.
 * "Cartagena, Bolívar" → "Cartagena"
 * "Cartagena - Tierra Bomba Island" → "Cartagena"
 * "Tierra Bomba Island" alone → "" (caller should use another source)
 */
export function mainCityLabel(raw: string | undefined | null): string {
  if (!raw?.trim()) return '';
  let s = raw.trim();

  const dash = s.match(/^(.+?)\s*[-–—]\s+(.+)$/);
  if (dash) {
    const left = dash[1].trim();
    const right = dash[2].trim();
    if (ZONE_HINT.test(right) || /island|isla/i.test(right)) return mainCityLabel(left);
  }

  const comma = (s.split(',')[0] || s).trim();
  if (ZONE_HINT.test(comma) && !/\b(cartagena|bogot[aá]|medell[ií]n|santa marta|cali|san andr[eé]s)\b/i.test(comma)) {
    return '';
  }
  return comma;
}
