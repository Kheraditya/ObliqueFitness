import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';

jest.mock('../../../../src/features/measurements/api', () => ({
  listMeasurements: jest.fn(),
  logMeasurement: jest.fn(),
  deleteMeasurement: jest.fn(),
}));

import { listMeasurements, logMeasurement, deleteMeasurement } from '../../../../src/features/measurements/api';
import Measures from '../measures';

describe('Measures', () => {
  it('logs a weight measurement and refreshes the list', async () => {
    (listMeasurements as jest.Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'm1', type: 'weight', value: 80, unit: 'kg', loggedAt: '2026-09-04T00:00:00Z' }]);
    (logMeasurement as jest.Mock).mockResolvedValue({ error: null });

    await render(<Measures />);
    await waitFor(() => expect(screen.getByText('No data yet.')).toBeTruthy());

    await fireEvent.changeText(screen.getByPlaceholderText('Value'), '80');
    await fireEvent.press(screen.getByText('Log'));

    expect(logMeasurement).toHaveBeenCalledWith('weight', 80, 'kg');
    await waitFor(() => expect(screen.getByText('80 kg')).toBeTruthy());
  });

  it('deletes a measurement when Delete is pressed', async () => {
    (listMeasurements as jest.Mock).mockResolvedValue([
      { id: 'm1', type: 'weight', value: 80, unit: 'kg', loggedAt: '2026-09-04T00:00:00Z' },
    ]);
    (deleteMeasurement as jest.Mock).mockResolvedValue({ error: null });

    await render(<Measures />);
    await waitFor(() => expect(screen.getByText('80 kg')).toBeTruthy());

    await fireEvent.press(screen.getByText('Delete'));

    expect(deleteMeasurement).toHaveBeenCalledWith('m1');
    await waitFor(() => expect(screen.queryByText('80 kg')).toBeNull());
  });

  it('clears a previous error once a later log succeeds', async () => {
    (listMeasurements as jest.Mock).mockResolvedValue([]);
    (logMeasurement as jest.Mock)
      .mockResolvedValueOnce({ error: 'boom' })
      .mockResolvedValueOnce({ error: null });

    await render(<Measures />);
    await waitFor(() => expect(screen.getByText('No data yet.')).toBeTruthy());

    await fireEvent.changeText(screen.getByPlaceholderText('Value'), '80');
    await fireEvent.press(screen.getByText('Log'));
    await waitFor(() => expect(screen.getByText('boom')).toBeTruthy());

    await fireEvent.changeText(screen.getByPlaceholderText('Value'), '85');
    await fireEvent.press(screen.getByText('Log'));

    await waitFor(() => expect(screen.queryByText('boom')).toBeNull());
  });

  it('clears the displayed entries when switching to Custom with an empty label', async () => {
    (listMeasurements as jest.Mock).mockResolvedValue([
      { id: 'm1', type: 'weight', value: 80, unit: 'kg', loggedAt: '2026-09-04T00:00:00Z' },
    ]);

    await render(<Measures />);
    await waitFor(() => expect(screen.getByText('80 kg')).toBeTruthy());

    await fireEvent.press(screen.getByText('Custom'));

    await waitFor(() => expect(screen.queryByText('80 kg')).toBeNull());
    expect(screen.getByText('No data yet.')).toBeTruthy();
  });
});
