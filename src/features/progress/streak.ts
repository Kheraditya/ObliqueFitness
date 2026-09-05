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

function mondayOf(date: Date): Date {
  const day = date.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + diff);
  return new Date(monday.getFullYear(), monday.getMonth(), monday.getDate());
}

function weeksBetween(a: Date, b: Date): number {
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  return Math.round((a.getTime() - b.getTime()) / msPerWeek);
}

export function computeWeekStreak(sessionDates: string[], today: Date = new Date()): number {
  const weekStarts = Array.from(new Set(sessionDates.map((d) => mondayOf(parseDate(d)).getTime())))
    .sort((a, b) => b - a)
    .map((t) => new Date(t));
  if (weekStarts.length === 0) return 0;

  const todayWeekStart = mondayOf(today);
  const mostRecent = weekStarts[0];
  const gapFromToday = weeksBetween(todayWeekStart, mostRecent);

  if (gapFromToday > 1) return 0;

  let streak = 1;
  let cursor = mostRecent;

  for (let i = 1; i < weekStarts.length; i++) {
    if (weeksBetween(cursor, weekStarts[i]) === 1) {
      streak += 1;
      cursor = weekStarts[i];
    } else {
      break;
    }
  }

  return streak;
}
