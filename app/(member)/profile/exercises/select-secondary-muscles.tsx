import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../../../src/components/Screen';
import { HeaderBar } from '../../../../src/components/HeaderBar';
import { MUSCLE_GROUP_OPTIONS } from '../../../../src/features/exercises/constants';
import { colors, radius, spacing, typography } from '../../../../src/theme';

export default function SelectSecondaryMuscles() {
  const { returnTo, initial, ...rest } = useLocalSearchParams() as {
    returnTo: string;
    initial?: string;
    [key: string]: string | string[] | undefined;
  };
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(initial ? initial.split(',').filter(Boolean) : [])
  );

  function toggle(muscle: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(muscle)) next.delete(muscle);
      else next.add(muscle);
      return next;
    });
  }

  function handleDone() {
    router.push({
      pathname: returnTo,
      params: { ...rest, selectedSecondaryMuscles: Array.from(selected).join(',') },
    });
  }

  const filtered = MUSCLE_GROUP_OPTIONS.filter((m) => m.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <Screen
      header={
        <HeaderBar
          left={
            <Pressable onPress={() => router.back()} hitSlop={8} testID="back-button">
              <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
            </Pressable>
          }
          center={<Text style={typography.headerTitle}>Secondary Muscle Groups</Text>}
          right={
            <Pressable onPress={handleDone} hitSlop={8}>
              <Text style={styles.doneText}>Done</Text>
            </Pressable>
          }
        />
      }
    >
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search muscle"
          placeholderTextColor={colors.textSecondary}
          value={search}
          onChangeText={setSearch}
        />
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>
        {filtered.map((muscle, index) => {
          const checked = selected.has(muscle);
          return (
            <Pressable
              key={muscle}
              style={[styles.rowBleed, index === filtered.length - 1 && styles.rowNoBorder]}
              onPress={() => toggle(muscle)}
            >
              <View style={styles.row}>
                <Text style={styles.label}>{muscle}</Text>
                <Ionicons
                  name={checked ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={checked ? colors.accent : colors.textSecondary}
                />
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  doneText: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '600',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.m,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    marginTop: spacing.m,
    marginBottom: spacing.m,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 16,
  },
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.m,
  },
  label: {
    color: colors.textPrimary,
    fontSize: 17,
  },
});
