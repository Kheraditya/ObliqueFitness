import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';

jest.mock('../../../../src/features/measurements/api', () => ({
  listMeasurements: jest.fn(),
  logMeasurement: jest.fn(),
}));

jest.mock('expo-router', () => ({
  router: { back: jest.fn() },
}));

import { listMeasurements, logMeasurement } from '../../../../src/features/measurements/api';
import { router } from 'expo-router';
import LogMeasurement from '../log-measurement';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('LogMeasurement', () => {
  it('shows the existing latest value for a type that has data, and "-" for one that does not', async () => {
    (listMeasurements as jest.Mock).mockResolvedValue([
      { id: 'm1', type: 'weight', value: 80, unit: 'kg', loggedAt: '2026-09-04T00:00:00Z' },
    ]);

    await render(<LogMeasurement />);

    await waitFor(() => expect(screen.getByText('80kg')).toBeTruthy());
    expect(screen.getByText('Waist (cm)')).toBeTruthy();
  });

  it('logs an edited value for a single type when Save is pressed', async () => {
    (listMeasurements as jest.Mock).mockResolvedValue([]);
    (logMeasurement as jest.Mock).mockResolvedValue({ error: null });

    await render(<LogMeasurement />);
    await waitFor(() => expect(screen.getByText('Body Weight (kg)')).toBeTruthy());

    await fireEvent.press(screen.getAllByText('-')[0]);
    await fireEvent.changeText(screen.getByPlaceholderText('-'), '82');
    await fireEvent.press(screen.getByText('Save'));

    await waitFor(() => expect(logMeasurement).toHaveBeenCalledWith('weight', 82, 'kg'));
    await waitFor(() => expect(router.back).toHaveBeenCalled());
  });

  it('does not call logMeasurement for types with no entered value', async () => {
    (listMeasurements as jest.Mock).mockResolvedValue([]);
    (logMeasurement as jest.Mock).mockResolvedValue({ error: null });

    await render(<LogMeasurement />);
    await waitFor(() => expect(screen.getByText('Body Weight (kg)')).toBeTruthy());

    await fireEvent.press(screen.getByText('Save'));

    expect(logMeasurement).not.toHaveBeenCalled();
    await waitFor(() => expect(router.back).toHaveBeenCalled());
  });

  it('navigates back without saving when Cancel is pressed', async () => {
    (listMeasurements as jest.Mock).mockResolvedValue([]);

    await render(<LogMeasurement />);
    await waitFor(() => expect(screen.getByText('Cancel')).toBeTruthy());

    await fireEvent.press(screen.getByText('Cancel'));

    await waitFor(() => expect(router.back).toHaveBeenCalled());
    expect(logMeasurement).not.toHaveBeenCalled();
  });
});
