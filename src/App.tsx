import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { LoginPage } from '@/pages/auth/LoginPage';
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
import { EntityPage } from './pages/admin/EntityPage';
import { CreateEntityPage } from './pages/admin/CreateEntityPage';
import OrgPage from './pages/admin/OrgPage';
import ExpenseMasterPage from './pages/admin/ExpenseMasterPage';
import ExpenseReportMaster from './pages/admin/ExpenseReportMaster';
import AdvanceMaster from './pages/admin/AdvanceMaster';
import ExpenseRequestMaster from './pages/admin/ExpenseRequestMaster';
import UserMaster from './pages/admin/UserMaster';
import UserPage from './pages/admin/UserPage';
import CreateUserPage from './pages/admin/CreateUserPage';
import WorkFlowPage from './pages/admin/WorkFlowPage';
import AdminExpenseCategories from './pages/admin/AdminExpenseCategories';
import CreateExpenseCategoryPage from './pages/admin/CreateExpenseCategoryPage';
import AdminExpensePolicies from './pages/admin/AdminExpensePolicies';
import CreateExpensePolicyPage from './pages/admin/CreateExpensePolicyPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPassword from './pages/auth/ResetPassword';
import CreatePassword from './pages/auth/CreatePassword';
import ResendVerificationMail from './pages/auth/ResendVerificationMail';
import CategoryLimitPage from './pages/admin/CategoryLimitPage';
import CreateCategoryLimitPage from './pages/admin/CreateCategoryLimitPage';
import EditCategoryLimitPage from './pages/admin/EditCategoryLimitPage';
import { AutoReportPage } from './pages/admin/AutoReportPage';

function App() {
  return (
    <>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/accounts/forgot_password"
            element={<ForgotPasswordPage />}
          />
          <Route path="/accounts/reset_password" element={<ResetPassword />} />
          <Route
            path="/accounts/create_password"
            element={<CreatePassword />}
          />
          <Route
            path="/accounts/resend_verification"
            element={<ResendVerificationMail />}
          />
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
          <Route path="/approvals/reports/:id" element={<ReportDetailPage />} />
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
          <Route
            path="/admin/entities"
            element={
              <ProtectedRoute>
                <EntityPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/entities/create"
            element={
              <ProtectedRoute>
                <CreateEntityPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/org"
            element={
              <ProtectedRoute>
                <OrgPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/expense-masters"
            element={
              <ProtectedRoute>
                <ExpenseMasterPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/masters/expense-reports-masters"
            element={
              <ProtectedRoute>
                <ExpenseReportMaster />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/masters/advance-masters"
            element={
              <ProtectedRoute>
                <AdvanceMaster />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/masters/expense-request-masters"
            element={
              <ProtectedRoute>
                <ExpenseRequestMaster />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/masters/users-masters"
            element={
              <ProtectedRoute>
                <UserMaster />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute>
                <UserPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users/create"
            element={
              <ProtectedRoute>
                <CreateUserPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/product-config/workflow"
            element={
              <ProtectedRoute>
                <WorkFlowPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/product-config/expense-categories"
            element={
              <ProtectedRoute>
                <AdminExpenseCategories />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/product-config/expense-categories/create"
            element={
              <ProtectedRoute>
                <CreateExpenseCategoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/product-config/expense-policies"
            element={
              <ProtectedRoute>
                <AdminExpensePolicies />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/product-config/expense-policies/create"
            element={
              <ProtectedRoute>
                <CreateExpensePolicyPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/product-config/category-limits"
            element={
              <ProtectedRoute>
                <CategoryLimitPage />
              </ProtectedRoute>
            }
          />
          <Route
          path="/admin/product-config/category-limits/create"
          element={
            <ProtectedRoute>
              <CreateCategoryLimitPage />
            </ProtectedRoute>
          }
          />
          <Route
            path="/admin/product-config/category-limits/:id"
            element={
              <ProtectedRoute>
                <EditCategoryLimitPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/product-config/auto-reports"
            element={
              <ProtectedRoute>
                <AutoReportPage />
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
