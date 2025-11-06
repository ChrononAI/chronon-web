import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { expenseService, CreateExpenseData } from '@/services/expenseService';
import { ParsedInvoiceData } from '@/services/fileParseService';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription } from '@/components/ui/alert-dialog';
import { UploadReceiptStep } from './UploadReceiptStep';
import { ExpenseDetailsStep } from './ExpenseDetailsStep';
import { StepNavigation } from './StepNavigation';
import { useExpenseStore } from '@/store/expenseStore';

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
  pre_approval_id?: string | null;
  advance_id?: string | null;
  foreign_currency?: string | null;
};

export function CreateExpenseForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { parsedData, setParsedData, selectedPreApproval } = useExpenseStore();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  // const [parsedData, setParsedData] = useState<ParsedInvoiceData | null>(null);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [uploadStepKey, setUploadStepKey] = useState(0);
  const [isReceiptReplaced, setIsReceiptReplaced] = useState(false);

  const stepTitles = ['Upload Receipt', 'Expense Details'];

  const fetchReceipt = async (receiptId: string, orgId: string) => {
      console.log(receiptId, orgId)
      try {
        const response: any = await expenseService.fetchReceiptPreview(receiptId, orgId);
        setPreviewUrl(response.data.data.signed_url);
      } catch (error) {
        console.log(error);
        toast.error('Failed to fetch receipt image');
      }
    }

  useEffect(() => {
    const shouldShowDialog = localStorage.getItem('showDuplicateDialog');
    const savedParsedData = localStorage.getItem('duplicateParsedData');
    const savedPreviewUrl = localStorage.getItem('duplicatePreviewUrl');
    
    if (shouldShowDialog === 'true' && savedParsedData && savedPreviewUrl) {
      try {
        const parsedDataFromStorage = JSON.parse(savedParsedData);
        const previewUrlFromStorage = savedPreviewUrl;
        
        setParsedData(parsedDataFromStorage);
        setPreviewUrl(previewUrlFromStorage);
        // Note: uploadedFile is not restored from localStorage as it's a File object
        // but previewUrl should be sufficient for display
        setShowDuplicateDialog(true);
        
        localStorage.removeItem('showDuplicateDialog');
        localStorage.removeItem('duplicateParsedData');
        localStorage.removeItem('duplicatePreviewUrl');
      } catch (error) {
        console.error('Error parsing saved data:', error);
      }
    }
  }, [location]);

  const handleStep1Next = (data: {
    uploadedFile: File | null;
    parsedData: ParsedInvoiceData | null;
    previewUrl: string;
  }) => {
    setUploadedFile(data.uploadedFile);
    setPreviewUrl(data.previewUrl);
    if(data.parsedData) setParsedData(data.parsedData);
    setCurrentStep(2);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleDuplicateDetected = async (data: { parsedData: ParsedInvoiceData; uploadedFile: File; previewUrl: string }) => {
    try {
      const base64Url = await fileToBase64(data.uploadedFile);
      setParsedData(data.parsedData);
      setUploadedFile(data.uploadedFile);
      setPreviewUrl(base64Url);
      setShowDuplicateDialog(true);
    } catch (error) {
      console.error('Error converting file to base64:', error);
      setParsedData(data.parsedData);
      setUploadedFile(data.uploadedFile);
      setPreviewUrl(data.previewUrl);
      setShowDuplicateDialog(true);
    }
  };

  const handleStep2Back = () => {
    setCurrentStep(1);
  };

  const actuallySubmit = async (data: ExpenseFormValues) => {
    // setLoading(true);
    const copiedData = JSON.parse(JSON.stringify(data));
    let isForeign = false;
    const curr = selectedPreApproval?.currency_conversion_rates?.find((cur) => cur.currency === copiedData.foreign_currency);
    if (copiedData.foreign_currency !== "INR" && selectedPreApproval?.currency_conversion_rates) {
      isForeign = true;
    }
    try {
      const formattedDate = format(data.dateOfExpense, 'yyyy-MM-dd');

      const expenseData: CreateExpenseData = {
        amount: isForeign ? (+copiedData.amount * (curr ? +curr.rate : 0)) : parseFloat(data.amount),
        foreign_amount: isForeign ? parseFloat(data.amount) : null,
        foreign_currency: isForeign ? data.foreign_currency : null,
        category_id: data.categoryId,
        description: data.comments || data.merchant || 'Expense description',
        expense_date: formattedDate,
        expense_policy_id: data.policyId,
        vendor: data.merchant,
        receipt_id: parsedData?.id || undefined,
        invoice_number: data.invoiceNumber || parsedData?.ocr_result?.invoice_number || null,
        advance_id: data.advance_id || undefined,
        pre_approval_id: data.pre_approval_id || undefined
      };
      const result = await expenseService.createExpense(expenseData);
      if (result.success) {
        toast.success(result.message);
        navigate('/expenses');
      } else {
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
      setShowDuplicateDialog(false);
    }
  };

  const handleStep2Submit = async (data: ExpenseFormValues) => {
    await actuallySubmit(data);
  };

  return (
    <div className="space-y-6">
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
          key={uploadStepKey}
          onNext={handleStep1Next}
          onBack={() => navigate(-1)}
          onDuplicateDetected={handleDuplicateDetected}
          type='upload'
        />
      ) : (
        <ExpenseDetailsStep
          onBack={handleStep2Back}
          mode="create"
          onSubmit={handleStep2Submit}
          loading={loading}
          uploadedFile={uploadedFile}
          previewUrl={previewUrl}
          fetchReceipt={fetchReceipt}
          isReceiptReplaced={isReceiptReplaced}
          setIsReceiptReplaced={setIsReceiptReplaced}
        />
      )}

      <AlertDialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader className="text-center pb-4">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-lg font-bold">!</span>
                </div>
              </div>
            </div>
            <AlertDialogTitle className="text-xl font-bold text-gray-900">
              Duplicate Receipt Detected!
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 mt-3 leading-relaxed">
              This receipt appears to be a duplicate of an existing expense:
            </AlertDialogDescription>
          </AlertDialogHeader>
          {parsedData?.ocr_result && (
            <div className="space-y-4 mb-4">
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-bold text-gray-900">
                      {parsedData?.ocr_result?.vendor || 'Unknown Merchant'}
                    </div>
                    <div className="text-sm text-gray-600">
                      Expense #{parsedData?.original_expense_id || 'Unknown'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gray-900">
                      ₹{parsedData?.extracted_amount || parsedData?.ocr_result?.amount}
                    </div>
                    <div className="text-sm text-gray-600">
                      {parsedData?.extracted_date ? new Date(parsedData.extracted_date).toLocaleDateString('en-GB', { 
                        weekday: 'short', 
                        day: '2-digit', 
                        month: 'short', 
                        year: 'numeric' 
                      }) : parsedData?.ocr_result?.date}
                    </div>
                  </div>
                </div>
              </div>
              
              
              {parsedData?.original_expense_id && (
                <div 
                  className="flex items-center text-blue-600 text-sm cursor-pointer hover:text-blue-700"
                  onClick={async () => {
                    try {
                      const base64Url = uploadedFile ? await fileToBase64(uploadedFile) : previewUrl;
                      localStorage.setItem('showDuplicateDialog', 'true');
                      localStorage.setItem('duplicateParsedData', JSON.stringify(parsedData));
                      localStorage.setItem('duplicatePreviewUrl', base64Url || '');
                      navigate(`/expenses/${parsedData.original_expense_id}?returnTo=create`);
                    } catch (error) {
                      console.error('Error converting file to base64:', error);
                      localStorage.setItem('showDuplicateDialog', 'true');
                      localStorage.setItem('duplicateParsedData', JSON.stringify(parsedData));
                      localStorage.setItem('duplicatePreviewUrl', previewUrl || '');
                      navigate(`/expenses/${parsedData.original_expense_id}?returnTo=create`);
                    }
                  }}
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  Tap to view expense
                </div>
              )}
            </div>
          )}

          <div className="space-y-3 pt-2">
            <Button
                onClick={() => {
                  setShowDuplicateDialog(false);
                  setUploadedFile(null);
                  setPreviewUrl(null);
                  setParsedData(null);
                  localStorage.removeItem('showDuplicateDialog');
                  localStorage.removeItem('duplicateParsedData');
                  localStorage.removeItem('duplicatePreviewUrl');
                  setUploadStepKey(prev => prev + 1);
                  setCurrentStep(1);
                }}
                className="w-full h-12 bg-blue-500 hover:bg-blue-600 text-white font-medium"
            >
              Upload New Receipt
            </Button>
            <Button
                variant="outline"
                onClick={() => {
                  setShowDuplicateDialog(false);
                  setCurrentStep(2);
                }}
                className="w-full h-12 bg-blue-50 hover:bg-blue-100 text-blue-600 border-blue-200 font-medium"
            >
              Create as Duplicate
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

