import { useEffect, useState } from 'react';
import { Image, Text, View, StyleSheet } from 'react-native';
import { getPersonalRecords } from '../api';
import type { Exercise, PersonalRecords } from '../types';
import { colors, radius, spacing, typography } from '../../../theme';

export function SummaryTab({ exercise }: { exercise: Exercise }) {
  const [records, setRecords] = useState<PersonalRecords | null>(null);

  useEffect(() => {
    getPersonalRecords(exercise.id).then(setRecords);
  }, [exercise.id]);

  return (
    <View>
      {exercise.images[0] && <Image source={{ uri: exercise.images[0] }} style={styles.image} resizeMode="cover" />}
      <Text style={[typography.label, styles.muscleRow]}>
        Primary: {exercise.primary_muscles.join(', ') || '-'}
      </Text>
      {exercise.secondary_muscles.length > 0 && (
        <Text style={typography.label}>Secondary: {exercise.secondary_muscles.join(', ')}</Text>
      )}
      <View style={styles.card}>
        <RecordRow label="Heaviest Weight" value={records?.heaviestWeight} />
        <RecordRow label="Best 1RM" value={records?.best1RM} />
        <RecordRow label="Best Set Volume" value={records?.bestSetVolume} />
        <RecordRow label="Best Session Volume" value={records?.bestSessionVolume} />
      </View>
    </View>
  );
}

function RecordRow({ label, value }: { label: string; value: number | null | undefined }) {
  return (
    <View style={styles.recordRow}>
      <Text style={typography.body}>{label}</Text>
      <Text style={typography.body}>{value != null ? Math.round(value * 10) / 10 : '-'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    width: '100%',
    height: 220,
    borderRadius: radius.m,
    backgroundColor: colors.surface,
    marginBottom: spacing.m,
  },
  muscleRow: {
    marginBottom: spacing.xs,
  },
  card: {
    marginTop: spacing.l,
    backgroundColor: colors.surface,
    borderRadius: radius.m,
    padding: spacing.m,
  },
  recordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.s,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
});
