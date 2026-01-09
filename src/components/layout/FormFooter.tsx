import { useAuthStore } from "@/store/authStore";
import React from "react";
import { useLocation } from "react-router-dom";
interface FormFooterProps {
  children: React.ReactNode;
  height?: string;
}

export const FormFooter: React.FC<FormFooterProps> = ({
  children,
  height = "h-20",
}) => {
  const { sidebarCollapsed } = useAuthStore();
  const { pathname } = useLocation();
  const isAdmin = pathname.includes("admin-settings");
  const getWidth = () => {
    if (isAdmin) {
      if (sidebarCollapsed) {
        return "md:left-[320px]";
      } else {
        return "md:left-[528px]";
      }
    } else {
      if (sidebarCollapsed) {
        return "md:left-[48px]";
      } else {
        return "md:left-[256px]";
      }
    }
  };
  return (
    <>
      <div className={height} />

      <div
        className={`pointer-events-none fixed bottom-0 right-0 left-0 ${getWidth()} z-30`}
      >
        <div className="pointer-events-auto flex w-full justify-end gap-4 border-t border-gray-200 bg-white px-6 py-5">
          {children}
        </div>
      </div>
    </>
  );
};
