import { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Badge } from '@/components/ui/badge';
import { ExpenseDetailsStep } from '@/components/expenses/ExpenseDetailsStep';
import MileagePage from '@/pages/MileagePage';
import PerdiemPage from '@/pages/PerdiemPage';
import {
  BanknoteArrowDown,
  CheckCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { expenseService, UpdateExpenseData } from '@/services/expenseService';
import { Expense } from '@/types/expense';
import { getStatusColor } from '@/lib/utils';
import { toast } from 'sonner';
import { useExpenseStore } from '@/store/expenseStore';

const EDITABLE_STATUSES = ['DRAFT', 'INCOMPLETE', 'COMPLETE'];

// Check if expense is a mileage expense
const isMileageExpense = (expense: Expense): boolean => {
  return !!(expense.distance && parseFloat(expense.distance.toString()) > 0);
};

// Check if expense is a per diem expense
const isPerDiemExpense = (expense: Expense): boolean => {
  return expense.expense_type === 'PER_DIEM' ||
    !!(expense.location && (expense.start_date || expense.end_date)) ||
    !!expense.per_diem_info;
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
    comments: expense.description || '',
    city: '',
    source: '',
    destination: '',
  };
};

export function ExpenseDetailPage() {
  const { parsedData, setParsedData } = useExpenseStore();
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
  const [receiptUrlStr, setReceiptUrlStr] = useState<string | null>();

  const searchParams = new URLSearchParams(location.search);
  const isFromReport = searchParams.get('from') === 'report';
  const isFromApprovals = searchParams.get('from') === 'approvals';
  const reportId = searchParams.get('reportId');
  const returnTo = searchParams.get('returnTo');

  console.log(receiptUrlStr);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        const [expenseData] = await Promise.all([
          expenseService.getExpenseById(id),
          expenseService.getAllPoliciesWithCategories()
        ]);
        setExpense(expenseData);
        // setPolicies(policiesData);
        setParsedData(null);

        if (EDITABLE_STATUSES.includes(expenseData.status.toUpperCase()) && !isFromApprovals && !isFromReport) {
          setIsEditing(true);
        }

        if (expenseData.receipt_id) {
          fetchReceipt(expenseData.receipt_id, expenseData.created_by.org_id);
        }
      } catch (error) {
        console.error('Failed to fetch expense details', error);
        toast.error('Failed to fetch expense details');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const fetchReceipt = async (receiptId: string, orgId: string) => {
    console.log(receiptId, orgId)
    try {
      const response: any = await expenseService.fetchReceiptPreview(receiptId, orgId);
      setReceiptSignedUrl(response.data.data.signed_url);
      setReceiptUrlStr(response.data.data.signed_url);
    } catch (error) {
      console.log(error);
      toast.error('Failed to fetch receipt image');
    }
  }


  const handleExpenseSubmit = async (formData: any) => {
    if (!expense || !id) return;

    setSaving(true);
    try {
      // Transform form data to UpdateExpenseData format
      const expenseData: UpdateExpenseData = {
        amount: parseFloat(formData.amount).toFixed(2),
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
        vehicle_type: formData.vehicle_type || null,
        mileage_meta: formData.mileage_meta || null,
        is_round_trip: formData.is_round_trip === "true" ? true : false,
        custom_attributes: {},
      };
      console.log(expenseData);

      const response = await expenseService.updateExpense(id, expenseData);
      if (response.success) {
        toast.success('Expense updated successfully');
        navigate('/expenses');
      } else {
        toast.error(response.message || 'Failed to update expense');
      }
    } catch (error) {
      console.error('Failed to update expense:', error);
      toast.error('Failed to update expense');
    } finally {
      setSaving(false);
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
              <p className="text-muted-foreground">The expense you're looking for doesn't exist.</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  let breadcrumbItems;

  if (isFromApprovals) {
    breadcrumbItems = [
      { label: 'Requests for Approval', href: '/approvals/reports' },
      {
        label: 'View Report',
        href: reportId ? `/reports/${reportId}?from=approvals` : '#'
      },
      { label: 'View Expense' },
    ];
  } else if (isFromReport && reportId) {
    breadcrumbItems = [
      { label: 'Expenses Reports', href: '/reports' },
      {
        label: 'View Report',
        href: `/reports/${reportId}`
      },
      { label: 'View Expense' },
    ];
  } else if (returnTo === 'create') {
    breadcrumbItems = [
      { label: 'Create Expense', href: '/expenses/create' },
      { label: 'View Expense' },
    ];
  } else {
    breadcrumbItems = [
      { label: 'My Expenses', href: '/expenses' },
      { label: 'View Expense' },
    ];
  }

  const getStatusIcon = (status: string) => {
    switch (status.toUpperCase()) {
      case 'APPROVED':
      case 'FULLY_APPROVED':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'PENDING':
      case 'PENDING_APPROVAL':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'REJECTED':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Clock className="h-5 w-5 text-blue-600" />;
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <Breadcrumb items={breadcrumbItems} />

        {/* Header Section */}
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-lg p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <BanknoteArrowDown className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">Expense Details</h1>
                  <p className="text-muted-foreground">{expense.sequence_number || expense.receipt_id}</p>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-3">
                {getStatusIcon(expense.status)}
                <Badge className={`${getStatusColor(expense.status)} text-sm px-3 py-1`}>
                  {expense.status.replace('_', ' ')}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {isMileageExpense(expense) ? (
          <MileagePage
            mode={(expense.status === "INCOMPLETE" || expense.status === "COMPLETE") ? "edit" : "view"}
            expenseData={expense}
            isEditable={EDITABLE_STATUSES.includes(expense.status.toUpperCase())}
            onUpdate={handleExpenseSubmit}
            isEditing={isEditing}
            saving={saving}
          />
        ) : isPerDiemExpense(expense) ? (
          <PerdiemPage mode={(expense.status === "INCOMPLETE" || expense.status === "COMPLETE") ? "edit" : "view"} expenseData={expense} />
        ) : (
          <ExpenseDetailsStep
            onBack={() => {
              if (returnTo === 'create') {
                window.location.href = '/expenses/create';
              } else {
                window.history.back();
              }
            }}
            mode={(expense.status === 'COMPLETE' || expense.status === 'INCOMPLETE') ? "edit" : "view"}
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
          />
        )}
      </div>
    </Layout>
  );
}