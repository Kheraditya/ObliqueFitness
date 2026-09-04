import { useEffect, useState } from 'react';
import { ScrollView, Text, TextInput, View, Pressable, StyleSheet } from 'react-native';
import { VictoryChart, VictoryLine, VictoryAxis, VictoryTheme } from 'victory-native';
import { Screen } from '../../../src/components/Screen';
import { Button } from '../../../src/components/Button';
import { ErrorText } from '../../../src/components/ErrorText';
import { listMeasurements, logMeasurement, deleteMeasurement } from '../../../src/features/measurements/api';
import type { Measurement } from '../../../src/features/measurements/types';
import { colors, radius, spacing, typography } from '../../../src/theme';

const BUILTIN_TYPES: { key: string; label: string; unit: string }[] = [
  { key: 'weight', label: 'Weight', unit: 'kg' },
  { key: 'body_fat', label: 'Body Fat', unit: '%' },
];

export default function Measures() {
  const [selectedType, setSelectedType] = useState('weight');
  const [customLabel, setCustomLabel] = useState('');
  const [customUnit, setCustomUnit] = useState('');
  const [valueInput, setValueInput] = useState('');
  const [entries, setEntries] = useState<Measurement[]>([]);
  const [error, setError] = useState<string | null>(null);

  const activeType = selectedType === 'custom' ? customLabel : selectedType;

  useEffect(() => {
    if (!activeType) {
      setEntries([]);
      return;
    }
    listMeasurements(activeType).then(setEntries);
  }, [activeType]);

  async function handleLog() {
    setError(null);
    const value = parseFloat(valueInput);
    if (Number.isNaN(value) || !activeType) return;

    const unit = selectedType === 'custom' ? customUnit : BUILTIN_TYPES.find((t) => t.key === selectedType)?.unit ?? '';
    const { error: logError } = await logMeasurement(activeType, value, unit);
    if (logError) {
      setError(logError);
      return;
    }
    setValueInput('');
    const updated = await listMeasurements(activeType);
    setEntries(updated);
  }

  async function handleDelete(id: string) {
    setError(null);
    const { error: deleteError } = await deleteMeasurement(id);
    if (deleteError) {
      setError(deleteError);
      return;
    }
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  return (
    <Screen>
      <ScrollView>
        <Text style={[typography.title, styles.heading]}>Measures</Text>
        <View style={styles.typeRow}>
          {BUILTIN_TYPES.map((t) => (
            <Pressable key={t.key} onPress={() => setSelectedType(t.key)} style={styles.typeChip}>
              <Text style={selectedType === t.key ? styles.typeChipActive : styles.typeChipInactive}>{t.label}</Text>
            </Pressable>
          ))}
          <Pressable onPress={() => setSelectedType('custom')} style={styles.typeChip}>
            <Text style={selectedType === 'custom' ? styles.typeChipActive : styles.typeChipInactive}>Custom</Text>
          </Pressable>
        </View>
        {selectedType === 'custom' && (
          <>
            <TextInput
              style={styles.input}
              placeholder="Label"
              placeholderTextColor={colors.textSecondary}
              value={customLabel}
              onChangeText={setCustomLabel}
            />
            <TextInput
              style={styles.input}
              placeholder="Unit"
              placeholderTextColor={colors.textSecondary}
              value={customUnit}
              onChangeText={setCustomUnit}
            />
          </>
        )}
        <TextInput
          style={styles.input}
          placeholder="Value"
          placeholderTextColor={colors.textSecondary}
          keyboardType="numeric"
          value={valueInput}
          onChangeText={setValueInput}
        />
        <Button title="Log" onPress={handleLog} />
        {error && <ErrorText>{error}</ErrorText>}
        <View style={styles.chartCard}>
          {entries.length === 0 ? (
            <Text style={typography.subtitle}>No data yet.</Text>
          ) : (
            <VictoryChart theme={VictoryTheme.material} domainPadding={20}>
              <VictoryAxis />
              <VictoryAxis dependentAxis />
              <VictoryLine data={entries.map((e) => ({ x: e.loggedAt, y: e.value }))} />
            </VictoryChart>
          )}
        </View>
        {entries
          .slice()
          .reverse()
          .map((entry) => (
            <View key={entry.id} style={styles.entryRow}>
              <Text style={typography.body}>
                {entry.value} {entry.unit}
              </Text>
              <Pressable onPress={() => handleDelete(entry.id)}>
                <Text style={styles.deleteText}>Delete</Text>
              </Pressable>
            </View>
          ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: {
    marginTop: spacing.l,
    marginBottom: spacing.m,
  },
  typeRow: {
    flexDirection: 'row',
    gap: spacing.s,
    marginBottom: spacing.s,
  },
  typeChip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.m,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeChipActive: {
    color: colors.accent,
    fontWeight: '700',
  },
  typeChipInactive: {
    color: colors.textSecondary,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.m,
    padding: spacing.m,
    color: colors.textPrimary,
    marginBottom: spacing.s,
  },
  chartCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.m,
    padding: spacing.m,
    minHeight: 120,
    justifyContent: 'center',
    marginTop: spacing.l,
    marginBottom: spacing.m,
  },
  entryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.s,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  deleteText: {
    color: colors.danger,
    fontSize: 14,
  },
});
