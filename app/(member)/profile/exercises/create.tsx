import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../../../src/components/Screen';
import { HeaderBar } from '../../../../src/components/HeaderBar';
import { ErrorText } from '../../../../src/components/ErrorText';
import { createExercise } from '../../../../src/features/exercises/api';
import { EXERCISE_TYPE_OPTIONS } from '../../../../src/features/exercises/constants';
import { colors, radius, spacing, typography } from '../../../../src/theme';

const OWN_PATH = '/(member)/profile/exercises/create';

export default function CreateExercise() {
  const params = useLocalSearchParams<{
    selectedEquipment?: string;
    selectedMuscle?: string;
    selectedSecondaryMuscles?: string;
    selectedExerciseType?: string;
  }>();

  const [name, setName] = useState('');
  const [equipment, setEquipment] = useState<string | null>(null);
  const [primaryMuscle, setPrimaryMuscle] = useState<string | null>(null);
  const [secondaryMuscles, setSecondaryMuscles] = useState<string[]>([]);
  const [exerciseType, setExerciseType] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (params.selectedEquipment === undefined) return;
    setEquipment(params.selectedEquipment || null);
    router.setParams({ selectedEquipment: undefined });
  }, [params.selectedEquipment]);

  useEffect(() => {
    if (params.selectedMuscle === undefined) return;
    setPrimaryMuscle(params.selectedMuscle || null);
    router.setParams({ selectedMuscle: undefined });
  }, [params.selectedMuscle]);

  useEffect(() => {
    if (params.selectedSecondaryMuscles === undefined) return;
    setSecondaryMuscles(params.selectedSecondaryMuscles ? params.selectedSecondaryMuscles.split(',').filter(Boolean) : []);
    router.setParams({ selectedSecondaryMuscles: undefined });
  }, [params.selectedSecondaryMuscles]);

  useEffect(() => {
    if (params.selectedExerciseType === undefined) return;
    setExerciseType(params.selectedExerciseType || null);
    router.setParams({ selectedExerciseType: undefined });
  }, [params.selectedExerciseType]);

  const canSave = name.trim().length > 0;
  const exerciseTypeLabel = EXERCISE_TYPE_OPTIONS.find((t) => t.key === exerciseType)?.label ?? null;

  async function handleSave() {
    if (!canSave) return;
    const result = await createExercise({
      name: name.trim(),
      equipment,
      primaryMuscle,
      secondaryMuscles,
      exerciseType,
    });
    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.id) router.replace(`/(member)/profile/exercises/${result.id}`);
  }

  return (
    <Screen
      header={
        <HeaderBar
          left={
            <Pressable onPress={() => router.back()} hitSlop={8} testID="back-button">
              <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
            </Pressable>
          }
          center={<Text style={typography.headerTitle}>Create Exercise</Text>}
          right={
            <Pressable
              onPress={handleSave}
              disabled={!canSave}
              hitSlop={8}
              style={[styles.savePill, canSave && styles.savePillActive]}
            >
              <Text style={[styles.saveText, canSave && styles.saveTextActive]}>Save</Text>
            </Pressable>
          }
        />
      }
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.assetWrap}>
          <View style={styles.assetCircle}>
            <Ionicons name="camera-outline" size={28} color={colors.textSecondary} />
          </View>
          <Text style={styles.assetLabel}>Add Asset</Text>
        </View>

        <TextInput
          style={styles.nameInput}
          placeholder="Exercise Name"
          placeholderTextColor={colors.textSecondary}
          value={name}
          onChangeText={setName}
        />

        {error && <ErrorText>{error}</ErrorText>}

        <FieldRow
          title="Equipment"
          value={equipment}
          onPress={() => router.push({ pathname: '/(member)/profile/exercises/select-equipment', params: { returnTo: OWN_PATH } })}
        />
        <FieldRow
          title="Primary Muscle Group"
          value={primaryMuscle}
          onPress={() => router.push({ pathname: '/(member)/profile/exercises/select-muscle', params: { returnTo: OWN_PATH } })}
        />
        <FieldRow
          title="Other Muscles"
          value={secondaryMuscles.length > 0 ? secondaryMuscles.join(', ') : null}
          placeholder="Select (optional)"
          onPress={() =>
            router.push({
              pathname: '/(member)/profile/exercises/select-secondary-muscles',
              params: { returnTo: OWN_PATH, initial: secondaryMuscles.join(',') },
            })
          }
          last
        />
        <FieldRow
          title="Exercise Type"
          value={exerciseTypeLabel}
          onPress={() =>
            router.push({ pathname: '/(member)/profile/exercises/select-exercise-type', params: { returnTo: OWN_PATH } })
          }
          last
        />
      </ScrollView>
    </Screen>
  );
}

function FieldRow({
  title,
  value,
  placeholder = 'Select',
  onPress,
  last = false,
}: {
  title: string;
  value: string | null;
  placeholder?: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Pressable style={[styles.rowBleed, last && styles.rowNoBorder]} onPress={onPress}>
      <View style={styles.row}>
        <View style={styles.rowText}>
          <Text style={styles.rowTitle}>{title}</Text>
          <Text style={styles.rowValue}>{value ?? placeholder}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  savePill: {
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    borderRadius: radius.m,
    backgroundColor: colors.surfaceElevated,
  },
  savePillActive: {
    backgroundColor: colors.accent,
  },
  saveText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  saveTextActive: {
    color: colors.textPrimary,
  },
  assetWrap: {
    alignItems: 'center',
    marginTop: spacing.l,
    marginBottom: spacing.l,
    gap: spacing.s,
  },
  assetCircle: {
    width: 96,
    height: 96,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assetLabel: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '600',
  },
  nameInput: {
    fontSize: 20,
    color: colors.textPrimary,
    paddingVertical: spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.m,
  },
  rowBleed: {
    marginHorizontal: -spacing.l,
    paddingHorizontal: spacing.l,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowNoBorder: {
    borderBottomWidth: 0,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.m,
  },
  rowText: {
    gap: spacing.xs,
  },
  rowTitle: {
    color: colors.textPrimary,
    fontSize: 16,
  },
  rowValue: {
    color: colors.accent,
    fontSize: 15,
  },
});
