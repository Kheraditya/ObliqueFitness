import { render, screen, fireEvent } from '@testing-library/react-native';
import { ConfirmModal } from '../ConfirmModal';

describe('ConfirmModal', () => {
  it('renders nothing interactable when not visible', async () => {
    await render(
      <ConfirmModal
        visible={false}
        title="Discard Workout"
        message="This will permanently delete this workout and all logged sets."
        confirmLabel="Discard Workout"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    expect(screen.queryByText('Discard Workout')).toBeNull();
  });

  it('renders the title, message, and both actions when visible', async () => {
    await render(
      <ConfirmModal
        visible
        title="Discard Workout"
        message="This will permanently delete this workout and all logged sets."
        confirmLabel="Discard Workout"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    expect(screen.getByText('This will permanently delete this workout and all logged sets.')).toBeTruthy();
    expect(screen.getByTestId('confirm-modal-confirm')).toBeTruthy();
    expect(screen.getByTestId('confirm-modal-cancel')).toBeTruthy();
  });

  it('calls onConfirm when the confirm action is pressed', async () => {
    const onConfirm = jest.fn();
    await render(
      <ConfirmModal
        visible
        title="Discard Workout"
        message="Message"
        confirmLabel="Discard Workout"
        onConfirm={onConfirm}
        onCancel={jest.fn()}
      />
    );

    await fireEvent.press(screen.getByTestId('confirm-modal-confirm'));

    expect(onConfirm).toHaveBeenCalled();
  });

  it('calls onCancel when the cancel action is pressed', async () => {
    const onCancel = jest.fn();
    await render(
      <ConfirmModal
        visible
        title="Discard Workout"
        message="Message"
        confirmLabel="Discard Workout"
        onConfirm={jest.fn()}
        onCancel={onCancel}
      />
    );

    await fireEvent.press(screen.getByTestId('confirm-modal-cancel'));

    expect(onCancel).toHaveBeenCalled();
  });

  it('calls onCancel when tapping the overlay outside the card', async () => {
    const onCancel = jest.fn();
    await render(
      <ConfirmModal
        visible
        title="Discard Workout"
        message="Message"
        confirmLabel="Discard Workout"
        onConfirm={jest.fn()}
        onCancel={onCancel}
      />
    );

    await fireEvent.press(screen.getByTestId('confirm-modal-overlay'));

    expect(onCancel).toHaveBeenCalled();
  });

  it('does not call onCancel when tapping inside the card', async () => {
    const onCancel = jest.fn();
    await render(
      <ConfirmModal
        visible
        title="Discard Workout"
        message="Message"
        confirmLabel="Discard Workout"
        onConfirm={jest.fn()}
        onCancel={onCancel}
      />
    );

    await fireEvent.press(screen.getByText('Message'));

    expect(onCancel).not.toHaveBeenCalled();
  });
});
