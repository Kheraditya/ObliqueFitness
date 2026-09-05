export const colors = {
  background: '#000000',
  surface: '#1C1C1E',
  surfaceElevated: '#2C2C2E',
  border: '#38383A',
  textPrimary: '#FFFFFF',
  textSecondary: '#8E8E93',
  accent: '#0A84FF',
  danger: '#FF453A',
};

export const spacing = {
  xs: 4,
  s: 8,
  m: 16,
  l: 24,
  xl: 32,
};

export const radius = {
  s: 8,
  m: 12,
  l: 16,
  full: 999,
};

export const typography = {
  title: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400' as const,
    color: colors.textSecondary,
  },
  label: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: colors.textSecondary,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    color: colors.textPrimary,
  },
  // The small centered title used in a HeaderBar's center slot (e.g. "Workout Settings",
  // "Create Routine") -- distinct from the large left-aligned `title` used on tab screens.
  headerTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: colors.textPrimary,
  },
};
