import type { HistoryEntry } from './quoteHistory';

export interface DashboardStats {
  today: number;
  yesterday: number;
  week: number;
  month: number;
  totalQuotedCop: number;
  avgTicketCop: number;
  topDestinations: { name: string; count: number }[];
  recent: HistoryEntry[];
}

function startOfDay(d: Date): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

function addDays(ts: number, days: number): number {
  return ts + days * 24 * 60 * 60 * 1000;
}

/** Aggregate local quote history for the assistant dashboard. */
export function computeDashboardStats(
  history: HistoryEntry[],
  now = Date.now()
): DashboardStats {
  const todayStart = startOfDay(new Date(now));
  const yesterdayStart = addDays(todayStart, -1);
  const weekStart = addDays(todayStart, -6);
  const monthStart = addDays(todayStart, -29);

  let today = 0;
  let yesterday = 0;
  let week = 0;
  let month = 0;
  let totalQuotedCop = 0;
  let quotedCount = 0;
  const destMap = new Map<string, number>();

  for (const h of history) {
    const t = h.createdAt;
    if (t >= todayStart) today += 1;
    else if (t >= yesterdayStart) yesterday += 1;
    if (t >= weekStart) week += 1;
    if (t >= monthStart) month += 1;

    if (typeof h.grandTotal === 'number' && h.grandTotal > 0) {
      const cur = (h.primaryCurrency || 'COP').toUpperCase();
      // Count COP totals only for simple v1 stats (USD quotes ignored in sum).
      if (cur === 'COP') {
        totalQuotedCop += h.grandTotal;
        quotedCount += 1;
      }
    }

      const dest =
      (h.destination || h.searchContext?.destinationText || '').trim() || 'Sin destino';
    destMap.set(dest, (destMap.get(dest) || 0) + 1);
  }

  const topDestinations = [...destMap.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    today,
    yesterday,
    week,
    month,
    totalQuotedCop,
    avgTicketCop: quotedCount > 0 ? totalQuotedCop / quotedCount : 0,
    topDestinations,
    recent: history.slice(0, 8),
  };
}
