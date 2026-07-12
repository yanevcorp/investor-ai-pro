import { Outlet, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import BottomNav from '../components/BottomNav';
import InstallBanner from '../components/InstallBanner';
import ErrorBoundary from '../components/ErrorBoundary';

export default function MainLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-slate-900">
      <Navbar />
      <InstallBanner />
      <div className="pb-16 md:pb-0">
        {/* Keyed on the path so navigating away from a crashed page mounts
            a fresh boundary instead of getting stuck on the fallback —
            the same key also remounts the fade-in wrapper below, so every
            route change replays the transition. */}
        <ErrorBoundary key={location.pathname}>
          <div key={location.pathname} className="animate-page-in">
            <Outlet />
          </div>
        </ErrorBoundary>
      </div>
      <BottomNav />
    </div>
  );
}
