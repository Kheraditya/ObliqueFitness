import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme';

interface ScreenProps {
  children: ReactNode;
  // Rendered full-bleed (edge to edge, behind the status bar) in a tinted band above the
  // padded body -- e.g. a HeaderBar. Omit for screens that just want a plain padded page.
  header?: ReactNode;
}

export function Screen({ children, header }: ScreenProps) {
  return (
    <SafeAreaView style={styles.root} edges={header ? ['bottom', 'left', 'right'] : ['top', 'bottom', 'left', 'right']}>
      {header && (
        <SafeAreaView style={styles.headerBand} edges={['top']}>
          {header}
        </SafeAreaView>
      )}
      <View style={styles.body}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerBand: {
    backgroundColor: colors.surface,
  },
  body: {
    flex: 1,
    paddingHorizontal: spacing.l,
  },
});
