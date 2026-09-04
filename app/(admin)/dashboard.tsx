import { Button, Text, View } from 'react-native';
import { router } from 'expo-router';
import { signOut } from '../../src/features/auth/api';

export default function AdminDashboard() {
  return (
    <View>
      <Text>Welcome, admin</Text>
      <Button title="Sign Out" onPress={async () => { await signOut(); router.replace('/'); }} />
    </View>
  );
}
