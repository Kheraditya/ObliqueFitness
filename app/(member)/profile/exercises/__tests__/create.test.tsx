import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';

jest.mock('../../../../../src/features/exercises/api', () => ({
  createExercise: jest.fn(),
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), setParams: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({})),
}));

import { createExercise } from '../../../../../src/features/exercises/api';
import { router, useLocalSearchParams } from 'expo-router';
import CreateExercise from '../create';

describe('CreateExercise', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useLocalSearchParams as jest.Mock).mockReturnValue({});
  });

  it('does not save while the exercise name is empty', async () => {
    await render(<CreateExercise />);
    await fireEvent.press(screen.getByText('Save'));

    expect(createExercise).not.toHaveBeenCalled();
  });

  it('creates the exercise with picked field values and navigates to its detail page', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      selectedEquipment: 'Barbell',
      selectedMuscle: 'Chest',
      selectedSecondaryMuscles: 'Shoulders,Triceps',
      selectedExerciseType: 'weight_reps',
    });
    (createExercise as jest.Mock).mockResolvedValue({ id: 'ex1', error: null });

    await render(<CreateExercise />);
    await waitFor(() => expect(screen.getByText('Barbell')).toBeTruthy());

    await fireEvent.changeText(screen.getByPlaceholderText('Exercise Name'), 'Incline Press');
    await fireEvent.press(screen.getByText('Save'));

    expect(createExercise).toHaveBeenCalledWith({
      name: 'Incline Press',
      equipment: 'Barbell',
      primaryMuscle: 'Chest',
      secondaryMuscles: ['Shoulders', 'Triceps'],
      exerciseType: 'weight_reps',
    });
    expect(router.replace).toHaveBeenCalledWith('/(member)/profile/exercises/ex1');
  });

  it('shows an error and does not navigate when creation fails', async () => {
    (createExercise as jest.Mock).mockResolvedValue({ id: null, error: 'insert failed' });

    await render(<CreateExercise />);
    await fireEvent.changeText(screen.getByPlaceholderText('Exercise Name'), 'Incline Press');
    await fireEvent.press(screen.getByText('Save'));

    await waitFor(() => expect(screen.getByText('insert failed')).toBeTruthy());
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('navigates to the equipment picker with its own path as returnTo', async () => {
    await render(<CreateExercise />);
    await fireEvent.press(screen.getByText('Equipment'));

    expect(router.push).toHaveBeenCalledWith({
      pathname: '/(member)/profile/exercises/select-equipment',
      params: { returnTo: '/(member)/profile/exercises/create' },
    });
  });

  it('navigates to the secondary muscles picker, forwarding the current selection as initial', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ selectedSecondaryMuscles: 'Shoulders' });

    await render(<CreateExercise />);
    await waitFor(() => expect(screen.getByText('Shoulders')).toBeTruthy());

    await fireEvent.press(screen.getByText('Other Muscles'));

    expect(router.push).toHaveBeenCalledWith({
      pathname: '/(member)/profile/exercises/select-secondary-muscles',
      params: { returnTo: '/(member)/profile/exercises/create', initial: 'Shoulders' },
    });
  });

  it('navigates back when the back arrow is pressed', async () => {
    await render(<CreateExercise />);
    await fireEvent.press(screen.getByTestId('back-button'));

    expect(router.back).toHaveBeenCalled();
  });
});
