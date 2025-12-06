import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { useLayoutStore } from "@/store/layoutStore";

export function Layout() {
  const { noPadding } = useLayoutStore();
  const location = useLocation();
  const isOverFlowHidden = location.pathname.includes("/expenses");

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="h-screen flex">
        <Sidebar />
        <main className="flex-1 bg-white flex flex-col overflow-auto min-w-0">
          <div
            className={`flex-1 min-w-0 ${
              isOverFlowHidden && "overflow-hidden"
            } ${noPadding ? "p-0" : "p-6"}`}
          >
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
