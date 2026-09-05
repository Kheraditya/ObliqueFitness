import { Text, View, StyleSheet } from 'react-native';
import { colors, radius, spacing } from '../../../theme';

interface ComparisonStatTileProps {
  label: string;
  value: string;
  previousValue: string;
}

export function ComparisonStatTile({ label, value, previousValue }: ComparisonStatTileProps) {
  return (
    <View style={styles.tile}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.previous}>{'→'} {previousValue}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minWidth: '45%',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.m,
    padding: spacing.m,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: spacing.xs,
  },
  value: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  previous: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: spacing.xs,
  },
});
