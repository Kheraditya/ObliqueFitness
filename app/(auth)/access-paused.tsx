import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { signOut } from '../../src/features/auth/api';
import { AuthScaffold } from '../../src/components/AuthScaffold';
import { Button } from '../../src/components/Button';
import { colors, radius, spacing } from '../../src/theme';

export default function AccessPaused() {
  async function handleSignOut() {
    await signOut();
    router.replace('/(auth)/login');
  }

  return (
    <AuthScaffold eyebrow="ACCOUNT ACCESS" title="Your access is paused." description="Your training history is safe. Contact your gym admin to restore access to the app.">
      <View style={styles.status}>
        <View style={styles.icon}><Ionicons name="pause" size={24} color={colors.danger} /></View>
        <View style={styles.copy}><Text style={styles.title}>Access disabled by gym</Text><Text style={styles.body}>Existing workouts, routines and progress have not been removed.</Text></View>
      </View>
      <Button title="Sign Out" onPress={handleSignOut} variant="dark" icon="log-out-outline" />
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  status: { flexDirection: 'row', gap: spacing.m, alignItems: 'center' },
  icon: { width: 46, height: 46, borderRadius: radius.full, backgroundColor: '#351713', alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1 },
  title: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  body: { color: colors.textSecondary, fontSize: 13, lineHeight: 19, marginTop: spacing.xs },
});
