import { formatElapsed } from './format';

describe('formatElapsed', () => {
  it('formats sub-minute durations in seconds', () => {
    expect(formatElapsed(5)).toBe('5s');
    expect(formatElapsed(59)).toBe('59s');
  });

  it('formats sub-hour durations in minutes', () => {
    expect(formatElapsed(60)).toBe('1m');
    expect(formatElapsed(3599)).toBe('59m');
  });

  it('formats hour-plus durations as hours and minutes', () => {
    expect(formatElapsed(3600)).toBe('1h 0m');
    expect(formatElapsed(3660)).toBe('1h 1m');
    expect(formatElapsed(7325)).toBe('2h 2m');
  });
});
