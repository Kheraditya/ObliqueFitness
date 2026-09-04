import { render, screen } from '@testing-library/react-native';
import { VictoryChart, VictoryBar, VictoryAxis, VictoryTheme } from 'victory-native';

describe('victory-native smoke test', () => {
  it('renders a basic bar chart without crashing', async () => {
    await render(
      <VictoryChart theme={VictoryTheme.material}>
        <VictoryAxis />
        <VictoryAxis dependentAxis />
        <VictoryBar data={[{ x: 'Mon', y: 10 }, { x: 'Tue', y: 20 }]} />
      </VictoryChart>
    );
    expect(screen.toJSON()).not.toBeNull();
  });
});
