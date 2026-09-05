import { render, screen, fireEvent } from '@testing-library/react-native';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({ returnTo: '/(member)/profile/exercises/create' })),
}));

import { router, useLocalSearchParams } from 'expo-router';
import SelectSecondaryMuscles from '../select-secondary-muscles';

describe('SelectSecondaryMuscles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useLocalSearchParams as jest.Mock).mockReturnValue({ returnTo: '/(member)/profile/exercises/create' });
  });

  it('renders every muscle group as an unchecked row by default', async () => {
    await render(<SelectSecondaryMuscles />);

    expect(screen.getByText('Shoulders')).toBeTruthy();
    expect(screen.getByText('Forearms')).toBeTruthy();
  });

  it('toggles a muscle on and off, and Done reports the current selection', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      returnTo: '/(member)/profile/exercises/create',
      pickMode: 'true',
    });

    await render(<SelectSecondaryMuscles />);

    await fireEvent.press(screen.getByText('Shoulders'));
    await fireEvent.press(screen.getByText('Forearms'));
    await fireEvent.press(screen.getByText('Done'));

    expect(router.push).toHaveBeenCalledWith({
      pathname: '/(member)/profile/exercises/create',
      params: { pickMode: 'true', selectedSecondaryMuscles: 'Shoulders,Forearms' },
    });
  });

  it('untoggling a selected muscle removes it before Done is pressed', async () => {
    await render(<SelectSecondaryMuscles />);

    await fireEvent.press(screen.getByText('Shoulders'));
    await fireEvent.press(screen.getByText('Shoulders'));
    await fireEvent.press(screen.getByText('Done'));

    expect(router.push).toHaveBeenCalledWith(
      expect.objectContaining({ params: expect.objectContaining({ selectedSecondaryMuscles: '' }) })
    );
  });

  it('preselects muscles passed in via the initial param', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      returnTo: '/(member)/profile/exercises/create',
      initial: 'Shoulders,Forearms',
    });

    await render(<SelectSecondaryMuscles />);
    await fireEvent.press(screen.getByText('Done'));

    expect(router.push).toHaveBeenCalledWith(
      expect.objectContaining({ params: expect.objectContaining({ selectedSecondaryMuscles: 'Shoulders,Forearms' }) })
    );
  });

  it('filters the list by search text', async () => {
    await render(<SelectSecondaryMuscles />);

    await fireEvent.changeText(screen.getByPlaceholderText('Search muscle'), 'trap');

    expect(screen.getByText('Traps')).toBeTruthy();
    expect(screen.queryByText('Chest')).toBeNull();
  });

  it('navigates back when the back arrow is pressed', async () => {
    await render(<SelectSecondaryMuscles />);
    await fireEvent.press(screen.getByTestId('back-button'));

    expect(router.back).toHaveBeenCalled();
  });
});
