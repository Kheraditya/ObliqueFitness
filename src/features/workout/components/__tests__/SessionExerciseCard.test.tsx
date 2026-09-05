import { render, screen, fireEvent } from '@testing-library/react-native';
import { SessionExerciseCard } from '../SessionExerciseCard';
import type { SessionExercise } from '../../types';

const exercise: SessionExercise = {
  exerciseId: 'ex1',
  exerciseName: 'Bench Press',
  order: 0,
  restSeconds: 90,
  supersetGroup: null,
};

describe('SessionExerciseCard', () => {
  it('logs a new set with parsed numeric values', async () => {
    const onLogSet = jest.fn();
    await render(<SessionExerciseCard exercise={exercise} sets={[]} onLogSet={onLogSet} onUpdateSet={jest.fn()} />);

    const inputs = screen.getAllByPlaceholderText('-');
    await fireEvent.changeText(inputs[0], '100');
    await fireEvent.changeText(inputs[1], '5');
    await fireEvent.press(screen.getByText('Add Set'));

    expect(onLogSet).toHaveBeenCalledWith(100, 5, null);
    expect(screen.getByText('SET')).toBeTruthy();
    expect(screen.getByText('KG')).toBeTruthy();
    expect(screen.getByText('REPS')).toBeTruthy();
  });

  it('edits an existing set when tapped', async () => {
    const onUpdateSet = jest.fn();
    const sets = [{ id: 'set1', exerciseId: 'ex1', setNumber: 1, weight: 80, reps: 8, rpe: null }];
    await render(<SessionExerciseCard exercise={exercise} sets={sets} onLogSet={jest.fn()} onUpdateSet={onUpdateSet} />);

    expect(screen.getByText('80')).toBeTruthy();
    expect(screen.getByText('8')).toBeTruthy();
    await fireEvent.press(screen.getByText('80'));
    await fireEvent.changeText(screen.getAllByPlaceholderText('-')[0], '85');
    await fireEvent.press(screen.getByText('Update Set'));

    expect(onUpdateSet).toHaveBeenCalledWith('set1', 85, 8, null);
  });

  it('hides the RPE column and input when showRpe is false, and logs null for it', async () => {
    const onLogSet = jest.fn();
    await render(
      <SessionExerciseCard exercise={exercise} sets={[]} onLogSet={onLogSet} onUpdateSet={jest.fn()} showRpe={false} />
    );

    expect(screen.queryByText('RPE')).toBeNull();
    expect(screen.getAllByPlaceholderText('-')).toHaveLength(2); // weight, reps only -- no third RPE input

    await fireEvent.changeText(screen.getAllByPlaceholderText('-')[0], '100');
    await fireEvent.changeText(screen.getAllByPlaceholderText('-')[1], '5');
    await fireEvent.press(screen.getByText('Add Set'));

    expect(onLogSet).toHaveBeenCalledWith(100, 5, null);
  });
});
