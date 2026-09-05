import { render, screen, fireEvent } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';
import { ListItem } from '../ListItem';

describe('ListItem', () => {
  it('renders title, subtitle, and calls onPress', async () => {
    const onPress = jest.fn();
    await render(<ListItem title="Bench Press" subtitle="Chest" trailing="chevron" onPress={onPress} />);
    expect(screen.getByText('Bench Press')).toBeTruthy();
    expect(screen.getByText('Chest')).toBeTruthy();
    await fireEvent.press(screen.getByText('Bench Press'));
    expect(onPress).toHaveBeenCalled();
  });

  it('renders a literal trailing value instead of a chevron', async () => {
    await render(<ListItem title="Sep 3" trailing="80kg" />);
    expect(screen.getByText('80kg')).toBeTruthy();
  });

  // Note: RNTL's fireEvent.press calls the target element's onPress directly rather than
  // simulating React Native's real touch-responder negotiation between nested Pressables, so
  // this confirms the two handlers are wired to distinct elements -- not that real nested-touch
  // isolation holds on-device (that's a well-established RN behavior, not something to reprove).
  it('renders a custom trailing node (e.g. its own pressable icon) wired to its own onPress, not the row\'s', async () => {
    const onPress = jest.fn();
    const onInfoPress = jest.fn();
    await render(
      <ListItem
        title="Bench Press"
        onPress={onPress}
        trailing={
          <Pressable onPress={onInfoPress} testID="info-button">
            <Text>i</Text>
          </Pressable>
        }
      />
    );

    await fireEvent.press(screen.getByTestId('info-button'));

    expect(onInfoPress).toHaveBeenCalled();
    expect(onPress).not.toHaveBeenCalled();
  });
});
