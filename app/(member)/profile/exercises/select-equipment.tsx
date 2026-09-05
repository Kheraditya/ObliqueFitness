import { Pressable, ScrollView, Text, View, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../../../src/components/Screen';
import { HeaderBar } from '../../../../src/components/HeaderBar';
import { EQUIPMENT_OPTIONS } from '../../../../src/features/exercises/constants';
import { colors, spacing, typography } from '../../../../src/theme';

export default function SelectEquipment() {
  const { returnTo, mode, ...rest } = useLocalSearchParams() as {
    returnTo: string;
    mode?: 'create' | 'filter';
    [key: string]: string | string[] | undefined;
  };

  function choose(equipment: string) {
    router.push({ pathname: returnTo, params: { ...rest, selectedEquipment: equipment } });
  }

  return (
    <Screen
      header={
        <HeaderBar
          left={
            <Pressable onPress={() => router.back()} hitSlop={8} testID="back-button">
              <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
            </Pressable>
          }
          center={<Text style={typography.headerTitle}>Select Equipment Type</Text>}
        />
      }
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        {mode === 'filter' && (
          <Pressable style={styles.rowBleed} onPress={() => choose('')}>
            <View style={styles.row}>
              <Text style={styles.label}>All Equipment</Text>
            </View>
          </Pressable>
        )}
        {EQUIPMENT_OPTIONS.map((option, index) => (
          <Pressable
            key={option.key}
            style={[styles.rowBleed, index === EQUIPMENT_OPTIONS.length - 1 && styles.rowNoBorder]}
            onPress={() => choose(option.key)}
          >
            <View style={styles.row}>
              <View style={styles.iconWrap}>
                <Ionicons name={option.icon} size={22} color={colors.textPrimary} />
              </View>
              <Text style={styles.label}>{option.label}</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
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
    alignItems: 'center',
    gap: spacing.m,
    paddingVertical: spacing.m,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: colors.textPrimary,
    fontSize: 17,
  },
});
