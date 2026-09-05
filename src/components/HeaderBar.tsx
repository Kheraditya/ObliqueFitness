import type { ReactNode } from "react";
import { View, StyleSheet } from "react-native";
import { spacing } from "../theme";

interface HeaderBarProps {
  left?: ReactNode;
  center?: ReactNode;
  right?: ReactNode;
}

// Three equal-width slots so `center` stays visually centered regardless of how wide `left`
// and `right` are -- matches the Cancel/Title/Save and back-arrow/Title/Done header pattern.
export function HeaderBar({ left, center, right }: HeaderBarProps) {
  return (
    <View style={styles.row}>
      <View style={[styles.leftSide]}>{left}</View>
      <View style={styles.center}>{center}</View>
      <View style={[styles.rightSide]}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.m,
  },
  side: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  leftSide: {
    justifyContent: "flex-start",
  },
  rightSide: {
    justifyContent: "flex-end",
  },
  center: {
    flex: 1,
    alignItems: "center",
    marginLeft: -40,
  },
});
