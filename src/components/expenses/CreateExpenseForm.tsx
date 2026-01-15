import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { expenseService } from "@/services/expenseService";
import { ParsedInvoiceData } from "@/services/fileParseService";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog";
import { UploadReceiptStep } from "./UploadReceiptStep";
import { useExpenseStore } from "@/store/expenseStore";
import { formatCurrency, getOrgCurrency } from "@/lib/utils";
import { ExpenseDetailsStep2 } from "./ExpenseDetailsStep2";
import { getTemplates, type Template } from "@/services/admin/templates";
import { trackEvent } from "@/mixpanel";
import { format } from "date-fns";

// Form schema for step 2
type ExpenseFormValues = {
  expense_policy_id: string;
  category_id: string;
  invoice_number: string;
  vendor: string;
  amount: string;
  expense_date: Date;
  descriotion?: string;
  city?: string;
  source?: string;
  destination?: string;
  foreign_currency?: string | null;
  currency?: string;
  api_conversion_rate?: string | null;
  user_conversion_rate?: string | null;
};

export function getYesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return format(d, "yyyy-MM-dd");
}

export function CreateExpenseForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { parsedData, setParsedData, setSelectedPreApproval } =
    useExpenseStore();
  const baseCurrency = getOrgCurrency();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  // const [parsedData, setParsedData] = useState<ParsedInvoiceData | null>(null);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [uploadStepKey, setUploadStepKey] = useState(0);
  const [isReceiptReplaced, setIsReceiptReplaced] = useState(false);
  const [templateEntities, setTemplateEntities] = useState<
    Template["entities"]
  >([]);

  useEffect(() => {
    if (currentStep === 2) {
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
      loadTemplateEntities();
    }
  }, [currentStep]);

  useEffect(() => {
    const shouldShowDialog = localStorage.getItem("showDuplicateDialog");
    const savedParsedData = localStorage.getItem("duplicateParsedData");
    const savedPreviewUrl = localStorage.getItem("duplicatePreviewUrl");

    if (shouldShowDialog === "true" && savedParsedData && savedPreviewUrl) {
      try {
        const parsedDataFromStorage = JSON.parse(savedParsedData);
        const previewUrlFromStorage = savedPreviewUrl;

        setParsedData(parsedDataFromStorage);
        setPreviewUrl(previewUrlFromStorage);
        setShowDuplicateDialog(true);

        localStorage.removeItem("showDuplicateDialog");
        localStorage.removeItem("duplicateParsedData");
        localStorage.removeItem("duplicatePreviewUrl");
      } catch (error) {
        console.error("Error parsing saved data:", error);
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
    if (data.parsedData) setParsedData(data.parsedData);
    setCurrentStep(2);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleDuplicateDetected = async (data: {
    parsedData: ParsedInvoiceData;
    uploadedFile: File;
    previewUrl: string;
  }) => {
    try {
      const base64Url = await fileToBase64(data.uploadedFile);
      setParsedData(data.parsedData);
      setUploadedFile(data.uploadedFile);
      setPreviewUrl(base64Url);
      setShowDuplicateDialog(true);
    } catch (error) {
      console.error("Error converting file to base64:", error);
      setParsedData(data.parsedData);
      setUploadedFile(data.uploadedFile);
      setPreviewUrl(data.previewUrl);
      setShowDuplicateDialog(true);
    }
  };

  const handleStep2Back = () => {
    setCurrentStep(1);
  };

  const actuallySubmit = async (formData: any) => {
    setLoading(true);
    try {
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

      const customAttributes: Record<string, string> = {};
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
              customAttributes[key] = value;
            }
          }
        });
      }

      // if (formData.advance_account_id) {
      //   customAttributes["advance_account_id"] = formData.advance_account_id;
      // }

      let result;
      if (formData.invoice_number) {
        // Regular expense with invoice number
        const expensePayload: any = {
          expense_policy_id: formData.expense_policy_id,
          category_id: formData.category_id,
          amount: parseFloat(formData.amount),
          expense_date:
            formData.expense_date instanceof Date
              ? format(formData.expenseDate, "yyyy-MM-dd")
              : formData.expense_date,
          vendor: formData.vendor,
          invoice_number: formData.invoice_number,
          description: formData.description,
          receipt_id: formData.receipt_id,
          currency: formData.currency || baseCurrency || "INR",
          advance_account_id: formData.advance_account_id
        };

        if (formData.advance_id)
          expensePayload.advance_id = formData.advance_id;
        if (formData.pre_approval_id)
          expensePayload.pre_approval_id = formData.pre_approval_id;
        if (formData.foreign_amount)
          expensePayload.foreign_amount = parseFloat(formData.foreign_amount);
        if (formData.foreign_currency)
          expensePayload.foreign_currency = formData.foreign_currency;
        if (formData.api_conversion_rate)
          expensePayload.api_conversion_rate = parseFloat(
            formData.api_conversion_rate
          );
        if (formData.user_conversion_rate)
          expensePayload.user_conversion_rate = parseFloat(
            formData.user_conversion_rate
          );

        if (Object.keys(customAttributes).length > 0) {
          expensePayload.custom_attributes = customAttributes;
        }
        console.log(expensePayload);

        result = await expenseService.createExpense(expensePayload);
        if (result?.success && result.data?.id) {
          await expenseService.validateExpense(result.data.id);
        }
      } else if (formData.start_location) {
        // Mileage expense
        const expenseData: any = {
          expense_policy_id: formData.expense_policy_id || formData.policyId,
          category_id: formData.category_id || formData.categoryId,
          amount: parseFloat(formData.amount),
          expense_date:
            formData.expense_date instanceof Date
              ? format(formData.expenseDate, "yyyy-MM-dd")
              : formData.expense_date,
          description: formData.description,
          vendor: formData.vendor || formData.merchant,
          receipt_id: formData.receipt_id,
          distance: formData.distance ? parseFloat(formData.distance) : null,
          distance_unit: formData.distance_unit || null,
          end_location: formData.end_location || null,
          start_location: formData.start_location,
          mileage_rate_id: formData.mileage_rate_id,
          mileage_meta: formData.mileage_meta || null,
          is_round_trip: formData.is_round_trip === "true" ? true : false,
          currency: baseCurrency,
        };

        if (formData.invoice_number || formData.invoiceNumber) {
          expenseData.invoice_number =
            formData.invoice_number || formData.invoiceNumber;
        }
        if (formData.advance_id) expenseData.advance_id = formData.advance_id;
        if (formData.pre_approval_id)
          expenseData.pre_approval_id = formData.pre_approval_id;
        delete customAttributes.advance_account_id;
        if (Object.keys(customAttributes).length > 0) {
          expenseData.custom_attributes = customAttributes;
        }

        result = await expenseService.createExpense(expenseData);
      }
      if (result?.success) {
        toast.success(result.message);
        navigate("/expenses");
        setParsedData(null);
      } else {
        toast.error(result?.message || "Failed to create expense");
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message);
      navigate("/expenses");
    } finally {
      setLoading(false);
      setShowDuplicateDialog(false);
    }
  };

  const handleStep2Submit = async (data: ExpenseFormValues) => {
    trackEvent("Create Expense Button Clicked", {
      button_name: "Create Expense",
    });
    await actuallySubmit(data);
  };

  useEffect(() => {
    setSelectedPreApproval(null);
  }, []);

  return (
    <div className="space-y-6">
      {/* Step Content */}
      {currentStep === 1 ? (
        <UploadReceiptStep
          key={uploadStepKey}
          onNext={handleStep1Next}
          onBack={() => navigate(-1)}
          onDuplicateDetected={handleDuplicateDetected}
          type="upload"
        />
      ) : (
        <ExpenseDetailsStep2
          onBack={handleStep2Back}
          onSubmit={handleStep2Submit}
          mode="create"
          loading={loading}
          isReceiptReplaced={isReceiptReplaced}
          setIsReceiptReplaced={setIsReceiptReplaced}
          uploadedFile={uploadedFile}
          previewUrl={previewUrl}
        />
      )}

      <AlertDialog
        open={showDuplicateDialog}
        onOpenChange={setShowDuplicateDialog}
      >
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
                      {parsedData?.ocr_result?.vendor || "Unknown Merchant"}
                    </div>
                    <div className="text-sm text-gray-600">
                      Expense #{parsedData?.original_expense_id || "Unknown"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gray-900">
                      {formatCurrency(
                        +(parsedData?.extracted_amount || 0) ||
                          +parsedData?.ocr_result?.amount
                      )}
                    </div>
                    <div className="text-sm text-gray-600">
                      {parsedData?.extracted_date
                        ? new Date(
                            parsedData.extracted_date
                          ).toLocaleDateString("en-GB", {
                            weekday: "short",
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : parsedData?.ocr_result?.date}
                    </div>
                  </div>
                </div>
              </div>

              {parsedData?.original_expense_id && (
                <div
                  className="flex items-center text-blue-600 text-sm cursor-pointer hover:text-blue-700"
                  onClick={() => {
                    navigate(
                      `/expenses/${parsedData.original_expense_id}?returnTo=create`
                    );
                  }}
                >
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
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
                localStorage.removeItem("showDuplicateDialog");
                localStorage.removeItem("duplicateParsedData");
                localStorage.removeItem("duplicatePreviewUrl");
                setUploadStepKey((prev) => prev + 1);
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
