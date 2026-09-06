import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { signUp } from '../../src/features/auth/api';
import { isValidEmail, isValidPassword } from '../../src/features/auth/validation';
import { AuthScaffold } from '../../src/components/AuthScaffold';
import { TextField } from '../../src/components/TextField';
import { Button } from '../../src/components/Button';
import { ErrorText } from '../../src/components/ErrorText';
import { colors, spacing } from '../../src/theme';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    const normalizedEmail = email.trim();
    if (!isValidEmail(normalizedEmail)) return setError('Enter a valid email address.');
    if (!isValidPassword(password)) return setError('Use at least 8 characters for your password.');
    setSubmitting(true);
    setError(null);
    const { error: signUpError } = await signUp(normalizedEmail, password);
    setSubmitting(false);
    if (signUpError) return setError(signUpError);
    router.replace('/');
  }

  return (
    <AuthScaffold eyebrow="START STRONG" title="Build your training history." description="Create an account, join your gym and keep every workout in one place.">
      <TextField label="EMAIL" icon="mail-outline" placeholder="you@example.com" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
      <TextField label="PASSWORD" icon="lock-closed-outline" placeholder="At least 8 characters" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" onSubmitEditing={handleSubmit} />
      <Text style={styles.hint}>Use 8 or more characters.</Text>
      {error && <ErrorText>{error}</ErrorText>}
      <Button title={submitting ? 'Creating account…' : 'Create Account'} onPress={handleSubmit} disabled={submitting} icon="person-add-outline" />
      <View style={styles.switchRow}>
        <Text style={styles.switchCopy}>Already have an account?</Text>
        <Pressable onPress={() => router.back()}><Text style={styles.switchAction}>Sign in</Text></Pressable>
      </View>
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  hint: { color: colors.textSecondary, fontSize: 12, marginTop: spacing.s },
  switchRow: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 6, marginTop: spacing.l },
  switchCopy: { color: colors.textSecondary, fontSize: 14 },
  switchAction: { color: colors.accent, fontSize: 14, fontWeight: '700' },
});
