import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useLayoutStore } from '@/store/layoutStore';

export function Layout() {
  const { noPadding } = useLayoutStore();
  return (
    <div className="h-screen flex flex-col relative overflow-hidden">
      <div className="h-screen flex flex-1 overflow-auto">
        <Sidebar />
        <main className="flex-1 bg-white flex overflow-hidden">
          <div className={`flex-1 ${noPadding ? "p-0" : "p-6"}`}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}