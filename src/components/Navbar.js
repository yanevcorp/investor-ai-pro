import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const links = [
  { to: '/', label: 'Home' },
  { to: '/portfolio', label: 'Portfolio' },
  { to: '/screener', label: 'Screener' },
  { to: '/bottlenecks', label: 'Bottleneck' },
  { to: '/alerts', label: 'Alerts' },
  { to: '/watchlist', label: 'Watchlist' },
];

export default function Navbar() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const handleAvatarClick = () => {
    if (user) {
      logout();
      navigate('/');
    } else {
      navigate('/login');
    }
  };

  const initials = user?.username ? user.username.slice(0, 2).toUpperCase() : null;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-16 bg-slate-900/90 backdrop-blur border-b border-slate-800">
      <div className="max-w-7xl mx-auto h-full px-4 flex items-center justify-between">
        <NavLink to="/" className="flex items-center gap-2 text-lg font-bold text-white shrink-0">
          <span>📊</span>
          <span>InvestorAI Pro</span>
        </NavLink>

        <div className="hidden md:flex items-center gap-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </div>

        <button
          onClick={handleAvatarClick}
          className="flex items-center justify-center w-9 h-9 rounded-full bg-blue-600 text-white text-sm font-semibold hover:bg-blue-500 transition-colors shrink-0"
          title={user ? `${user.username} (${user.email}) — кликни за изход` : 'Вход'}
        >
          {initials || '👤'}
        </button>
      </div>
    </nav>
  );
}
