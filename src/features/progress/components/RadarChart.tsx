import { View, Text, StyleSheet } from 'react-native';
import Svg, { Polygon, Line, Text as SvgText } from 'react-native-svg';
import { MUSCLE_GROUPS, type MuscleGroup } from '../muscleGroups';
import { colors, spacing } from '../../../theme';

const SIZE = 260;
const CENTER = SIZE / 2;
const RADIUS = 90;
const RINGS = [0.25, 0.5, 0.75, 1];

export function pointFor(index: number, fraction: number): { x: number; y: number } {
  const angle = -Math.PI / 2 + index * ((2 * Math.PI) / MUSCLE_GROUPS.length);
  return {
    x: CENTER + RADIUS * fraction * Math.cos(angle),
    y: CENTER + RADIUS * fraction * Math.sin(angle),
  };
}

export function polygonPoints(values: Record<MuscleGroup, number>, max: number): string {
  return MUSCLE_GROUPS.map((group, i) => {
    const fraction = max > 0 ? values[group] / max : 0;
    const { x, y } = pointFor(i, fraction);
    return `${x},${y}`;
  }).join(' ');
}

interface RadarChartProps {
  current: Record<MuscleGroup, number>;
  previous: Record<MuscleGroup, number>;
}

export function RadarChart({ current, previous }: RadarChartProps) {
  const max = Math.max(1, ...MUSCLE_GROUPS.map((g) => Math.max(current[g], previous[g])));

  return (
    <View style={styles.container}>
      <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        {RINGS.map((ring) => (
          <Polygon
            key={ring}
            points={MUSCLE_GROUPS.map((_, i) => {
              const p = pointFor(i, ring);
              return `${p.x},${p.y}`;
            }).join(' ')}
            fill="none"
            stroke={colors.border}
            strokeWidth={1}
          />
        ))}
        {MUSCLE_GROUPS.map((_, i) => {
          const p = pointFor(i, 1);
          return <Line key={i} x1={CENTER} y1={CENTER} x2={p.x} y2={p.y} stroke={colors.border} strokeWidth={1} />;
        })}
        <Polygon points={polygonPoints(previous, max)} fill={colors.textSecondary} fillOpacity={0.2} stroke={colors.textSecondary} strokeWidth={2} />
        <Polygon points={polygonPoints(current, max)} fill={colors.accent} fillOpacity={0.25} stroke={colors.accent} strokeWidth={2} />
        {MUSCLE_GROUPS.map((group, i) => {
          const p = pointFor(i, 1.22);
          return (
            <SvgText key={group} x={p.x} y={p.y} fill={colors.textSecondary} fontSize={12} textAnchor="middle">
              {group}
            </SvgText>
          );
        })}
      </Svg>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.accent }]} />
          <Text style={styles.legendText}>Current</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.textSecondary }]} />
          <Text style={styles.legendText}>Previous</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  legend: {
    flexDirection: 'row',
    gap: spacing.l,
    marginTop: spacing.s,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
});
