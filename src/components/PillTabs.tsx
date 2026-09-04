import { Pressable, Text, View, StyleSheet } from 'react-native';
import { colors, radius, spacing } from '../theme';

interface PillTabsProps {
  options: { key: string; label: string }[];
  value: string;
  onChange: (key: string) => void;
}

export function PillTabs({ options, value, onChange }: PillTabsProps) {
  return (
    <View style={styles.row}>
      {options.map((opt) => {
        const active = opt.key === value;
        return (
          <Pressable key={opt.key} onPress={() => onChange(opt.key)} style={[styles.pill, active ? styles.pillActive : styles.pillInactive]}>
            <Text style={active ? styles.labelActive : styles.labelInactive}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s,
    marginVertical: spacing.s,
  },
  pill: {
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    borderRadius: radius.full,
  },
  pillActive: {
    backgroundColor: colors.accent,
  },
  pillInactive: {
    backgroundColor: colors.surface,
  },
  labelActive: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 14,
  },
  labelInactive: {
    color: colors.textSecondary,
    fontWeight: '500',
    fontSize: 14,
  },
});
