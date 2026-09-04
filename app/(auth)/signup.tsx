import { useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { signUp } from '../../src/features/auth/api';
import { isValidEmail, isValidPassword } from '../../src/features/auth/validation';
import { Screen } from '../../src/components/Screen';
import { Wordmark } from '../../src/components/Wordmark';
import { TextField } from '../../src/components/TextField';
import { Button } from '../../src/components/Button';
import { ErrorText } from '../../src/components/ErrorText';
import { typography, spacing } from '../../src/theme';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!isValidEmail(email)) {
      setError('Enter a valid email');
      return;
    }
    if (!isValidPassword(password)) {
      setError('Password must be at least 8 characters');
      return;
    }
    const { error: signUpError } = await signUp(email, password);
    if (signUpError) {
      setError(signUpError);
      return;
    }
    router.replace('/');
  }

  return (
    <Screen>
      <Wordmark />
      <Text style={[typography.title, styles.heading]}>Sign Up</Text>
      <TextField label="Email" placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" />
      <TextField label="Password" placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
      {error && <ErrorText>{error}</ErrorText>}
      <Button title="Sign Up" onPress={handleSubmit} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: {
    marginTop: spacing.l,
    marginBottom: spacing.s,
  },
});
