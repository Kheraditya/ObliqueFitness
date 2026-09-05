import { computeStreak, computeWeekStreak } from './streak';

describe('computeStreak', () => {
  const today = new Date(2026, 8, 4); // Sept 4, 2026 (month is 0-indexed)

  it('returns 0 when there are no sessions', () => {
    expect(computeStreak([], today)).toBe(0);
  });

  it('counts 3 consecutive days ending today', () => {
    expect(computeStreak(['2026-09-04', '2026-09-03', '2026-09-02'], today)).toBe(3);
  });

  it('stops at a gap', () => {
    expect(computeStreak(['2026-09-04', '2026-09-03', '2026-09-01'], today)).toBe(2);
  });

  it('is still alive if the most recent session was yesterday (today not over yet)', () => {
    expect(computeStreak(['2026-09-03', '2026-09-02'], today)).toBe(2);
  });

  it('is broken if the most recent session was 2+ days ago', () => {
    expect(computeStreak(['2026-09-02'], today)).toBe(0);
  });

  it('deduplicates multiple sessions on the same day', () => {
    expect(computeStreak(['2026-09-04', '2026-09-04', '2026-09-03'], today)).toBe(2);
  });
});

describe('computeWeekStreak', () => {
  // Sept 4, 2026 is a Friday; its week runs Mon Aug 31 - Sun Sep 6.
  const today = new Date(2026, 8, 4);

  it('returns 0 when there are no sessions', () => {
    expect(computeWeekStreak([], today)).toBe(0);
  });

  it('counts 3 consecutive weeks ending this week', () => {
    expect(computeWeekStreak(['2026-09-02', '2026-08-26', '2026-08-19'], today)).toBe(3);
  });

  it('stops at a skipped week', () => {
    expect(computeWeekStreak(['2026-09-02', '2026-08-19'], today)).toBe(1);
  });

  it('is still alive if the most recent session was last week (this week not over yet)', () => {
    expect(computeWeekStreak(['2026-08-26', '2026-08-19'], today)).toBe(2);
  });

  it('is broken if the most recent session was 2+ weeks ago', () => {
    expect(computeWeekStreak(['2026-08-18'], today)).toBe(0);
  });

  it('counts multiple sessions in the same week as one week', () => {
    expect(computeWeekStreak(['2026-09-01', '2026-09-02', '2026-08-26'], today)).toBe(2);
  });
});
