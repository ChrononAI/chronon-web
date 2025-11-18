import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { useEffect } from "react";
import { authService } from "@/services/authService";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, orgSettings, setOrgSettings } = useAuthStore();
  const location = useLocation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  let enabled: boolean;

  if (location.pathname.includes("pre-approvals") ) {
    enabled = orgSettings?.pre_approval_settings?.enabled || false;
  } else if (location.pathname.includes("advances") || location.pathname.includes('/advance_accounts')) {
    enabled = orgSettings?.pre_approval_settings?.enabled || false;
  } else if (location.pathname.includes("admin")) {
    enabled = (orgSettings.admin_dashboard_settings?.enabled && user?.role === "ADMIN");
  } else if (location.pathname.includes('all-reports')) {
    enabled = user?.role === "ADMIN"
  } else {
    enabled = true;
  }

  useEffect(() => {
    if (user) {
      // Fetch both in parallel and merge together to ensure currency is preserved
      Promise.all([
        authService.getOrgData().catch(() => null),
        authService.getOrgSetting().catch(() => null),
      ]).then(([orgDataResponse, orgSettingsResponse]) => {
        const currentSettings = useAuthStore.getState().orgSettings;
        // Merge settings, prioritizing currency from orgData (which has the currency field)
        const mergedSettings = {
          ...currentSettings,
          ...(orgSettingsResponse?.data?.data || {}),
          ...(orgDataResponse?.data || {}), // This should come last to preserve currency
        };
        setOrgSettings(mergedSettings);
      });
    }
  }, [user]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!enabled) {
    return <Navigate to="/permisison-denied" replace />;
  }

  return <>{children}</>;
}
