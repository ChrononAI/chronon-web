import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { useEffect } from "react";
import { authService } from "@/services/authService";

export function ProtectedRoute() {
  const { user, orgSettings, setOrgSettings, selectedProduct, products } = useAuthStore();
  const location = useLocation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  
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
          ...(orgDataResponse?.data || {}),
        };
        setOrgSettings(mergedSettings);
      });
    }
  }, [user, setOrgSettings]);
  
  const isInvoiceRoute = location.pathname.startsWith('/flow') || 
                         location.pathname.includes('/invoice') || 
                         location.pathname.includes('/vendors');
  const isExpenseRoute = location.pathname.startsWith('/expenses') || 
                         location.pathname.startsWith('/reports') ||
                         location.pathname.startsWith('/requests') ||
                         location.pathname.startsWith('/approvals') ||
                         location.pathname.startsWith('/transactions') ||
                         location.pathname.startsWith('/advance_accounts') ||
                         location.pathname.startsWith('/admin/settlements') ||
                         (location.pathname.startsWith('/admin-settings') && !location.pathname.includes('/flow'));
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (selectedProduct) {
    if (isInvoiceRoute && selectedProduct !== "Invoice Payments") {
      return <Navigate to="/permission-denied" replace />;
    }
    if (isExpenseRoute && selectedProduct !== "Expense Management") {
      return <Navigate to="/permission-denied" replace />;
    }
  } else if (products.length > 1) {
    if (location.pathname !== '/select-product') {
      return <Navigate to="/select-product" replace />;
    }
  }
  
  let enabled: boolean;

  if (location.pathname.includes("pre-approvals") ) {
    enabled = orgSettings?.pre_approval_settings?.enabled || false;
  } else if (location.pathname.includes("advances") || location.pathname.includes('/advance_accounts')) {
    enabled = orgSettings?.advance_settings?.enabled || false;
  } else if (location.pathname.includes("transactions")) {
    enabled = orgSettings.mobile_payment_settings.enabled;
  } else if (location.pathname.includes("admin-settings")) {
    enabled = (orgSettings.admin_dashboard_settings?.enabled && user?.role === "SUPER_ADMIN");
  } else if (location.pathname.includes('all-reports')) {
    enabled = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";
  } else if (location.pathname.includes("stores")) {
    enabled = orgSettings.store_settings?.enabled || false;
  } else {
    enabled = true;
  }

  if (!enabled) {
    return <Navigate to="/permission-denied" replace />;
  }

  return <Outlet />;
}
