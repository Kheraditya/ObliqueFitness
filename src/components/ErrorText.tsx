import { Text, StyleSheet } from 'react-native';
import { colors, spacing } from '../theme';

export function ErrorText({ children }: { children: string }) {
  return <Text style={styles.text}>{children}</Text>;
}

const styles = StyleSheet.create({
  text: {
    color: colors.danger,
    marginTop: spacing.s,
    fontSize: 14,
  },
});
