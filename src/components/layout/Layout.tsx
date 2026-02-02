import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { useLayoutStore } from "@/store/layoutStore";
import { TooltipProvider } from "../ui/tooltip";

export function Layout() {
  const { noPadding } = useLayoutStore();

  return (
    <TooltipProvider>
      <div className="h-screen flex flex-col relative overflow-hidden">
        <div className="h-screen flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 bg-white flex overflow-auto min-w-0">
            <div className={`flex-1 min-w-0 ${noPadding ? "p-0" : "p-6"}`}>
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
