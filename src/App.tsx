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
import Stores from "./pages/Stores";
import { CreateStorePage } from "./pages/CreateStorePage";
import StoreDetailsPage from "./pages/StoreDetailsPage";
import ApprovalsStoresPage from "./pages/ApprovalsStoresPage";
import ProcessStorePage from "./pages/ProcessStorePage";
import Settlements from "./pages/settlements/Settlements";
import StoreMaster from "./pages/admin/StoreMaster";
import CreateWorkflowPage from "./pages/admin/CreateWorkflowPage";
import CreateRulePage from "./pages/admin/CreateRulePage";
import TransactionsPage from "./pages/transactions/TransactionsPage";
import TransactionDetailPage from "./pages/transactions/TransactionDetailPage";

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
              <Route path="/expenses/:expenseId" element={<ExpenseDetailPage />} />

              {/* TRANSACTIONS */}
              <Route path="/transactions" element={<TransactionsPage />} />
              <Route path="/transactions/:id" element={<TransactionDetailPage />} />


              {/* REPORTS */}
              <Route path="/reports" element={<MyReportsPage />} />
              <Route path="/reports/create" element={<CreateReportPage />} />
              <Route path="/reports/:id" element={<ReportDetailPage2 />} />
              <Route path="/reports/:id/:expenseId" element={<ExpenseDetailPage />} />

              {/* PRE APPROVALS */}
              <Route path="/requests/pre-approvals" element={<PreApprovalPage />} />
              <Route path="/requests/pre-approvals/create" element={<CreatePreApprovalPage />} />
              <Route path="/requests/pre-approvals/:id" element={<PreApprovalDetailsPage />} />

              {/* ADVANCES */}
              <Route path="/requests/advances" element={<MyAdvancesPage />} />
              <Route path="/requests/advances/create" element={<CreateAdvancePage />} />
              <Route path="/requests/advances/:id" element={<AdvanceDetailsPage />} />
              <Route path="/advance_accounts" element={<AdvanceAccounts />} />

              <Route path="/requests/users" element={<CreateUserPage />} />

              {/* APPROVALS */}
              <Route path="/approvals/reports" element={<ApprovalsReportsPage />} />
              <Route path="/approvals/reports/:id" element={<ReportDetailPage2 />} />
              <Route path="/approvals/reports/:id/:expenseId" element={<ExpenseDetailPage />} />
              <Route path="/approvals/advances" element={<ApprovalsAdvancesPage />} />
              <Route path="/approvals/stores" element={<ApprovalsStoresPage />} />
              <Route path="/approvals/advances/:id" element={<ProcessAdvancePage />} />
              <Route path="/approvals/pre-approvals" element={<ApprovalsPreApprovalsPage />} />
              <Route path="/approvals/pre-approvals/:id" element={<ProcessPreApprovalPage />} />
              <Route path="/approvals/stores/:id" element={<ProcessStorePage />} />

              {/* STORE */}
              <Route path="/requests/stores" element={<Stores />} />
              <Route path="/requests/stores/create" element={<CreateStorePage />} />
              <Route path="/requests/stores/:id" element={<StoreDetailsPage />} />

              {/* SETTLEMENTS */}
              <Route path="/admin/settlements" element={<Settlements />} />
              <Route path="/admin/settlements/:id" element={<ReportDetailPage2 />} />
              <Route path="/admin/settlements/:id/:expenseId" element={<ExpenseDetailPage />} />

              {/* ADMIN (No Padding Layout) */}
              <Route element={<AdminLayout />}>
                <Route path="/admin-settings/entities" element={<EntityPage />} />
                <Route path="/admin-settings/entities/create" element={<CreateEntityPage />} />
                <Route path="/admin-settings/entities/:id" element={<CreateEntityPage />} />
                <Route path="/admin-settings/expense-masters" element={<ExpenseMasterPage />} />
                <Route path="/admin-settings/masters/expense-reports-masters" element={<ExpenseReportMaster />} />
                <Route path="/admin-settings/masters/advance-masters" element={<AdvanceMaster />} />
                <Route path="/admin-settings/masters/expense-request-masters" element={<ExpenseRequestMaster />} />
                <Route path="/admin-settings/masters/users-masters" element={<UserMaster />} />
                <Route path="/admin-settings/masters/store-masters" element={<StoreMaster />} />
                <Route path="/admin-settings/users" element={<UserPage />} />
                <Route path="/admin-settings/users/create" element={<CreateUserPage />} />
                <Route path="/admin-settings/users/:id" element={<CreateUserPage />} />
                <Route path="/admin-settings/product-config/workflow" element={<WorkFlowPage />} />
                <Route path="/admin-settings/product-config/workflow/create-workflow" element={<CreateWorkflowPage />} />
                <Route path="/admin-settings/product-config/workflow/create-workflow/:id" element={<CreateWorkflowPage />} />
                <Route path="/admin-settings/product-config/workflow/create-rule" element={<CreateRulePage />} />
                <Route path="/admin-settings/product-config/workflow/create-rule/:id" element={<CreateRulePage />} />
                <Route path="/admin-settings/product-config/expense-categories" element={<AdminExpenseCategories />} />
                <Route path="/admin-settings/product-config/expense-categories/create" element={<CreateExpenseCategoryPage />} />
                <Route path="/admin-settings/product-config/expense-categories/create/:id" element={<CreateExpenseCategoryPage />} />
                <Route path="/admin-settings/product-config/expense-policies" element={<AdminExpensePolicies />} />
                <Route path="/admin-settings/product-config/expense-policies/create" element={<CreateExpensePolicyPage />} />
                <Route path="/admin-settings/product-config/expense-policies/create/:id" element={<CreateExpensePolicyPage />} />
                <Route path="/admin-settings/product-config/category-limits" element={<CategoryLimitPage />} />
                <Route path="/admin-settings/product-config/category-limits/create" element={<CreateCategoryLimitPage />} />
                <Route path="/admin-settings/product-config/category-limits/:id" element={<EditCategoryLimitPage />} />
                <Route path="/admin-settings/product-config/auto-reports" element={<AutoReportPage />} />
              </Route>

              {/* OTHER PAGES */}
              <Route path="/admin/all-reports" element={<AllReportsPage />} />
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
