import { render, screen, fireEvent } from '@testing-library/react-native';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({ returnTo: '/(member)/profile/exercises/create' })),
}));

import { router, useLocalSearchParams } from 'expo-router';
import SelectMuscle from '../select-muscle';

describe('SelectMuscle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useLocalSearchParams as jest.Mock).mockReturnValue({ returnTo: '/(member)/profile/exercises/create' });
  });

  it('renders every muscle group option', async () => {
    await render(<SelectMuscle />);

    expect(screen.getByText('Abdominals')).toBeTruthy();
    expect(screen.getByText('Chest')).toBeTruthy();
    expect(screen.getByText('Other')).toBeTruthy();
  });

  it('filters the list by search text', async () => {
    await render(<SelectMuscle />);

    await fireEvent.changeText(screen.getByPlaceholderText('Search muscle'), 'ham');

    expect(screen.getByText('Hamstrings')).toBeTruthy();
    expect(screen.queryByText('Chest')).toBeNull();
  });

  it('does not show an "All Muscles" row outside filter mode', async () => {
    await render(<SelectMuscle />);

    expect(screen.queryByText('All Muscles')).toBeNull();
  });

  it('pushes the selected muscle back to returnTo, forwarding other params', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      returnTo: '/(member)/profile/exercises/create',
      pickMode: 'true',
    });

    await render(<SelectMuscle />);
    await fireEvent.press(screen.getByText('Chest'));

    expect(router.push).toHaveBeenCalledWith({
      pathname: '/(member)/profile/exercises/create',
      params: { pickMode: 'true', selectedMuscle: 'Chest' },
    });
  });

  it('shows an "All Muscles" row in filter mode that clears the filter', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      returnTo: '/(member)/profile/exercises',
      mode: 'filter',
    });

    await render(<SelectMuscle />);
    await fireEvent.press(screen.getByText('All Muscles'));

    expect(router.push).toHaveBeenCalledWith({
      pathname: '/(member)/profile/exercises',
      params: { selectedMuscle: '' },
    });
  });

  it('navigates back when the back arrow is pressed', async () => {
    await render(<SelectMuscle />);
    await fireEvent.press(screen.getByTestId('back-button'));

    expect(router.back).toHaveBeenCalled();
  });
});
