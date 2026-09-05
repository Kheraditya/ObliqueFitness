import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../../src/components/Screen';
import { getWorkoutDates } from '../../../src/features/workout/api';
import { computeWeekStreak } from '../../../src/features/progress/streak';
import { colors, radius, spacing, typography } from '../../../src/theme';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function toLocalDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function buildMonthGrid(year: number, month: number): (Date | null)[][] {
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = firstDay.getDay();

  const cells: (Date | null)[] = [
    ...Array(startWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];

  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    const week = cells.slice(i, i + 7);
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }
  return weeks;
}

export default function CalendarScreen() {
  const [workoutDates, setWorkoutDates] = useState<Set<string>>(new Set());
  const today = useMemo(() => new Date(), []);
  const todayStr = toLocalDateString(today);

  useEffect(() => {
    getWorkoutDates().then((dates) => setWorkoutDates(new Set(dates)));
  }, []);

  const weekStreak = computeWeekStreak(Array.from(workoutDates), today);

  const restDays = useMemo(() => {
    let count = 0;
    for (let d = 1; d <= today.getDate(); d++) {
      const dateStr = toLocalDateString(new Date(today.getFullYear(), today.getMonth(), d));
      if (!workoutDates.has(dateStr)) count += 1;
    }
    return count;
  }, [workoutDates, today]);

  const monthsToShow = [-2, -1, 0].map((offset) => {
    const d = new Date(today.getFullYear(), today.getMonth() + offset, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={typography.body}>Calendar</Text>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView>
        <View style={styles.statsRow}>
          <Text style={styles.statText}>{'\u{1F525}'} {weekStreak} week streak</Text>
          <View style={styles.statDivider} />
          <Text style={styles.statText}>{'\u{1F319}'} {restDays} rest days</Text>
        </View>
        <View style={styles.dayHeaderRow}>
          {DAY_LABELS.map((d) => (
            <Text key={d} style={styles.dayHeaderText}>
              {d}
            </Text>
          ))}
        </View>
        {monthsToShow.map(({ year, month }, idx) => (
          <View key={`${year}-${month}`}>
            {idx > 0 && (
              <Text style={styles.monthLabel}>
                {MONTH_NAMES[month]} {year}
              </Text>
            )}
            {buildMonthGrid(year, month).map((week, wi) => (
              <View key={wi} style={styles.weekRow}>
                {week.map((date, di) => {
                  const dateStr = date ? toLocalDateString(date) : null;
                  const isToday = dateStr === todayStr;
                  const hasWorkout = dateStr != null && workoutDates.has(dateStr);
                  return (
                    <View key={di} style={styles.dayCell}>
                      {date && (
                        <Text style={[styles.dayText, isToday && styles.dayTextToday]}>{date.getDate()}</Text>
                      )}
                      {hasWorkout && <View style={styles.workoutDot} />}
                    </View>
                  );
                })}
              </View>
            ))}
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
  headerSpacer: {
    width: 22,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.m,
    paddingVertical: spacing.m,
    marginBottom: spacing.m,
  },
  statText: {
    flex: 1,
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 14,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
  },
  dayHeaderRow: {
    flexDirection: 'row',
    marginBottom: spacing.s,
  },
  dayHeaderText: {
    flex: 1,
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 13,
  },
  monthLabel: {
    ...typography.title,
    fontSize: 20,
    marginTop: spacing.l,
    marginBottom: spacing.s,
  },
  weekRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.m,
  },
  dayText: {
    color: colors.textPrimary,
    fontSize: 15,
  },
  dayTextToday: {
    color: colors.accent,
    fontWeight: '700',
  },
  workoutDot: {
    width: 5,
    height: 5,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
    marginTop: spacing.xs,
  },
});
