import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import BottomNav from '../components/BottomNav';
import InstallBanner from '../components/InstallBanner';

export default function MainLayout() {
  return (
    <div className="min-h-screen bg-slate-900">
      <Navbar />
      <InstallBanner />
      <div className="pb-16 md:pb-0">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  );
}
