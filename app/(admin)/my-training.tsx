import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { HeaderBar } from '../../src/components/HeaderBar';
import { Button } from '../../src/components/Button';
import { ErrorText } from '../../src/components/ErrorText';
import { getMyProgress, listMyRoutines } from '../../src/features/admin/api';
import type { MemberProgress } from '../../src/features/admin/types';
import { listExercises } from '../../src/features/exercises/api';
import type { Exercise } from '../../src/features/exercises/types';
import { createRoutine } from '../../src/features/routines/api';
import { ShareRoutineModal } from '../../src/features/sharing/components/ShareRoutineModal';
import { startSession } from '../../src/features/workout/api';
import { colors, radius, spacing, typography } from '../../src/theme';

type RoutineSummary = { id: string; name: string; exerciseCount: number };

const emptyProgress: MemberProgress = {
  workoutCount: 0,
  totalVolume: 0,
  totalDurationSeconds: 0,
  lastWorkoutAt: null,
  latestWeight: null,
};

function durationLabel(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours ? `${hours}h ${minutes}m` : `${minutes} min`;
}

export default function AdminMyTraining() {
  const [progress, setProgress] = useState<MemberProgress>(emptyProgress);
  const [routines, setRoutines] = useState<RoutineSummary[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [routineName, setRoutineName] = useState('');
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [shareTarget, setShareTarget] = useState<RoutineSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([getMyProgress(), listMyRoutines(), listExercises()])
      .then(([progressResult, routineResult, exerciseResult]) => {
        setProgress(progressResult);
        setRoutines(routineResult);
        setExercises(exerciseResult);
      })
      .catch(() => setError('Could not load your training data.'))
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(refresh);

  const filteredExercises = useMemo(() => {
    const query = exerciseSearch.trim().toLowerCase();
    return query ? exercises.filter((exercise) => exercise.name.toLowerCase().includes(query)) : exercises;
  }, [exerciseSearch, exercises]);

  async function handleStart(routineId: string | null) {
    const result = await startSession(routineId);
    if (!result.id) {
      setError(result.error);
      return;
    }
    router.push({
      pathname: `/(member)/active-workout/${result.id}`,
      params: { returnTo: '/(admin)/my-training' },
    });
  }

  async function handleCreateRoutine() {
    if (!routineName.trim()) {
      setError('Enter a routine name.');
      return;
    }
    if (!selectedIds.length) {
      setError('Choose at least one exercise.');
      return;
    }
    setSaving(true);
    setError(null);
    const drafts = selectedIds.map((exerciseId) => {
      const exercise = exercises.find((item) => item.id === exerciseId)!;
      return {
        exerciseId,
        exerciseName: exercise.name,
        imageUri: exercise.images[0],
        notes: '',
        targetSets: 3,
        restSeconds: 90,
        supersetGroup: null,
      };
    });
    const result = await createRoutine(routineName.trim(), drafts);
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setRoutineName('');
    setSelectedIds([]);
    refresh();
  }

  function toggleExercise(exerciseId: string) {
    setSelectedIds((current) =>
      current.includes(exerciseId) ? current.filter((id) => id !== exerciseId) : [...current, exerciseId]
    );
  }

  return (
    <Screen
      header={
        <HeaderBar
          left={<Pressable onPress={() => router.replace('/(admin)/dashboard')} hitSlop={8}><Ionicons name="arrow-back" size={25} color={colors.textPrimary} /></Pressable>}
          center={<Text style={typography.headerTitle}>My Training</Text>}
        />
      }
    >
      {loading ? (
        <View style={styles.loading}><ActivityIndicator color={colors.accent} /><Text style={styles.muted}>Loading your training...</Text></View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <Text style={styles.eyebrow}>YOUR PROGRESS</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}><Text style={styles.statValue}>{progress.workoutCount}</Text><Text style={styles.statLabel}>Workouts</Text></View>
            <View style={styles.statCard}><Text style={styles.statValue}>{Math.round(progress.totalVolume).toLocaleString()}</Text><Text style={styles.statLabel}>Volume (kg)</Text></View>
            <View style={styles.statCard}><Text style={styles.statValue}>{durationLabel(progress.totalDurationSeconds)}</Text><Text style={styles.statLabel}>Training time</Text></View>
            <View style={styles.statCard}><Text style={styles.statValue}>{progress.latestWeight ? `${progress.latestWeight.value} ${progress.latestWeight.unit}` : '—'}</Text><Text style={styles.statLabel}>Latest weight</Text></View>
          </View>

          <Button title="Start Empty Workout" icon="barbell-outline" onPress={() => handleStart(null)} />
          {error && <ErrorText>{error}</ErrorText>}

          <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>My routines</Text><Text style={styles.count}>{routines.length}</Text></View>
          {routines.length === 0 ? (
            <View style={styles.empty}><Ionicons name="reader-outline" size={30} color={colors.textSecondary} /><Text style={styles.emptyTitle}>No routines yet</Text><Text style={styles.muted}>Create one below, then start or share it with your gym.</Text></View>
          ) : routines.map((routine) => (
            <View key={routine.id} style={styles.routineCard}>
              <View style={styles.routineIcon}><Ionicons name="barbell-outline" size={20} color={colors.accent} /></View>
              <View style={styles.routineInfo}><Text style={styles.routineName}>{routine.name}</Text><Text style={styles.muted}>{routine.exerciseCount} exercises</Text></View>
              <Pressable onPress={() => setShareTarget(routine)} hitSlop={8} accessibilityLabel={`Share ${routine.name}`}><Ionicons name="share-outline" size={22} color={colors.textPrimary} /></Pressable>
              <Pressable style={styles.startIcon} onPress={() => handleStart(routine.id)} accessibilityLabel={`Start ${routine.name}`}><Ionicons name="play" size={17} color={colors.textPrimary} /></Pressable>
            </View>
          ))}

          <View style={styles.creator}>
            <Text style={styles.sectionTitle}>Create a routine</Text>
            <TextInput value={routineName} onChangeText={setRoutineName} placeholder="Routine title" placeholderTextColor={colors.textSecondary} style={styles.input} />
            <Pressable style={styles.exercisePickerButton} onPress={() => setPickerOpen(true)}>
              <Ionicons name="add" size={21} color={colors.accent} />
              <Text style={styles.pickerText}>{selectedIds.length ? `${selectedIds.length} exercises selected` : 'Choose exercises'}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </Pressable>
            <Button title={saving ? 'Creating...' : 'Create Routine'} onPress={handleCreateRoutine} disabled={saving} />
          </View>
        </ScrollView>
      )}

      <Modal visible={pickerOpen} animationType="slide" onRequestClose={() => setPickerOpen(false)}>
        <View style={styles.modalRoot}>
          <HeaderBar left={<Pressable onPress={() => setPickerOpen(false)}><Text style={styles.close}>Done</Text></Pressable>} center={<Text style={typography.headerTitle}>Choose Exercises</Text>} />
          <View style={styles.modalBody}>
            <View style={styles.search}><Ionicons name="search" size={18} color={colors.textSecondary} /><TextInput value={exerciseSearch} onChangeText={setExerciseSearch} placeholder="Search exercises" placeholderTextColor={colors.textSecondary} style={styles.searchInput} /></View>
            <FlatList data={filteredExercises} keyExtractor={(item) => item.id} renderItem={({ item }) => {
              const selected = selectedIds.includes(item.id);
              return <Pressable style={styles.exerciseRow} onPress={() => toggleExercise(item.id)}><Text style={styles.exerciseName}>{item.name}</Text><View style={[styles.checkbox, selected && styles.checkboxSelected]}>{selected && <Ionicons name="checkmark" size={17} color={colors.textPrimary} />}</View></Pressable>;
            }} />
          </View>
        </View>
      </Modal>

      {shareTarget && <ShareRoutineModal visible routineId={shareTarget.id} routineName={shareTarget.name} onClose={() => setShareTarget(null)} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.l, paddingBottom: spacing.xl },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.m },
  muted: { color: colors.textSecondary, fontSize: 13 },
  eyebrow: { color: colors.accent, fontSize: 11, fontWeight: '800', letterSpacing: 1.4 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s, marginTop: spacing.m },
  statCard: { width: '48%', flexGrow: 1, backgroundColor: colors.surface, borderRadius: radius.l, borderWidth: 1, borderColor: colors.border, padding: spacing.m },
  statValue: { color: colors.textPrimary, fontSize: 22, fontWeight: '800' },
  statLabel: { color: colors.textSecondary, fontSize: 12, marginTop: spacing.xs },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xl, marginBottom: spacing.s },
  sectionTitle: { color: colors.textPrimary, fontSize: 20, fontWeight: '800' },
  count: { color: colors.textSecondary, fontSize: 14 },
  empty: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.l, padding: spacing.xl, gap: spacing.s },
  emptyTitle: { color: colors.textPrimary, fontSize: 17, fontWeight: '700' },
  routineCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.m, minHeight: 72, borderBottomWidth: 1, borderBottomColor: colors.border },
  routineIcon: { width: 42, height: 42, borderRadius: radius.full, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  routineInfo: { flex: 1 },
  routineName: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  startIcon: { width: 38, height: 38, borderRadius: radius.full, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  creator: { marginTop: spacing.xl, backgroundColor: colors.surface, borderRadius: radius.l, padding: spacing.m },
  input: { minHeight: 48, borderBottomWidth: 1, borderBottomColor: colors.border, color: colors.textPrimary, fontSize: 17, marginTop: spacing.s },
  exercisePickerButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.s, minHeight: 52, marginTop: spacing.m },
  pickerText: { flex: 1, color: colors.accent, fontSize: 15, fontWeight: '600' },
  modalRoot: { flex: 1, backgroundColor: colors.background, paddingTop: spacing.l },
  modalBody: { flex: 1, paddingHorizontal: spacing.l },
  close: { color: colors.accent, fontSize: 16, fontWeight: '600' },
  search: { flexDirection: 'row', alignItems: 'center', gap: spacing.s, backgroundColor: colors.surface, borderRadius: radius.m, paddingHorizontal: spacing.m, marginVertical: spacing.l },
  searchInput: { flex: 1, minHeight: 46, color: colors.textPrimary },
  exerciseRow: { flexDirection: 'row', alignItems: 'center', minHeight: 54, borderBottomWidth: 1, borderBottomColor: colors.border },
  exerciseName: { flex: 1, color: colors.textPrimary, fontSize: 15 },
  checkbox: { width: 28, height: 28, borderRadius: radius.s, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  checkboxSelected: { backgroundColor: colors.accent, borderColor: colors.accent },
});
