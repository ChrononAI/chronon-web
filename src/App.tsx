import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { LoginPage } from "@/pages/auth/LoginPage";
import { ExpenseDetailPage } from "@/pages/ExpenseDetailPage";
import { MyReportsPage } from "@/pages/MyReportsPage";
import { MyAdvancesPage } from "@/pages/MyAdvancesPage";
import { CreateAdvancePage } from "@/pages/CreateAdvancePage";
import { CreateReportPage } from "@/pages/CreateReportPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { ApprovalsReportsPage } from "@/pages/ApprovalsReportsPage";
import { AllReportsPage } from "@/pages/AllReportsPage";
import { ApprovalRulesPage } from "@/pages/ApprovalRulesPage";
import { PaymentPage } from "@/pages/PaymentPage";
import { OrganizationSetupPage } from "@/pages/OrganizationSetupPage";
import UploadPolicyPage from "@/pages/UploadPolicyPage";
import QueryBuilderDemoPage from "@/pages/QueryBuilderDemoPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { PermissionDeniedPage } from "@/pages/PermissionDeniedPage";
import { MyExpensesPage } from "@/pages/MyExpensesPage";
import { UnifiedExpensesPage } from "@/pages/UnifiedExpensesPage";
import PreApprovalPage from "./pages/PreApprovalPage";
import CreatePreApprovalPage from "./pages/CreatePreApprovalPage";
import PreApprovalDetailsPage from "./pages/PreApprovalDetailsPage";
import ApprovalsPreApprovalsPage from "./pages/ApprovalsPreApprovalsPage";
import ProcessPreApprovalPage from "./pages/ProcessPreApprovalPage";
import AdvanceDetailsPage from "./pages/AdvanceDetailsPage";
import ApprovalsAdvancesPage from "./pages/ApprovalsAdvancesPage";
import ProcessAdvancePage from "./pages/ProcessAdvancePage";
import { EntityPage } from "./pages/admin/EntityPage";
import { CreateEntityPage } from "./pages/admin/CreateEntityPage";
import ExpenseMasterPage from "./pages/admin/ExpenseMasterPage";
import ExpenseReportMaster from "./pages/admin/ExpenseReportMaster";
import AdvanceMaster from "./pages/admin/AdvanceMaster";
import ExpenseRequestMaster from "./pages/admin/ExpenseRequestMaster";
import UserMaster from "./pages/admin/UserMaster";
import UserPage from "./pages/admin/UserPage";
import CreateUserPage from "./pages/admin/CreateUserPage";
import WorkFlowPage from "./pages/admin/WorkFlowPage";
import AdminExpenseCategories from "./pages/admin/AdminExpenseCategories";
import CreateExpenseCategoryPage from "./pages/admin/CreateExpenseCategoryPage";
import AdminExpensePolicies from "./pages/admin/AdminExpensePolicies";
import CreateExpensePolicyPage from "./pages/admin/CreateExpensePolicyPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import ResetPassword from "./pages/auth/ResetPassword";
import CreatePassword from "./pages/auth/CreatePassword";
import ResendVerificationMail from "./pages/auth/ResendVerificationMail";
import CategoryLimitPage from "./pages/admin/CategoryLimitPage";
import CreateCategoryLimitPage from "./pages/admin/CreateCategoryLimitPage";
import EditCategoryLimitPage from "./pages/admin/EditCategoryLimitPage";
import AdvanceAccounts from "./pages/AdvanceAccounts";
import { AutoReportPage } from "./pages/admin/AutoReportPage";
import { ReportDetailPage2 } from "./pages/ReportDetailPage2";
import { Layout } from "./components/layout/Layout";
import AdminLayout from "./components/layout/AdminLayout";

