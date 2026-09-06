import { render, screen, waitFor } from '@testing-library/react-native';

jest.mock('../../../../src/features/progress/reports', () => ({ getSetsCountByMuscle: jest.fn() }));
jest.mock('expo-router', () => ({ router: { back: jest.fn() } }));

import { getSetsCountByMuscle } from '../../../../src/features/progress/reports';
import SetCountStatistics from '../set-count';

describe('SetCountStatistics', () => {
  it('groups and lists completed muscle sets', async () => {
    (getSetsCountByMuscle as jest.Mock).mockResolvedValue([
      { muscle: 'chest', sets: 5 },
      { muscle: 'triceps', sets: 3 },
    ]);
    await render(<SetCountStatistics />);

    await waitFor(() => expect(screen.getByText('8')).toBeTruthy());
    expect(screen.getByText('5 sets')).toBeTruthy();
    expect(screen.getByText('3 sets')).toBeTruthy();
    expect(screen.getByText('Triceps')).toBeTruthy();
  });
});
