jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({ mocked: true })),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {},
}));

describe('supabase client', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
  });

  it('creates a client with the configured url, anon key, and persistent session storage', async () => {
    const { createClient } = await import('@supabase/supabase-js');
    await import('./supabase');

    expect(createClient).toHaveBeenCalledWith(
      'https://example.supabase.co',
      'anon-key',
      expect.objectContaining({
        auth: expect.objectContaining({
          persistSession: true,
          autoRefreshToken: true,
        }),
      })
    );
  });
});
