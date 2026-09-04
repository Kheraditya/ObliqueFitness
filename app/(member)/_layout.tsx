import { Tabs } from 'expo-router';

export default function MemberTabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
      <Tabs.Screen name="workout" options={{ title: 'Workout' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      <Tabs.Screen name="routines" options={{ href: null }} />
      <Tabs.Screen name="active-workout" options={{ href: null }} />
    </Tabs>
  );
}
