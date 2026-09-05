import { useFonts } from 'expo-font';
import { Slot } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function RootLayout() {
  // The tab bar mounts once at app start and stays mounted for the whole session, so if
  // Ionicons' font hasn't finished loading by that first render, its icons stay blank forever
  // with nothing to trigger a re-render once the font is ready -- unlike screens further into
  // the app, which mount fresh (by then the font has already loaded) and render icons fine.
  // Loading the font here, before anything renders, closes that race for every screen at once.
  const [fontsLoaded] = useFonts({ ...Ionicons.font });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <Slot />
    </SafeAreaProvider>
  );
}
