import { useState } from 'react';
import { Button, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { signIn } from '../../src/features/auth/api';
import { isValidEmail } from '../../src/features/auth/validation';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!isValidEmail(email)) {
      setError('Enter a valid email');
      return;
    }
    const { error: signInError } = await signIn(email, password);
    if (signInError) {
      setError(signInError);
      return;
    }
    router.replace('/');
  }

  return (
    <View>
      <Text>Log In</Text>
      <TextInput placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" />
      <TextInput placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
      {error && <Text>{error}</Text>}
      <Button title="Log In" onPress={handleSubmit} />
      <Button title="Sign Up" onPress={() => router.push('/(auth)/signup')} />
    </View>
  );
}
