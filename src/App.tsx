import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
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
import PreApprovalPage from './pages/PreApprovalPage';
import CreatePreApprovalPage from './pages/CreatePreApprovalPage';
import PreApprovalDetailsPage from './pages/PreApprovalDetailsPage';
import ApprovalsPreApprovalsPage from './pages/ApprovalsPreApprovalsPage';
import ProcessPreApprovalPage from './pages/ProcessPreApprovalPage';
import AdvanceDetailsPage from './pages/AdvanceDetailsPage';
import ApprovalsAdvancesPage from './pages/ApprovalsAdvancesPage';
import ProcessAdvancePage from './pages/ProcessAdvancePage';
import AdminPage from './pages/admin/AdminPage';

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
            path="/pre-approvals"
            element={
              <ProtectedRoute>
                <PreApprovalPage />
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
            path="/advances/:id"
            element={
              <ProtectedRoute>
                <AdvanceDetailsPage />
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
                <ApprovalsAdvancesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/approvals/advances/:id"
            element={
              <ProtectedRoute>
                <ProcessAdvancePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/approvals/pre-approvals"
            element={
              <ProtectedRoute>
                <ApprovalsPreApprovalsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/approvals/pre-approvals/:id"
            element={
              <ProtectedRoute>
                <ProcessPreApprovalPage />
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
          <Route
            path="/pre-approvals/create"
            element={
              <ProtectedRoute>
                <CreatePreApprovalPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pre-approvals/:id"
            element={
              <ProtectedRoute>
                <PreApprovalDetailsPage />
              </ProtectedRoute>
            }
          />
          {/* Admin Pages */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminPage />
              </ProtectedRoute>
            }
          />

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