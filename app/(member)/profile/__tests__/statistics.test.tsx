import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';

jest.mock('../../../../src/features/progress/api', () => ({
  getMuscleVolumes: jest.fn(),
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
}));

import { getMuscleVolumes } from '../../../../src/features/progress/api';
import { router } from 'expo-router';
import Statistics from '../statistics';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Statistics', () => {
  it('renders the header and the body heatmap', async () => {
    (getMuscleVolumes as jest.Mock).mockResolvedValue([{ muscle: 'chest', volume: 500 }]);

    await render(<Statistics />);

    await waitFor(() => expect(screen.getByLabelText('male-body-front')).toBeTruthy());
    expect(screen.getByLabelText('male-body-back')).toBeTruthy();
    expect(screen.getByText('Last 7 days body graph')).toBeTruthy();
    expect(screen.queryByText('Exercises')).toBeNull();
  });

  it('navigates to Muscle Distribution and Body Distribution and Monthly Report', async () => {
    (getMuscleVolumes as jest.Mock).mockResolvedValue([]);

    await render(<Statistics />);
    await waitFor(() => expect(screen.getByText('Monthly Report')).toBeTruthy());

    await fireEvent.press(screen.getByText('Muscle distribution (Chart)'));
    expect(router.push).toHaveBeenCalledWith('/(member)/profile/muscle-distribution');

    await fireEvent.press(screen.getByText('Muscle distribution (Body)'));
    expect(router.push).toHaveBeenCalledWith('/(member)/profile/body-distribution');

    await fireEvent.press(screen.getByText('Monthly Report'));
    expect(router.push).toHaveBeenCalledWith('/(member)/profile/monthly-report');
  });

  it('navigates back when the back arrow is pressed', async () => {
    (getMuscleVolumes as jest.Mock).mockResolvedValue([]);

    await render(<Statistics />);
    await fireEvent.press(screen.getByTestId('back-button'));

    expect(router.back).toHaveBeenCalled();
  });
});
