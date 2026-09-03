import { render, screen } from '@testing-library/react-native';
import Index from '../app/index';

describe('app/index', () => {
  it('renders without crashing', () => {
    render(<Index />);
    expect(screen).toBeDefined();
  });
});
