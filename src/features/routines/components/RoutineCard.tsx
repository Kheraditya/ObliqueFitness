import { Alert, Pressable, Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../../components/Button';
import { colors, radius, spacing, typography } from '../../../theme';

interface RoutineCardProps {
  name: string;
  onStart: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function RoutineCard({ name, onStart, onEdit, onDelete }: RoutineCardProps) {
  function handleMenu() {
    Alert.alert(name, undefined, [
      { text: 'Edit Routine', onPress: onEdit },
      { text: 'Delete Routine', style: 'destructive', onPress: onDelete },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={[typography.body, styles.name]}>{name}</Text>
        <Pressable onPress={handleMenu} hitSlop={8} testID={`routine-menu-${name}`}>
          <Ionicons name="ellipsis-horizontal" size={20} color={colors.textSecondary} />
        </Pressable>
      </View>
      <Button title="Start Routine" onPress={onStart} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.m,
    padding: spacing.m,
    marginBottom: spacing.s,
    gap: spacing.s,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    flex: 1,
  },
});
