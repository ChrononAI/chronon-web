import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { orgSettings } = useAuthStore();
  const location = useLocation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  let enabled: boolean;

  if (location.pathname.includes('pre-approvals')) {
    enabled = orgSettings?.pre_approval_settings?.enabled || false;
  } else if (location.pathname.includes('advances')) {
    enabled = orgSettings?.pre_approval_settings?.enabled || false;
  } else if (location.pathname.includes('admin')) {
    enabled = orgSettings?.admin_dashboard_settings?.enabled || false;
  } else {
    enabled = true;
  }

  if (!enabled) {
    return <Navigate to="/permisison-denied" replace />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
