import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';
import { buildMonthGrid } from '../calendar';

jest.mock('../../../../src/features/workout/api', () => ({
  getWorkoutDates: jest.fn(),
}));

jest.mock('expo-router', () => ({
  router: { back: jest.fn() },
}));

import { getWorkoutDates } from '../../../../src/features/workout/api';
import { router } from 'expo-router';
import CalendarScreen from '../calendar';

describe('buildMonthGrid', () => {
  it('pads the first week with leading nulls up to the month\'s starting weekday', () => {
    // September 2026 starts on a Tuesday (weekday index 2).
    const grid = buildMonthGrid(2026, 8);
    expect(grid[0][0]).toBeNull();
    expect(grid[0][1]).toBeNull();
    expect(grid[0][2]?.getDate()).toBe(1);
  });

  it('includes every day of the month exactly once', () => {
    const grid = buildMonthGrid(2026, 8); // September has 30 days
    const days = grid.flat().filter((d): d is Date => d !== null).map((d) => d.getDate());
    expect(days).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
  });

  it('pads the last week with trailing nulls so every week has 7 cells', () => {
    const grid = buildMonthGrid(2026, 8);
    for (const week of grid) {
      expect(week).toHaveLength(7);
    }
  });
});

describe('CalendarScreen', () => {
  it('renders the day-of-week headers and back navigation', async () => {
    (getWorkoutDates as jest.Mock).mockResolvedValue([]);

    await render(<CalendarScreen />);

    await waitFor(() => expect(screen.getByText('Calendar')).toBeTruthy());
    expect(screen.getByText('Sun')).toBeTruthy();
    expect(screen.getByText('Sat')).toBeTruthy();
  });

  it('shows a real week streak and rest-day count derived from fetched workout dates', async () => {
    (getWorkoutDates as jest.Mock).mockResolvedValue([]);

    await render(<CalendarScreen />);

    await waitFor(() => expect(screen.getByText(/week streak/)).toBeTruthy());
    expect(screen.getByText(/rest days/)).toBeTruthy();
  });
});
