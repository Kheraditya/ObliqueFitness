import { render, screen, waitFor } from '@testing-library/react-native';

jest.mock('../../../../src/features/progress/reports', () => ({
  getSetsCountByMuscle: jest.fn(),
}));

jest.mock('expo-router', () => ({
  router: { back: jest.fn() },
}));

import { getSetsCountByMuscle } from '../../../../src/features/progress/reports';
import BodyDistribution from '../body-distribution';

describe('BodyDistribution', () => {
  it('lists every muscle at 0 sets when nothing has been logged', async () => {
    (getSetsCountByMuscle as jest.Mock).mockResolvedValue([]);

    await render(<BodyDistribution />);

    await waitFor(() => expect(screen.getByText('Chest')).toBeTruthy());
    expect(screen.getByText('Hamstrings')).toBeTruthy();
    expect(screen.getAllByText('0').length).toBeGreaterThan(1); // Total row + every muscle row
  });

  it('shows a multi-word muscle in title case', async () => {
    (getSetsCountByMuscle as jest.Mock).mockResolvedValue([{ muscle: 'lower back', sets: 4 }]);

    await render(<BodyDistribution />);

    await waitFor(() => expect(screen.getByText('Lower Back')).toBeTruthy());
  });

  it('lists each logged muscle with its set count and a correct total, alongside untrained muscles at 0', async () => {
    (getSetsCountByMuscle as jest.Mock).mockResolvedValue([
      { muscle: 'chest', sets: 8 },
      { muscle: 'triceps', sets: 6 },
    ]);

    await render(<BodyDistribution />);

    await waitFor(() => expect(screen.getByText('Chest')).toBeTruthy());
    expect(screen.getByText('8')).toBeTruthy();
    expect(screen.getByText('Triceps')).toBeTruthy();
    expect(screen.getByText('6')).toBeTruthy();
    expect(screen.getByText('14')).toBeTruthy(); // Total = 8 + 6
    expect(screen.getByText('Hamstrings')).toBeTruthy(); // untrained muscle still listed
  });
});
