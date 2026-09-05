import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';

jest.mock('../../../../src/features/auth/api', () => ({
  getCurrentUserProfile: jest.fn(),
  updateProfile: jest.fn(),
}));

jest.mock('expo-router', () => ({
  router: { back: jest.fn() },
}));

jest.mock('@react-native-community/datetimepicker', () => {
  const { Pressable, Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ onChange }: { onChange: (event: { type: string }, date?: Date) => void }) => (
      <Pressable testID="mock-date-picker" onPress={() => onChange({ type: 'set' }, new Date(2003, 5, 16))}>
        <Text>Mock Date Picker</Text>
      </Pressable>
    ),
  };
});

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

  it('opens the date picker and sets the picked date as the birthday', async () => {
    (updateProfile as jest.Mock).mockResolvedValue({ error: null });

    await render(<EditProfile />);
    await waitFor(() => expect(screen.getByText('Select date')).toBeTruthy());

    await fireEvent.press(screen.getByText('Select date'));
    await fireEvent.press(screen.getByTestId('mock-date-picker'));

    await waitFor(() => expect(screen.getByText('2003-06-16')).toBeTruthy());

    await fireEvent.press(screen.getByText('Done'));
    await waitFor(() => expect(updateProfile).toHaveBeenCalledWith(expect.objectContaining({ birthday: '2003-06-16' })));
  });
});
