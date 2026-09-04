import { render, screen } from '@testing-library/react-native';

jest.mock('../src/features/auth/useAuth', () => ({
  useAuth: jest.fn(),
}));

jest.mock('expo-router', () => ({
  Redirect: ({ href }: { href: string }) => {
    const { Text } = require('react-native');
    return <Text>redirect:{href}</Text>;
  },
}));

import { useAuth } from '../src/features/auth/useAuth';
import Index from '../app/index';

describe('app/index', () => {
  it('shows nothing that redirects while auth state is loading', async () => {
    (useAuth as jest.Mock).mockReturnValue({ loading: true, session: null, profile: null });
    await render(<Index />);
    expect(screen.queryByText(/redirect:/)).toBeNull();
  });

  it('redirects to login when logged out', async () => {
    (useAuth as jest.Mock).mockReturnValue({ loading: false, session: null, profile: null });
    await render(<Index />);
    expect(screen.getByText('redirect:/(auth)/login')).toBeTruthy();
  });

  it('redirects admins to the admin dashboard', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      loading: false,
      session: { user: { id: 'user-1' } },
      profile: { id: 'user-1', email: 'a@b.com', role: 'admin', gym_id: 'gym-1', name: null, avatar_url: null },
    });
    await render(<Index />);
    expect(screen.getByText('redirect:/(admin)/dashboard')).toBeTruthy();
  });
});
