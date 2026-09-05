import { render, screen, fireEvent } from '@testing-library/react-native';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({ returnTo: '/(member)/profile/exercises/create' })),
}));

import { router, useLocalSearchParams } from 'expo-router';
import SelectExerciseType from '../select-exercise-type';

describe('SelectExerciseType', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useLocalSearchParams as jest.Mock).mockReturnValue({ returnTo: '/(member)/profile/exercises/create' });
  });

  it('renders every exercise type with its example and tracked metrics', async () => {
    await render(<SelectExerciseType />);

    expect(screen.getByText('Weight & Reps')).toBeTruthy();
    expect(screen.getByText('Example: Bench Press, Dumbbell Curls')).toBeTruthy();
    expect(screen.getByText('Duration & Weight')).toBeTruthy();
    expect(screen.getAllByText('Kg').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Reps').length).toBeGreaterThan(0);
  });

  it('pushes the selected exercise type back to returnTo, forwarding other params', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      returnTo: '/(member)/profile/exercises/create',
      pickMode: 'true',
    });

    await render(<SelectExerciseType />);
    await fireEvent.press(screen.getByText('Duration'));

    expect(router.push).toHaveBeenCalledWith({
      pathname: '/(member)/profile/exercises/create',
      params: { pickMode: 'true', selectedExerciseType: 'duration' },
    });
  });

  it('navigates back when the back arrow is pressed', async () => {
    await render(<SelectExerciseType />);
    await fireEvent.press(screen.getByTestId('back-button'));

    expect(router.back).toHaveBeenCalled();
  });
});
