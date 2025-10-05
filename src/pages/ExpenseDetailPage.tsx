import { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExpenseDetailsStep } from '@/components/expenses/ExpenseDetailsStep';
import MileagePage from '@/pages/MileagePage';
import PerdiemPage from '@/pages/PerdiemPage';
import {
  BanknoteArrowDown,
  CheckCircle,
  Clock,
  AlertCircle,
  Edit3,
  X,
} from 'lucide-react';
import { expenseService, UpdateExpenseData } from '@/services/expenseService';
import { Expense, Policy } from '@/types/expense';
import { getStatusColor } from '@/lib/utils';
import { toast } from 'sonner';

const EDITABLE_STATUSES = ['DRAFT', 'INCOMPLETE', 'COMPLETE', 'PENDING', 'PENDING_APPROVAL'];

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
const transformExpenseToFormData = (expense: Expense, policies?: Policy[]) => {
  let policyId = '';
  let categoryId = '';
  
  if (policies && expense.category) {
    for (const policy of policies) {
      const matchingCategory = policy.categories.find(cat => 
        cat.name.toLowerCase() === expense.category.toLowerCase()
      );
      if (matchingCategory) {
        policyId = policy.id;
        categoryId = matchingCategory.id;
        break;
      }
    }
    
    if (!categoryId && policies.length > 0) {
      const firstPolicy = policies[0];
      if (firstPolicy.categories.length > 0) {
        policyId = firstPolicy.id;
        categoryId = firstPolicy.categories[0].id;
      }
    }
  }

  return {
    policyId,
    categoryId,
    invoiceNumber: expense.receipt_id || expense.description,
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
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [expense, setExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [receiptSignedUrl, setReceiptSignedUrl] = useState<string | null>(null);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const searchParams = new URLSearchParams(location.search);
  const isFromReport = searchParams.get('from') === 'report';
  const isFromApprovals = searchParams.get('from') === 'approvals';
  const reportId = searchParams.get('reportId');
  const returnTo = searchParams.get('returnTo');

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        const [expenseData, policiesData] = await Promise.all([
          expenseService.getExpenseById(id),
          expenseService.getAllPoliciesWithCategories()
        ]);
        setExpense(expenseData);
        setPolicies(policiesData);
        
        
        if (EDITABLE_STATUSES.includes(expenseData.status.toUpperCase())) {
          setIsEditing(true);
        }
        
        if (expenseData.receipt_id) {
          fetchReceiptPreview(expenseData.receipt_id, expenseData.created_by.org_id);
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

  const fetchReceiptPreview = async (receiptId: string, orgId: string) => {
    setReceiptLoading(true);
    try {
      const response = await fetch(
        `https://in.pulse.chronon.co.in/receipts/${receiptId}/signed-url?org_id=${orgId}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth-storage') ? JSON.parse(localStorage.getItem('auth-storage')!).state.token : ''}`
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success' && data.data.signed_url) {
          setReceiptSignedUrl(data.data.signed_url);
        }
      }
    } catch (error) {
      console.error('Failed to fetch receipt preview:', error);
    } finally {
      setReceiptLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleExpenseSubmit = async (formData: any) => {
    if (!expense || !id) return;
    
    setSaving(true);
    try {
      // Transform form data to UpdateExpenseData format
      const expenseData: UpdateExpenseData = {
        amount: parseFloat(formData.amount).toFixed(2),
        category_id: formData.categoryId,
        description: formData.comments || expense.description,
        expense_date: formData.dateOfExpense.toISOString().split('T')[0],
        expense_policy_id: formData.policyId,
        vendor: formData.merchant,
        receipt_id: expense.receipt_id || null,
        invoice_number: formData.invoiceNumber || null,
        distance: expense.distance || null,
        distance_unit: expense.distance_unit || null,
        end_location: expense.end_location || null,
        start_location: expense.start_location || null,
        vehicle_type: expense.vehicle_type || null,
        mileage_meta: expense.mileage_meta || null,
        custom_attributes: {},
      };

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
        label: `Report #${reportId}`,
        href: reportId ? `/reports/${reportId}?from=approvals` : '#'
      },
      { label: `Expense #${expense.receipt_id || expense.description}` },
    ];
  } else if (isFromReport && reportId) {
    breadcrumbItems = [
      { label: 'Expenses Reports', href: '/reports' },
      {
        label: `Report #${reportId}`,
        href: `/reports/${reportId}`
      },
      { label: `Expense #${expense.receipt_id || expense.description}` },
    ];
  } else if (returnTo === 'create') {
    breadcrumbItems = [
      { label: 'Create Expense', href: '/expenses/create' },
      { label: `Expense #${expense.receipt_id || expense.description}` },
    ];
  } else {
    breadcrumbItems = [
      { label: 'My Expenses', href: '/expenses' },
      { label: `Expense #${expense.receipt_id || expense.description}` },
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
                  <p className="text-muted-foreground">Receipt #{expense.receipt_id || expense.description}</p>
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
              {EDITABLE_STATUSES.includes(expense.status.toUpperCase()) && (
                <div className="flex items-center gap-2">
                  {!isEditing ? (
                    <Button
                      onClick={handleEdit}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Edit3 className="h-4 w-4" />
                      Edit
                    </Button>
                  ) : (
                    <Button
                      onClick={handleCancel}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <X className="h-4 w-4" />
                      Cancel
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {isMileageExpense(expense) ? (
          <MileagePage mode="view" expenseData={expense} />
        ) : isPerDiemExpense(expense) ? (
          <PerdiemPage mode="view" expenseData={expense} />
        ) : (
          <ExpenseDetailsStep
            onBack={() => {
              if (returnTo === 'create') {
                window.location.href = '/expenses/create';
              } else {
                window.history.back();
              }
            }}
            onSubmit={handleExpenseSubmit}
            loading={saving}
            parsedData={null}
            uploadedFile={null}
            previewUrl={receiptSignedUrl}
            readOnly={!isEditing}
            expenseData={transformExpenseToFormData(expense, policies)}
            receiptUrls={receiptSignedUrl ? [receiptSignedUrl] : []}
            isEditMode={isEditing}
            receiptLoading={receiptLoading}
          />
        )}
      </div>
    </Layout>
  );
}