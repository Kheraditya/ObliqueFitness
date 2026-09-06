import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

jest.mock('../../../src/features/auth/api', () => ({
  signIn: jest.fn(),
  signUp: jest.fn(),
  redeemInviteCode: jest.fn(),
  signOut: jest.fn(),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() } }));

import { redeemInviteCode, signIn, signOut, signUp } from '../../../src/features/auth/api';
import { router } from 'expo-router';
import Login from '../login';
import Signup from '../signup';
import JoinGym from '../join-gym';
import AccessPaused from '../access-paused';

describe('polished authentication screens', () => {
  afterEach(async () => { await cleanup(); });
  beforeEach(() => {
    jest.clearAllMocks();
    (signIn as jest.Mock).mockResolvedValue({ error: null });
    (signUp as jest.Mock).mockResolvedValue({ error: null });
    (redeemInviteCode as jest.Mock).mockResolvedValue({ error: null });
    (signOut as jest.Mock).mockResolvedValue(undefined);
  });

  it('signs in and exposes password visibility', async () => {
    await render(<Login />);
    await fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), ' member@example.com ');
    await fireEvent.changeText(screen.getByPlaceholderText('Your password'), 'password123');
    expect(screen.getByLabelText('Show password')).toBeTruthy();
    await fireEvent.press(screen.getByText('Sign In'));
    expect(signIn).toHaveBeenCalledWith('member@example.com', 'password123');
  });

  it('creates an account from the registration screen', async () => {
    await render(<Signup />);
    await fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'new@example.com');
    await fireEvent.changeText(screen.getByPlaceholderText('At least 8 characters'), 'password123');
    await fireEvent.press(screen.getByText('Create Account'));
    expect(signUp).toHaveBeenCalledWith('new@example.com', 'password123');
  });

  it('normalizes and redeems a gym welcome code', async () => {
    await render(<JoinGym />);
    await fireEvent.changeText(screen.getByPlaceholderText('e.g. A1B2C3D4'), 'gym12345');
    await fireEvent.press(screen.getByText('Join Gym'));
    expect(redeemInviteCode).toHaveBeenCalledWith('GYM12345');
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/'));
  });

  it('lets a paused member sign out', async () => {
    await render(<AccessPaused />);
    expect(screen.getByText('Your access is paused.')).toBeTruthy();
    await fireEvent.press(screen.getByText('Sign Out'));
    expect(signOut).toHaveBeenCalled();
    expect(router.replace).toHaveBeenCalledWith('/(auth)/login');
  });
});
