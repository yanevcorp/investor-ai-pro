import { NavLink } from 'react-router-dom';

const links = [
  { to: '/', label: 'Home', icon: '🏠' },
  { to: '/portfolio', label: 'Portfolio', icon: '💼' },
  { to: '/screener', label: 'Screener', icon: '🧮' },
  { to: '/bottlenecks', label: 'Bottleneck', icon: '⚠️' },
  { to: '/alerts', label: 'Alerts', icon: '🔔' },
  { to: '/watchlist', label: 'Watchlist', icon: '⭐' },
];

export default function BottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 h-16 bg-slate-900/95 backdrop-blur border-t border-slate-800 pb-[env(safe-area-inset-bottom)]">
      <div className="h-16 grid grid-cols-6">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${
                isActive ? 'text-blue-400' : 'text-slate-400'
              }`
            }
          >
            <span className="text-lg leading-none">{link.icon}</span>
            <span>{link.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
