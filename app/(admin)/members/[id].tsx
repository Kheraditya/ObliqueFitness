import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { createAssignedRoutine, getAdminMember, getMemberProgress, listMemberRoutines, saveMemberMembership, setMemberAppAccess } from '../../../src/features/admin/api';
import type { AdminMember, MemberProgress, MembershipStatus } from '../../../src/features/admin/types';
import { listExercises } from '../../../src/features/exercises/api';
import type { Exercise } from '../../../src/features/exercises/types';
import { Button } from '../../../src/components/Button';
import { ErrorText } from '../../../src/components/ErrorText';
import { HeaderBar } from '../../../src/components/HeaderBar';
import { Screen } from '../../../src/components/Screen';
import { colors, radius, spacing, typography } from '../../../src/theme';

const emptyProgress: MemberProgress = {
  workoutCount: 0,
  totalVolume: 0,
  totalDurationSeconds: 0,
  lastWorkoutAt: null,
  latestWeight: null,
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function shortDate(value: string | null): string {
  if (!value) return 'No workouts yet';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

function durationLabel(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
}

export default function AdminMemberDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [member, setMember] = useState<AdminMember | null>(null);
  const [progress, setProgress] = useState<MemberProgress>(emptyProgress);
  const [routines, setRoutines] = useState<{ id: string; name: string; exerciseCount: number }[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [planName, setPlanName] = useState('Monthly');
  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<MembershipStatus>('active');
  const [routineName, setRoutineName] = useState('');
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<string[]>([]);
  const [exercisePickerOpen, setExercisePickerOpen] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState('');

  async function load() {
    if (!id) return;
    setLoading(true);
    const [memberResult, progressResult, routineResult, exerciseResult] = await Promise.all([
      getAdminMember(id),
      getMemberProgress(id),
      listMemberRoutines(id),
      listExercises(),
    ]);
    setMember(memberResult);
    setProgress(progressResult);
    setRoutines(routineResult);
    setExercises(exerciseResult);
    if (memberResult?.membership) {
      setPlanName(memberResult.membership.planName);
      setStartDate(memberResult.membership.startDate);
      setEndDate(memberResult.membership.endDate ?? '');
      setStatus(memberResult.membership.status);
    }
    setLoading(false);
  }

  useEffect(() => {
    load().catch(() => {
      setError('Could not load this member.');
      setLoading(false);
    });
  }, [id]);

  const filteredExercises = useMemo(() => {
    const query = exerciseSearch.trim().toLowerCase();
    return query ? exercises.filter((exercise) => exercise.name.toLowerCase().includes(query)) : exercises;
  }, [exerciseSearch, exercises]);

  async function handleSaveMembership() {
    if (!member || !planName.trim() || !startDate.trim()) return;
    setError(null);
    setSuccess(null);
    const result = await saveMemberMembership(
      member.id,
      { planName: planName.trim(), startDate: startDate.trim(), endDate: endDate.trim() || null, status },
      member.membership?.id
    );
    if (result.error) {
      setError(result.error);
      return;
    }
    setSuccess('Membership updated');
    await load();
  }

  async function handleAccessChange(enabled: boolean) {
    if (!member) return;
    const previous = member.accessEnabled;
    setMember({ ...member, accessEnabled: enabled });
    setError(null);
    setSuccess(null);
    const result = await setMemberAppAccess(member.id, enabled);
    if (result.error) {
      setMember((current) => current ? { ...current, accessEnabled: previous } : current);
      setError(result.error);
      return;
    }
    setSuccess(enabled ? 'App access restored' : 'App access paused');
  }

  async function handleAssignRoutine() {
    if (!member || !routineName.trim() || selectedExerciseIds.length === 0) return;
    setError(null);
    setSuccess(null);
    const result = await createAssignedRoutine(member.id, routineName, selectedExerciseIds);
    if (result.error) {
      setError(result.error);
      return;
    }
    setRoutineName('');
    setSelectedExerciseIds([]);
    setSuccess('Routine assigned to member');
    setRoutines(await listMemberRoutines(member.id));
  }

  function toggleExercise(exerciseId: string) {
    setSelectedExerciseIds((current) =>
      current.includes(exerciseId) ? current.filter((idValue) => idValue !== exerciseId) : [...current, exerciseId]
    );
  }

  if (loading || !member) {
    return (
      <Screen header={<HeaderBar left={<Pressable onPress={() => router.replace('/(admin)/dashboard')}><Ionicons name="arrow-back" size={25} color={colors.textPrimary} /></Pressable>} center={<Text style={typography.headerTitle}>Member</Text>} />}>
        <View style={styles.loadingState}><ActivityIndicator color={colors.accent} /><Text style={styles.muted}>Loading member...</Text></View>
      </Screen>
    );
  }

  return (
    <Screen
      header={
        <HeaderBar
          left={<Pressable onPress={() => router.replace('/(admin)/dashboard')} hitSlop={8}><Ionicons name="arrow-back" size={25} color={colors.textPrimary} /></Pressable>}
          center={<Text style={typography.headerTitle}>Member</Text>}
        />
      }
    >
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent}>
        <View style={styles.profileHeader}>
          {member.avatarUrl ? <Image source={{ uri: member.avatarUrl }} style={styles.avatar} /> : <View style={styles.avatarFallback}><Text style={styles.avatarInitial}>{(member.name ?? member.email).charAt(0).toUpperCase()}</Text></View>}
          <View style={styles.profileText}>
            <Text style={styles.memberName}>{member.name || 'Unnamed member'}</Text>
            <Text style={styles.muted}>{member.email}</Text>
          </View>
        </View>

        {error && <ErrorText>{error}</ErrorText>}
        {success && <Text style={styles.success}>{success}</Text>}

        <View style={[styles.accessCard, !member.accessEnabled && styles.accessCardPaused]}>
          <View style={styles.accessIcon}><Ionicons name={member.accessEnabled ? 'shield-checkmark-outline' : 'pause-circle-outline'} size={22} color={member.accessEnabled ? colors.success : colors.danger} /></View>
          <View style={styles.profileText}>
            <Text style={styles.accessTitle}>App access</Text>
            <Text style={styles.muted}>{member.accessEnabled ? 'This member can sign in and use gym features.' : 'Access is paused. Their data remains safely stored.'}</Text>
          </View>
          <Switch testID="member-access-switch" accessibilityLabel="Allow member app access" value={member.accessEnabled} onValueChange={handleAccessChange} trackColor={{ false: '#6A2924', true: '#216E43' }} thumbColor={colors.textPrimary} />
        </View>

        <Text style={styles.sectionTitle}>Progress</Text>
        <View style={styles.progressGrid}>
          <ProgressCard label="Workouts" value={String(progress.workoutCount)} />
          <ProgressCard label="Total volume" value={`${Math.round(progress.totalVolume).toLocaleString()} kg`} />
          <ProgressCard label="Training time" value={durationLabel(progress.totalDurationSeconds)} />
          <ProgressCard label="Latest weight" value={progress.latestWeight ? `${progress.latestWeight.value} ${progress.latestWeight.unit}` : '—'} />
        </View>
        <Text style={styles.lastWorkout}>Last workout: {shortDate(progress.lastWorkoutAt)}</Text>

        <Text style={styles.sectionTitle}>Membership</Text>
        <View style={styles.panel}>
          <Text style={styles.fieldLabel}>PLAN</Text>
          <TextInput style={styles.input} value={planName} onChangeText={setPlanName} placeholder="Plan name" placeholderTextColor={colors.textSecondary} />
          <View style={styles.dateRow}>
            <View style={styles.dateField}><Text style={styles.fieldLabel}>START DATE</Text><TextInput style={styles.input} value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textSecondary} /></View>
            <View style={styles.dateField}><Text style={styles.fieldLabel}>END DATE</Text><TextInput style={styles.input} value={endDate} onChangeText={setEndDate} placeholder="Optional" placeholderTextColor={colors.textSecondary} /></View>
          </View>
          <View style={styles.statusRow}>
            {(['active', 'frozen', 'expired'] as MembershipStatus[]).map((value) => <Pressable key={value} onPress={() => setStatus(value)} style={[styles.statusChoice, status === value && styles.statusChoiceActive]}><Text style={[styles.statusChoiceText, status === value && styles.statusChoiceTextActive]}>{value}</Text></Pressable>)}
          </View>
          <Button title="Save Membership" onPress={handleSaveMembership} disabled={!planName.trim() || !startDate.trim()} />
        </View>

        <View style={styles.sectionHeadingRow}><Text style={styles.sectionTitle}>Assigned routines</Text><Text style={styles.muted}>{routines.length}</Text></View>
        {routines.map((routine) => (
          <Pressable
            key={routine.id}
            style={({ pressed }) => [styles.routineRow, pressed && styles.pressed]}
            accessibilityLabel={`View ${routine.name}`}
            onPress={() => router.push({
              pathname: `/(member)/routines/${routine.id}`,
              params: { returnTo: `/(admin)/members/${member.id}`, readOnly: 'true' },
            })}
          >
            <View style={styles.routineIcon}><Ionicons name="clipboard-outline" size={20} color={colors.accent} /></View>
            <View style={styles.profileText}><Text style={styles.routineName}>{routine.name}</Text><Text style={styles.muted}>{routine.exerciseCount} exercises</Text></View>
            <Ionicons name="chevron-forward" size={19} color={colors.textSecondary} />
          </Pressable>
        ))}

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Assign a new routine</Text>
          <TextInput style={styles.input} value={routineName} onChangeText={setRoutineName} placeholder="Routine name" placeholderTextColor={colors.textSecondary} />
          <Pressable style={styles.exerciseSelector} onPress={() => setExercisePickerOpen(true)}><View><Text style={styles.selectorTitle}>Choose exercises</Text><Text style={styles.muted}>{selectedExerciseIds.length ? `${selectedExerciseIds.length} selected` : 'No exercises selected'}</Text></View><Ionicons name="chevron-forward" size={19} color={colors.textSecondary} /></Pressable>
          <Button title="Assign Routine" icon="add" onPress={handleAssignRoutine} disabled={!routineName.trim() || selectedExerciseIds.length === 0} />
        </View>
      </ScrollView>

      <Modal visible={exercisePickerOpen} animationType="slide" onRequestClose={() => setExercisePickerOpen(false)}>
        <View style={styles.modalRoot}>
          <HeaderBar left={<Pressable onPress={() => setExercisePickerOpen(false)}><Text style={styles.actionText}>Cancel</Text></Pressable>} center={<Text style={typography.headerTitle}>Choose Exercises</Text>} right={<Pressable onPress={() => setExercisePickerOpen(false)}><Text style={styles.doneText}>Done</Text></Pressable>} />
          <View style={styles.modalBody}>
            <TextInput style={styles.input} value={exerciseSearch} onChangeText={setExerciseSearch} placeholder="Search exercises" placeholderTextColor={colors.textSecondary} />
            <FlatList data={filteredExercises} keyExtractor={(item) => item.id} renderItem={({ item }) => { const selected = selectedExerciseIds.includes(item.id); return <Pressable style={styles.exerciseRow} onPress={() => toggleExercise(item.id)}><Text style={styles.exerciseName}>{item.name}</Text><View style={[styles.checkBox, selected && styles.checkBoxSelected]}>{selected && <Ionicons name="checkmark" size={18} color={colors.textPrimary} />}</View></Pressable>; }} />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function ProgressCard({ label, value }: { label: string; value: string }) {
  return <View style={styles.progressCard}><Text style={styles.progressValue}>{value}</Text><Text style={styles.progressLabel}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  scrollContent: { paddingVertical: spacing.l, paddingBottom: 56 },
  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.m },
  profileHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.m },
  avatar: { width: 64, height: 64, borderRadius: radius.full },
  avatarFallback: { width: 64, height: 64, borderRadius: radius.full, backgroundColor: colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: colors.textPrimary, fontSize: 25, fontWeight: '800' },
  profileText: { flex: 1 },
  memberName: { color: colors.textPrimary, fontSize: 24, fontWeight: '800' },
  muted: { color: colors.textSecondary, fontSize: 13 },
  success: { color: colors.success, marginTop: spacing.m, fontWeight: '600' },
  accessCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.m, backgroundColor: '#0C2117', borderRadius: radius.l, padding: spacing.m, borderWidth: 1, borderColor: '#1E5135', marginTop: spacing.l },
  accessCardPaused: { backgroundColor: '#26110F', borderColor: '#5A2924' },
  accessIcon: { width: 42, height: 42, borderRadius: radius.full, backgroundColor: colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  accessTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: '700', marginBottom: 2 },
  sectionTitle: { color: colors.textPrimary, fontSize: 19, fontWeight: '800', marginTop: spacing.xl, marginBottom: spacing.s },
  sectionHeadingRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  progressGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s },
  progressCard: { width: '48.5%', backgroundColor: colors.surface, borderRadius: radius.m, padding: spacing.m, borderWidth: 1, borderColor: colors.border },
  progressValue: { color: colors.textPrimary, fontSize: 18, fontWeight: '800' },
  progressLabel: { color: colors.textSecondary, fontSize: 12, marginTop: spacing.xs },
  lastWorkout: { color: colors.textSecondary, fontSize: 13, marginTop: spacing.s },
  panel: { backgroundColor: colors.surface, borderRadius: radius.l, padding: spacing.m, borderWidth: 1, borderColor: colors.border, marginTop: spacing.s },
  panelTitle: { color: colors.textPrimary, fontSize: 17, fontWeight: '700', marginBottom: spacing.m },
  fieldLabel: { color: colors.textSecondary, fontSize: 11, fontWeight: '700', marginBottom: spacing.xs },
  input: { minHeight: 45, borderWidth: 1, borderColor: colors.border, borderRadius: radius.s, paddingHorizontal: spacing.m, color: colors.textPrimary, backgroundColor: colors.background, fontSize: 15 },
  dateRow: { flexDirection: 'row', gap: spacing.s, marginTop: spacing.m },
  dateField: { flex: 1 },
  statusRow: { flexDirection: 'row', gap: spacing.s, marginTop: spacing.m },
  statusChoice: { flex: 1, borderRadius: radius.full, paddingVertical: spacing.s, backgroundColor: colors.surfaceElevated, alignItems: 'center' },
  statusChoiceActive: { backgroundColor: colors.accent },
  statusChoiceText: { color: colors.textSecondary, fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  statusChoiceTextActive: { color: colors.textPrimary },
  routineRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.m, paddingVertical: spacing.m, borderBottomWidth: 1, borderBottomColor: colors.border },
  routineIcon: { width: 40, height: 40, borderRadius: radius.m, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  routineName: { color: colors.textPrimary, fontSize: 15, fontWeight: '700' },
  pressed: { opacity: 0.7 },
  exerciseSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.m },
  selectorTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: '600' },
  modalRoot: { flex: 1, backgroundColor: colors.background, paddingTop: 24 },
  modalBody: { flex: 1, paddingHorizontal: spacing.l, gap: spacing.m },
  actionText: { color: colors.accent, fontSize: 16 },
  doneText: { color: colors.accent, fontSize: 16, fontWeight: '700' },
  exerciseRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.m, borderBottomWidth: 1, borderBottomColor: colors.border },
  exerciseName: { flex: 1, color: colors.textPrimary, fontSize: 15 },
  checkBox: { width: 28, height: 28, borderRadius: radius.s, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  checkBoxSelected: { backgroundColor: colors.accent, borderColor: colors.accent },
});
