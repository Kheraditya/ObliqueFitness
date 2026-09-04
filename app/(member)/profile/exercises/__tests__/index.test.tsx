import { render, screen, waitFor } from '@testing-library/react-native';

jest.mock('../../../../../src/features/exercises/api', () => ({
  listExercises: jest.fn(),
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));

import { listExercises } from '../../../../../src/features/exercises/api';
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
});
