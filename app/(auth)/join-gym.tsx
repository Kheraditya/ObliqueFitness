import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { redeemInviteCode, signOut } from '../../src/features/auth/api';
import { AuthScaffold } from '../../src/components/AuthScaffold';
import { TextField } from '../../src/components/TextField';
import { Button } from '../../src/components/Button';
import { ErrorText } from '../../src/components/ErrorText';
import { colors, radius, spacing } from '../../src/theme';

export default function JoinGym() {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    const normalized = code.trim().toUpperCase();
    if (!normalized) return setError('Enter the welcome code from your gym admin.');
    setSubmitting(true);
    setError(null);
    const { error: redeemError } = await redeemInviteCode(normalized);
    setSubmitting(false);
    if (redeemError) return setError(redeemError);
    router.replace('/');
  }

  async function handleDifferentAccount() {
    await signOut();
    router.replace('/(auth)/login');
  }

  return (
    <AuthScaffold eyebrow="JOIN YOUR GYM" title="Enter your welcome code." description="Your gym admin can find and share this code from their dashboard.">
      <View style={styles.notice}>
        <View style={styles.noticeIcon}><Ionicons name="shield-checkmark-outline" size={21} color={colors.accent} /></View>
        <Text style={styles.noticeText}>The code connects your account to the correct gym, trainers and shared routines.</Text>
      </View>
      <TextField label="WELCOME CODE" icon="key-outline" placeholder="e.g. A1B2C3D4" value={code} onChangeText={(value) => setCode(value.toUpperCase())} autoCapitalize="characters" autoCorrect={false} maxLength={12} onSubmitEditing={handleSubmit} />
      {error && <ErrorText>{error}</ErrorText>}
      <Button title={submitting ? 'Joining gym…' : 'Join Gym'} onPress={handleSubmit} disabled={submitting || !code.trim()} icon="arrow-forward" />
      <Button title="Use a different account" onPress={handleDifferentAccount} variant="secondary" />
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  notice: { flexDirection: 'row', alignItems: 'center', gap: spacing.m, backgroundColor: '#071D30', borderRadius: radius.m, padding: spacing.m, marginBottom: spacing.s },
  noticeIcon: { width: 38, height: 38, borderRadius: radius.full, backgroundColor: '#0A84FF1F', alignItems: 'center', justifyContent: 'center' },
  noticeText: { flex: 1, color: colors.textSecondary, fontSize: 12, lineHeight: 18 },
});
