import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../../src/components/Screen';
import { ErrorText } from '../../../src/components/ErrorText';
import { listMeasurements, logMeasurement } from '../../../src/features/measurements/api';
import { colors, radius, spacing, typography } from '../../../src/theme';

const MEASUREMENT_TYPES: { key: string; label: string; unit: string }[] = [
  { key: 'weight', label: 'Body Weight (kg)', unit: 'kg' },
  { key: 'waist', label: 'Waist (cm)', unit: 'cm' },
  { key: 'body_fat', label: 'Body Fat (%)', unit: '%' },
  { key: 'lean_body_mass', label: 'Lean Body Mass (kg)', unit: 'kg' },
  { key: 'neck', label: 'Neck (cm)', unit: 'cm' },
  { key: 'shoulder', label: 'Shoulder (cm)', unit: 'cm' },
  { key: 'chest', label: 'Chest (cm)', unit: 'cm' },
  { key: 'left_bicep', label: 'Left Bicep (cm)', unit: 'cm' },
  { key: 'right_bicep', label: 'Right Bicep (cm)', unit: 'cm' },
  { key: 'left_forearm', label: 'Left Forearm (cm)', unit: 'cm' },
  { key: 'right_forearm', label: 'Right Forearm (cm)', unit: 'cm' },
  { key: 'abdomen', label: 'Abdomen (cm)', unit: 'cm' },
  { key: 'hips', label: 'Hips (cm)', unit: 'cm' },
  { key: 'left_thigh', label: 'Left Thigh (cm)', unit: 'cm' },
  { key: 'right_thigh', label: 'Right Thigh (cm)', unit: 'cm' },
  { key: 'left_calf', label: 'Left Calf (cm)', unit: 'cm' },
  { key: 'right_calf', label: 'Right Calf (cm)', unit: 'cm' },
];

function formatToday(): string {
  return new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function LogMeasurement() {
  const [latestByType, setLatestByType] = useState<Record<string, { value: number; unit: string }>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [editingType, setEditingType] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listMeasurements().then((entries) => {
      const latest: Record<string, { value: number; unit: string; loggedAt: string }> = {};
      for (const entry of entries) {
        const existing = latest[entry.type];
        if (!existing || entry.loggedAt > existing.loggedAt) {
          latest[entry.type] = { value: entry.value, unit: entry.unit, loggedAt: entry.loggedAt };
        }
      }
      setLatestByType(latest);
    });
  }, []);

  async function handleSave() {
    setError(null);
    setSaving(true);
    const toSave = MEASUREMENT_TYPES.filter((t) => drafts[t.key]?.trim());
    for (const type of toSave) {
      const value = parseFloat(drafts[type.key]);
      if (Number.isNaN(value)) continue;
      const { error: saveError } = await logMeasurement(type.key, value, type.unit);
      if (saveError) {
        setError(saveError);
        setSaving(false);
        return;
      }
    }
    setSaving(false);
    router.back();
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.headerAction}>Cancel</Text>
        </Pressable>
        <Text style={typography.body}>Log Measurements</Text>
        <Pressable onPress={handleSave} disabled={saving}>
          <Text style={styles.headerAction}>Save</Text>
        </Pressable>
      </View>
      <ScrollView>
        <View style={styles.row}>
          <Text style={typography.body}>Date</Text>
          <Text style={typography.body}>{formatToday()}</Text>
        </View>

        <Text style={[typography.label, styles.sectionLabel]}>Progress Picture</Text>
        <View style={styles.pictureCard}>
          <Ionicons name="camera-outline" size={22} color={colors.accent} />
          <Text style={styles.pictureText}>Add Picture</Text>
        </View>

        <Text style={[typography.label, styles.sectionLabel]}>Measurements</Text>
        {error && <ErrorText>{error}</ErrorText>}
        {MEASUREMENT_TYPES.map((type) => {
          const isEditing = editingType === type.key;
          const latest = latestByType[type.key];
          const draft = drafts[type.key];
          const displayValue = draft ?? (latest ? `${latest.value}${latest.unit}` : '-');

          return (
            <View key={type.key} style={styles.row}>
              <Text style={typography.body}>{type.label}</Text>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  placeholder="-"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                  autoFocus
                  value={draft ?? ''}
                  onChangeText={(text) => setDrafts((prev) => ({ ...prev, [type.key]: text }))}
                  onBlur={() => setEditingType(null)}
                />
              ) : (
                <Pressable onPress={() => setEditingType(type.key)}>
                  <Text style={styles.rowValue}>{displayValue}</Text>
                </Pressable>
              )}
            </View>
          );
        })}
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
  headerAction: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowValue: {
    color: colors.textSecondary,
    fontSize: 16,
  },
  input: {
    color: colors.textPrimary,
    fontSize: 16,
    textAlign: 'right',
    minWidth: 80,
  },
  sectionLabel: {
    marginTop: spacing.l,
    marginBottom: spacing.s,
  },
  pictureCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.m,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.l,
    gap: spacing.xs,
  },
  pictureText: {
    color: colors.accent,
    fontWeight: '600',
  },
});
