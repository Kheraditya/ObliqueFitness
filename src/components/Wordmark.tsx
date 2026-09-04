import { Text, StyleSheet } from 'react-native';
import { colors, spacing } from '../theme';

export function Wordmark() {
  return <Text style={styles.text}>Oblique Fitness</Text>;
}

const styles = StyleSheet.create({
  text: {
    marginTop: spacing.xl,
    fontSize: 34,
    fontWeight: '800',
    fontStyle: 'italic',
    letterSpacing: -0.5,
    color: colors.textPrimary,
  },
});
