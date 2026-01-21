import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { useEffect } from "react";
import { authService } from "@/services/authService";

export function ProtectedRoute() {
  const { user, orgSettings, setOrgSettings } = useAuthStore();
  const location = useLocation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  let enabled: boolean;

  if (location.pathname.includes("pre-approvals") ) {
    enabled = orgSettings?.pre_approval_settings?.enabled || false;
  } else if (location.pathname.includes("advances") || location.pathname.includes('/advance_accounts')) {
    enabled = orgSettings?.advance_settings?.enabled || false;
  } else if (location.pathname.includes("transactions")) {
    enabled = orgSettings.mobile_payment_settings.enabled;
  } else if (location.pathname.includes("admin-settings")) {
    enabled = (orgSettings.admin_dashboard_settings?.enabled && user?.role === "SUPER_ADMIN");
  } else if (location.pathname.includes("/admin/")) {
    if (location.pathname.includes("admin-reports")) {
      enabled = orgSettings?.admin_approval_settings?.enabled && (user?.role === "ADMIN" || user?.role === "SUPER_ADMIN");
    } else {
      enabled = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";
    }
  } else if (location.pathname.includes('all-reports')) {
    enabled = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";
  } else if (location.pathname.includes("stores")) {
    enabled = orgSettings.store_settings?.enabled || false;
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
        const newSettings = { ...orgSettingsResponse?.data?.data, store_settings: { enabled: true, allowed: true } }
        // Merge settings, prioritizing currency from orgData (which has the currency field)
        const mergedSettings = {
          ...currentSettings,
          // ...(orgSettingsResponse?.data?.data || {}),
          ...newSettings,
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
    return <Navigate to="/permission-denied" replace />;
  }

  return <Outlet />;
}
