import React from "react";
import AdminSidebar from "../admin/AdminSidebar";

interface AdminLayoutProps {
    children?: React.ReactNode
}

function AdminLayout({ children }: AdminLayoutProps) {
    return (
        <div className="h-screen flex flex-col relative">
            <div className="flex flex-1 overflow-hidden">
                <AdminSidebar />
                <main className="flex-1 overflow-y-auto bg-white">
                    <div className="p-6">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    )
}

export default AdminLayout