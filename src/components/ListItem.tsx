import { Image, Pressable, Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../theme';

interface ListItemProps {
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  imageUri?: string;
  trailing?: 'chevron' | string;
  onPress?: () => void;
}

export function ListItem({ title, subtitle, icon, imageUri, trailing, onPress }: ListItemProps) {
  const Wrapper = onPress ? Pressable : View;
  return (
    <Wrapper onPress={onPress} style={styles.row}>
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.thumb} />
      ) : icon ? (
        <View style={styles.iconWrap}>
          <Ionicons name={icon} size={20} color={colors.textPrimary} />
        </View>
      ) : null}
      <View style={styles.textCol}>
        <Text style={typography.body}>{title}</Text>
        {subtitle && <Text style={typography.label}>{subtitle}</Text>}
      </View>
      {trailing === 'chevron' ? (
        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
      ) : trailing ? (
        <Text style={typography.body}>{trailing}</Text>
      ) : null}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.m,
  },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.m,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
  },
});
