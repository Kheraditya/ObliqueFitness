import { Tabs } from "expo-router";
import { View, StyleSheet, type ColorValue } from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";
import { colors, radius, spacing } from "../../src/theme";

function TabIcon({
  icon,
  focused,
  color,
  size,
}: {
  icon: "home" | "workout" | "profile";
  focused: boolean;
  color: ColorValue;
  size: number;
}) {
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        {icon === "home" && (
          <Path
            d="M3.5 10.5 12 3l8.5 7.5V21h-6v-6h-5v6h-6V10.5Z"
            fill={focused ? color : "none"}
            stroke={color}
            strokeWidth={1.8}
            strokeLinejoin="round"
          />
        )}
        {icon === "workout" && (
          <>
            <Line
              x1="7"
              y1="12"
              x2="17"
              y2="12"
              stroke={color}
              strokeWidth={2}
            />
            <Path
              d="M4.5 8.5h2v7h-2a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1Zm15 0h-2v7h2a1 1 0 0 0 1-1v-5a1 1 0 0 0-1-1Z"
              fill={focused ? color : "none"}
              stroke={color}
              strokeWidth={1.8}
              strokeLinejoin="round"
            />
            <Line
              x1="2"
              y1="10"
              x2="2"
              y2="14"
              stroke={color}
              strokeWidth={1.8}
              strokeLinecap="round"
            />
            <Line
              x1="22"
              y1="10"
              x2="22"
              y2="14"
              stroke={color}
              strokeWidth={1.8}
              strokeLinecap="round"
            />
          </>
        )}
        {icon === "profile" && (
          <>
            <Circle
              cx="12"
              cy="8"
              r="3.5"
              fill={focused ? color : "none"}
              stroke={color}
              strokeWidth={1.8}
            />
            <Path
              d="M5 21a7 7 0 0 1 14 0"
              fill={focused ? color : "none"}
              stroke={color}
              strokeWidth={1.8}
              strokeLinecap="round"
            />
          </>
        )}
      </Svg>
    </View>
  );
}

export default function MemberTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ focused, color, size }) => (
            <TabIcon
              icon="home"
              focused={focused}
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="workout"
        options={{
          title: "Workout",
          tabBarIcon: ({ focused, color, size }) => (
            <TabIcon
              icon="workout"
              focused={focused}
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ focused, color, size }) => (
            <TabIcon
              icon="profile"
              focused={focused}
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen name="routines" options={{ href: null }} />
      <Tabs.Screen name="active-workout" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  iconWrapActive: {
    backgroundColor: colors.surfaceElevated,
  },
});
