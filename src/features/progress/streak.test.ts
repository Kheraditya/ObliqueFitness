import { computeStreak } from './streak';

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
