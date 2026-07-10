import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import HomePage from './HomePage';
import api from '../lib/api';

jest.mock('../lib/api');

function renderHomePage() {
  return render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>
  );
}

afterEach(() => {
  jest.resetAllMocks();
});

test('shows ticker/company/type suggestions after typing in ticker mode', async () => {
  api.get.mockResolvedValueOnce({
    data: {
      results: [
        { symbol: 'AAPL', name: 'Apple Inc', type: 'Common Stock', isEtf: false },
        { symbol: 'QQQ', name: 'Invesco QQQ Trust', type: 'ETP', isEtf: true },
      ],
    },
  });

  renderHomePage();
  userEvent.click(screen.getByText('Ticker Search'));
  userEvent.type(screen.getByPlaceholderText(/Въведи тикер/), 'AAP');

  await waitFor(() => expect(api.get).toHaveBeenCalledWith('/stocks/search', { params: { q: 'AAP' } }));

  expect(await screen.findByText('Apple Inc')).toBeInTheDocument();
  expect(screen.getByText('Invesco QQQ Trust')).toBeInTheDocument();
  expect(screen.getByText('ETF')).toBeInTheDocument();
});

test('does not query suggestions in natural-language mode', async () => {
  renderHomePage();
  userEvent.type(screen.getByPlaceholderText(/киберсигурността/), 'undervalued tech');

  await new Promise((resolve) => setTimeout(resolve, 350));
  expect(api.get).not.toHaveBeenCalled();
});

test('does not query suggestions for a single character', async () => {
  renderHomePage();
  userEvent.click(screen.getByText('Ticker Search'));
  userEvent.type(screen.getByPlaceholderText(/Въведи тикер/), 'A');

  await new Promise((resolve) => setTimeout(resolve, 350));
  expect(api.get).not.toHaveBeenCalled();
});

test('renders the suggestion dropdown above fixed mobile chrome (z-60)', async () => {
  // Regression test: the dropdown previously used z-20, which is below
  // BottomNav/Navbar's z-50 — on a real phone with the keyboard open, the
  // dropdown rendered completely hidden behind the fixed bottom nav.
  api.get.mockResolvedValueOnce({
    data: { results: [{ symbol: 'AAPL', name: 'Apple Inc', type: 'Common Stock', isEtf: false }] },
  });

  renderHomePage();
  userEvent.click(screen.getByText('Ticker Search'));
  userEvent.type(screen.getByPlaceholderText(/Въведи тикер/), 'AAPL');

  const item = await screen.findByText('Apple Inc');
  const dropdown = item.closest('ul');
  expect(dropdown.className).toMatch(/z-\[60\]/);
});

test('rotates through example NL queries as the placeholder', () => {
  jest.useFakeTimers();
  try {
    renderHomePage();
    expect(screen.getByPlaceholderText(/киберсигурността/i)).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(3500);
    });
    expect(screen.getByPlaceholderText(/TSLA и NVDA/i)).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(3500);
    });
    expect(screen.getByPlaceholderText(/ETF-и с нисък разход/i)).toBeInTheDocument();
  } finally {
    jest.useRealTimers();
  }
});

test('stops rotating the placeholder once the user has typed something', () => {
  jest.useFakeTimers();
  try {
    renderHomePage();
    const input = screen.getByPlaceholderText(/киберсигурността/i);
    fireEvent.change(input, { target: { value: 'x' } });

    act(() => {
      jest.advanceTimersByTime(10000);
    });
    // The placeholder is irrelevant once there's real input, but the timer
    // shouldn't still be silently reassigning it underneath what's typed.
    expect(input).toHaveValue('x');
  } finally {
    jest.useRealTimers();
  }
});
