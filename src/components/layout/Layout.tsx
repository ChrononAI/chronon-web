import { Sidebar } from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
  noPadding?: boolean;
}

export function Layout({ children, noPadding }: LayoutProps) {
  return (
    <div className="h-screen flex flex-col relative overflow-hidden">
      <div className="h-screen flex flex-1 overflow-auto">
        <Sidebar />
        <main className="flex-1 bg-white flex overflow-hidden">
          <div className={`flex-1 ${noPadding ? "p-0" : "p-6"} overflow-auto`}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}