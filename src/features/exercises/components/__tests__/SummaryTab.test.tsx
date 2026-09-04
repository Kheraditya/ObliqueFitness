import { render, screen, waitFor } from '@testing-library/react-native';

jest.mock('../../api', () => ({
  getPersonalRecords: jest.fn().mockResolvedValue({
    heaviestWeight: 100,
    best1RM: 110,
    bestSetVolume: 500,
    bestSessionVolume: 1500,
  }),
  getStrengthTrend: jest.fn(),
}));

import { getStrengthTrend } from '../../api';
import { SummaryTab } from '../SummaryTab';

const exercise = {
  id: 'ex1',
  name: 'Bench Press',
  primary_muscles: ['chest'],
  secondary_muscles: [],
  equipment: 'barbell',
  instructions: [],
  images: [],
  is_custom: false,
  created_by: null,
};

describe('SummaryTab', () => {
  it('renders a strength trend chart when trend data exists', async () => {
    (getStrengthTrend as jest.Mock).mockResolvedValue([
      { date: '2026-09-01T00:00:00Z', maxWeight: 100, best1RM: 110 },
      { date: '2026-09-03T00:00:00Z', maxWeight: 105, best1RM: 115 },
    ]);

    await render(<SummaryTab exercise={exercise} />);

    await waitFor(() => expect(screen.getByText('Strength Trend')).toBeTruthy());
    expect(screen.queryByText('No data yet.')).toBeNull();
  });

  it('shows "No data yet." when there is no trend data', async () => {
    (getStrengthTrend as jest.Mock).mockResolvedValue([]);

    await render(<SummaryTab exercise={exercise} />);

    await waitFor(() => expect(screen.getByText('No data yet.')).toBeTruthy());
  });
});
