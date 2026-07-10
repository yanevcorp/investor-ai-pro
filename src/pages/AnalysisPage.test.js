import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import AnalysisPage from './AnalysisPage';
import api from '../lib/api';

jest.mock('../lib/api');

function renderAnalysisPage(symbol) {
  return render(
    <MemoryRouter initialEntries={[`/analysis/${symbol}`]}>
      <Routes>
        <Route path="/analysis/:symbol" element={<AnalysisPage />} />
      </Routes>
    </MemoryRouter>
  );
}

afterEach(() => {
  jest.resetAllMocks();
});

test('renders full stock data', async () => {
  api.get.mockResolvedValueOnce({
    data: {
      stock: {
        symbol: 'TEST',
        name: 'Test Corp',
        sector: 'Technology',
        price: 123.45,
        change: 1.5,
        changePercent: 1.23,
        verdict: 'BUY',
        aiScore: 70,
        analysis: {
          xaiReasons: [{ label: 'Growth', points: 10, positive: true }],
          probability: { '1W': { up: 50, flat: 30, down: 20 } },
          overview: [{ label: 'Cap', value: '$1B', good: true }],
          news: [{ title: 'Headline', url: 'https://x.com', source: 'X', publishedAt: '2026-01-01T00:00:00Z' }],
        },
      },
    },
  });

  renderAnalysisPage('TEST');

  expect(await screen.findByText('TEST')).toBeInTheDocument();
  expect(screen.getByText('$123.45')).toBeInTheDocument();
});

test('renders without crashing when price/change/analysis are missing', async () => {
  api.get.mockResolvedValueOnce({
    data: {
      stock: {
        symbol: 'INCOMPLETE',
        name: 'Incomplete Corp',
        verdict: 'HOLD',
        // price, change, changePercent, aiScore, analysis all absent
      },
    },
  });

  renderAnalysisPage('INCOMPLETE');

  expect(await screen.findByText('INCOMPLETE')).toBeInTheDocument();
  expect(screen.getAllByText('N/A').length).toBeGreaterThanOrEqual(1);
});

test('renders without crashing when analysis arrays contain null/malformed entries', async () => {
  api.get.mockResolvedValueOnce({
    data: {
      stock: {
        symbol: 'MALFORMED',
        name: 'Malformed Corp',
        price: 10,
        change: 0.1,
        changePercent: 1,
        verdict: 'HOLD',
        aiScore: 50,
        analysis: {
          xaiReasons: [null, { label: 'ok', points: 5, positive: true }, undefined],
          overview: [null, undefined, {}],
          news: [null, { title: 'Real headline', url: 'https://x.com' }],
        },
      },
    },
  });

  renderAnalysisPage('MALFORMED');

  expect(await screen.findByText('MALFORMED')).toBeInTheDocument();
  expect(screen.getByText('ok')).toBeInTheDocument();
});

test('shows not-found state on a 404 response', async () => {
  api.get.mockRejectedValueOnce({ response: { status: 404 } });

  renderAnalysisPage('MISSING');

  expect(await screen.findByText(/Няма данни за/)).toBeInTheDocument();
});

test('shows a retryable error state on network/server failure', async () => {
  api.get.mockRejectedValueOnce(new Error('Network Error'));

  renderAnalysisPage('DOWN');

  expect(await screen.findByText(/Неуспешно зареждане на/)).toBeInTheDocument();
  expect(screen.getByText('Опитай отново')).toBeInTheDocument();
});

test('shows an error state when the response has no stock payload', async () => {
  api.get.mockResolvedValueOnce({ data: {} });

  renderAnalysisPage('EMPTY');

  expect(await screen.findByText(/Неуспешно зареждане на/)).toBeInTheDocument();
});
