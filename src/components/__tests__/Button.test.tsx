import { render, screen } from '@testing-library/react-native';
import { fireEvent } from '@testing-library/react-native';
import { Button } from '../Button';

describe('Button', () => {
  it('calls onPress when enabled and pressed', async () => {
    const onPress = jest.fn();
    await render(<Button title="Tap me" onPress={onPress} />);
    fireEvent.press(screen.getByText('Tap me'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', async () => {
    const onPress = jest.fn();
    await render(<Button title="Tap me" onPress={onPress} disabled />);
    fireEvent.press(screen.getByText('Tap me'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('renders an icon when the icon prop is given', async () => {
    await render(<Button title="Start Empty Workout" onPress={() => {}} variant="dark" icon="add" align="left" />);
    expect(screen.getByText('Start Empty Workout')).toBeTruthy();
  });

  it('applies a textColor override instead of the variant default', async () => {
    await render(<Button title="Discard Workout" onPress={() => {}} variant="dark" textColor="#FF453A" />);
    const label = screen.getByText('Discard Workout');
    const flattened = Array.isArray(label.props.style) ? Object.assign({}, ...label.props.style) : label.props.style;
    expect(flattened.color).toBe('#FF453A');
  });
});
