import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';

jest.mock('../../../../src/features/measurements/api', () => ({
  listMeasurements: jest.fn(),
  deleteMeasurement: jest.fn(),
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useFocusEffect: (callback: () => void) => callback(),
}));

import { listMeasurements, deleteMeasurement } from '../../../../src/features/measurements/api';
import { router } from 'expo-router';
import Measures from '../measures';

describe('Measures', () => {
  it('shows "No data yet." when there are no entries', async () => {
    (listMeasurements as jest.Mock).mockResolvedValue([]);

    await render(<Measures />);

    await waitFor(() => expect(screen.getByText('No data yet.')).toBeTruthy());
  });

  it('shows the latest value/date and history for the default type', async () => {
    (listMeasurements as jest.Mock).mockResolvedValue([
      { id: 'm1', type: 'weight', value: 78, unit: 'kg', loggedAt: '2026-09-01T00:00:00Z' },
      { id: 'm2', type: 'weight', value: 80, unit: 'kg', loggedAt: '2026-09-04T00:00:00Z' },
    ]);

    await render(<Measures />);

    await waitFor(() => expect(screen.getAllByText('80kg').length).toBeGreaterThan(0));
    expect(screen.getAllByText('2026-09-04').length).toBeGreaterThan(0);
    expect(screen.getByText('2026-09-01')).toBeTruthy();
  });

  it('switches history when a different type pill is pressed', async () => {
    (listMeasurements as jest.Mock).mockResolvedValue([
      { id: 'm1', type: 'weight', value: 80, unit: 'kg', loggedAt: '2026-09-04T00:00:00Z' },
      { id: 'm2', type: 'body_fat', value: 18, unit: '%', loggedAt: '2026-09-04T00:00:00Z' },
    ]);

    await render(<Measures />);

    await waitFor(() => expect(screen.getAllByText('80kg').length).toBeGreaterThan(0));
    await fireEvent.press(screen.getByText('Body Fat'));

    await waitFor(() => expect(screen.getAllByText('18%').length).toBeGreaterThan(0));
  });

  it('deletes a measurement when Delete is pressed', async () => {
    (listMeasurements as jest.Mock).mockResolvedValue([
      { id: 'm1', type: 'weight', value: 80, unit: 'kg', loggedAt: '2026-09-04T00:00:00Z' },
    ]);
    (deleteMeasurement as jest.Mock).mockResolvedValue({ error: null });

    await render(<Measures />);
    await waitFor(() => expect(screen.getAllByText('80kg').length).toBeGreaterThan(0));

    await fireEvent.press(screen.getByText('Delete'));

    expect(deleteMeasurement).toHaveBeenCalledWith('m1');
  });

  it('navigates to the Log Measurement screen when + is pressed', async () => {
    (listMeasurements as jest.Mock).mockResolvedValue([]);

    await render(<Measures />);
    await waitFor(() => expect(screen.getByText('Measurements')).toBeTruthy());

    await fireEvent.press(screen.getByTestId('add-measurement-button'));

    expect(router.push).toHaveBeenCalledWith('/(member)/profile/log-measurement');
  });
});
