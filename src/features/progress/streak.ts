function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function daysBetween(a: Date, b: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((a.getTime() - b.getTime()) / msPerDay);
}

export function computeStreak(sessionDates: string[], today: Date = new Date()): number {
  const uniqueDates = Array.from(new Set(sessionDates)).sort().reverse();
  if (uniqueDates.length === 0) return 0;

  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const mostRecent = parseDate(uniqueDates[0]);
  const gapFromToday = daysBetween(todayMidnight, mostRecent);

  if (gapFromToday > 1) return 0;

  let streak = 1;
  let cursor = mostRecent;

  for (let i = 1; i < uniqueDates.length; i++) {
    const candidate = parseDate(uniqueDates[i]);
    if (daysBetween(cursor, candidate) === 1) {
      streak += 1;
      cursor = candidate;
    } else {
      break;
    }
  }

  return streak;
}
