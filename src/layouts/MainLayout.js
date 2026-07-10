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
            a fresh boundary instead of getting stuck on the fallback. */}
        <ErrorBoundary key={location.pathname}>
          <Outlet />
        </ErrorBoundary>
      </div>
      <BottomNav />
    </div>
  );
}
