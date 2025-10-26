import { Header } from './Header';
import { Sidebar } from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="h-screen flex flex-col relative">
      {/* <Header /> */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-muted/30">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
      {/* Vertical line extending from sidebar up into header */}
      <div className="absolute top-0 left-64 w-px h-full bg-border z-10"></div>
    </div>
  );
}