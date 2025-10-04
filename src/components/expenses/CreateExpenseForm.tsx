import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { expenseService, CreateExpenseData } from '@/services/expenseService';
import { ParsedInvoiceData } from '@/services/fileParseService';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { UploadReceiptStep } from './UploadReceiptStep';
import { ExpenseDetailsStep } from './ExpenseDetailsStep';
import { StepNavigation } from './StepNavigation';

// Form schema for step 2
type ExpenseFormValues = {
  policyId: string;
  categoryId: string;
  invoiceNumber: string;
  merchant: string;
  amount: string;
  dateOfExpense: Date;
  comments?: string;
  city?: string;
  source?: string;
  destination?: string;
};

export function CreateExpenseForm() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1 data
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ParsedInvoiceData | null>(null);

  // Dialog for duplicate expenses
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [pendingSubmitData, setPendingSubmitData] = useState<ExpenseFormValues | null>(null);

  const stepTitles = ['Upload Receipt', 'Expense Details'];

  const handleStep1Next = (data: {
    uploadedFile: File | null;
    parsedData: ParsedInvoiceData | null;
    previewUrl: string;
  }) => {
    setUploadedFile(data.uploadedFile);
    setPreviewUrl(data.previewUrl);
    setParsedData(data.parsedData);
    
    
    setCurrentStep(2);
  };

  const handleStep2Back = () => {
    setCurrentStep(1);
  };

  const actuallySubmit = async (data: ExpenseFormValues) => {
    setLoading(true);
    try {
      // Convert date format from Date to YYYY-MM-DD
      const formattedDate = format(data.dateOfExpense, 'yyyy-MM-dd');


      const expenseData: CreateExpenseData = {
        amount: parseFloat(data.amount),
        category_id: data.categoryId, // Use category ID from form
        description: data.comments || data.merchant || 'Expense description',
        expense_date: formattedDate,
        expense_policy_id: data.policyId, // Use policy ID from form
        vendor: data.merchant,
        receipt_id: parsedData?.id || undefined,
        invoice_number: data.invoiceNumber || parsedData?.ocr_result?.invoice_number || null
      };
      const result = await expenseService.createExpense(expenseData);
      if (result.success) {
        toast.success(result.message);
        navigate('/expenses');
      } else {
        // Show detailed validation error if available, otherwise show general error
        if (result.validation_details) {
          toast.error(`Daily limit exceeded. Current: ${result.validation_details.current_daily_total}, New: ${result.validation_details.new_amount}, Limit: ${result.validation_details.daily_limit}`);
        } else {
          toast.error(result.message);
        }
      }
    } catch {
      toast.error('Failed to create expense');
    } finally {
      setLoading(false);
      setPendingSubmitData(null);
      setShowDuplicateDialog(false);
    }
  };

  const handleStep2Submit = async (data: ExpenseFormValues) => {
    if (parsedData?.is_invoice_flagged) {
      setPendingSubmitData(data);
      setShowDuplicateDialog(true);
      return;
    }
    await actuallySubmit(data);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
     

      {/* Step Navigation */}
      <div className="w-full">
        <StepNavigation 
          currentStep={currentStep} 
          totalSteps={2} 
          stepTitles={stepTitles}
          isManualEntry={currentStep === 2 && !uploadedFile}
        />
                             </div>

      {/* Step Content */}
      {currentStep === 1 ? (
        <UploadReceiptStep 
          onNext={handleStep1Next}
          onBack={() => navigate(-1)}
        />
      ) : (
        <ExpenseDetailsStep
          onBack={handleStep2Back}
          onSubmit={handleStep2Submit}
          loading={loading}
          parsedData={parsedData}
          uploadedFile={uploadedFile}
          previewUrl={previewUrl}
        />
      )}

      {/* Duplicate Dialog */}
      <AlertDialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader className="text-center pb-2">
            <AlertDialogTitle className="text-xl font-semibold text-gray-900 text-center">
              Duplicate Expense Detected
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 mt-3 leading-relaxed text-center">
              This expense appears to match existing records in your system
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="flex gap-3 pt-1">
            <AlertDialogCancel
                onClick={() => {
                  setShowDuplicateDialog(false);
                  setPendingSubmitData(null);
                }}
                className="flex-1 h-11 bg-gray-100 hover:bg-gray-200 text-gray-900 border-gray-200"
            >
              Cancel
            </AlertDialogCancel>
            <Button
                onClick={() => {
                  if (pendingSubmitData) {
                    actuallySubmit(pendingSubmitData);
                  }
                }}
                disabled={loading}
                className="flex-1 h-11 bg-amber-300 hover:bg-amber-400 text-black"
            >
              {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting
                  </>
              ) : (
                  'Continue Anyway'
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

