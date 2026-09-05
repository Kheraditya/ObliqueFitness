import { Pressable, ScrollView, Text, View, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../../../src/components/Screen';
import { HeaderBar } from '../../../../src/components/HeaderBar';
import { EXERCISE_TYPE_OPTIONS } from '../../../../src/features/exercises/constants';
import { colors, radius, spacing, typography } from '../../../../src/theme';

export default function SelectExerciseType() {
  const { returnTo, ...rest } = useLocalSearchParams() as { returnTo: string; [key: string]: string | string[] | undefined };

  function choose(key: string) {
    router.push({ pathname: returnTo, params: { ...rest, selectedExerciseType: key } });
  }

  return (
    <Screen
      header={
        <HeaderBar
          left={
            <Pressable onPress={() => router.back()} hitSlop={8} testID="back-button">
              <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
            </Pressable>
          }
          center={<Text style={typography.headerTitle}>Select Exercise Type</Text>}
        />
      }
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        {EXERCISE_TYPE_OPTIONS.map((option, index) => (
          <Pressable
            key={option.key}
            style={[styles.rowBleed, index === EXERCISE_TYPE_OPTIONS.length - 1 && styles.rowNoBorder]}
            onPress={() => choose(option.key)}
          >
            <View style={styles.row}>
              <Text style={styles.label}>{option.label}</Text>
              <Text style={styles.example}>Example: {option.example}</Text>
              <View style={styles.metricsRow}>
                {option.metrics.map((metric) => (
                  <View key={metric} style={styles.metricChip}>
                    <Text style={styles.metricText}>{metric}</Text>
                  </View>
                ))}
              </View>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  rowBleed: {
    marginHorizontal: -spacing.l,
    paddingHorizontal: spacing.l,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowNoBorder: {
    borderBottomWidth: 0,
  },
  row: {
    paddingVertical: spacing.m,
    gap: spacing.s,
  },
  label: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  example: {
    color: colors.textSecondary,
    fontSize: 15,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.s,
  },
  metricChip: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.s,
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.xs,
  },
  metricText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
});
