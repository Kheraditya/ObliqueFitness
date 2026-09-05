import { useEffect, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../../../src/components/Screen';
import { HeaderBar } from '../../../../src/components/HeaderBar';
import { ListItem } from '../../../../src/components/ListItem';
import { listExercises } from '../../../../src/features/exercises/api';
import { filterExercises } from '../../../../src/features/exercises/filters';
import { matchesEquipmentOption } from '../../../../src/features/exercises/constants';
import type { Exercise } from '../../../../src/features/exercises/types';
import { colors, radius, spacing, typography } from '../../../../src/theme';

const OWN_PATH = '/(member)/profile/exercises';

export default function ExerciseList() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [search, setSearch] = useState('');
  const params = useLocalSearchParams<{
    pickMode?: string;
    returnTo?: string;
    // Set instead of `returnTo` when arriving back from a filter picker (select-equipment /
    // select-muscle) -- those pickers' own `returnTo` control param already means "push back to
    // the exercise list", so the caller's original returnTo (e.g. Active Workout) has to travel
    // under a different key or it gets overwritten. See the forwardedParams comment below.
    callerReturnTo?: string;
    selectedEquipment?: string;
    selectedMuscle?: string;
  }>();
  const [equipmentFilter, setEquipmentFilter] = useState<string | null>(null);
  const [muscleFilter, setMuscleFilter] = useState<string | null>(null);

  useEffect(() => {
    listExercises().then(setExercises);
  }, []);

  useEffect(() => {
    if (params.selectedEquipment === undefined) return;
    setEquipmentFilter(params.selectedEquipment || null);
    router.setParams({ selectedEquipment: undefined });
  }, [params.selectedEquipment]);

  useEffect(() => {
    if (params.selectedMuscle === undefined) return;
    setMuscleFilter(params.selectedMuscle || null);
    router.setParams({ selectedMuscle: undefined });
  }, [params.selectedMuscle]);

  const pickMode = params.pickMode === 'true';
  // The caller's returnTo may be sitting under either key depending on how we got here: a
  // direct pick-mode navigation uses `returnTo`, while arriving back from a filter picker uses
  // `callerReturnTo` (see the field comment above).
  const returnTo = params.returnTo ?? params.callerReturnTo;

  const filtered = filterExercises(exercises, { search, equipment: null, muscle: null }).filter((e) => {
    if (equipmentFilter && !matchesEquipmentOption(e.equipment, equipmentFilter)) return false;
    if (muscleFilter) {
      const muscleLower = muscleFilter.toLowerCase();
      const all = [...e.primary_muscles, ...e.secondary_muscles].map((m) => m.toLowerCase());
      if (!all.includes(muscleLower)) return false;
    }
    return true;
  });

  // Preserve pickMode/returnTo across the round trip through a filter picker, so filtering the
  // list mid-pick-flow doesn't drop the params needed to return the final pick to the caller.
  // The picker's own `returnTo` param (set explicitly below, pointing back at this screen) would
  // otherwise collide with and silently overwrite the caller's returnTo if both used the same
  // key -- so the caller's value travels as `callerReturnTo` instead.
  const forwardedParams: Record<string, string> = {};
  if (params.pickMode) forwardedParams.pickMode = params.pickMode;
  if (returnTo) forwardedParams.callerReturnTo = returnTo;

  // The detail screen uses router.dismissTo to pop back to THIS existing list instance rather
  // than pushing a new one, so it doesn't need returnTo forwarded -- but it does need to know
  // pickMode, to decide whether it's safe to leave the native swipe-back gesture enabled (see
  // that screen's own comment for why cross-tab pick-mode entries disable it).
  function goToDetail(exerciseId: string) {
    router.push({ pathname: `/(member)/profile/exercises/${exerciseId}`, params: forwardedParams });
  }

  return (
    <Screen
      header={
        <HeaderBar
          left={
            pickMode ? (
              <Pressable onPress={() => router.back()} hitSlop={8}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
            ) : (
              <Pressable onPress={() => router.back()} hitSlop={8}>
                <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
              </Pressable>
            )
          }
          center={<Text style={typography.headerTitle}>{pickMode ? 'Add Exercise' : 'Exercises'}</Text>}
          right={
            <Pressable onPress={() => router.push('/(member)/profile/exercises/create')} hitSlop={8}>
              <Text style={styles.createText}>Create</Text>
            </Pressable>
          }
        />
      }
    >
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search exercise"
          placeholderTextColor={colors.textSecondary}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={styles.chipRow}>
        <Pressable
          style={styles.chip}
          onPress={() =>
            router.push({
              pathname: '/(member)/profile/exercises/select-equipment',
              params: { ...forwardedParams, returnTo: OWN_PATH, mode: 'filter' },
            })
          }
        >
          <Text style={styles.chipText}>{equipmentFilter ?? 'All Equipment'}</Text>
        </Pressable>
        <Pressable
          style={styles.chip}
          onPress={() =>
            router.push({
              pathname: '/(member)/profile/exercises/select-muscle',
              params: { ...forwardedParams, returnTo: OWN_PATH, mode: 'filter' },
            })
          }
        >
          <Text style={styles.chipText}>{muscleFilter ?? 'All Muscles'}</Text>
        </Pressable>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ListItem
            title={item.name}
            subtitle={item.primary_muscles[0] ?? ''}
            imageUri={item.images[0]}
            trailing={
              <Pressable onPress={() => goToDetail(item.id)} hitSlop={8} testID={`exercise-info-${item.id}`}>
                <Ionicons name="information-circle-outline" size={22} color={colors.textSecondary} />
              </Pressable>
            }
            onPress={() => {
              if (pickMode && returnTo) {
                router.push({ pathname: returnTo, params: { addExerciseId: item.id } });
              } else {
                goToDetail(item.id);
              }
            }}
          />
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  cancelText: {
    color: colors.accent,
    fontSize: 16,
  },
  createText: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '600',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.m,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    marginTop: spacing.m,
    marginBottom: spacing.m,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 16,
  },
  chipRow: {
    flexDirection: 'row',
    gap: spacing.s,
    marginBottom: spacing.m,
  },
  chip: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.full,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
  },
  chipText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
});
