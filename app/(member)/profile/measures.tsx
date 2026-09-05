import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View, StyleSheet } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { VictoryChart, VictoryLine, VictoryAxis, VictoryTheme } from 'victory-native';
import { Screen } from '../../../src/components/Screen';
import { ErrorText } from '../../../src/components/ErrorText';
import { ListItem } from '../../../src/components/ListItem';
import { PillTabs } from '../../../src/components/PillTabs';
import { listMeasurements, deleteMeasurement } from '../../../src/features/measurements/api';
import type { Measurement } from '../../../src/features/measurements/types';
import { colors, spacing, typography } from '../../../src/theme';

const TYPE_LABELS: Record<string, string> = {
  weight: 'Weight',
  body_fat: 'Body Fat',
};

function labelFor(type: string): string {
  return TYPE_LABELS[type] ?? type.split('_').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

export default function Measures() {
  const [allEntries, setAllEntries] = useState<Measurement[]>([]);
  const [selectedType, setSelectedType] = useState('weight');
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    listMeasurements().then((entries) => {
      setAllEntries(entries);
      const types = Array.from(new Set(entries.map((e) => e.type)));
      setSelectedType((prev) => (types.length > 0 && !types.includes(prev) ? types[0] : prev));
    });
  }, []);

  useFocusEffect(refresh);

  const types = Array.from(new Set(allEntries.map((e) => e.type)));
  const pillOptions = (types.length > 0 ? types : ['weight']).map((t) => ({ key: t, label: labelFor(t) }));
  const typeEntries = allEntries.filter((e) => e.type === selectedType).sort((a, b) => a.loggedAt.localeCompare(b.loggedAt));
  const latest = typeEntries[typeEntries.length - 1];

  async function handleDelete(id: string) {
    setError(null);
    const { error: deleteError } = await deleteMeasurement(id);
    if (deleteError) {
      setError(deleteError);
      return;
    }
    setAllEntries((prev) => prev.filter((e) => e.id !== id));
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={typography.body}>Measurements</Text>
        <Pressable testID="add-measurement-button" onPress={() => router.push('/(member)/profile/log-measurement')}>
          <Ionicons name="add" size={24} color={colors.textPrimary} />
        </Pressable>
      </View>
      <ScrollView>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryValue}>
            {latest ? `${latest.value}${latest.unit}` : '-'}
          </Text>
          {latest && <Text style={styles.summaryDate}>{latest.loggedAt.slice(0, 10)}</Text>}
          <View style={styles.spacer} />
          <Text style={styles.rangeLabel}>Last 3 months</Text>
        </View>
        <View style={styles.chartCard}>
          {typeEntries.length === 0 ? (
            <Text style={typography.subtitle}>No data yet.</Text>
          ) : (
            <VictoryChart theme={VictoryTheme.material} domainPadding={20}>
              <VictoryAxis />
              <VictoryAxis dependentAxis />
              <VictoryLine data={typeEntries.map((e) => ({ x: e.loggedAt, y: e.value }))} />
            </VictoryChart>
          )}
        </View>
        <PillTabs options={pillOptions} value={selectedType} onChange={setSelectedType} />
        {error && <ErrorText>{error}</ErrorText>}
        <Text style={[typography.title, styles.sectionHeading]}>{labelFor(selectedType)} History</Text>
        {typeEntries
          .slice()
          .reverse()
          .map((entry) => (
            <View key={entry.id} style={styles.entryRow}>
              <ListItem title={entry.loggedAt.slice(0, 10)} trailing={`${entry.value}${entry.unit}`} />
              <Pressable onPress={() => handleDelete(entry.id)} style={styles.deleteButton}>
                <Text style={styles.deleteText}>Delete</Text>
              </Pressable>
            </View>
          ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.l,
    marginBottom: spacing.m,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: spacing.s,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  summaryDate: {
    fontSize: 15,
    color: colors.accent,
    marginLeft: spacing.s,
  },
  spacer: {
    flex: 1,
  },
  rangeLabel: {
    fontSize: 15,
    color: colors.accent,
  },
  chartCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.m,
    minHeight: 120,
    justifyContent: 'center',
    marginBottom: spacing.m,
  },
  sectionHeading: {
    fontSize: 20,
    marginTop: spacing.l,
    marginBottom: spacing.s,
  },
  entryRow: {
    marginBottom: spacing.m,
  },
  deleteButton: {
    alignSelf: 'flex-end',
    paddingTop: spacing.xs,
    paddingBottom: spacing.s,
  },
  deleteText: {
    color: colors.danger,
    fontSize: 14,
  },
});
