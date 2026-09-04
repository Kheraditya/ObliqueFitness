import { render, screen, fireEvent } from '@testing-library/react-native';
import { PillTabs } from '../PillTabs';

describe('PillTabs', () => {
  it('renders all options and calls onChange when a different one is pressed', async () => {
    const onChange = jest.fn();
    await render(
      <PillTabs
        options={[
          { key: 'volume', label: 'Volume' },
          { key: 'reps', label: 'Reps' },
        ]}
        value="volume"
        onChange={onChange}
      />
    );
    expect(screen.getByText('Volume')).toBeTruthy();
    expect(screen.getByText('Reps')).toBeTruthy();
    await fireEvent.press(screen.getByText('Reps'));
    expect(onChange).toHaveBeenCalledWith('reps');
  });
});
