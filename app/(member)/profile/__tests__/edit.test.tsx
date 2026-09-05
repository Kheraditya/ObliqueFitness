import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';

jest.mock('../../../../src/features/auth/api', () => ({
  getCurrentUserProfile: jest.fn(),
  updateProfile: jest.fn(),
}));

jest.mock('expo-router', () => ({
  router: { back: jest.fn() },
}));

import { getCurrentUserProfile, updateProfile } from '../../../../src/features/auth/api';
import { router } from 'expo-router';
import EditProfile from '../edit';

beforeEach(() => {
  jest.clearAllMocks();
  (getCurrentUserProfile as jest.Mock).mockResolvedValue({
    id: 'u1',
    email: 'a@b.com',
    role: 'member',
    gym_id: null,
    name: 'Aditya',
    avatar_url: null,
    bio: 'Lifting since 2020',
    link: null,
    sex: null,
    birthday: null,
  });
});

describe('EditProfile', () => {
  it('prefills the existing profile fields', async () => {
    await render(<EditProfile />);

    await waitFor(() => expect(screen.getByDisplayValue('Aditya')).toBeTruthy());
    expect(screen.getByDisplayValue('Lifting since 2020')).toBeTruthy();
  });

  it('saves edited fields and navigates back when Done is pressed', async () => {
    (updateProfile as jest.Mock).mockResolvedValue({ error: null });

    await render(<EditProfile />);
    await waitFor(() => expect(screen.getByDisplayValue('Aditya')).toBeTruthy());

    await fireEvent.changeText(screen.getByDisplayValue('Aditya'), 'Aditya V');
    await fireEvent.press(screen.getByText('Done'));

    await waitFor(() =>
      expect(updateProfile).toHaveBeenCalledWith({
        name: 'Aditya V',
        bio: 'Lifting since 2020',
        link: null,
        sex: null,
        birthday: null,
      })
    );
    expect(router.back).toHaveBeenCalled();
  });

  it('shows an error and does not navigate back when saving fails', async () => {
    (updateProfile as jest.Mock).mockResolvedValue({ error: 'Not authenticated' });

    await render(<EditProfile />);
    await waitFor(() => expect(screen.getByDisplayValue('Aditya')).toBeTruthy());

    await fireEvent.press(screen.getByText('Done'));

    await waitFor(() => expect(screen.getByText('Not authenticated')).toBeTruthy());
    expect(router.back).not.toHaveBeenCalled();
  });

  it('sets sex from the selected pill', async () => {
    (updateProfile as jest.Mock).mockResolvedValue({ error: null });

    await render(<EditProfile />);
    await waitFor(() => expect(screen.getByText('Male')).toBeTruthy());

    await fireEvent.press(screen.getByText('Male'));
    await fireEvent.press(screen.getByText('Done'));

    await waitFor(() => expect(updateProfile).toHaveBeenCalledWith(expect.objectContaining({ sex: 'male' })));
  });
});
