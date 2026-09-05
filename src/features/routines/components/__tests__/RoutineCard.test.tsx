import { render, screen, fireEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { RoutineCard } from '../RoutineCard';

describe('RoutineCard', () => {
  it('renders the exercise preview when provided, and omits it when absent', async () => {
    const { rerender } = await render(
      <RoutineCard
        name="Push Day"
        exercisePreview="Bench Press, Overhead Press"
        onStart={jest.fn()}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    );

    expect(screen.getByText('Bench Press, Overhead Press')).toBeTruthy();

    await rerender(<RoutineCard name="Push Day" onStart={jest.fn()} onEdit={jest.fn()} onDelete={jest.fn()} />);

    expect(screen.queryByText('Bench Press, Overhead Press')).toBeNull();
  });

  it('calls onStart when Start Routine is pressed', async () => {
    const onStart = jest.fn();
    await render(<RoutineCard name="Push Day" onStart={onStart} onEdit={jest.fn()} onDelete={jest.fn()} />);

    await fireEvent.press(screen.getByText('Start Routine'));

    expect(onStart).toHaveBeenCalled();
  });

  it('opens a menu with Edit and Delete options when the menu icon is pressed', async () => {
    const onEdit = jest.fn();
    const onDelete = jest.fn();
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      buttons?.find((b) => b.text === 'Edit Routine')?.onPress?.();
    });

    await render(<RoutineCard name="Push Day" onStart={jest.fn()} onEdit={onEdit} onDelete={onDelete} />);
    await fireEvent.press(screen.getByTestId('routine-menu-Push Day'));

    expect(onEdit).toHaveBeenCalled();
    expect(onDelete).not.toHaveBeenCalled();

    const buttons = alertSpy.mock.calls[0][2];
    expect(buttons?.find((b) => b.text === 'Delete Routine')?.style).toBe('destructive');
    expect(buttons?.find((b) => b.text === 'Cancel')).toEqual({ text: 'Cancel', style: 'cancel' });

    alertSpy.mockRestore();
  });

  it('calls onDelete when Delete Routine is chosen from the menu', async () => {
    const onDelete = jest.fn();
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      buttons?.find((b) => b.text === 'Delete Routine')?.onPress?.();
    });

    await render(<RoutineCard name="Push Day" onStart={jest.fn()} onEdit={jest.fn()} onDelete={onDelete} />);
    await fireEvent.press(screen.getByTestId('routine-menu-Push Day'));

    expect(onDelete).toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});
