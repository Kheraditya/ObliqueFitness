import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../theme';

interface AuthScaffoldProps {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}

export function AuthScaffold({ eyebrow, title, description, children }: AuthScaffoldProps) {
  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.brandRow}>
            <View style={styles.mark}>
              <Svg width={30} height={30} viewBox="0 0 30 30" accessibilityLabel="Oblique Fitness mark">
                <Circle cx="15" cy="15" r="13" fill={colors.accent} />
                <Line x1="8" y1="15" x2="22" y2="15" stroke={colors.textPrimary} strokeWidth="3" strokeLinecap="round" />
                <Path d="M8 11v8M22 11v8M5.5 12.5v5M24.5 12.5v5" stroke={colors.textPrimary} strokeWidth="2.3" strokeLinecap="round" />
              </Svg>
            </View>
            <Text style={styles.wordmark}>OBLIQUE</Text>
          </View>

          <View style={styles.hero}>
            <View style={styles.glowOne} />
            <View style={styles.glowTwo} />
            <Text style={styles.eyebrow}>{eyebrow}</Text>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.description}>{description}</Text>
          </View>

          <View style={styles.card}>{children}</View>
          <Text style={styles.footer}>TRAIN · TRACK · PROGRESS</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: spacing.l, paddingTop: spacing.l, paddingBottom: spacing.xl },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mark: { width: 38, height: 38, borderRadius: radius.m, alignItems: 'center', justifyContent: 'center', backgroundColor: '#061D33' },
  wordmark: { color: colors.textPrimary, fontSize: 16, lineHeight: 20, fontWeight: '900', letterSpacing: 2.4 },
  hero: { overflow: 'hidden', minHeight: 220, justifyContent: 'flex-end', marginTop: spacing.l, paddingBottom: spacing.l },
  glowOne: { position: 'absolute', width: 190, height: 190, borderRadius: 95, backgroundColor: '#07294A', right: -65, top: -40, opacity: 0.65 },
  glowTwo: { position: 'absolute', width: 105, height: 105, borderRadius: 53, borderWidth: 18, borderColor: '#0A84FF22', right: 38, top: 48 },
  eyebrow: { color: colors.accent, fontSize: 11, lineHeight: 16, fontWeight: '800', letterSpacing: 1.8 },
  title: { color: colors.textPrimary, fontSize: 36, lineHeight: 41, fontWeight: '800', letterSpacing: -1.1, maxWidth: 310, marginTop: spacing.s },
  description: { color: colors.textSecondary, fontSize: 15, lineHeight: 22, maxWidth: 320, marginTop: spacing.s },
  card: { backgroundColor: '#111113', borderWidth: 1, borderColor: colors.border, borderRadius: 22, padding: spacing.l },
  footer: { color: '#55555B', fontSize: 10, fontWeight: '800', letterSpacing: 2.2, textAlign: 'center', marginTop: 'auto', paddingTop: spacing.xl },
});
