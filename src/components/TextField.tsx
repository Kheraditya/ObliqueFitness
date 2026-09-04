import { Text, TextInput, View, StyleSheet, type TextInputProps } from 'react-native';
import { colors, radius, spacing, typography } from '../theme';

interface TextFieldProps extends TextInputProps {
  label: string;
}

export function TextField({ label, style, ...props }: TextFieldProps) {
  return (
    <View style={styles.container}>
      <Text style={typography.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.textSecondary}
        style={[styles.input, style]}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.m,
  },
  input: {
    marginTop: spacing.xs,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.m,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.m,
    color: colors.textPrimary,
    fontSize: 16,
  },
});
