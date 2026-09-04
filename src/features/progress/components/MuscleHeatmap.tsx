import { useState } from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Rect } from 'react-native-svg';
import { colors, spacing } from '../../../theme';
import { zoneVolumes, type Zone } from '../muscleZones';

interface ShapeDef {
  zone: Zone;
  x: number;
  y: number;
  width: number;
  height: number;
}

const FRONT_SHAPES: ShapeDef[] = [
  { zone: 'neck', x: 88, y: 40, width: 24, height: 16 },
  { zone: 'shoulders', x: 48, y: 56, width: 104, height: 18 },
  { zone: 'chest', x: 65, y: 76, width: 70, height: 38 },
  { zone: 'biceps', x: 38, y: 76, width: 20, height: 50 },
  { zone: 'biceps', x: 142, y: 76, width: 20, height: 50 },
  { zone: 'forearms', x: 34, y: 128, width: 18, height: 48 },
  { zone: 'forearms', x: 148, y: 128, width: 18, height: 48 },
  { zone: 'abs', x: 70, y: 116, width: 60, height: 38 },
  { zone: 'quads', x: 68, y: 156, width: 28, height: 68 },
  { zone: 'quads', x: 104, y: 156, width: 28, height: 68 },
  { zone: 'adductors', x: 94, y: 162, width: 12, height: 50 },
];

const BACK_SHAPES: ShapeDef[] = [
  { zone: 'traps', x: 80, y: 42, width: 40, height: 28 },
  { zone: 'upperBack', x: 65, y: 72, width: 70, height: 48 },
  { zone: 'triceps', x: 38, y: 76, width: 20, height: 50 },
  { zone: 'triceps', x: 142, y: 76, width: 20, height: 50 },
  { zone: 'forearms', x: 34, y: 128, width: 18, height: 48 },
  { zone: 'forearms', x: 148, y: 128, width: 18, height: 48 },
  { zone: 'lowerBack', x: 75, y: 122, width: 50, height: 28 },
  { zone: 'glutes', x: 68, y: 152, width: 64, height: 28 },
  { zone: 'abductors', x: 58, y: 152, width: 10, height: 60 },
  { zone: 'abductors', x: 132, y: 152, width: 10, height: 60 },
  { zone: 'hamstrings', x: 68, y: 182, width: 28, height: 50 },
  { zone: 'hamstrings', x: 104, y: 182, width: 28, height: 50 },
  { zone: 'calves', x: 68, y: 234, width: 28, height: 56 },
  { zone: 'calves', x: 104, y: 234, width: 28, height: 56 },
];

const COLD = { r: 0x2c, g: 0x2c, b: 0x2e }; // colors.surfaceElevated
const HOT = { r: 0x0a, g: 0x84, b: 0xff }; // colors.accent

export function interpolateColor(t: number): string {
  const r = Math.round(COLD.r + (HOT.r - COLD.r) * t);
  const g = Math.round(COLD.g + (HOT.g - COLD.g) * t);
  const b = Math.round(COLD.b + (HOT.b - COLD.b) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

export function MuscleHeatmap({ muscleVolumes }: { muscleVolumes: { muscle: string; volume: number }[] }) {
  const [view, setView] = useState<'front' | 'back'>('front');
  const volumes = zoneVolumes(muscleVolumes);
  const maxVolume = Math.max(0, ...Object.values(volumes));
  const shapes = view === 'front' ? FRONT_SHAPES : BACK_SHAPES;

  function colorFor(zone: Zone): string {
    if (maxVolume === 0) return colors.surfaceElevated;
    return interpolateColor(volumes[zone] / maxVolume);
  }

  return (
    <View>
      <View style={styles.toggleRow}>
        <Pressable onPress={() => setView('front')} style={styles.toggleButton}>
          <Text style={view === 'front' ? styles.toggleActive : styles.toggleInactive}>Front</Text>
        </Pressable>
        <Pressable onPress={() => setView('back')} style={styles.toggleButton}>
          <Text style={view === 'back' ? styles.toggleActive : styles.toggleInactive}>Back</Text>
        </Pressable>
      </View>
      <Svg viewBox="0 0 200 400" width="100%" height={280}>
        <Circle cx={100} cy={25} r={18} fill={colors.surfaceElevated} stroke={colors.border} strokeWidth={1} />
        {shapes.map((shape, index) => (
          <Rect
            key={`${shape.zone}-${index}`}
            x={shape.x}
            y={shape.y}
            width={shape.width}
            height={shape.height}
            rx={6}
            fill={colorFor(shape.zone)}
            stroke={colors.border}
            strokeWidth={1}
          />
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.l,
    marginBottom: spacing.s,
  },
  toggleButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.m,
  },
  toggleActive: {
    color: colors.accent,
    fontWeight: '700',
    fontSize: 15,
  },
  toggleInactive: {
    color: colors.textSecondary,
    fontWeight: '500',
    fontSize: 15,
  },
});
