import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HeaderBar } from '../../../components/HeaderBar';
import { colors, radius, spacing, typography } from '../../../theme';
import { listShareRecipients, shareRoutine, type ShareRecipient } from '../api';

interface ShareRoutineModalProps {
  visible: boolean;
  routineId: string;
  routineName: string;
  onClose: () => void;
}

export function ShareRoutineModal({ visible, routineId, routineName, onClose }: ShareRoutineModalProps) {
  const [recipients, setRecipients] = useState<ShareRecipient[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    setMessage(null);
    listShareRecipients()
      .then(setRecipients)
      .catch((loadError: unknown) => {
        setRecipients([]);
        setMessage(loadError instanceof Error ? loadError.message : 'Could not load gym members.');
      })
      .finally(() => setLoading(false));
  }, [visible]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query
      ? recipients.filter((recipient) => `${recipient.name ?? ''} ${recipient.email}`.toLowerCase().includes(query))
      : recipients;
  }, [recipients, search]);

  async function handleShare(recipient: ShareRecipient) {
    setSharingId(recipient.id);
    setMessage(null);
    const result = await shareRoutine(routineId, recipient.id);
    setSharingId(null);
    if (result.error) {
      setMessage(result.error);
      return;
    }
    setMessage(`Shared with ${recipient.name || recipient.email}`);
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <HeaderBar
          left={<Pressable onPress={onClose}><Text style={styles.action}>Close</Text></Pressable>}
          center={<Text style={typography.headerTitle}>Share Routine</Text>}
        />
        <View style={styles.body}>
          <Text style={styles.routineName}>{routineName}</Text>
          <Text style={styles.caption}>Only people in your gym are shown.</Text>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={colors.textSecondary} />
            <TextInput value={search} onChangeText={setSearch} placeholder="Search gym members" placeholderTextColor={colors.textSecondary} style={styles.searchInput} />
          </View>
          {message && <Text style={message.startsWith('Shared') ? styles.success : styles.error}>{message}</Text>}
          {loading ? (
            <ActivityIndicator color={colors.accent} style={styles.loader} />
          ) : filtered.length === 0 && !message ? (
            <Text style={styles.empty}>No other gym members found.</Text>
          ) : filtered.length > 0 ? (
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.row}>
                  <View style={styles.avatar}><Text style={styles.initial}>{(item.name ?? item.email).charAt(0).toUpperCase()}</Text></View>
                  <View style={styles.memberText}><Text style={styles.name}>{item.name || 'Unnamed member'}</Text><Text style={styles.email}>{item.email}</Text></View>
                  <Pressable style={styles.shareButton} onPress={() => handleShare(item)} disabled={sharingId !== null}>
                    {sharingId === item.id ? <ActivityIndicator size="small" color={colors.textPrimary} /> : <Text style={styles.shareText}>Share</Text>}
                  </Pressable>
                </View>
              )}
            />
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, paddingTop: spacing.l },
  body: { flex: 1, paddingHorizontal: spacing.l },
  action: { color: colors.accent, fontSize: 16 },
  routineName: { color: colors.textPrimary, fontSize: 24, fontWeight: '800', marginTop: spacing.l },
  caption: { color: colors.textSecondary, fontSize: 13, marginTop: spacing.xs },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.s, backgroundColor: colors.surface, borderRadius: radius.m, paddingHorizontal: spacing.m, marginVertical: spacing.l },
  searchInput: { flex: 1, minHeight: 46, color: colors.textPrimary },
  loader: { marginTop: spacing.xl },
  empty: { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xl },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.m, paddingVertical: spacing.m, borderBottomWidth: 1, borderBottomColor: colors.border },
  avatar: { width: 42, height: 42, borderRadius: radius.full, backgroundColor: colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  initial: { color: colors.textPrimary, fontSize: 17, fontWeight: '800' },
  memberText: { flex: 1 },
  name: { color: colors.textPrimary, fontSize: 15, fontWeight: '700' },
  email: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  shareButton: { backgroundColor: colors.accent, borderRadius: radius.s, minWidth: 68, minHeight: 36, alignItems: 'center', justifyContent: 'center' },
  shareText: { color: colors.textPrimary, fontWeight: '700' },
  success: { color: colors.success, marginBottom: spacing.s },
  error: { color: colors.danger, marginBottom: spacing.s },
});
