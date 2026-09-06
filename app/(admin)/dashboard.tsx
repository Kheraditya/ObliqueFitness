import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { signOut } from '../../src/features/auth/api';
import { getGymWelcomeCode, listGymMembers, rotateGymWelcomeCode } from '../../src/features/admin/api';
import type { AdminMember } from '../../src/features/admin/types';
import { startSession } from '../../src/features/workout/api';
import { Screen } from '../../src/components/Screen';
import { Button } from '../../src/components/Button';
import { ErrorText } from '../../src/components/ErrorText';
import { ConfirmModal } from '../../src/components/ConfirmModal';
import { colors, radius, spacing, typography } from '../../src/theme';

export default function AdminDashboard() {
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [welcomeCode, setWelcomeCode] = useState<string | null>(null);
  const [rotateOpen, setRotateOpen] = useState(false);
  const [rotating, setRotating] = useState(false);

  const refresh = useCallback(() => {
    setLoading(true);
    Promise.all([listGymMembers(), getGymWelcomeCode()])
      .then(([memberResult, codeResult]) => {
        setMembers(memberResult);
        setWelcomeCode(codeResult.code);
        setError(codeResult.error);
      })
      .catch(() => setError('Could not load gym details.'))
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(refresh);

  const filteredMembers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return members;
    return members.filter((member) => `${member.name ?? ''} ${member.email}`.toLowerCase().includes(query));
  }, [members, search]);

  const activeCount = members.filter((member) => member.accessEnabled !== false && member.membership?.status === 'active').length;

  async function handleShareCode() {
    if (!welcomeCode) return;
    try {
      await Share.share({
        title: 'Join my gym on Oblique Fitness',
        message: `Join my gym on Oblique Fitness with welcome code ${welcomeCode}.`,
      });
    } catch {
      setError('Could not open sharing. Please try again.');
    }
  }

  async function handleRotateCode() {
    if (rotating) return;
    setRotating(true);
    const result = await rotateGymWelcomeCode();
    setRotating(false);
    setRotateOpen(false);
    if (result.error) return setError(result.error);
    setWelcomeCode(result.code);
    setError(null);
  }

  async function handleStartWorkout() {
    const result = await startSession(null);
    if (!result.id) {
      setError(result.error);
      return;
    }
    router.push({ pathname: `/(member)/active-workout/${result.id}`, params: { returnTo: '/(admin)/dashboard' } });
  }

  async function handleSignOut() {
    await signOut();
    router.replace('/');
  }

  return (
    <Screen>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.eyebrow}>GYM ADMIN</Text>
          <Text style={typography.title}>Members</Text>
        </View>
        <View style={styles.topActions}>
          <Pressable onPress={refresh} hitSlop={8} accessibilityLabel="Refresh members">
            <Ionicons name="refresh" size={22} color={colors.textPrimary} />
          </Pressable>
          <Pressable onPress={handleSignOut} hitSlop={8} accessibilityLabel="Sign out">
            <Ionicons name="log-out-outline" size={23} color={colors.textPrimary} />
          </Pressable>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{members.length}</Text>
          <Text style={styles.statLabel}>Total members</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, styles.activeValue]}>{activeCount}</Text>
          <Text style={styles.statLabel}>Active plans</Text>
        </View>
      </View>

      <View style={styles.codeCard}>
        <View style={styles.codeHeading}>
          <View style={styles.codeIcon}><Ionicons name="key-outline" size={20} color={colors.accent} /></View>
          <View style={styles.codeCopy}><Text style={styles.codeLabel}>GYM WELCOME CODE</Text><Text style={styles.codeHelp}>Share this with new members</Text></View>
        </View>
        <Text selectable style={styles.codeValue}>{welcomeCode ?? '— — — —'}</Text>
        <View style={styles.codeActions}>
          <Pressable style={styles.codeAction} onPress={handleShareCode} disabled={!welcomeCode} accessibilityLabel="Share welcome code"><Ionicons name="share-outline" size={18} color={colors.accent} /><Text style={styles.codeActionText}>Share</Text></Pressable>
          <Pressable style={styles.codeAction} onPress={() => setRotateOpen(true)} accessibilityLabel="Rotate welcome code"><Ionicons name="refresh" size={18} color={colors.accent} /><Text style={styles.codeActionText}>Rotate</Text></Pressable>
        </View>
      </View>

      <View style={styles.trainingActions}>
        <Button
          title="My Progress & Routines"
          icon="analytics-outline"
          onPress={() => router.push('/(admin)/my-training')}
          style={styles.trainingButton}
        />
        <Button title="Log My Workout" icon="barbell-outline" variant="secondary" onPress={handleStartWorkout} style={styles.trainingButton} />
      </View>
      {error && <ErrorText>{error}</ErrorText>}

      <View style={styles.searchBar}>
        <Ionicons name="search" size={19} color={colors.textSecondary} />
        <TextInput value={search} onChangeText={setSearch} placeholder="Search members" placeholderTextColor={colors.textSecondary} style={styles.searchInput} />
      </View>

      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>Your members</Text>
        <Text style={styles.listCount}>{filteredMembers.length}</Text>
      </View>

      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.mutedText}>Loading members...</Text>
        </View>
      ) : filteredMembers.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={34} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>No members found</Text>
          <Text style={styles.mutedText}>Members who join your gym will appear here.</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.memberList}>
          {filteredMembers.map((member) => {
            const status = member.accessEnabled === false ? 'Access paused' : (member.membership?.status ?? 'No plan');
            return (
              <Pressable key={member.id} style={({ pressed }) => [styles.memberCard, pressed && styles.pressed]} onPress={() => router.push(`/(admin)/members/${member.id}`)}>
                {member.avatarUrl ? (
                  <Image source={{ uri: member.avatarUrl }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarInitial}>{(member.name ?? member.email).charAt(0).toUpperCase()}</Text>
                  </View>
                )}
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{member.name || 'Unnamed member'}</Text>
                  <Text style={styles.memberEmail}>{member.email}</Text>
                  <Text style={styles.planName}>{member.membership?.planName ?? 'Membership not configured'}</Text>
                </View>
                <View style={styles.memberTrailing}>
                  <View style={[styles.statusPill, status === 'active' && styles.statusActive, status === 'Access paused' && styles.statusPaused]}>
                    <Text style={[styles.statusText, status === 'active' && styles.statusTextActive]}>{status}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
      <ConfirmModal
        visible={rotateOpen}
        title="Rotate welcome code?"
        message="The current code will stop working immediately. Existing members will stay connected to your gym."
        confirmLabel={rotating ? 'Rotating…' : 'Rotate Code'}
        destructive={false}
        onConfirm={handleRotateCode}
        onCancel={() => setRotateOpen(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.l },
  topActions: { flexDirection: 'row', gap: spacing.l },
  eyebrow: { color: colors.accent, fontSize: 11, fontWeight: '800', letterSpacing: 1.4, marginBottom: spacing.xs },
  statsRow: { flexDirection: 'row', gap: spacing.s, marginTop: spacing.l },
  statCard: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.l, padding: spacing.m, borderWidth: 1, borderColor: colors.border },
  statValue: { color: colors.textPrimary, fontSize: 26, fontWeight: '800' },
  activeValue: { color: colors.success },
  statLabel: { color: colors.textSecondary, fontSize: 13, marginTop: spacing.xs },
  codeCard: { backgroundColor: '#071624', borderRadius: radius.l, borderWidth: 1, borderColor: '#123B5F', padding: spacing.m, marginTop: spacing.m },
  codeHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.s },
  codeIcon: { width: 36, height: 36, borderRadius: radius.m, backgroundColor: '#0A84FF1F', alignItems: 'center', justifyContent: 'center' },
  codeCopy: { flex: 1 },
  codeLabel: { color: colors.accent, fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  codeHelp: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  codeValue: { color: colors.textPrimary, fontSize: 29, lineHeight: 36, fontWeight: '800', letterSpacing: 4, textAlign: 'center', marginVertical: spacing.m },
  codeActions: { flexDirection: 'row', gap: spacing.s },
  codeAction: { flex: 1, minHeight: 42, borderRadius: radius.m, backgroundColor: '#0A84FF16', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.s },
  codeActionText: { color: colors.accent, fontSize: 14, fontWeight: '700' },
  trainingActions: { marginTop: spacing.s },
  trainingButton: { width: '100%', minHeight: 50 },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.s, backgroundColor: colors.surface, borderRadius: radius.m, paddingHorizontal: spacing.m, marginTop: spacing.l },
  searchInput: { flex: 1, minHeight: 46, color: colors.textPrimary, fontSize: 15 },
  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.l, marginBottom: spacing.s },
  listTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '700' },
  listCount: { color: colors.textSecondary, fontSize: 14 },
  memberList: { paddingBottom: spacing.xl },
  memberCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.m, paddingVertical: spacing.m, borderBottomWidth: 1, borderBottomColor: colors.border },
  avatar: { width: 48, height: 48, borderRadius: radius.full },
  avatarFallback: { width: 48, height: 48, borderRadius: radius.full, backgroundColor: colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: colors.textPrimary, fontSize: 19, fontWeight: '800' },
  memberInfo: { flex: 1 },
  memberName: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  memberEmail: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  planName: { color: colors.textSecondary, fontSize: 12, marginTop: spacing.xs },
  memberTrailing: { alignItems: 'flex-end', gap: spacing.s },
  statusPill: { backgroundColor: colors.surfaceElevated, borderRadius: radius.full, paddingHorizontal: spacing.s, paddingVertical: spacing.xs },
  statusActive: { backgroundColor: '#143523' },
  statusPaused: { backgroundColor: '#351713' },
  statusText: { color: colors.textSecondary, fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  statusTextActive: { color: colors.success },
  loadingState: { paddingTop: 60, alignItems: 'center', gap: spacing.m },
  emptyState: { paddingTop: 60, alignItems: 'center', gap: spacing.s },
  emptyTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '700' },
  mutedText: { color: colors.textSecondary, fontSize: 14, textAlign: 'center' },
  pressed: { opacity: 0.7 },
});
