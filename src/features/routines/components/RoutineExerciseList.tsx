import { Alert, Image, Pressable, Text, TextInput, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { RoutineExerciseDraft } from '../types';
import { moveUp, moveDown, groupWithPrevious, ungroup } from '../reorder';
import { colors, radius, spacing, typography } from '../../../theme';

interface RoutineExerciseListProps {
  exercises: RoutineExerciseDraft[];
  onChange: (exercises: RoutineExerciseDraft[]) => void;
}

export function RoutineExerciseList({ exercises, onChange }: RoutineExerciseListProps) {
  function updateAt(index: number, patch: Partial<RoutineExerciseDraft>) {
    const next = [...exercises];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  }

  function removeAt(index: number) {
    onChange(exercises.filter((_, i) => i !== index));
  }

  function openMenu(index: number) {
    const exercise = exercises[index];
    Alert.alert(exercise.exerciseName, undefined, [
      ...(index > 0 ? [{ text: 'Move Up', onPress: () => onChange(moveUp(exercises, index)) }] : []),
      ...(index < exercises.length - 1
        ? [{ text: 'Move Down', onPress: () => onChange(moveDown(exercises, index)) }]
        : []),
      ...(index > 0
        ? [
            {
              text: exercise.supersetGroup != null ? 'Remove from Superset' : 'Superset with Above',
              onPress: () =>
                onChange(
                  exercise.supersetGroup != null
                    ? ungroup(exercises, index)
                    : groupWithPrevious(exercises, index)
                ),
            },
          ]
        : []),
      { text: 'Remove Exercise', style: 'destructive', onPress: () => removeAt(index) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  return (
    <View>
      {exercises.map((ex, index) => (
        <View key={`${ex.exerciseId}-${index}`} style={styles.exercise}>
          <View style={styles.exerciseHeader}>
            {ex.imageUri ? (
              <Image source={{ uri: ex.imageUri }} style={styles.thumbnail} />
            ) : (
              <View style={styles.thumbnailFallback}>
                <Ionicons name="barbell-outline" size={22} color={colors.textSecondary} />
              </View>
            )}
            <View style={styles.nameColumn}>
              <Text style={styles.exerciseName}>{ex.exerciseName}</Text>
              {ex.supersetGroup != null && (
                <Text style={styles.supersetLabel}>Superset {ex.supersetGroup}</Text>
              )}
            </View>
            <Pressable
              onPress={() => openMenu(index)}
              hitSlop={10}
              testID={`routine-exercise-menu-${index}`}
            >
              <Ionicons name="ellipsis-vertical" size={24} color={colors.textPrimary} />
            </Pressable>
          </View>

          <TextInput
            style={styles.notesInput}
            placeholder="Add routine notes here"
            placeholderTextColor={colors.textSecondary}
            value={ex.notes ?? ''}
            onChangeText={(notes) => updateAt(index, { notes })}
            multiline
          />

          <Pressable
            style={styles.restRow}
            accessibilityRole="button"
            accessibilityLabel={`Change rest timer for ${ex.exerciseName}`}
            onPress={() =>
              updateAt(index, { restSeconds: ex.restSeconds === 0 ? 90 : ex.restSeconds === 90 ? 120 : 0 })
            }
          >
            <Ionicons name="stopwatch-outline" size={21} color={colors.accent} />
            <Text style={styles.restText}>
              Rest Timer: {ex.restSeconds === 0 ? 'OFF' : `${ex.restSeconds}s`}
            </Text>
          </Pressable>

          <View style={styles.columnHeaders}>
            <Text style={[styles.columnLabel, styles.setColumn]}>SET</Text>
            <Text style={[styles.columnLabel, styles.valueColumn]}>KG</Text>
            <Text style={[styles.columnLabel, styles.valueColumn]}>REPS</Text>
          </View>

          {Array.from({ length: ex.targetSets }, (_, setIndex) => (
            <View key={setIndex} style={styles.setRow}>
              <View style={styles.setNumberBox}>
                <Text style={styles.setNumber}>{setIndex + 1}</Text>
              </View>
              <View style={styles.valueBox}>
                <Text style={styles.placeholderValue}>-</Text>
              </View>
              <View style={styles.valueBox}>
                <Text style={styles.placeholderValue}>-</Text>
              </View>
            </View>
          ))}

          <Pressable
            style={styles.addSetButton}
            onPress={() => updateAt(index, { targetSets: ex.targetSets + 1 })}
          >
            <Ionicons name="add" size={23} color={colors.textPrimary} />
            <Text style={styles.addSetText}>Add Set</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  exercise: {
    paddingTop: spacing.l,
    paddingBottom: spacing.l,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
  },
  thumbnail: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceElevated,
  },
  thumbnailFallback: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameColumn: {
    flex: 1,
  },
  exerciseName: {
    color: colors.accent,
    fontSize: 18,
    fontWeight: '700',
  },
  supersetLabel: {
    ...typography.label,
    marginTop: 2,
  },
  notesInput: {
    color: colors.textSecondary,
    fontSize: 15,
    marginTop: spacing.m,
    padding: 0,
    minHeight: 24,
  },
  restRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    marginTop: spacing.l,
    marginBottom: spacing.l,
  },
  restText: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '500',
  },
  columnHeaders: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.s,
  },
  columnLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  setColumn: {
    width: 48,
    textAlign: 'center',
  },
  valueColumn: {
    flex: 1,
    textAlign: 'center',
  },
  setRow: {
    flexDirection: 'row',
    gap: spacing.s,
    marginBottom: spacing.s,
  },
  setNumberBox: {
    width: 48,
    height: 46,
    borderRadius: radius.s,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setNumber: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  valueBox: {
    flex: 1,
    height: 46,
    borderRadius: radius.s,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderValue: {
    color: colors.textSecondary,
    fontSize: 17,
  },
  addSetButton: {
    height: 48,
    borderRadius: radius.m,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.s,
    marginTop: spacing.xs,
  },
  addSetText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
});
