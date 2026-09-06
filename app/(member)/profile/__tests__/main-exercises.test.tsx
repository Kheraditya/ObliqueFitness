import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

jest.mock('../../../../src/features/progress/reports', () => ({ getMainExercises: jest.fn() }));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

import { getMainExercises } from '../../../../src/features/progress/reports';
import { router } from 'expo-router';
import MainExercises from '../main-exercises';

describe('MainExercises', () => {
  it('shows ranked exercises and opens their detail', async () => {
    (getMainExercises as jest.Mock).mockResolvedValue([{ id: 'e1', name: 'Bench Press', setCount: 12 }]);
    await render(<MainExercises />);

    await waitFor(() => expect(screen.getByText('12 completed sets')).toBeTruthy());
    fireEvent.press(screen.getByText('Bench Press'));
    expect(router.push).toHaveBeenCalledWith('/(member)/profile/exercises/e1');
  });
});
