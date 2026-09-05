import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';

jest.mock('../../../../src/features/progress/api', () => ({
  getMuscleVolumes: jest.fn(),
}));

jest.mock('../../../../src/features/exercises/api', () => ({
  getLoggedExercises: jest.fn(),
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));

import { getMuscleVolumes } from '../../../../src/features/progress/api';
import { getLoggedExercises } from '../../../../src/features/exercises/api';
import { router } from 'expo-router';
import Statistics from '../statistics';

describe('Statistics', () => {
  it('renders the heatmap and a list of logged exercises', async () => {
    (getMuscleVolumes as jest.Mock).mockResolvedValue([{ muscle: 'chest', volume: 500 }]);
    (getLoggedExercises as jest.Mock).mockResolvedValue([{ id: 'ex1', name: 'Bench Press' }]);

    await render(<Statistics />);

    await waitFor(() => expect(screen.getByText('Bench Press')).toBeTruthy());
    expect(screen.getByText('Front')).toBeTruthy();
    expect(screen.toJSON()).not.toBeNull();
  });

  it('navigates to the exercise detail screen when a row is pressed', async () => {
    (getMuscleVolumes as jest.Mock).mockResolvedValue([]);
    (getLoggedExercises as jest.Mock).mockResolvedValue([{ id: 'ex1', name: 'Bench Press' }]);

    await render(<Statistics />);
    await waitFor(() => expect(screen.getByText('Bench Press')).toBeTruthy());

    await fireEvent.press(screen.getByText('Bench Press'));

    expect(router.push).toHaveBeenCalledWith('/(member)/profile/exercises/ex1');
  });

  it('navigates to Muscle Distribution and Body Distribution and Monthly Report', async () => {
    (getMuscleVolumes as jest.Mock).mockResolvedValue([]);
    (getLoggedExercises as jest.Mock).mockResolvedValue([]);

    await render(<Statistics />);
    await waitFor(() => expect(screen.getByText('Monthly Report')).toBeTruthy());

    await fireEvent.press(screen.getByText('Muscle distribution (Chart)'));
    expect(router.push).toHaveBeenCalledWith('/(member)/profile/muscle-distribution');

    await fireEvent.press(screen.getByText('Muscle distribution (Body)'));
    expect(router.push).toHaveBeenCalledWith('/(member)/profile/body-distribution');

    await fireEvent.press(screen.getByText('Monthly Report'));
    expect(router.push).toHaveBeenCalledWith('/(member)/profile/monthly-report');
  });
});
