import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DisclaimerModal from './DisclaimerModal';

const KEY = 'investorai-disclaimer-accepted';

afterEach(() => {
  localStorage.clear();
});

test('shows the disclaimer on first visit and accepting dismisses it', async () => {
  render(<DisclaimerModal />);

  expect(await screen.findByText(/НЕ представлява/)).toBeInTheDocument();

  userEvent.click(screen.getByRole('button', { name: 'Разбрах' }));

  expect(screen.queryByText(/НЕ представлява/)).not.toBeInTheDocument();
  expect(localStorage.getItem(KEY)).toBe('1');
});

test('does not show again once already accepted', () => {
  localStorage.setItem(KEY, '1');
  render(<DisclaimerModal />);

  expect(screen.queryByText(/НЕ представлява/)).not.toBeInTheDocument();
});
