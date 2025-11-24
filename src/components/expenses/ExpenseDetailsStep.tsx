import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { getOrgIdFromToken } from "@/lib/jwtUtils";
import api from "@/lib/api";
import {
  ArrowLeft,
  Calendar,
  Loader2,
  FileText,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RefreshCw,
  Maximize2,
  Download,
  X,
  ChevronDown,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn, formatCurrency, getOrgCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { expenseService } from "@/services/expenseService";
import { Policy, PolicyCategory } from "@/types/expense";
import { ExpenseComments } from "./ExpenseComments";
import {
  fileParseService,
  ParsedInvoiceData,
} from "@/services/fileParseService";
import { useExpenseStore } from "@/store/expenseStore";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { useNavigate } from "react-router-dom";
import {
  preApprovalService,
  PreApprovalType,
} from "@/services/preApprovalService";
import { AdvanceService, AdvanceType } from "@/services/advanceService";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Copy, ExternalLink } from "lucide-react";
import { getYesterday } from "./CreateExpenseForm";
import { useAuthStore } from "@/store/authStore";

// Form schema
const expenseSchema = z.object({
  policyId: z.string().min(1, "Please select a policy"),
  categoryId: z.string().min(1, "Please select a category"),
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  merchant: z.string().min(1, "Merchant is required"),
  amount: z.string().min(1, "Amount is required"),
  base_currency_amount: z.string().optional(),
  dateOfExpense: z.date({
    required_error: "Date is required",
  }),
  comments: z.string().min(1, "Description is required"),
  // Conveyance specific fields
  city: z.string().optional(),
  source: z.string().optional(),
  destination: z.string().optional(),
  pre_approval_id: z.string().nullable().optional(),
  advance_id: z.string().nullable().optional(),
  foreign_currency: z.string().optional().default("INR").nullable(),
  currency: z.string().optional().default("INR"),
  foreign_amount: z.string().optional().nullable(),
  user_conversion_rate: z.string().optional(),
  api_conversion_rate: z.string().min(1, "Conversion rate is required"),
});

type ExpenseFormValues = z.infer<typeof expenseSchema>;

interface ExpenseDetailsStepProps {
  onBack: () => void;
  onSubmit: (data: ExpenseFormValues) => void;
  mode?: "create" | "edit" | "view";
  loading: boolean;
  isReceiptReplaced?: boolean;
  setIsReceiptReplaced?: any;
  uploadedFile: File | null;
  previewUrl: string | null;
  fetchReceipt?: any;
  readOnly?: boolean;
  expenseData?: ExpenseFormValues;
  receiptUrls?: string[];
  isEditMode?: boolean;
  foreign_currency?: string | null;
  currency?: string | null;
  expense?: any; // Full expense object with original_expense_id
}

