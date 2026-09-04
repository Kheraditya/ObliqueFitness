import { render, screen, fireEvent } from '@testing-library/react-native';
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
});
