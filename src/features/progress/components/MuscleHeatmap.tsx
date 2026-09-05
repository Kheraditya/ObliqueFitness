import { View, StyleSheet } from 'react-native';
import Body, { type ExtendedBodyPart, type Slug } from 'react-native-body-highlighter';
import { MUSCLE_TO_SLUG } from '../bodyHighlighterMap';
import { colors, spacing } from '../../../theme';

// A 4-step ramp from "untrained" to "most-trained this period": starts and ends on real
// theme tokens (colors.surfaceElevated / colors.accent), with two hand-picked intermediate
// blues in between -- there's no third/fourth theme color to interpolate through instead.
const INTENSITY_COLORS = [colors.surfaceElevated, '#3D6FA8', '#1D5FC4', colors.accent];

export function buildBodyData(muscleVolumes: { muscle: string; volume: number }[]): ExtendedBodyPart[] {
  const bySlug = new Map<Slug, number>();

  for (const { muscle, volume } of muscleVolumes) {
    const slug = MUSCLE_TO_SLUG[muscle];
    if (!slug) continue;
    bySlug.set(slug, (bySlug.get(slug) ?? 0) + volume);
  }

  const max = Math.max(0, ...Array.from(bySlug.values()));

  return Array.from(bySlug.entries()).map(([slug, volume]) => {
    const ratio = max > 0 ? volume / max : 0;
    const intensity = Math.max(1, Math.min(INTENSITY_COLORS.length, Math.ceil(ratio * INTENSITY_COLORS.length)));
    return { slug, intensity };
  });
}

export function MuscleHeatmap({ muscleVolumes }: { muscleVolumes: { muscle: string; volume: number }[] }) {
  const data = buildBodyData(muscleVolumes);

  return (
    <View style={styles.row}>
      <Body data={data} colors={INTENSITY_COLORS} side="front" scale={0.9} border="none" defaultFill={colors.surfaceElevated} />
      <Body data={data} colors={INTENSITY_COLORS} side="back" scale={0.9} border="none" defaultFill={colors.surfaceElevated} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.m,
  },
});
