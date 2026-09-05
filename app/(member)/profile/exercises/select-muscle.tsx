import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../../../src/components/Screen';
import { HeaderBar } from '../../../../src/components/HeaderBar';
import { MUSCLE_GROUP_OPTIONS } from '../../../../src/features/exercises/constants';
import { colors, radius, spacing, typography } from '../../../../src/theme';

export default function SelectMuscle() {
  const { returnTo, mode, ...rest } = useLocalSearchParams() as {
    returnTo: string;
    mode?: 'create' | 'filter';
    [key: string]: string | string[] | undefined;
  };
  const [search, setSearch] = useState('');

  function choose(muscle: string) {
    router.push({ pathname: returnTo, params: { ...rest, selectedMuscle: muscle } });
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
          center={<Text style={typography.headerTitle}>Select Muscle Group</Text>}
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
        {mode === 'filter' && (
          <Pressable style={styles.rowBleed} onPress={() => choose('')}>
            <View style={styles.row}>
              <Text style={styles.label}>All Muscles</Text>
            </View>
          </Pressable>
        )}
        {filtered.map((muscle, index) => (
          <Pressable
            key={muscle}
            style={[styles.rowBleed, index === filtered.length - 1 && styles.rowNoBorder]}
            onPress={() => choose(muscle)}
          >
            <View style={styles.row}>
              <Text style={styles.label}>{muscle}</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
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
    paddingVertical: spacing.m,
  },
  label: {
    color: colors.textPrimary,
    fontSize: 17,
  },
});
