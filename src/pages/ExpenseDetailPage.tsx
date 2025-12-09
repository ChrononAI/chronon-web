import { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
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
import { ExpenseDetailsStep2 } from "@/components/expenses/ExpenseDetailsStep2";
import { getTemplates, Template } from "@/services/admin/templates";

const EDITABLE_STATUSES = ["DRAFT", "INCOMPLETE", "COMPLETE", "SENT_BACK"];

const filterFormData = (data: Record<string, any>): UpdateExpenseData => {
  const allowedKeys: (keyof UpdateExpenseData)[] = [
    "amount",
    "category_id",
    "description",
    "expense_date",
    "expense_policy_id",
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
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [expense, setExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);
  const [isReceiptReplaced, setIsReceiptReplaced] = useState(false);
  const [receiptLoading, setReceiptLoading] = useState(false);
  // const [policies, setPolicies] = useState<Policy[]>([]);
  const [receiptSignedUrl, setReceiptSignedUrl] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [templateEntities, setTemplateEntities] = useState<
    Template["entities"]
  >([]);
  // const [conversionRate, setConversionRate] = useState();

  const baseCurrency = getOrgCurrency();
  const searchParams = new URLSearchParams(location.search);
  const isFromReport = searchParams.get("from") === "report";
  const isFromApprovals = searchParams.get("from") === "approvals";
  const returnTo = searchParams.get("returnTo");

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
    loadTemplateEntities();
  }, [id]);

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
    if (!expense || !id) return;
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
        filteredData.expense_date = new Date(filteredData.expense_date)
          .toISOString()
          .split("T")[0];
        filteredData.currency = baseCurrency || "INR";
        if (!filteredData.foreign_amount) {
          filteredData.foreign_currency = null;
        }
        if (formData.advance_account_id) {
          if (!filteredData.custom_attributes) {
            filteredData.custom_attributes = {};
          }
          filteredData.custom_attributes.advance_account_id =
            formData.advance_account_id;
        }
        await expenseService.updateExpense(id, filteredData);
        await expenseService.validateExpense(id);
      } else if (formData.start_location) {
        const expenseData: UpdateExpenseData = {
          amount: parseFloat(formData.amount),
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
          currency: baseCurrency,
        };
        await expenseService.updateExpense(id, expenseData);
      }
      toast.success("Expense updated successfully");
      navigate("/expenses");
    } catch (error: any) {
      console.error("Failed to update expense:", error);
      toast.error(error?.response?.data?.message || error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteExpense = async () => {
    if (!expense || !id) return;

    setIsDeleting(true);
    try {
      await expenseService.deleteExpense(id);
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
              expense.status === "INCOMPLETE" ||
              expense.status === "COMPLETE" ||
              expense.status === "SENT_BACK"
                ? "edit"
                : "view"
            }
            expenseData={expense}
            isEditable={EDITABLE_STATUSES.includes(
              expense.status.toUpperCase()
            )}
            onCancel={() => {
              if (returnTo === "create") {
                window.location.href = "/expenses/create";
              } else {
                window.history.back();
              }
            }}
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
          <ExpenseDetailsStep2
            onBack={() => {
              if (returnTo === "create") {
                window.location.href = "/expenses/create";
              } else {
                window.history.back();
              }
            }}
            onSubmit={handleExpenseSubmit}
            receiptLoading={receiptLoading}
            mode={
              expense.status === "COMPLETE" ||
              expense.status === "INCOMPLETE" ||
              expense.status === "SENT_BACK"
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
    </>
  );
}