export function ExpenseDetailsStep({
  onBack,
  onSubmit,
  loading,
  isReceiptReplaced,
  setIsReceiptReplaced,
  uploadedFile,
  previewUrl,
  fetchReceipt,
  readOnly = false,
  expenseData,
  receiptUrls = [],
  isEditMode = false,
  expense,
}: ExpenseDetailsStepProps) {
  const navigate = useNavigate();
  const { orgSettings } = useAuthStore();
  const orgId = getOrgIdFromToken();
  const {
    parsedData,
    setParsedData,
    selectedPreApproval,
    setSelectedPreApproval,
  } = useExpenseStore();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [duplicateReceiptUrl, setDuplicateReceiptUrl] = useState<string | null>(
    null
  );
  const [duplicateReceiptLoading, setDuplicateReceiptLoading] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const showPreApproval = selectedPolicy?.is_pre_approval_required;
  const [preApprovals, setPreApprovals] = useState<PreApprovalType[]>([]);
  const [selectedCategory, setSelectedCategory] =
    useState<PolicyCategory | null>(null);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [replaceRecLoading, setReplaceRecLoading] = useState(false);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [advances, setAdvances] = useState<AdvanceType[]>([]);
  // const [selectedAdvance, setSelectedAdvance] = useState<AdvanceType | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState(getOrgCurrency());
  const [shouldGetConversion, setShouldGetConversion] = useState(!Boolean(expenseData));
  const [showConversion, setShowConversion] = useState(false);
  const conversionRates = selectedPreApproval?.currency_conversion_rates || [];

  const selectedConversion = conversionRates?.find(
    (con) => con.currency === selectedCurrency
  );

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: expenseData
      ? expenseData
      : {
          policyId: "",
          categoryId: "",
          invoiceNumber: "",
          merchant: "",
          amount: "",
          dateOfExpense: new Date(),
          comments: "",
          city: "",
          source: "",
          destination: "",
          pre_approval_id: "",
          advance_id: "",
          foreign_currency: getOrgCurrency(),
          currency: getOrgCurrency(),
        },
  });

  const userRate = form.watch("user_conversion_rate");
  const apiRate = form.watch("api_conversion_rate");

  const baseAmount =
    selectedConversion && +form.getValues("amount") * +selectedConversion?.rate;

  // Fetch signed URL for duplicate receipts
  const fetchDuplicateReceiptUrl = async (receiptId: string) => {
    try {
      setDuplicateReceiptLoading(true);
      if (!orgId) return;

      const response = await api.get(
        `/receipts/${receiptId}/signed-url?org_id=${orgId}`
      );
      if (response.data.status === "success" && response.data.data.signed_url) {
        setDuplicateReceiptUrl(response.data.data.signed_url);
      }
    } catch (error) {
      console.error("Error fetching duplicate receipt signed URL:", error);
    } finally {
      setDuplicateReceiptLoading(false);
    }
  };

  const getApprovedPreApprovals = async () => {
    try {
      const response: any = await preApprovalService.getPreApprovalsByStatus({
        status: "APPROVED",
        page: 1,
        perPage: 25,
      });
      setPreApprovals(response?.data.data);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    if (selectedPolicy && selectedPolicy.is_pre_approval_required) {
      getApprovedPreApprovals();
    }
  }, [selectedPolicy]);

  // Receipt viewer states
  const [isReceiptFullscreen, setIsReceiptFullscreen] = useState(false);
  const [activeReceiptTab, setActiveReceiptTab] = useState<
    "receipt" | "comments"
  >("receipt");
  const [receiptZoom, setReceiptZoom] = useState(1);
  const [receiptRotation, setReceiptRotation] = useState(0);

  // Fetch signed URL for duplicate receipts when component mounts
  useEffect(() => {
    if (
      parsedData?.id &&
      !readOnly &&
      !receiptUrls.length &&
      !duplicateReceiptUrl &&
      !duplicateReceiptLoading
    ) {
      fetchDuplicateReceiptUrl(parsedData.id);
    }
  }, [
    parsedData?.id,
    readOnly,
    receiptUrls.length,
    duplicateReceiptUrl,
    duplicateReceiptLoading,
    fetchDuplicateReceiptUrl,
  ]);

  const getApprovedAdvances = async () => {
    try {
      const res: any = await AdvanceService.getAdvancesByStatus({
        status: "APPROVED",
        page: 1,
        perPage: 25,
      });
      setAdvances(res.data.data);
    } catch (error) {
      console.log(error);
    }
  };

  const getCurrencyConversion = async ({
    date,
    from,
    to,
  }: {
    date: string;
    from: string;
    to: string;
  }) => {
    try {
      const res = await expenseService.getCurrencyConversionRate({
        date,
        to,
        from,
      });
      const conversion = res.data.data.exchange_rate;
      form.setValue(
        "base_currency_amount",
        `${(+conversion * +form.getValues("amount")).toFixed(3)}`
      );
      form.setValue('user_conversion_rate', conversion);
      form.setValue("api_conversion_rate", conversion);
      // form.setValue("user_conversion_rate", conversion);
      setShowConversion(true);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    if (form.watch('currency') !== getOrgCurrency()) {
      setShowConversion(true);
      setShouldGetConversion(true);
    } else {
      setShowConversion(false);
    }
  }, [form.watch('currency')]);
  
  useEffect(() => {
    if ((form.getValues("currency") !== getOrgCurrency()) && shouldGetConversion) {
      const yesterday = getYesterday();
      getCurrencyConversion({
        date: yesterday,
        from: form.getValues("currency"),
        to: getOrgCurrency(),
      });
      setShowConversion(true);
    } else {
      form.setValue("api_conversion_rate", "0");
    }
  }, [form.watch("currency")]);

  useEffect(() => {
    if (form.getValues("user_conversion_rate") && form.getValues("amount")) {
      form.setValue(
        "base_currency_amount",
        `${(
          +(form.getValues("user_conversion_rate") || 0) *
          +form.getValues("amount")
        ).toFixed(3)}`
      );
    }
  }, [form.watch("user_conversion_rate"), form.watch("amount")]);

  useEffect(() => {
    loadPoliciesWithCategories();
    getApprovedAdvances();
  }, []);

  // Update form values when expenseData changes
  useEffect(() => {
    if (expenseData && !isReceiptReplaced) {
      form.reset(expenseData);
      // Set selected policy and category based on form data
      if (expenseData.foreign_amount && expenseData.foreign_currency) {
        setShowConversion(true);
        form.setValue("amount", expenseData.amount);
        form.setValue("foreign_currency", expenseData.foreign_currency);
        form.setValue('base_currency_amount', expenseData.foreign_amount)
      }
      if (expenseData.policyId && policies.length > 0) {
        const policy = policies.find((p) => p.id === expenseData.policyId);
        if (policy) {
          setSelectedPolicy(policy);
          form.setValue("policyId", expenseData.policyId);

          if (expenseData.categoryId) {
            const category = policy.categories.find(
              (c) => c.id === expenseData.categoryId
            );
            if (category) {
              setSelectedCategory(category);
              form.setValue("categoryId", expenseData.categoryId);
            }
          }
        }
      }
      if (expenseData.foreign_currency) {
        setSelectedCurrency(expenseData.foreign_currency);
      }
      // if (expenseData.advance_id && advances.length > 0) {
      //   const adv = advances.find((a) => a.id === expenseData.advance_id);
      //   if (adv) {
      //     setSelectedAdvance(adv)
      //     form.setValue('advance_id', expenseData.advance_id);
      //   };
      // }
      if (expenseData.pre_approval_id && preApprovals.length > 0) {
        const preApp = preApprovals.find(
          (a) => a.id === expenseData.pre_approval_id
        );
        if (preApp) {
          setSelectedPreApproval(preApp);
          form.setValue("pre_approval_id", expenseData.pre_approval_id);
        }
      }
    }
  }, [form, policies, preApprovals, advances]);

  // Auto-fill fields from parsed data
  useEffect(() => {
    if (parsedData && parsedData.ocr_result) {
      const ocrData = parsedData.ocr_result;

      if (ocrData.amount) {
        // Clean amount by removing currency symbols and commas
        const cleanAmount = ocrData.amount
          .replace(/[^\d.,]/g, "")
          .replace(/,/g, "");
        form.setValue("amount", cleanAmount);
      }

      if (ocrData.vendor) {
        form.setValue("merchant", ocrData.vendor);
      }

      if (ocrData.invoice_number) {
        form.setValue("invoiceNumber", ocrData.invoice_number);
      }

      if (ocrData.date) {
        // Parse the date string and convert to Date object
        const parsedDate = new Date(parsedData.extracted_date || "");
        if (!isNaN(parsedDate.getTime())) {
          form.setValue("dateOfExpense", parsedDate);
        }
      }
    }
  }, [parsedData, form]);

  const loadPoliciesWithCategories = async () => {
    try {
      const policiesData = await expenseService.getPoliciesWithCategories();
      setPolicies(policiesData);
    } catch (error) {
      console.error("Error loading policies:", error);
    }
  };

  // Receipt viewer functions
  const handleReceiptZoomIn = () => {
    setReceiptZoom((prev) => Math.min(prev + 0.25, 3));
  };

  const handleReceiptZoomOut = () => {
    setReceiptZoom((prev) => Math.max(prev - 0.25, 0.5));
  };

  const handleReceiptRotate = () => {
    setReceiptRotation((prev) => (prev + 90) % 360);
  };

  const handleReceiptReset = () => {
    setReceiptZoom(1);
    setReceiptRotation(0);
  };

  const handleReceiptFullscreen = () => {
    setIsReceiptFullscreen(true);
  };

  const handleReceiptDownload = () => {
    if (uploadedFile) {
      const url = URL.createObjectURL(uploadedFile);
      const a = document.createElement("a");
      a.href = url;
      a.download = uploadedFile.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return;
    }

    const sourceUrl =
      previewUrl ||
      duplicateReceiptUrl ||
      (readOnly && receiptUrls.length > 0 ? receiptUrls[0] : null);

    if (sourceUrl) {
      window.open(sourceUrl, "_blank", "noopener,noreferrer");
    }
  };

  const [semiParsedData, setSemiParsedData] =
    useState<ParsedInvoiceData | null>(null);

  const uploadNewReceipt = async (file: File) => {
    const orgId = getOrgIdFromToken();
    try {
      setReplaceRecLoading(true);
      const parsedData = await fileParseService.parseInvoiceFile(file);
      if (parsedData.is_duplicate_receipt) {
        setSemiParsedData(parsedData);
        setShowDuplicateDialog(true);
      } else {
        setParsedData(parsedData);
        fetchReceipt(parsedData.id, orgId);
        setIsReceiptReplaced(true);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setReplaceRecLoading(false);
    }
  };

  const handleReplaceReceipt = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf,image/*";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        uploadNewReceipt(file);
      }
    };
    input.click();
  };

  const isConveyanceCategory = selectedCategory?.name === "Conveyance 2W";
  const availableCategories = selectedPolicy?.categories || [];

  useEffect(() => {
    if (parsedData?.recommended_policy_id && parsedData?.recommended_category) {
      const selectedPolicy = policies.find(
        (policy) => policy.id === parsedData.recommended_policy_id
      );
      const selectedCategory = selectedPolicy?.categories.find(
        (category) =>
          category.id === parsedData.recommended_category.category_id
      );
      if (selectedPolicy && selectedCategory) {
        setSelectedCategory(selectedCategory);
        setSelectedPolicy(selectedPolicy);
        form.setValue("policyId", selectedPolicy.id);
        form.setValue("categoryId", selectedCategory.id);
      }
    }
  }, [parsedData, policies]);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const isPdfUrl = (url: string | null | undefined) => {
    if (!url) return false;
    const lowerUrl = url.toLowerCase();
    return (
      lowerUrl.includes(".pdf") ||
      lowerUrl.startsWith("data:application/pdf") ||
      lowerUrl.includes("application%2Fpdf")
    );
  };

  const activeReceiptUrl =
    previewUrl ||
    duplicateReceiptUrl ||
    (readOnly && receiptUrls.length > 0 ? receiptUrls[0] : null);

  const receiptDisplayName =
    uploadedFile?.name ||
    (readOnly && receiptUrls.length > 0
      ? `Receipt ${receiptUrls.length > 1 ? "1" : ""}`
      : activeReceiptUrl
      ? "Receipt preview"
      : "No receipt uploaded");

  const receiptDisplayType = uploadedFile
    ? uploadedFile.type.toLowerCase().includes("pdf")
      ? "PDF"
      : "Image"
    : activeReceiptUrl
    ? isPdfUrl(activeReceiptUrl)
      ? "PDF"
      : "Image"
    : null;

  const isPdfReceipt =
    (uploadedFile && uploadedFile.type.toLowerCase().includes("pdf")) ||
    isPdfUrl(activeReceiptUrl);

  const hasReceipt = Boolean(activeReceiptUrl);
  const isLoadingReceipt = replaceRecLoading || duplicateReceiptLoading;
  const inputFieldClass =
    "h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm shadow-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0";
  const selectTriggerClass =
    "h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm shadow-none focus:outline-none focus:ring-1 focus:ring-primary focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0";
  const textareaClass =
    "rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0";

  return (
    <div className="space-y-12">
      {expense?.original_expense_id && (
        <Alert className="bg-yellow-50 border-yellow-200">
          <Copy className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="text-yellow-800">
            Duplicate Expense Detected
          </AlertTitle>
          <AlertDescription className="text-yellow-700">
            This expense has been flagged as a duplicate.
            <Button
              variant="link"
              className="p-0 h-auto text-yellow-700 underline ml-1"
              onClick={() =>
                navigate(`/expenses/${expense.original_expense_id}`)
              }
            >
              View original expense <ExternalLink className="ml-1 h-3 w-3" />
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="relative grid gap-6 md:grid-cols-2 md:items-start">
        <div className="space-y-6 md:sticky md:top-4 md:self-start md:h-[calc(100vh-6rem)] md:overflow-hidden">
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div className="flex items-center gap-3">
                {[
                  { key: "receipt", label: "Receipt" },
                  { key: "comments", label: "Comments" },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() =>
                      setActiveReceiptTab(tab.key as "receipt" | "comments")
                    }
                    className={cn(
                      "rounded-full px-4 py-2 text-sm font-medium transition-all",
                      activeReceiptTab === tab.key
                        ? "bg-primary/10 text-primary"
                        : "text-gray-500 hover:text-gray-900"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {!readOnly && hasReceipt && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleReplaceReceipt}
                  disabled={replaceRecLoading || loading}
                >
                  <RotateCw className="mr-2 h-4 w-4" />
                  Replace receipt
                </Button>
              )}
            </div>

            {activeReceiptTab === "receipt" ? (
              <>
                <div className="md:flex-1 md:overflow-hidden">
                  {isLoadingReceipt ? (
                    <div className="flex flex-col items-center justify-center gap-3 rounded-b-2xl bg-gray-50 p-16 text-center">
                      <Loader2 className="h-10 w-10 animate-spin text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          Loading receipt preview
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Please wait a moment
                        </p>
                      </div>
                    </div>
                  ) : hasReceipt ? (
                    <div className="flex items-center justify-center rounded-b-2xl bg-gray-50 p-6 md:h-full">
                      {isPdfReceipt ? (
                        <embed
                          src={`${activeReceiptUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                          type="application/pdf"
                          className="h-[520px] w-full rounded-xl border border-gray-200 bg-white"
                          style={{
                            transform: `scale(${receiptZoom}) rotate(${receiptRotation}deg)`,
                            transformOrigin: "center",
                          }}
                        />
                      ) : (
                        <img
                          src={activeReceiptUrl ?? ""}
                          alt="Receipt preview"
                          className="max-h-[520px] w-full rounded-xl border border-gray-200 bg-white object-contain"
                          style={{
                            transform: `scale(${receiptZoom}) rotate(${receiptRotation}deg)`,
                            transformOrigin: "center",
                          }}
                          onClick={handleReceiptFullscreen}
                        />
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-3 rounded-b-2xl bg-gray-50 p-16 text-center md:h-full">
                      <FileText className="h-14 w-14 text-gray-300" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          No receipt uploaded
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Upload the receipt in the previous step to see a
                          preview here.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 px-6 py-4">
                  <div className="text-xs text-muted-foreground">
                    <p className="text-sm font-medium text-gray-900">
                      {receiptDisplayName}
                    </p>
                    {receiptDisplayType && (
                      <p className="mt-1 flex items-center gap-2">
                        <span>{receiptDisplayType}</span>
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 p-0"
                      onClick={handleReceiptZoomOut}
                      disabled={!hasReceipt || receiptZoom <= 0.5}
                    >
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 p-0"
                      onClick={handleReceiptZoomIn}
                      disabled={!hasReceipt || receiptZoom >= 3}
                    >
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 p-0"
                      onClick={handleReceiptRotate}
                      disabled={!hasReceipt}
                    >
                      <RotateCw className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 p-0"
                      onClick={handleReceiptReset}
                      disabled={!hasReceipt}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 px-3"
                      onClick={handleReceiptFullscreen}
                      disabled={!hasReceipt}
                    >
                      <Maximize2 className="mr-2 h-4 w-4" />
                      View
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 px-3"
                      onClick={handleReceiptDownload}
                      disabled={!hasReceipt && !uploadedFile}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <ExpenseComments
                expenseId={expense?.id}
                readOnly={false}
                autoFetch={activeReceiptTab === "comments"}
              />
            )}
          </div>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="md:h-[calc(100vh-7rem)] md:overflow-y-auto"
          >
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm md:min-h-full">
              <div className="divide-y divide-gray-100 pb-32">
                <section className="space-y-4 p-6">
                  <div>
                    <h2 className="text-sm font-semibold tracking-wide text-gray-500">
                      CATEGORY
                    </h2>
                  </div>

                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="policyId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Policy *</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={(value) => {
                              field.onChange(value);
                              const policy = policies.find(
                                (p) => p.id === value
                              );
                              setSelectedPolicy(policy || null);
                              setSelectedCategory(null);
                              form.setValue("categoryId", "");
                            }}
                            disabled={readOnly}
                          >
                            <FormControl>
                              <SelectTrigger className={selectTriggerClass}>
                                <SelectValue placeholder="Select a policy">
                                  {field.value && selectedPolicy
                                    ? selectedPolicy.name
                                    : "Select a policy"}
                                </SelectValue>
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {policies.map((policy) => (
                                <SelectItem key={policy.id} value={policy.id}>
                                  <div>
                                    <div className="font-medium">
                                      {policy.name}
                                    </div>
                                    {policy.description && (
                                      <div className="text-sm text-muted-foreground">
                                        {policy.description}
                                      </div>
                                    )}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="categoryId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category *</FormLabel>
                          <Popover
                            open={categoryDropdownOpen}
                            onOpenChange={setCategoryDropdownOpen}
                          >
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={categoryDropdownOpen}
                                  className="h-11 w-full justify-between"
                                  disabled={!selectedPolicy || readOnly}
                                >
                                  <>
                                    <span className="truncate max-w-[85%] overflow-hidden text-ellipsis text-left">
                                      {selectedCategory
                                        ? selectedCategory.name
                                        : !selectedPolicy
                                        ? "Select policy first"
                                        : "Select a category"}
                                    </span>
                                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  </>
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                              <Command>
                                <CommandInput placeholder="Search categories..." />
                                <CommandList>
                                  <CommandEmpty>
                                    No category found.
                                  </CommandEmpty>
                                  <CommandGroup>
                                    {availableCategories.map((category) => (
                                      <CommandItem
                                        key={category.id}
                                        value={category.name}
                                        onSelect={() => {
                                          field.onChange(category.id);
                                          setSelectedCategory(category);
                                          setCategoryDropdownOpen(false);
                                        }}
                                      >
                                        {category.name}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </section>

                <section className="space-y-4 p-6">
                  <div>
                    <h2 className="text-sm font-semibold tracking-wide text-gray-500">
                      RECEIPT DETAILS
                    </h2>
                  </div>

                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="dateOfExpense"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date *</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "h-11 w-full justify-between pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                  disabled={readOnly}
                                >
                                  {field.value ? (
                                    format(field.value, "PPP")
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                  <Calendar className="h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-auto p-0"
                              align="start"
                            >
                              <CalendarComponent
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) =>
                                  date > new Date() ||
                                  date < new Date("1900-01-01")
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid gap-3 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="currency"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Currency *</FormLabel>
                            <FormControl>
                              <Select
                                value={field.value || "INR"}
                                onValueChange={(value) => {
                                  field.onChange(value);
                                  setSelectedCurrency(value);
                                }}
                                disabled={readOnly || !orgSettings.currency_conversion_settings.enabled}
                              >
                                <SelectTrigger className={selectTriggerClass}>
                                  <SelectValue placeholder="Select a currency" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="INR">INR (₹)</SelectItem>
                                  <SelectItem value="USD">USD ($)</SelectItem>
                                  <SelectItem value="EUR">EUR (€)</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="amount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Amount *</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder={
                                  isConveyanceCategory
                                    ? "Auto calculated for conveyance"
                                    : "Enter amount"
                                }
                                type="number"
                                disabled={readOnly}
                                className={inputFieldClass}
                              />
                            </FormControl>
                            <FormMessage />
                            {baseAmount && (
                              <p className="text-xs text-muted-foreground">
                                {formatCurrency(baseAmount)}
                              </p>
                            )}
                          </FormItem>
                        )}
                      />
                      {showConversion && (
                        <>
                          <FormField
                            control={form.control}
                            name="api_conversion_rate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Conversion Rate</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    placeholder="Conversion Rate"
                                    type="number"
                                    disabled={readOnly}
                                    className={inputFieldClass}
                                    value={
                                      userRate ??
                                      expenseData?.user_conversion_rate ??
                                      apiRate ??
                                      ""
                                    }
                                    // 👇 Update ONLY user_conversion_rate (NOT api_conversion_rate)
                                    onChange={(e) => {
                                      form.setValue(
                                        "user_conversion_rate",
                                        e.target.value
                                      );
                                    }}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="base_currency_amount"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{`Amount (in ${getOrgCurrency()})`}</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    placeholder="Conversion Rate"
                                    type="string"
                                    value={
                                      form.watch("base_currency_amount") ??
                                      expenseData?.base_currency_amount
                                    }
                                    readOnly={true}
                                    disabled={readOnly}
                                    className={inputFieldClass}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </>
                      )}
                    </div>

                    {!isConveyanceCategory && (
                      <FormField
                        control={form.control}
                        name="invoiceNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Receipt number *</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="e.g. INV-1254"
                                disabled={readOnly}
                                className={inputFieldClass}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                </section>

                {!isConveyanceCategory && (
                  <section className="space-y-6 p-6">
                    <div>
                      <h2 className="text-sm font-semibold tracking-wide text-gray-500">
                        MERCHANT DETAILS
                      </h2>
                    </div>

                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="merchant"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Vendor *</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="e.g. Blue Bottle Coffee"
                                disabled={readOnly}
                                className={inputFieldClass}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </section>
                )}

                <section className="space-y-4 p-6">
                  <div>
                    <h2 className="text-sm font-semibold tracking-wide text-gray-500">
                      OTHER DETAILS
                    </h2>
                  </div>

                  <div className="space-y-4">
                    {showPreApproval && (
                      <FormField
                        control={form.control}
                        name="pre_approval_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Pre approval</FormLabel>
                            <Select
                              value={field.value || ""}
                              onValueChange={(value) => {
                                const preApp = preApprovals.find(
                                  (p) => p.id === value
                                );
                                if (preApp) setSelectedPreApproval(preApp);
                                form.setValue("pre_approval_id", value);
                              }}
                              disabled={readOnly}
                            >
                              <FormControl>
                                <SelectTrigger className={selectTriggerClass}>
                                  <SelectValue placeholder="Select pre approval">
                                    {field.value && selectedPreApproval
                                      ? selectedPreApproval.title
                                      : "Select pre approval"}
                                  </SelectValue>
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {preApprovals.length > 0 ? (
                                  preApprovals.map((preApproval) => (
                                    <SelectItem
                                      key={preApproval.id}
                                      value={preApproval.id}
                                    >
                                      <div>
                                        <div className="font-medium">
                                          {preApproval.title}
                                        </div>
                                      </div>
                                    </SelectItem>
                                  ))
                                ) : (
                                  <SelectItem value="no pre approvals" disabled>
                                    No pre approvals
                                  </SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <FormField
                      control={form.control}
                      name="comments"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description *</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="e.g. Client meeting lunch at downtown cafe"
                              rows={4}
                              disabled={readOnly}
                              className={cn(textareaClass, "resize-none")}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </section>
              </div>

              <div className="fixed inset-x-4 bottom-4 z-30 flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white/95 p-4 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-white/80 md:hidden">
                <Button type="button" variant="outline" onClick={onBack}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                {!readOnly && (
                  <Button type="submit" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {isEditMode ? "Updating..." : "Creating..."}
                      </>
                    ) : isEditMode ? (
                      "Update expense"
                    ) : (
                      "Create expense"
                    )}
                  </Button>
                )}
              </div>

              <div className="pointer-events-none fixed bottom-0 right-0 left-0 md:left-64 z-30 hidden md:block">
                <div className="pointer-events-auto flex w-full justify-end gap-4 border-t border-gray-200 bg-white px-12 py-5">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onBack}
                    className="min-w-[140px]"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  {!readOnly && (
                    <Button
                      type="submit"
                      disabled={loading}
                      className="min-w-[200px]"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {isEditMode ? "Updating..." : "Creating..."}
                        </>
                      ) : isEditMode ? (
                        "Update expense"
                      ) : (
                        "Create expense"
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </form>
        </Form>
      </div>

      {/* Fullscreen Receipt Modal */}
      {isReceiptFullscreen && hasReceipt && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4">
          <div className="relative w-full h-full flex flex-col">
            {/* Fullscreen Header */}
            <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
              <div className="flex items-center gap-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Receipt Viewer
                </h3>
                <span className="text-sm text-gray-500">
                  {receiptDisplayName}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReceiptZoomOut}
                  disabled={receiptZoom <= 0.5}
                  className="h-8 w-8 p-0"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-sm text-gray-600 min-w-[3rem] text-center">
                  {Math.round(receiptZoom * 100)}%
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReceiptZoomIn}
                  disabled={receiptZoom >= 3}
                  className="h-8 w-8 p-0"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <div className="w-px h-6 bg-gray-300 mx-2" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReceiptRotate}
                  className="h-8 w-8 p-0"
                >
                  <RotateCw className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReceiptReset}
                  className="h-8 w-8 p-0"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <div className="w-px h-6 bg-gray-300 mx-2" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReceiptDownload}
                  className="h-8 px-3 text-xs"
                >
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsReceiptFullscreen(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Fullscreen Content */}
            <div className="flex-1 overflow-auto bg-gray-100 flex items-center justify-center p-4">
              {(() => {
                const fullscreenSourceUrl = activeReceiptUrl;
                return fullscreenSourceUrl?.toLowerCase().includes(".pdf") ? (
                  <div className="w-full h-full bg-white rounded">
                    <embed
                      src={`${fullscreenSourceUrl}#toolbar=0&navpanes=0&scrollbar=0&statusbar=0&messages=0&scrollbar=0`}
                      type="application/pdf"
                      className="w-full h-full border-0 rounded"
                      style={{
                        transform: `scale(${receiptZoom}) rotate(${receiptRotation}deg)`,
                        transformOrigin: "center",
                      }}
                    />
                  </div>
                ) : (
                  <img
                    src={fullscreenSourceUrl || ""}
                    alt="Receipt fullscreen"
                    className="max-w-full max-h-full object-contain"
                    style={{
                      transform: `scale(${receiptZoom}) rotate(${receiptRotation}deg)`,
                      transformOrigin: "center",
                    }}
                  />
                );
              })()}
            </div>
          </div>
        </div>
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
          {semiParsedData?.ocr_result && (
            <div className="space-y-4 mb-4">
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-bold text-gray-900">
                      {semiParsedData?.ocr_result?.vendor || "Unknown Merchant"}
                    </div>
                    <div className="text-sm text-gray-600">
                      Expense #
                      {semiParsedData?.original_expense_id || "Unknown"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gray-900">
                      ₹
                      {semiParsedData?.extracted_amount ||
                        semiParsedData?.ocr_result?.amount}
                    </div>
                    <div className="text-sm text-gray-600">
                      {semiParsedData?.extracted_date
                        ? new Date(
                            semiParsedData.extracted_date
                          ).toLocaleDateString("en-GB", {
                            weekday: "short",
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : semiParsedData?.ocr_result?.date}
                    </div>
                  </div>
                </div>
              </div>

              {semiParsedData?.original_expense_id && (
                <div
                  className="flex items-center text-blue-600 text-sm cursor-pointer hover:text-blue-700"
                  onClick={async () => {
                    try {
                      const base64Url = uploadedFile
                        ? await fileToBase64(uploadedFile)
                        : previewUrl;
                      localStorage.setItem("showDuplicateDialog", "true");
                      localStorage.setItem(
                        "duplicateParsedData",
                        JSON.stringify(semiParsedData)
                      );
                      localStorage.setItem(
                        "duplicatePreviewUrl",
                        base64Url || ""
                      );
                      navigate(
                        `/expenses/${semiParsedData.original_expense_id}?returnTo=create`
                      );
                    } catch (error) {
                      console.error("Error converting file to base64:", error);
                      localStorage.setItem("showDuplicateDialog", "true");
                      localStorage.setItem(
                        "duplicateParsedData",
                        JSON.stringify(semiParsedData)
                      );
                      localStorage.setItem(
                        "duplicatePreviewUrl",
                        previewUrl || ""
                      );
                      navigate(
                        `/expenses/${semiParsedData.original_expense_id}?returnTo=create`
                      );
                    }
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
              }}
              className="w-full h-12 bg-blue-500 hover:bg-blue-600 text-white font-medium"
            >
              Upload New Receipt
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowDuplicateDialog(false);
                // setCurrentStep(2);
                setParsedData(semiParsedData);
                console.log(semiParsedData);
                fetchReceipt(semiParsedData?.id, orgId);
                setIsReceiptReplaced(true);
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
