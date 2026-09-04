import { Text, View, StyleSheet } from 'react-native';
import type { Exercise } from '../types';
import { spacing, typography } from '../../../theme';

export function HowToTab({ exercise }: { exercise: Exercise }) {
  if (exercise.instructions.length === 0) {
    return <Text style={typography.subtitle}>No instructions available.</Text>;
  }

  return (
    <View>
      {exercise.instructions.map((step, index) => (
        <View key={index} style={styles.step}>
          <Text style={typography.label}>{index + 1}.</Text>
          <Text style={[typography.body, styles.stepText]}>{step}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  step: {
    flexDirection: 'row',
    marginBottom: spacing.m,
  },
  stepText: {
    flex: 1,
    marginLeft: spacing.s,
  },
});
