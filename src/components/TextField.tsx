import { useState } from 'react';
import { Pressable, Text, TextInput, View, StyleSheet, type TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../theme';

interface TextFieldProps extends TextInputProps {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

export function TextField({ label, icon, style, secureTextEntry, ...props }: TextFieldProps) {
  const [passwordVisible, setPasswordVisible] = useState(false);
  return (
    <View style={styles.container}>
      <Text style={typography.label}>{label}</Text>
      <View style={styles.inputShell}>
        {icon && <Ionicons name={icon} size={19} color={colors.textSecondary} />}
        <TextInput
          placeholderTextColor={colors.textSecondary}
          style={[styles.input, style]}
          secureTextEntry={secureTextEntry && !passwordVisible}
          {...props}
        />
        {secureTextEntry && (
          <Pressable onPress={() => setPasswordVisible((visible) => !visible)} hitSlop={10} accessibilityLabel={passwordVisible ? 'Hide password' : 'Show password'}>
            <Ionicons name={passwordVisible ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textSecondary} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.m,
  },
  inputShell: {
    marginTop: spacing.xs,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.m,
    minHeight: 54,
    paddingHorizontal: spacing.m,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.m,
    color: colors.textPrimary,
    fontSize: 16,
  },
});
