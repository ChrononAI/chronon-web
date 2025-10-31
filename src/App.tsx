import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { LoginPage } from '@/pages/LoginPage';
import { ExpenseDetailPage } from '@/pages/ExpenseDetailPage';
import { MyReportsPage } from '@/pages/MyReportsPage';
import { ReportDetailPage } from '@/pages/ReportDetailPage';
import { MyAdvancesPage } from '@/pages/MyAdvancesPage';
import { CreateAdvancePage } from '@/pages/CreateAdvancePage';
import { CreateReportPage } from '@/pages/CreateReportPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { ApprovalsReportsPage } from '@/pages/ApprovalsReportsPage';
import { AllReportsPage } from '@/pages/AllReportsPage';
import { ApprovalRulesPage } from '@/pages/ApprovalRulesPage';
import { PaymentPage } from '@/pages/PaymentPage';
import { OrganizationSetupPage } from '@/pages/OrganizationSetupPage';
import UploadPolicyPage from '@/pages/UploadPolicyPage';
import QueryBuilderDemoPage from '@/pages/QueryBuilderDemoPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { PermissionDeniedPage } from '@/pages/PermissionDeniedPage';
import { MyExpensesPage } from '@/pages/MyExpensesPage';
import { UnifiedExpensesPage } from "@/pages/UnifiedExpensesPage"
import { AccountPage } from '@/pages/AccountPage';

// Simple redirect component with toast notification
function AdvancesRedirect() {
  const navigate = useNavigate();
  
  React.useEffect(() => {
    toast.info('Advances management is now part of My Expenses');
    navigate('/expenses', { replace: true });
  }, [navigate]);
  
  return null;
}

function App() {
  return (
    <>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/expenses"
            element={
              <ProtectedRoute>
                <MyExpensesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/expenses/create"
            element={
              <ProtectedRoute>
                <UnifiedExpensesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/expenses/:id"
            element={
              <ProtectedRoute>
                <ExpenseDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <MyReportsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports/create"
            element={
              <ProtectedRoute>
                <CreateReportPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports/:id"
            element={
              <ProtectedRoute>
                <ReportDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/advances"
            element={
              <ProtectedRoute>
                <MyAdvancesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/advances/create"
            element={
              <ProtectedRoute>
                <CreateAdvancePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/approvals/reports"
            element={
              <ProtectedRoute>
                <ApprovalsReportsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/approvals/advances"
            element={
              <ProtectedRoute>
                <AdvancesRedirect />
              </ProtectedRoute>
            }
          />
          <Route
            path="/all-reports"
            element={
              <ProtectedRoute>
                <AllReportsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/approval-rules"
            element={
              <ProtectedRoute>
                <ApprovalRulesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payment"
            element={
              <ProtectedRoute>
                <PaymentPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/organization/setup"
            element={
              <ProtectedRoute>
                <OrganizationSetupPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/policy"
            element={
              <ProtectedRoute>
                <UploadPolicyPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/policy/builder"
            element={
              <ProtectedRoute>
                <QueryBuilderDemoPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          
          <Route path="/account/password-reset" element={<AccountPage />} />
          {/* <Route
            path="/report/expenses/:id"
            element={
              <ProtectedRoute>
                <ExpenseDetailPage />
              </ProtectedRoute>
            }
          /> */}
          <Route path="/" element={<Navigate to="/expenses" replace />} />
          <Route path="/404" element={<NotFoundPage />} />
          <Route path="/permission-denied" element={<PermissionDeniedPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Router>
      <Toaster />
    </>
  );
}

export default App;