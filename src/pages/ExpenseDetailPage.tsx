import { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { ExpenseDetailsStep } from "@/components/expenses/ExpenseDetailsStep";
import MileagePage from "@/pages/MileagePage";
import PerdiemPage from "@/pages/PerdiemPage";
import { AlertCircle, Trash2, Loader2 } from "lucide-react";
import { expenseService, UpdateExpenseData } from "@/services/expenseService";
import { Expense } from "@/types/expense";
import { getOrgCurrency, getStatusColor } from "@/lib/utils";
import { toast } from "sonner";
import { useExpenseStore } from "@/store/expenseStore";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/authStore";

const EDITABLE_STATUSES = ["DRAFT", "INCOMPLETE", "COMPLETE", "SENT_BACK"];

// Check if expense is a mileage expense
const isMileageExpense = (expense: Expense): boolean => {
  return !!(expense.distance && parseFloat(expense.distance.toString()) > 0);
};

// Check if expense is a per diem expense
const isPerDiemExpense = (expense: Expense): boolean => {
  return (
    expense.expense_type === "PER_DIEM" ||
    !!(expense.location && (expense.start_date || expense.end_date)) ||
    !!expense.per_diem_info
  );
};

// Transform Expense data to form format
const transformExpenseToFormData = (expense: Expense) => {
  return {
    policyId: expense.expense_policy_id,
    categoryId: expense.category_id,
    invoiceNumber: expense.invoice_number || "",
    merchant: expense.vendor,
    amount: expense.amount.toString(),
    dateOfExpense: new Date(expense.expense_date),
    comments: expense.description || "",
    city: "",
    source: "",
    destination: "",
    advance_id: expense.advance_id || null,
    pre_approval_id: expense.pre_approval_id || null,
    currency: expense.foreign_currency || expense.currency,
    foreign_currency: expense.foreign_currency || null,
    foreign_amount: expense.foreign_amount || null,
    api_conversion_rate: expense.api_conversion_rate ? expense.api_conversion_rate.toString() : "",
    user_conversion_rate: expense.user_conversion_rate ? expense.user_conversion_rate.toString() : "",
    base_currency_amount: expense.amount.toString()
  };
};

export function ExpenseDetailPage() {
  const { parsedData, setParsedData } = useExpenseStore();
  const { orgSettings } = useAuthStore();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [expense, setExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);
  const [isReceiptReplaced, setIsReceiptReplaced] = useState(false);
  // const [policies, setPolicies] = useState<Policy[]>([]);
  const [receiptSignedUrl, setReceiptSignedUrl] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  // const [conversionRate, setConversionRate] = useState();

  const baseCurrency = getOrgCurrency();
  const searchParams = new URLSearchParams(location.search);
  const isFromReport = searchParams.get("from") === "report";
  const isFromApprovals = searchParams.get("from") === "approvals";
  const reportId = searchParams.get("reportId");
  const returnTo = searchParams.get("returnTo");

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        const [expenseData] = await Promise.all([
          expenseService.getExpenseById(id),
          expenseService.getAllPoliciesWithCategories(),
        ]);
        setExpense(expenseData);
        // setPolicies(policiesData);
        setParsedData(null);

        setIsEditing(false);

        if (
          EDITABLE_STATUSES.includes(expenseData.status.toUpperCase()) &&
          !isFromApprovals &&
          !isFromReport
        ) {
          setIsEditing(true);
        }

        if (expenseData.receipt_id) {
          fetchReceipt(expenseData.receipt_id, expenseData.org_id);
        }
      } catch (error) {
        console.error("Failed to fetch expense details", error);
        toast.error("Failed to fetch expense details");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const fetchReceipt = async (receiptId: string, orgId: string) => {
    try {
      const response: any = await expenseService.fetchReceiptPreview(
        receiptId,
        orgId
      );
      setReceiptSignedUrl(response.data.data.signed_url);
    } catch (error) {
      console.log(error);
      toast.error("Failed to fetch receipt image");
    }
  };

  const handleExpenseSubmit = async (formData: any) => {
    if (!expense || !id) return;
    setSaving(true);
    try {
      // Transform form data to UpdateExpenseData format
      const expenseData: UpdateExpenseData = {
        foreign_amount:
          formData.currency !== baseCurrency
            ? +(formData.base_currency_amount || 0)
            : null,
        amount:
          formData.currency !== baseCurrency
            ? parseFloat(formData.amount)
            : +(formData.base_currency_amount || 0),
        category_id: formData.categoryId,
        description: formData.description,
        expense_date: formData.expense_date,
        expense_policy_id: formData.policyId,
        vendor: formData.merchant,
        receipt_id: isReceiptReplaced
          ? parsedData?.id ?? null
          : expense?.receipt_id ?? null,
        invoice_number: formData.invoiceNumber || null,
        distance: formData.distance || null,
        distance_unit: formData.distance_unit || null,
        end_location: formData.end_location || null,
        start_location: formData.start_location || null,
        mileage_rate_id: formData.mileage_rate_id,
        mileage_meta: formData.mileage_meta || null,
        is_round_trip: formData.is_round_trip === "true" ? true : false,
        custom_attributes: {},
        currency: orgSettings.currency,
        foreign_currency:
          formData.currency !== baseCurrency
            ? formData.currency
            : null,
        api_conversion_rate: formData.currency !== baseCurrency ? +(formData.api_conversion_rate || 0) : undefined,
        user_conversion_rate: formData.currency !== baseCurrency ? +(formData.user_conversion_rate || 0) : undefined,
      };
      const response = await expenseService.updateExpense(id, expenseData);
      if (response.success) {
        toast.success("Expense updated successfully");
        navigate("/expenses");
      } else {
        toast.error(response.message || "Failed to update expense");
      }
    } catch (error) {
      console.error("Failed to update expense:", error);
      toast.error("Failed to update expense");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteExpense = async () => {
    if (!expense || !id) return;

    setIsDeleting(true);
    try {
      const response = await expenseService.deleteExpense(id);
      if (response.success) {
        toast.success("Expense deleted successfully");
        navigate("/expenses");
      } else {
        toast.error(response.message || "Failed to delete expense");
        setShowDeleteDialog(false);
      }
    } catch (error) {
      console.error("Failed to delete expense:", error);
      toast.error("Failed to delete expense");
      setShowDeleteDialog(false);
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Loading expense details...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!expense) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto" />
            <div>
              <h3 className="text-lg font-semibold">Expense Not Found</h3>
              <p className="text-muted-foreground">
                The expense you're looking for doesn't exist.
              </p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  let breadcrumbItems;

  if (isFromApprovals) {
    breadcrumbItems = [
      { label: "Requests for Approval", href: "/approvals/reports" },
      {
        label: "View Report",
        href: reportId ? `/reports/${reportId}?from=approvals` : "#",
      },
      { label: "View Expense" },
    ];
  } else if (isFromReport && reportId) {
    breadcrumbItems = [
      { label: "Expenses Reports", href: "/reports" },
      {
        label: "View Report",
        href: `/reports/${reportId}`,
      },
      { label: "View Expense" },
    ];
  } else if (returnTo === "create") {
    breadcrumbItems = [
      { label: "Create Expense", href: "/expenses/create" },
      { label: "View Expense" },
    ];
  } else {
    breadcrumbItems = [
      { label: "My Expenses", href: "/expenses" },
      { label: "View Expense" },
    ];
  }

  return (
    <Layout>
      <div className="space-y-6">
        <Breadcrumb items={breadcrumbItems} />
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold">Expense Details</div>
            <div className="flex items-center gap-2 mt-2">
              <Badge
                className={`${getStatusColor(
                  expense.status
                )} text-xs px-2 py-0.5`}
              >
                {expense.status.replace("_", " ")}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Delete Button - Only show for COMPLETE and INCOMPLETE status */}
            {(expense.status === "COMPLETE" ||
              expense.status === "INCOMPLETE") && (
              <AlertDialog
                open={showDeleteDialog}
                onOpenChange={setShowDeleteDialog}
              >
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="px-6 py-2 border-red-500 text-red-600 hover:bg-red-50"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDeleteDialog(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Expense</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this expense? This action
                      cannot be undone.
                      {expense.sequence_number && (
                        <span className="block mt-2 font-medium">
                          Expense ID: {expense.sequence_number}
                        </span>
                      )}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteExpense}
                      disabled={isDeleting}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      {isDeleting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        "Delete"
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        {isMileageExpense(expense) ? (
          <MileagePage
            mode={
              expense.status === "INCOMPLETE" || expense.status === "COMPLETE"
                ? "edit"
                : "view"
            }
            expenseData={expense}
            isEditable={EDITABLE_STATUSES.includes(
              expense.status.toUpperCase()
            )}
            onUpdate={handleExpenseSubmit}
            isEditing={isEditing}
            saving={saving}
          />
        ) : isPerDiemExpense(expense) ? (
          <PerdiemPage
            mode={
              expense.status === "INCOMPLETE" ||
              expense.status === "COMPLETE" ||
              expense.status === "SENT_BACK"
                ? "edit"
                : "view"
            }
            expenseData={expense}
          />
        ) : (
          <ExpenseDetailsStep
            onBack={() => {
              if (returnTo === "create") {
                window.location.href = "/expenses/create";
              } else {
                window.history.back();
              }
            }}
            mode={
              expense.status === "COMPLETE" ||
              expense.status === "INCOMPLETE" ||
              expense.status === "SENT_BACK"
                ? "edit"
                : "view"
            }
            onSubmit={handleExpenseSubmit}
            loading={saving}
            isReceiptReplaced={isReceiptReplaced}
            setIsReceiptReplaced={setIsReceiptReplaced}
            uploadedFile={null}
            previewUrl={receiptSignedUrl}
            fetchReceipt={fetchReceipt}
            readOnly={!isEditing}
            expenseData={transformExpenseToFormData(expense)}
            receiptUrls={receiptSignedUrl ? [receiptSignedUrl] : []}
            isEditMode={isEditing}
            expense={expense}
          />
        )}
      </div>
    </Layout>
  );
}
