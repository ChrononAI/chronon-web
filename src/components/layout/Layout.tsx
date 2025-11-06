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
        <main className="flex-1 overflow-y-auto bg-white">
          <div className={noPadding ? "p-0" : "p-6"}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}