function App() {
  return (
    <>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/accounts/forgot_password" element={<ForgotPasswordPage />} />
          <Route path="/accounts/reset_password" element={<ResetPassword />} />
          <Route path="/accounts/create_password" element={<CreatePassword />} />
          <Route path="/accounts/resend_verification" element={<ResendVerificationMail />} />

          {/* Protected + Main Layout */}
          <Route element={<Layout />}>
            <Route element={<ProtectedRoute />}>

              {/* Default Redirect */}
              <Route path="/" element={<Navigate to="/expenses" replace />} />

              {/* EXPENSES */}
              <Route path="/expenses" element={<MyExpensesPage />} />
              <Route path="/expenses/create" element={<UnifiedExpensesPage />} />
              <Route path="/expenses/:id" element={<ExpenseDetailPage />} />

              {/* REPORTS */}
              <Route path="/reports" element={<MyReportsPage />} />
              <Route path="/reports/create" element={<CreateReportPage />} />
              <Route path="/reports/:id" element={<ReportDetailPage2 />} />

              {/* PRE APPROVALS */}
              <Route path="/pre-approvals" element={<PreApprovalPage />} />
              <Route path="/pre-approvals/create" element={<CreatePreApprovalPage />} />
              <Route path="/pre-approvals/:id" element={<PreApprovalDetailsPage />} />

              {/* ADVANCES */}
              <Route path="/advances" element={<MyAdvancesPage />} />
              <Route path="/advances/create" element={<CreateAdvancePage />} />
              <Route path="/advances/:id" element={<AdvanceDetailsPage />} />
              <Route path="/advance_accounts" element={<AdvanceAccounts />} />

              {/* APPROVALS */}
              <Route path="/approvals/reports" element={<ApprovalsReportsPage />} />
              <Route path="/approvals/reports/:id" element={<ReportDetailPage2 />} />
              <Route path="/approvals/advances" element={<ApprovalsAdvancesPage />} />
              <Route path="/approvals/advances/:id" element={<ProcessAdvancePage />} />
              <Route path="/approvals/pre-approvals" element={<ApprovalsPreApprovalsPage />} />
              <Route path="/approvals/pre-approvals/:id" element={<ProcessPreApprovalPage />} />

              {/* ADMIN (No Padding Layout) */}
              <Route element={<AdminLayout />}>
                <Route path="/admin/entities" element={<EntityPage />} />
                <Route path="/admin/entities/create" element={<CreateEntityPage />} />
                <Route path="/admin/expense-masters" element={<ExpenseMasterPage />} />
                <Route path="/admin/masters/expense-reports-masters" element={<ExpenseReportMaster />} />
                <Route path="/admin/masters/advance-masters" element={<AdvanceMaster />} />
                <Route path="/admin/masters/expense-request-masters" element={<ExpenseRequestMaster />} />
                <Route path="/admin/masters/users-masters" element={<UserMaster />} />
                <Route path="/admin/users" element={<UserPage />} />
                <Route path="/admin/users/create" element={<CreateUserPage />} />
                <Route path="/admin/product-config/workflow" element={<WorkFlowPage />} />
                <Route path="/admin/product-config/expense-categories" element={<AdminExpenseCategories />} />
                <Route path="/admin/product-config/expense-categories/create" element={<CreateExpenseCategoryPage />} />
                <Route path="/admin/product-config/expense-policies" element={<AdminExpensePolicies />} />
                <Route path="/admin/product-config/expense-policies/create" element={<CreateExpensePolicyPage />} />
                <Route path="/admin/product-config/category-limits" element={<CategoryLimitPage />} />
                <Route path="/admin/product-config/category-limits/create" element={<CreateCategoryLimitPage />} />
                <Route path="/admin/product-config/category-limits/:id" element={<EditCategoryLimitPage />} />
                <Route path="/admin/product-config/auto-reports" element={<AutoReportPage />} />
              </Route>

              {/* OTHER PAGES */}
              <Route path="/all-reports" element={<AllReportsPage />} />
              <Route path="/approval-rules" element={<ApprovalRulesPage />} />
              <Route path="/payment" element={<PaymentPage />} />
              <Route path="/organization/setup" element={<OrganizationSetupPage />} />
              <Route path="/policy" element={<UploadPolicyPage />} />
              <Route path="/policy/builder" element={<QueryBuilderDemoPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>
          </Route>

          {/* Errors */}
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
