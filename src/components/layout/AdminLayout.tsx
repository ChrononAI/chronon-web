import { useEffect } from "react";
import AdminSidebar from "../admin/AdminSidebar";
import { useLayoutStore } from "@/store/layoutStore";
import { Outlet } from "react-router-dom";

function AdminLayout() {
  const setNoPadding = useLayoutStore((s) => s.setNoPadding);

  useEffect(() => {
    setNoPadding(true);

    return () => {
      setNoPadding(false);
    };
  }, []);

  return (
    <div className="h-screen flex flex-col relative">
      <div className="flex flex-1 overflow-hidden">
        <AdminSidebar />
        <main className="flex-1 overflow-y-auto bg-white">
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
