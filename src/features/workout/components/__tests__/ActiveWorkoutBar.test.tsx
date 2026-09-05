import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { ActiveWorkoutBar } from '../ActiveWorkoutBar';

describe('ActiveWorkoutBar', () => {
  it('shows "No exercise" when the session has none logged yet', async () => {
    await render(
      <ActiveWorkoutBar startedAt={new Date().toISOString()} exerciseCount={0} onResume={jest.fn()} onDiscard={jest.fn()} />
    );

    expect(screen.getByText('No exercise')).toBeTruthy();
  });

  it('pluralizes the exercise count', async () => {
    const { rerender } = await render(
      <ActiveWorkoutBar startedAt={new Date().toISOString()} exerciseCount={1} onResume={jest.fn()} onDiscard={jest.fn()} />
    );
    expect(screen.getByText('1 exercise')).toBeTruthy();

    await rerender(
      <ActiveWorkoutBar startedAt={new Date().toISOString()} exerciseCount={3} onResume={jest.fn()} onDiscard={jest.fn()} />
    );
    expect(screen.getByText('3 exercises')).toBeTruthy();
  });

  it('calls onResume when the bar is pressed', async () => {
    const onResume = jest.fn();
    await render(
      <ActiveWorkoutBar startedAt={new Date().toISOString()} exerciseCount={0} onResume={onResume} onDiscard={jest.fn()} />
    );

    await fireEvent.press(screen.getByTestId('active-workout-bar'));

    expect(onResume).toHaveBeenCalled();
  });

  it('asks for confirmation before discarding, and only discards when confirmed', async () => {
    const onDiscard = jest.fn();
    await render(
      <ActiveWorkoutBar startedAt={new Date().toISOString()} exerciseCount={0} onResume={jest.fn()} onDiscard={onDiscard} />
    );

    await fireEvent.press(screen.getByTestId('active-workout-bar-discard'));

    expect(screen.getByText('This will permanently delete this workout and all logged sets.')).toBeTruthy();
    expect(onDiscard).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByTestId('confirm-modal-confirm'));

    expect(onDiscard).toHaveBeenCalled();
  });

  it('does not discard when the confirmation is cancelled', async () => {
    const onDiscard = jest.fn();
    await render(
      <ActiveWorkoutBar startedAt={new Date().toISOString()} exerciseCount={0} onResume={jest.fn()} onDiscard={onDiscard} />
    );

    await fireEvent.press(screen.getByTestId('active-workout-bar-discard'));
    await fireEvent.press(screen.getByTestId('confirm-modal-cancel'));

    expect(onDiscard).not.toHaveBeenCalled();
  });

  it('shows a live-ticking duration from startedAt', async () => {
    jest.useFakeTimers();
    const startedAt = new Date(Date.now() - 5000).toISOString();

    await render(<ActiveWorkoutBar startedAt={startedAt} exerciseCount={0} onResume={jest.fn()} onDiscard={jest.fn()} />);

    expect(screen.getByText('Workout 5s')).toBeTruthy();

    await act(async () => {
      jest.advanceTimersByTime(3000);
    });

    expect(screen.getByText('Workout 8s')).toBeTruthy();
    jest.useRealTimers();
  });
});
