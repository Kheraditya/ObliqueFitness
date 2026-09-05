import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';

jest.mock('../../../../../src/features/exercises/api', () => ({
  listExercises: jest.fn(),
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), setParams: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({})),
}));

import { listExercises } from '../../../../../src/features/exercises/api';
import { router, useLocalSearchParams } from 'expo-router';
import ExerciseList from '../index';

describe('ExerciseList', () => {
  it('renders exercises once loaded', async () => {
    (listExercises as jest.Mock).mockResolvedValue([
      { id: '1', name: 'Bench Press', primary_muscles: ['chest'], secondary_muscles: [], equipment: 'barbell', instructions: [], images: [], is_custom: false },
      { id: '2', name: 'Squat', primary_muscles: ['quadriceps'], secondary_muscles: [], equipment: 'barbell', instructions: [], images: [], is_custom: false },
    ]);

    await render(<ExerciseList />);

    await waitFor(() => expect(screen.getByText('Bench Press')).toBeTruthy());
    expect(screen.getByText('Squat')).toBeTruthy();
  });

  it('pushes to the exercise detail route when not in pick mode', async () => {
    (listExercises as jest.Mock).mockResolvedValue([
      { id: '1', name: 'Bench Press', primary_muscles: ['chest'], secondary_muscles: [], equipment: 'barbell', instructions: [], images: [], is_custom: false },
    ]);
    (useLocalSearchParams as jest.Mock).mockReturnValue({});

    await render(<ExerciseList />);

    await waitFor(() => expect(screen.getByText('Bench Press')).toBeTruthy());
    fireEvent.press(screen.getByText('Bench Press'));

    expect(router.push).toHaveBeenCalledWith({ pathname: '/(member)/profile/exercises/1', params: {} });
  });

  it('pushes to returnTo with addExerciseId when in pick mode', async () => {
    (listExercises as jest.Mock).mockResolvedValue([
      { id: '1', name: 'Bench Press', primary_muscles: ['chest'], secondary_muscles: [], equipment: 'barbell', instructions: [], images: [], is_custom: false },
    ]);
    (useLocalSearchParams as jest.Mock).mockReturnValue({ pickMode: 'true', returnTo: '/(member)/routines/new' });

    await render(<ExerciseList />);

    await waitFor(() => expect(screen.getByText('Bench Press')).toBeTruthy());
    fireEvent.press(screen.getByText('Bench Press'));

    expect(router.push).toHaveBeenCalledWith({ pathname: '/(member)/routines/new', params: { addExerciseId: '1' } });
  });

  it('titles the header "Add Exercise" in pick mode and "Exercises" otherwise', async () => {
    (listExercises as jest.Mock).mockResolvedValue([]);
    (useLocalSearchParams as jest.Mock).mockReturnValue({ pickMode: 'true', returnTo: '/(member)/routines/new' });

    const { rerender } = await render(<ExerciseList />);
    expect(screen.getByText('Add Exercise')).toBeTruthy();

    (useLocalSearchParams as jest.Mock).mockReturnValue({});
    await rerender(<ExerciseList />);
    expect(screen.getByText('Exercises')).toBeTruthy();
  });

  it('navigates to Create Exercise when Create is pressed', async () => {
    (listExercises as jest.Mock).mockResolvedValue([]);
    (useLocalSearchParams as jest.Mock).mockReturnValue({});

    await render(<ExerciseList />);
    await fireEvent.press(screen.getByText('Create'));

    expect(router.push).toHaveBeenCalledWith('/(member)/profile/exercises/create');
  });

  it('opens the equipment filter picker, forwarding pickMode and the caller\'s returnTo under a distinct key, when "All Equipment" is pressed', async () => {
    (listExercises as jest.Mock).mockResolvedValue([]);
    (useLocalSearchParams as jest.Mock).mockReturnValue({ pickMode: 'true', returnTo: '/(member)/routines/new' });

    await render(<ExerciseList />);
    await fireEvent.press(screen.getByText('All Equipment'));

    // returnTo here means "the picker should push back to the exercise list" -- the caller's
    // own returnTo travels separately as callerReturnTo so it isn't overwritten.
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/(member)/profile/exercises/select-equipment',
      params: { pickMode: 'true', callerReturnTo: '/(member)/routines/new', returnTo: '/(member)/profile/exercises', mode: 'filter' },
    });
  });

  it('survives a full round trip through a filter picker without losing pick-mode return-to-caller', async () => {
    (listExercises as jest.Mock).mockResolvedValue([
      { id: '1', name: 'Bench Press', primary_muscles: ['chest'], secondary_muscles: [], equipment: 'barbell', instructions: [], images: [], is_custom: false },
    ]);
    // Simulates arriving back on the list after select-equipment forwarded `rest` (which now
    // carries callerReturnTo instead of returnTo) alongside the picked filter value.
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      pickMode: 'true',
      callerReturnTo: '/(member)/routines/new',
      selectedEquipment: 'Barbell',
    });

    await render(<ExerciseList />);
    await waitFor(() => expect(screen.getByText('Bench Press')).toBeTruthy());

    await fireEvent.press(screen.getByText('Bench Press'));

    expect(router.push).toHaveBeenCalledWith({ pathname: '/(member)/routines/new', params: { addExerciseId: '1' } });
  });

  it('opens the muscle filter picker when "All Muscles" is pressed', async () => {
    (listExercises as jest.Mock).mockResolvedValue([]);
    (useLocalSearchParams as jest.Mock).mockReturnValue({});

    await render(<ExerciseList />);
    await fireEvent.press(screen.getByText('All Muscles'));

    expect(router.push).toHaveBeenCalledWith({
      pathname: '/(member)/profile/exercises/select-muscle',
      params: { returnTo: '/(member)/profile/exercises', mode: 'filter' },
    });
  });

  it('filters the list by equipment once a filter is picked, matching legacy seeded values', async () => {
    (listExercises as jest.Mock).mockResolvedValue([
      { id: '1', name: 'Bench Press', primary_muscles: ['chest'], secondary_muscles: [], equipment: 'barbell', instructions: [], images: [], is_custom: false },
      { id: '2', name: 'Kettlebell Swing', primary_muscles: ['glutes'], secondary_muscles: [], equipment: 'kettlebells', instructions: [], images: [], is_custom: false },
    ]);
    (useLocalSearchParams as jest.Mock).mockReturnValue({ selectedEquipment: 'Kettlebell' });

    await render(<ExerciseList />);

    await waitFor(() => expect(screen.getByText('Kettlebell Swing')).toBeTruthy());
    expect(screen.queryByText('Bench Press')).toBeNull();
    expect(router.setParams).toHaveBeenCalledWith({ selectedEquipment: undefined });
  });

  it('always opens the detail screen from the info icon, even in pick mode, forwarding pick-mode context so the detail screen can navigate back explicitly', async () => {
    (listExercises as jest.Mock).mockResolvedValue([
      { id: '1', name: 'Bench Press', primary_muscles: ['chest'], secondary_muscles: [], equipment: 'barbell', instructions: [], images: [], is_custom: false },
    ]);
    (useLocalSearchParams as jest.Mock).mockReturnValue({ pickMode: 'true', returnTo: '/(member)/routines/new' });

    await render(<ExerciseList />);
    await waitFor(() => expect(screen.getByText('Bench Press')).toBeTruthy());

    await fireEvent.press(screen.getByTestId('exercise-info-1'));

    expect(router.push).toHaveBeenCalledWith({
      pathname: '/(member)/profile/exercises/1',
      params: { pickMode: 'true', callerReturnTo: '/(member)/routines/new' },
    });
  });
});
