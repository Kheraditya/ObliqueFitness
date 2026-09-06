import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { signIn } from '../../src/features/auth/api';
import { isValidEmail } from '../../src/features/auth/validation';
import { AuthScaffold } from '../../src/components/AuthScaffold';
import { TextField } from '../../src/components/TextField';
import { Button } from '../../src/components/Button';
import { ErrorText } from '../../src/components/ErrorText';
import { colors, spacing } from '../../src/theme';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    const normalizedEmail = email.trim();
    if (!isValidEmail(normalizedEmail)) return setError('Enter a valid email address.');
    if (!password) return setError('Enter your password.');
    setSubmitting(true);
    setError(null);
    const { error: signInError } = await signIn(normalizedEmail, password);
    setSubmitting(false);
    if (signInError) return setError(signInError);
    router.replace('/');
  }

  return (
    <AuthScaffold eyebrow="WELCOME BACK" title="Ready for your next set?" description="Sign in to continue your training, routines and progress.">
      <TextField label="EMAIL" icon="mail-outline" placeholder="you@example.com" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
      <TextField label="PASSWORD" icon="lock-closed-outline" placeholder="Your password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" onSubmitEditing={handleSubmit} />
      {error && <ErrorText>{error}</ErrorText>}
      <Button title={submitting ? 'Signing in…' : 'Sign In'} onPress={handleSubmit} disabled={submitting} icon="arrow-forward" />
      <View style={styles.switchRow}>
        <Text style={styles.switchCopy}>New to Oblique?</Text>
        <Pressable onPress={() => router.push('/(auth)/signup')}><Text style={styles.switchAction}>Create an account</Text></Pressable>
      </View>
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  switchRow: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 6, marginTop: spacing.l },
  switchCopy: { color: colors.textSecondary, fontSize: 14 },
  switchAction: { color: colors.accent, fontSize: 14, fontWeight: '700' },
});
