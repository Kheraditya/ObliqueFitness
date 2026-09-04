import { Pressable, Text, StyleSheet } from 'react-native';
import { colors, radius, spacing } from '../theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
}

export function Button({ title, onPress, variant = 'primary' }: ButtonProps) {
  const isPrimary = variant === 'primary';
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        isPrimary ? styles.primary : styles.secondary,
        pressed && styles.pressed,
      ]}
    >
      <Text style={isPrimary ? styles.primaryText : styles.secondaryText}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.full,
    paddingVertical: spacing.m,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.m,
  },
  primary: {
    backgroundColor: colors.accent,
  },
  secondary: {
    backgroundColor: 'transparent',
  },
  pressed: {
    opacity: 0.8,
  },
  primaryText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryText: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '600',
  },
});
