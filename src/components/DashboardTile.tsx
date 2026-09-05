import { Pressable, Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../theme';

interface DashboardTileProps {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
}

export function DashboardTile({ label, icon, onPress, disabled = false }: DashboardTileProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.tile, disabled && styles.disabled]}
    >
      <Ionicons name={icon} size={20} color={colors.textPrimary} />
      <Text style={[typography.body, styles.label]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    backgroundColor: colors.surface,
    borderRadius: radius.l,
    padding: spacing.m,
  },
  label: {
    flexShrink: 1,
  },
  disabled: {
    opacity: 0.4,
  },
});
