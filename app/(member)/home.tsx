import { Text } from 'react-native';
import { Screen } from '../../src/components/Screen';
import { typography } from '../../src/theme';

export default function Home() {
  return (
    <Screen>
      <Text style={typography.title}>Welcome back</Text>
      <Text style={typography.subtitle}>Your dashboard is coming soon.</Text>
    </Screen>
  );
}
