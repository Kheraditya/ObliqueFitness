import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

jest.mock('../../api', () => ({
  listShareRecipients: jest.fn(),
  shareRoutine: jest.fn(),
}));

import { listShareRecipients, shareRoutine } from '../../api';
import { ShareRoutineModal } from '../ShareRoutineModal';

describe('ShareRoutineModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (listShareRecipients as jest.Mock).mockResolvedValue([
      { id: 'user-2', name: 'Sam', email: 'sam@example.com' },
    ]);
  });

  it('shows same-gym recipients and shares a copy with the selected person', async () => {
    (shareRoutine as jest.Mock).mockResolvedValue({ routineId: 'copy-1', error: null });
    await render(
      <ShareRoutineModal visible routineId="routine-1" routineName="Push Day" onClose={jest.fn()} />
    );

    await waitFor(() => expect(screen.getByText('Sam')).toBeTruthy());
    await act(async () => {
      fireEvent.press(screen.getByText('Share'));
    });

    await waitFor(() => expect(shareRoutine).toHaveBeenCalledWith('routine-1', 'user-2'));
    expect(screen.getByText('Shared with Sam')).toBeTruthy();
  });
});
