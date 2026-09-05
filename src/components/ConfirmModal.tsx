import { Modal, Pressable, Text, View, StyleSheet } from 'react-native';
import { Button } from './Button';
import { colors, spacing } from '../theme';

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// A dark, rounded-card confirmation dialog matching the app's own design language, used in
// place of the native Alert.alert for destructive actions (e.g. Discard Workout) where the
// reference design calls for a styled in-app dialog rather than the OS-default alert.
export function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  destructive = true,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.overlay} onPress={onCancel} testID="confirm-modal-overlay">
        {/* A no-op onPress claims the touch responder so taps inside the card don't fall
            through to the overlay's onCancel -- the standard RN "tap outside to dismiss" trick. */}
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <Button
            title={confirmLabel}
            variant="dark"
            textColor={destructive ? colors.danger : colors.accent}
            onPress={onConfirm}
            style={styles.noMarginTop}
            testID="confirm-modal-confirm"
          />
          <Button
            title={cancelLabel}
            variant="dark"
            onPress={onCancel}
            style={styles.noMarginTop}
            testID="confirm-modal-cancel"
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.l,
  },
  card: {
    width: '100%',
    backgroundColor: colors.surfaceElevated,
    borderRadius: 20,
    padding: spacing.l,
    gap: spacing.s,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  message: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: spacing.s,
  },
  noMarginTop: {
    marginTop: 0,
  },
});
