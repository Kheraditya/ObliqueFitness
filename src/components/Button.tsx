import { Pressable, Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'dark';
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  align?: 'center' | 'left';
  // Overrides the variant's default text (and icon) color -- e.g. a danger-red label on an
  // otherwise ordinary "dark" button, without needing a whole new variant for one color.
  textColor?: string;
}

export function Button({ title, onPress, variant = 'primary', disabled = false, icon, align = 'center', textColor }: ButtonProps) {
  const isPrimary = variant === 'primary';
  const isDark = variant === 'dark';
  const defaultTextColor = isPrimary ? colors.textPrimary : isDark ? colors.textPrimary : colors.accent;
  const resolvedTextColor = textColor ?? defaultTextColor;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        isPrimary ? styles.primary : isDark ? styles.dark : styles.secondary,
        align === 'left' && styles.alignLeft,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <View style={styles.content}>
        {icon && <Ionicons name={icon} size={18} color={resolvedTextColor} style={styles.icon} />}
        <Text style={[styles.text, isPrimary && styles.textBold, { color: resolvedTextColor }]}>{title}</Text>
      </View>
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
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: spacing.s,
  },
  primary: {
    backgroundColor: colors.accent,
  },
  secondary: {
    backgroundColor: 'transparent',
  },
  dark: {
    backgroundColor: colors.surface,
  },
  // align="left" only aligns content within Button's own bounds — the calling screen must
  // give Button a width: '100%' (or equivalent flex container) for a true edge-to-edge look.
  alignLeft: {
    alignItems: 'flex-start',
    paddingHorizontal: spacing.m,
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.4,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
  textBold: {
    fontWeight: '700',
  },
});
