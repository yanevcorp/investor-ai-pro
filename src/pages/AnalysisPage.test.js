import { render, screen, waitFor } from '@testing-library/react';
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

test('shows an ETF badge, Holdings tab label, and market session label for an ETF', async () => {
  api.get.mockResolvedValueOnce({
    data: {
      stock: {
        symbol: 'QQQ',
        name: 'Invesco QQQ Trust',
        price: 500,
        change: -1.2,
        changePercent: -0.24,
        verdict: 'HOLD',
        aiScore: 55,
        isEtf: true,
        marketSession: 'after-hours',
        analysis: {
          overview: [{ label: 'Разходен коефициент (TER)', value: '0.20%', good: true }],
          financials: [{ label: 'NVIDIA CORP', value: '9.1%', good: true }],
        },
      },
    },
  });

  renderAnalysisPage('QQQ');

  expect(await screen.findByText('QQQ')).toBeInTheDocument();
  expect(screen.getByText('ETF')).toBeInTheDocument();
  expect(screen.getByText('Holdings')).toBeInTheDocument();
  expect(screen.getByText('След борсата')).toBeInTheDocument();
});

test('does not show an ETF badge or session label for a regular equity', async () => {
  api.get.mockResolvedValueOnce({
    data: {
      stock: {
        symbol: 'AAPL',
        name: 'Apple Inc',
        price: 200,
        change: 1,
        changePercent: 0.5,
        verdict: 'BUY',
        aiScore: 80,
        isEtf: false,
        marketSession: 'regular',
        analysis: { overview: [{ label: 'P/E', value: '30', good: true }] },
      },
    },
  });

  renderAnalysisPage('AAPL');

  expect(await screen.findByText('AAPL')).toBeInTheDocument();
  expect(screen.queryByText('ETF')).not.toBeInTheDocument();
  expect(screen.getByText('Financials')).toBeInTheDocument();
  expect(screen.queryByText('След борсата')).not.toBeInTheDocument();
  expect(screen.queryByText('Преди борсата')).not.toBeInTheDocument();
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

test('renders without crashing when fields that should be strings are objects', async () => {
  // Optional chaining guards against missing fields, but not against a
  // field existing with the wrong type — React throws "Objects are not
  // valid as a React child" if one of these is ever rendered directly.
  api.get.mockResolvedValueOnce({
    data: {
      stock: {
        symbol: { unexpected: 'shape' },
        name: { unexpected: 'shape' },
        sector: { unexpected: 'shape' },
        price: 10,
        change: 0.1,
        changePercent: 1,
        verdict: { unexpected: 'shape' },
        aiScore: 50,
        analysis: {
          xaiReasons: [{ label: { unexpected: 'shape' }, points: 5, positive: true }],
          overview: [{ label: { unexpected: 'shape' }, value: { unexpected: 'shape' }, good: true }],
          news: [{ title: { unexpected: 'shape' }, source: { unexpected: 'shape' }, url: 'https://x.com' }],
        },
      },
    },
  });

  renderAnalysisPage('WEIRD');

  // Falls back to the route param instead of crashing on the malformed symbol.
  expect(await screen.findByText('WEIRD')).toBeInTheDocument();
  expect(screen.getAllByText('N/A').length).toBeGreaterThanOrEqual(1);
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

describe('with a real ResizeObserver (recharts measurement path)', () => {
  // jsdom has no ResizeObserver by default, so recharts' ResponsiveContainer
  // silently no-ops its measurement effect and every test above renders
  // without ever exercising that code — which is exactly how the original
  // mobile-only crash slipped through undetected. Polyfilling it here
  // forces the real measurement/render path recharts uses in an actual
  // browser (mobile included).
  let originalResizeObserver;

  beforeEach(() => {
    originalResizeObserver = global.ResizeObserver;
    global.ResizeObserver = class {
      constructor(callback) {
        this.callback = callback;
      }
      observe(target) {
        Promise.resolve().then(() => {
          this.callback([{ target, contentRect: { width: 320, height: 260 } }]);
        });
      }
      unobserve() {}
      disconnect() {}
    };
  });

  afterEach(() => {
    global.ResizeObserver = originalResizeObserver;
  });

  test('renders the probability chart without tripping its error boundary', async () => {
    api.get.mockResolvedValueOnce({
      data: {
        stock: {
          symbol: 'RESIZE',
          name: 'Resize Corp',
          price: 50,
          change: 1,
          changePercent: 2,
          verdict: 'BUY',
          aiScore: 60,
          analysis: {
            xaiReasons: [{ label: 'Growth', points: 10, positive: true }],
            probability: { '1W': { up: 50, flat: 30, down: 20 }, '1M': { up: 55, flat: 25, down: 20 }, '3M': { up: 60, flat: 20, down: 20 } },
            overview: [{ label: 'Cap', value: '$1B', good: true }],
          },
        },
      },
    });

    const { container } = renderAnalysisPage('RESIZE');

    expect(await screen.findByText('RESIZE')).toBeInTheDocument();

    await waitFor(() => {
      expect(container.querySelector('.recharts-wrapper')).toBeInTheDocument();
    });
    expect(screen.queryByText('Графиката не можа да се зареди.')).not.toBeInTheDocument();
  });
});
