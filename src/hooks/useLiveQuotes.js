import { useEffect, useRef, useState } from 'react';
import api from '../lib/api';

// Polling-based "live" price feed via the app's own backend, not a direct
// WebSocket to Finnhub — a raw client-side WS connection would ship the
// Finnhub API token in the public bundle, and this app's backend runs as
// Vercel serverless functions, which can't hold a persistent connection
// open to relay a push feed anyway. Polling through the existing quote
// endpoint gets the same "prices update on their own" result without
// either problem.
//
// Battery/data-friendly by design: pauses entirely (not just skipping the
// fetch) while the tab/app is backgrounded via the Page Visibility API,
// and always stops on unmount — the practical equivalent of a
// WebSocket's subscribe-on-open / unsubscribe-on-close lifecycle.
export default function useLiveQuotes(symbols, intervalMs) {
  const [quotesBySymbol, setQuotesBySymbol] = useState({});
  const key = symbols.filter(Boolean).join(',');
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!key) return undefined;
    let cancelled = false;

    const fetchQuotes = () => {
      Promise.all(
        key
          .split(',')
          .map((symbol) =>
            api
              .get(`/stocks/${symbol}/quote`)
              .then((res) => [symbol, res.data])
              .catch(() => [symbol, null])
          )
      ).then((entries) => {
        if (cancelled) return;
        setQuotesBySymbol((prev) => {
          const next = { ...prev };
          entries.forEach(([symbol, data]) => {
            if (data) next[symbol] = data;
          });
          return next;
        });
      });
    };

    const start = () => {
      if (intervalRef.current) return;
      intervalRef.current = setInterval(fetchQuotes, intervalMs);
    };
    const stop = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    const handleVisibility = () => {
      if (document.hidden) {
        stop();
      } else {
        fetchQuotes(); // catch up immediately on return instead of waiting a full interval
        start();
      }
    };

    if (!document.hidden) start();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      cancelled = true;
      stop();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [key, intervalMs]);

  return quotesBySymbol;
}
