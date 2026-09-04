import { useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { redeemInviteCode } from '../../src/features/auth/api';
import { Screen } from '../../src/components/Screen';
import { TextField } from '../../src/components/TextField';
import { Button } from '../../src/components/Button';
import { ErrorText } from '../../src/components/ErrorText';
import { typography, spacing } from '../../src/theme';

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
    <Screen>
      <Text style={[typography.title, styles.heading]}>Enter your gym's invite code</Text>
      <TextField label="Invite code" placeholder="Invite code" value={code} onChangeText={setCode} autoCapitalize="characters" />
      {error && <ErrorText>{error}</ErrorText>}
      <Button title="Join Gym" onPress={handleSubmit} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: {
    marginTop: spacing.l,
    marginBottom: spacing.s,
  },
});
