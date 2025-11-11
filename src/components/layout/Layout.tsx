import { Sidebar } from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
  noPadding?: boolean;
}

export function Layout({ children, noPadding }: LayoutProps) {
  return (
    <div className="h-screen flex flex-col relative">
      {/* <Header /> */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 bg-white flex overflow-hidden">
          <div className={`flex-1 ${noPadding ? "p-0" : "p-6"} overflow-hidden`}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}