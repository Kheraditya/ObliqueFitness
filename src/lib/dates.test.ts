import { toLocalDateString, parseLocalDateString } from './dates';

describe('toLocalDateString', () => {
  it('formats a date as YYYY-MM-DD using local components', () => {
    expect(toLocalDateString(new Date(2003, 5, 16))).toBe('2003-06-16');
  });

  it('pads single-digit months and days', () => {
    expect(toLocalDateString(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('parseLocalDateString', () => {
  it('parses a YYYY-MM-DD string into a local-midnight Date', () => {
    const date = parseLocalDateString('2003-06-16');
    expect(date.getFullYear()).toBe(2003);
    expect(date.getMonth()).toBe(5);
    expect(date.getDate()).toBe(16);
  });

  it('round-trips through toLocalDateString', () => {
    expect(toLocalDateString(parseLocalDateString('2026-01-05'))).toBe('2026-01-05');
  });
});
