import { useState } from 'react';
import { Button, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { signUp } from '../../src/features/auth/api';
import { isValidEmail, isValidPassword } from '../../src/features/auth/validation';

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
    <View>
      <Text>Sign Up</Text>
      <TextInput placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" />
      <TextInput placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
      {error && <Text>{error}</Text>}
      <Button title="Sign Up" onPress={handleSubmit} />
    </View>
  );
}
