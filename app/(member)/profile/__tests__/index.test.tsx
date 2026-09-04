import { render, screen, fireEvent } from '@testing-library/react-native';

jest.mock('../../../../src/features/auth/api', () => ({
  signOut: jest.fn(),
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn() },
}));

import { router } from 'expo-router';
import ProfileHome from '../index';

describe('ProfileHome', () => {
  it('navigates to Statistics when pressed', async () => {
    await render(<ProfileHome />);
    await fireEvent.press(screen.getByText('Statistics'));
    expect(router.push).toHaveBeenCalledWith('/(member)/profile/statistics');
  });

  it('navigates to Measures when pressed', async () => {
    await render(<ProfileHome />);
    await fireEvent.press(screen.getByText('Measures'));
    expect(router.push).toHaveBeenCalledWith('/(member)/profile/measures');
  });
});
