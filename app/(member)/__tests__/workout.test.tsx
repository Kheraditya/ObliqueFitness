import { render, screen, waitFor } from '@testing-library/react-native';

jest.mock('../../../src/features/routines/api', () => ({
  listRoutines: jest.fn(),
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));

import { listRoutines } from '../../../src/features/routines/api';
import Workout from '../workout';

describe('Workout', () => {
  it('renders the routines list once loaded', async () => {
    (listRoutines as jest.Mock).mockResolvedValue([{ id: 'r1', name: 'Push Day' }]);

    await render(<Workout />);

    await waitFor(() => expect(screen.getByText('Push Day')).toBeTruthy());
  });
});
