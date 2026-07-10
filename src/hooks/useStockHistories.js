import { useEffect, useState } from 'react';
import api from '../lib/api';

// Shared by Watchlist and Portfolio pages, both of which need per-symbol
// sparkline/drawdown data for a small, user-curated list of symbols.
export default function useStockHistories(symbols) {
  const [historiesBySymbol, setHistoriesBySymbol] = useState({});
  const key = symbols.join(',');

  useEffect(() => {
    if (!key) {
      setHistoriesBySymbol({});
      return;
    }
    let cancelled = false;

    Promise.all(
      key
        .split(',')
        .map((symbol) =>
          api
            .get(`/stocks/${symbol}/history`)
            .then((res) => [symbol, res.data])
            .catch(() => [symbol, null])
        )
    ).then((entries) => {
      if (cancelled) return;
      const map = {};
      entries.forEach(([symbol, data]) => {
        if (data) map[symbol] = data;
      });
      setHistoriesBySymbol(map);
    });

    return () => {
      cancelled = true;
    };
  }, [key]);

  return historiesBySymbol;
}
