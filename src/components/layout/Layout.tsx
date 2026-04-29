import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { MobileNav } from './MobileNav';
import { LembreteBackup } from '../LembreteBackup';
import { useRealtime } from '../../hooks/useRealtime';

export function Layout() {
  useRealtime();

  return (
    <div className="min-h-screen flex bg-bg">
      <Sidebar className="hidden md:flex" />
      <div className="flex-1 flex flex-col min-w-0">
        <MobileNav className="md:hidden" />
        <TopBar />
        <main className="flex-1 p-6 md:p-8 overflow-auto">
          <Outlet />
        </main>
      </div>
      <LembreteBackup />
    </div>
  );
}
