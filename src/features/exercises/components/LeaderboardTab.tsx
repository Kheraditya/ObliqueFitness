import { useEffect, useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { getLeaderboard, getLeaderboardOptIn, setLeaderboardOptIn } from '../api';
import type { LeaderboardEntry } from '../types';
import { Button } from '../../../components/Button';
import { colors, spacing, typography } from '../../../theme';

export function LeaderboardTab({ exerciseId }: { exerciseId: string }) {
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
  const [optedIn, setOptedIn] = useState(false);

  useEffect(() => {
    getLeaderboard(exerciseId).then(setEntries);
    getLeaderboardOptIn().then(setOptedIn);
  }, [exerciseId]);

  async function handleOptIn() {
    const { error } = await setLeaderboardOptIn(true);
    if (!error) {
      setOptedIn(true);
      getLeaderboard(exerciseId).then(setEntries);
    }
  }

  if (entries === null) return null;

  return (
    <View>
      {!optedIn && <Button title="Show me on leaderboards" variant="secondary" onPress={handleOptIn} />}
      {entries.length === 0 ? (
        <Text style={[typography.subtitle, styles.empty]}>No data yet.</Text>
      ) : (
        entries.map((entry, index) => (
          <View key={entry.userId} style={styles.row}>
            <Text style={typography.body}>
              {index + 1}. {entry.name ?? 'Member'}
            </Text>
            <Text style={typography.body}>{entry.heaviestWeight} kg</Text>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    marginTop: spacing.m,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.s,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginTop: spacing.s,
  },
});
