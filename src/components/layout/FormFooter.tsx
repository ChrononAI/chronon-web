import { useAuthStore } from "@/store/authStore";
import React from "react";

interface FormFooterProps {
  children: React.ReactNode;
  height?: string;
}

export const FormFooter: React.FC<FormFooterProps> = ({
  children,
  height = "h-20",
}) => {
    const {sidebarCollapsed} = useAuthStore();
  return (
    <>
      {/* Spacer so content doesn't get hidden behind footer */}
      <div className={height} />

      {/* Fixed footer */}
      <div className={`pointer-events-none fixed bottom-0 right-0 left-0 ${sidebarCollapsed ? "md:left-12" : "md:left-64"} z-30`}>
        <div className="pointer-events-auto flex w-full justify-end gap-4 border-t border-gray-200 bg-white px-12 py-5">
          {children}
        </div>
      </div>
    </>
  );
};
