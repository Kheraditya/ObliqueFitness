import { useEffect, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View, StyleSheet } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../../src/components/Screen';
import { PillTabs } from '../../../src/components/PillTabs';
import { ErrorText } from '../../../src/components/ErrorText';
import { getCurrentUserProfile, updateProfile } from '../../../src/features/auth/api';
import { toLocalDateString, parseLocalDateString } from '../../../src/lib/dates';
import { colors, radius, spacing, typography } from '../../../src/theme';

export default function EditProfile() {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [link, setLink] = useState('');
  const [sex, setSex] = useState('');
  const [birthday, setBirthday] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  function handleDateChange(event: DateTimePickerEvent, selectedDate?: Date) {
    setShowDatePicker(Platform.OS === 'ios');
    if (event.type === 'set' && selectedDate) {
      setBirthday(toLocalDateString(selectedDate));
    }
  }

  useEffect(() => {
    getCurrentUserProfile().then((profile) => {
      if (!profile) return;
      setAvatarUrl(profile.avatar_url);
      setName(profile.name ?? '');
      setBio(profile.bio ?? '');
      setLink(profile.link ?? '');
      setSex(profile.sex ?? '');
      setBirthday(profile.birthday ?? '');
    });
  }, []);

  async function handleDone() {
    setError(null);
    setSaving(true);
    const { error: saveError } = await updateProfile({
      name: name.trim() || null,
      bio: bio.trim() || null,
      link: link.trim() || null,
      sex: sex || null,
      birthday: birthday.trim() || null,
    });
    setSaving(false);
    if (saveError) {
      setError(saveError);
      return;
    }
    router.back();
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={typography.body}>Edit Profile</Text>
        <Pressable onPress={handleDone} disabled={saving}>
          <Text style={styles.doneText}>Done</Text>
        </Pressable>
      </View>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? spacing.xl : 0}
      >
      <ScrollView keyboardShouldPersistTaps="handled">
        <View style={styles.avatarSection}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Ionicons name="person" size={40} color={colors.textSecondary} />
            </View>
          )}
          <Text style={styles.changePicture}>Change Picture</Text>
        </View>

        {error && <ErrorText>{error}</ErrorText>}

        <Text style={[typography.label, styles.sectionLabel]}>Public profile data</Text>
        <View style={styles.field}>
          <Text style={typography.body}>Name</Text>
          <TextInput
            style={styles.fieldInput}
            placeholder="Your full name"
            placeholderTextColor={colors.textSecondary}
            value={name}
            onChangeText={setName}
          />
        </View>
        <View style={styles.field}>
          <Text style={typography.body}>Bio</Text>
          <TextInput
            style={styles.fieldInput}
            placeholder="Describe yourself"
            placeholderTextColor={colors.textSecondary}
            value={bio}
            onChangeText={setBio}
            multiline
          />
        </View>
        <View style={styles.field}>
          <Text style={typography.body}>Link</Text>
          <TextInput
            style={styles.fieldInput}
            placeholder="https://example.com"
            placeholderTextColor={colors.textSecondary}
            value={link}
            onChangeText={setLink}
            autoCapitalize="none"
          />
        </View>

        <Text style={[typography.label, styles.sectionLabel]}>Private data</Text>
        <PillTabs
          options={[
            { key: 'male', label: 'Male' },
            { key: 'female', label: 'Female' },
            { key: 'other', label: 'Other' },
          ]}
          value={sex}
          onChange={setSex}
        />
        <View style={styles.field}>
          <Text style={typography.body}>Birthday</Text>
          <Pressable onPress={() => setShowDatePicker(true)}>
            <Text style={styles.fieldInput}>{birthday || 'Select date'}</Text>
          </Pressable>
        </View>
        {showDatePicker && (
          <DateTimePicker
            value={birthday ? parseLocalDateString(birthday) : new Date(2000, 0, 1)}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            maximumDate={new Date()}
            onChange={handleDateChange}
          />
        )}
      </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.l,
    marginBottom: spacing.m,
  },
  doneText: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '600',
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: spacing.l,
    gap: spacing.s,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  changePicture: {
    color: colors.accent,
    fontWeight: '600',
  },
  sectionLabel: {
    marginTop: spacing.l,
    marginBottom: spacing.s,
  },
  field: {
    paddingVertical: spacing.s,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.s,
  },
  fieldInput: {
    color: colors.textSecondary,
    fontSize: 16,
    marginTop: spacing.xs,
  },
});
