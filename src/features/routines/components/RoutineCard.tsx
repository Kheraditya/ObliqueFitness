import { Alert, Pressable, Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../../components/Button';
import { colors, radius, spacing } from '../../../theme';

interface RoutineCardProps {
  name: string;
  exercisePreview?: string;
  onOpen?: () => void;
  onStart: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function RoutineCard({ name, exercisePreview, onOpen, onStart, onEdit, onDelete }: RoutineCardProps) {
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
        <Pressable style={styles.textCol} onPress={onOpen} disabled={!onOpen}>
          <Text style={styles.name}>{name}</Text>
          {!!exercisePreview && (
            <Text style={styles.preview} numberOfLines={2}>
              {exercisePreview}
            </Text>
          )}
        </Pressable>
        <Pressable onPress={handleMenu} hitSlop={8} testID={`routine-menu-${name}`}>
          <Ionicons name="ellipsis-horizontal" size={20} color={colors.textSecondary} />
        </Pressable>
      </View>
      <Button title="Start Routine" onPress={onStart} style={styles.noMarginTop} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.l,
    padding: spacing.m,
    marginBottom: spacing.m,
    gap: spacing.m,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.s,
  },
  textCol: {
    flex: 1,
  },
  name: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  preview: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 19,
    marginTop: spacing.xs,
  },
  noMarginTop: {
    marginTop: 0,
  },
});
