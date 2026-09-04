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
});
