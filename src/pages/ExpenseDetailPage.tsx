import { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import MileagePage from "@/pages/MileagePage";
import PerdiemPage from "@/pages/PerdiemPage";
import { AlertCircle, Trash2, Loader2 } from "lucide-react";
import { expenseService, UpdateExpenseData } from "@/services/expenseService";
import { Expense } from "@/types/expense";
import { getOrgCurrency, getStatusColor, parseLocalDate } from "@/lib/utils";
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
import { ExpenseDetailsStep2 } from "@/components/expenses/ExpenseDetailsStep2";
import { getTemplates, Template } from "@/services/admin/templates";
import { useAuthStore } from "@/store/authStore";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { toast } from "sonner";

const EDITABLE_STATUSES = ["DRAFT", "INCOMPLETE", "COMPLETE", "SENT_BACK"];

const filterFormData = (data: Record<string, any>): UpdateExpenseData => {
  const allowedKeys: (keyof UpdateExpenseData)[] = [
    "amount",
    "category_id",
    "description",
    "expense_date",
    "expense_policy_id",
    "file_ids",
    "vendor",
    "receipt_id",
    "invoice_number",
    "distance",
    "distance_unit",
    "end_location",
    "start_location",
    "mileage_rate_id",
    "mileage_meta",
    "custom_attributes",
    "is_round_trip",
    "foreign_amount",
    "foreign_currency",
    "currency",
    "api_conversion_rate",
    "user_conversion_rate",
  ];

  const sanitized: any = {};

  for (const key of allowedKeys) {
    if (data[key] !== undefined) {
      sanitized[key] = data[key];
    }
  }

  return sanitized as UpdateExpenseData;
};

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

export function ExpenseDetailPage() {
  const { parsedData, setParsedData } = useExpenseStore();
  const { expenseId } = useParams<{ expenseId: string }>();
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";
  const location = useLocation();
  const navigate = useNavigate();
  const [expense, setExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);
  const [isReceiptReplaced, setIsReceiptReplaced] = useState(false);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [receiptSignedUrl, setReceiptSignedUrl] = useState<string | null>(null);
  const [adminEditReason, setAdminEditReason] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [templateEntities, setTemplateEntities] = useState<
    Template["entities"]
  >([]);
  const [showAdminEditConfirm, setShowAdminEditConfirm] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<any>(null);
  const baseCurrency = getOrgCurrency();
  const searchParams = new URLSearchParams(location.search);
  const isFromReport = searchParams.get("from") === "report";
  const isFromApprovals = searchParams.get("from") === "approvals";

  const isAdminUpdatingExpense =
    isAdmin &&
    (location.pathname.includes("/approvals") || location.pathname.includes("/admin-reports")) &&
    expense?.status !== "APPROVED" &&
    expense?.status !== "REJECTED";

  const loadTemplateEntities = async () => {
    try {
      const templates = await getTemplates();
      const expenseTemplate = Array.isArray(templates)
        ? templates.find((t) => t.module_type === "expense")
        : null;
      if (expenseTemplate?.entities) {
        setTemplateEntities(expenseTemplate.entities);
      }
    } catch (error) {
      console.error("Failed to load template entities:", error);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!expenseId) return;
      try {
        const [expenseData] = await Promise.all([
          expenseService.getExpenseById(expenseId),
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
    loadTemplateEntities();
  }, [expenseId]);

  const fetchReceipt = async (receiptId: string, orgId: string) => {
    try {
      setReceiptLoading(true);
      const response: any = await expenseService.fetchReceiptPreview(
        receiptId,
        orgId
      );
      setReceiptSignedUrl(response.data.data.signed_url);
    } catch (error) {
      console.log(error);
      toast.error("Failed to fetch receipt image");
    } finally {
      setReceiptLoading(false);
    }
  };

  const handleExpenseSubmit = async (formData: any) => {
    if (!expense || !expenseId) return;
    setSaving(true);
    if (!formData.custom_attributes) {
      formData.custom_attributes = {};
    }
    let entitiesToUse = templateEntities;
    if (!entitiesToUse || entitiesToUse.length === 0) {
      try {
        const templates = await getTemplates();
        const expenseTemplate = Array.isArray(templates)
          ? templates.find((t) => t.module_type === "expense")
          : null;
        if (expenseTemplate?.entities) {
          entitiesToUse = expenseTemplate.entities;
        }
      } catch (error) {
        console.error("Failed to load template entities:", error);
      }
    }
    if (entitiesToUse && entitiesToUse.length > 0) {
      const entityIdSet = new Set(
        entitiesToUse
          .map((entity) => entity?.entity_id || entity?.id)
          .filter(Boolean)
      );

      Object.keys(formData).forEach((key) => {
        if (entityIdSet.has(key) && formData[key]) {
          const value = String(formData[key]).trim();
          if (value) {
            formData.custom_attributes[key] = value;
          }
        }
      });
    }
    const filteredData = filterFormData(formData);
    try {
      if (filteredData.invoice_number) {
        filteredData.expense_date = format(
          parseLocalDate(filteredData.expense_date),
          "yyyy-MM-dd"
        );
        filteredData.currency = baseCurrency;
        if (!filteredData.foreign_amount) {
          filteredData.foreign_currency = null;
        }
        filteredData.advance_account_id = formData.advance_account_id?.length > 0 ? formData.advance_account_id : null;
        console.log(filteredData);

        if (isAdminUpdatingExpense) {
          setShowAdminEditConfirm(true);
          setPendingFormData(filteredData);
          return;
        } else {
          await expenseService.updateExpense(expenseId, filteredData);
        }
        await expenseService.validateExpense(expenseId);
      } else if (formData.start_location) {
        const expenseData: UpdateExpenseData = {
          amount: parseFloat(formData.amount),
          category_id: formData.category_id,
          description: formData.description,
          expense_date: formData.expense_date,
          expense_policy_id: formData.expense_policy_id,
          file_ids: formData.file_ids,
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
          currency: baseCurrency,
        };
        if (isAdminUpdatingExpense) {
          setPendingFormData(expenseData);
          setShowAdminEditConfirm(true);
          setLoading(false);
          return;
        } else {
          await expenseService.updateExpense(expenseId, expenseData);
        }
      }
      toast.success("Expense updated successfully");
      navigate(-1);
    } catch (error: any) {
      console.error("Failed to update expense:", error);
      toast.error(error?.response?.data?.message || error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEditExpenseAsAdmin = async () => {
    try {
      if (expenseId) {
        const newPayload = { ...pendingFormData, reason: adminEditReason };
        await expenseService.adminUpdateExpense({
          id: expenseId,
          payload: newPayload,
        });
      }
      setShowAdminEditConfirm(false);
      navigate(-1);
    } catch (error: any) {
      console.log(error);
      toast.error(error?.response?.data?.message || error?.message);
    }
  };

  const handleDeleteExpense = async () => {
    if (!expense || !expenseId) return;

    setIsDeleting(true);
    try {
      await expenseService.deleteExpense(expenseId);
      toast.success("Expense deleted successfully");
      navigate("/expenses");
    } catch (error: any) {
      console.error("Failed to delete expense:", error);
      toast.error(error?.response?.data?.message || "Failed to delete expense");
      setShowDeleteDialog(false);
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Loading expense details...</p>
          </div>
        </div>
      </>
    );
  }

  if (!expense) {
    return (
      <>
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
      </>
    );
  }

  return (
    <>
      <div className="space-y-6">
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
              expense.status === "COMPLETE" ||
              expense.status === "INCOMPLETE" ||
              expense.status === "SENT_BACK" ||
              (isAdmin &&
                (location.pathname.includes("/approvals") || location.pathname.includes("/admin-reports")) &&
                expense.status !== "APPROVED" &&
                expense.status !== "REJECTED")
                ? "edit"
                : "view"
            }
            expenseData={expense}
            isEditable={EDITABLE_STATUSES.includes(
              expense.status.toUpperCase()
            )}
            onCancel={() => {
              navigate(-1);
            }}
            onUpdate={handleExpenseSubmit}
            isEditing={isEditing}
            saving={saving}
          />
        ) : isPerDiemExpense(expense) ? (
          <PerdiemPage
            mode={
              expense.status === "COMPLETE" ||
              expense.status === "INCOMPLETE" ||
              expense.status === "SENT_BACK" ||
              (isAdmin &&
                (location.pathname.includes("/approvals") || location.pathname.includes("/admin-reports")) &&
                expense.status !== "APPROVED" &&
                expense.status !== "REJECTED")
                ? "edit"
                : "view"
            }
            expenseData={expense}
          />
        ) : (
          <ExpenseDetailsStep2
            onBack={() => {
              navigate(-1);
            }}
            onSubmit={handleExpenseSubmit}
            receiptLoading={receiptLoading}
            mode={
              expense.status === "COMPLETE" ||
              expense.status === "INCOMPLETE" ||
              expense.status === "SENT_BACK" ||
              (isAdmin &&
                (location.pathname.includes("/approvals") || location.pathname.includes("/admin-reports")) &&
                expense.status !== "APPROVED" &&
                expense.status !== "REJECTED")
                ? "edit"
                : "view"
            }
            loading={saving}
            isReceiptReplaced={isReceiptReplaced}
            setIsReceiptReplaced={setIsReceiptReplaced}
            uploadedFile={null}
            previewUrl={receiptSignedUrl}
            expense={expense}
          />
        )}
      </div>
      <AlertDialog
        open={showAdminEditConfirm}
        onOpenChange={setShowAdminEditConfirm}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Edit expense?</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to edit this expense as an admin. This will
              overwrite the existing data. Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Reason for editing</Label>
            <Textarea
              placeholder="Enter reason for editing this expense"
              value={adminEditReason}
              className="resize-none"
              onChange={(e) => setAdminEditReason(e.target.value)}
              rows={3}
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>

            <AlertDialogAction
              onClick={() => {
                handleEditExpenseAsAdmin();
                setShowAdminEditConfirm(false);
              }}
            >
              Yes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
