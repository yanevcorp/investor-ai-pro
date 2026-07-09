import { Link } from 'react-router-dom';
import { watchlist, stocks } from '../data/mockData';
import { Card, VerdictBadge } from '../components/ui';

export default function WatchlistPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] pt-20 px-4 pb-16">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-6">Watchlist</h1>

        <div className="space-y-3">
          {watchlist.map((sym) => {
            const stock = stocks[sym];
            if (!stock) return null;
            const isPositive = stock.change >= 0;
            return (
              <Link key={sym} to={`/analysis/${sym}`}>
                <Card className="hover:border-slate-600 transition-colors">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-white font-semibold">{stock.symbol}</div>
                      <div className="text-sm text-slate-500">{stock.name}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-medium">${stock.price.toFixed(2)}</div>
                      <div className={`text-sm ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                        {isPositive ? '▲' : '▼'} {Math.abs(stock.changePercent).toFixed(2)}%
                      </div>
                    </div>
                    <VerdictBadge verdict={stock.verdict} />
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
