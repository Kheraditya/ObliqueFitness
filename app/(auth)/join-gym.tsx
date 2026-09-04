import { useState } from 'react';
import { Button, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { redeemInviteCode } from '../../src/features/auth/api';

export default function JoinGym() {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    const { error: redeemError } = await redeemInviteCode(code);
    if (redeemError) {
      setError(redeemError);
      return;
    }
    router.replace('/');
  }

  return (
    <View>
      <Text>Enter your gym's invite code</Text>
      <TextInput placeholder="Invite code" value={code} onChangeText={setCode} autoCapitalize="characters" />
      {error && <Text>{error}</Text>}
      <Button title="Join Gym" onPress={handleSubmit} />
    </View>
  );
}
