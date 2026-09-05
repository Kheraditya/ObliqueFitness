import { render, screen, fireEvent } from '@testing-library/react-native';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({ returnTo: '/(member)/profile/exercises/create' })),
}));

import { router, useLocalSearchParams } from 'expo-router';
import SelectEquipment from '../select-equipment';

describe('SelectEquipment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useLocalSearchParams as jest.Mock).mockReturnValue({ returnTo: '/(member)/profile/exercises/create' });
  });

  it('renders every equipment option', async () => {
    await render(<SelectEquipment />);

    expect(screen.getByText('None')).toBeTruthy();
    expect(screen.getByText('Barbell')).toBeTruthy();
    expect(screen.getByText('Suspension Band')).toBeTruthy();
    expect(screen.getByText('Other')).toBeTruthy();
  });

  it('does not show an "All Equipment" row outside filter mode', async () => {
    await render(<SelectEquipment />);

    expect(screen.queryByText('All Equipment')).toBeNull();
  });

  it('pushes the selected equipment back to returnTo, forwarding other params', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      returnTo: '/(member)/profile/exercises/create',
      pickMode: 'true',
    });

    await render(<SelectEquipment />);
    await fireEvent.press(screen.getByText('Barbell'));

    expect(router.push).toHaveBeenCalledWith({
      pathname: '/(member)/profile/exercises/create',
      params: { pickMode: 'true', selectedEquipment: 'Barbell' },
    });
  });

  it('shows an "All Equipment" row in filter mode that clears the filter', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      returnTo: '/(member)/profile/exercises',
      mode: 'filter',
    });

    await render(<SelectEquipment />);
    await fireEvent.press(screen.getByText('All Equipment'));

    expect(router.push).toHaveBeenCalledWith({
      pathname: '/(member)/profile/exercises',
      params: { selectedEquipment: '' },
    });
  });

  it('navigates back when the back arrow is pressed', async () => {
    await render(<SelectEquipment />);
    await fireEvent.press(screen.getByTestId('back-button'));

    expect(router.back).toHaveBeenCalled();
  });
});
