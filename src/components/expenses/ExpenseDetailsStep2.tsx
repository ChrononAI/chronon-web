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
import { cn, getOrgCurrency } from "@/lib/utils";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Copy, ExternalLink } from "lucide-react";
import { getYesterday } from "./CreateExpenseForm";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";
import { getTemplates, type Template } from "@/services/admin/templates";
import { getEntities, type Entity } from "@/services/admin/entities";
import { AdvanceService } from "@/services/advanceService";
import { ExpenseValidation } from "./ExpenseValidation";

// Form schema
const expenseSchema = z.object({
  expense_policy_id: z.string().min(1, "Please select a policy"),
  category_id: z.string().min(1, "Please select a category"),
  invoice_number: z.string().min(1, "Invoice number is required"),
  vendor: z.string().min(1, "Vendor is required"),
  amount: z.string().min(1, "Amount is required"),
  receipt_id: z.string().optional(),
  expense_date: z.preprocess(
    (v) => (v ? new Date(v as string) : v),
    z.date({ required_error: "Date is required" })
  ),
  advance_account_id: z.string().optional().nullable(),
  description: z.string().min(1, "Description is required"),
  foreign_currency: z.string().optional().nullable(),
  currency: z.string().optional().default("INR"),
  foreign_amount: z.string().optional().nullable(),
  user_conversion_rate: z.string().optional().nullable(),
  api_conversion_rate: z.string().optional().nullable(),
});

type ExpenseFormValues = z.infer<typeof expenseSchema> & Record<string, any>;

type TemplateEntity = NonNullable<Template["entities"]>[0];

const getEntityId = (entity: TemplateEntity): string => {
  return entity?.entity_id || entity?.id || "";
};

const getFieldName = (entity: TemplateEntity): string => {
  return entity?.display_name || entity?.field_name || getEntityId(entity);
};

interface ExpenseDetailsStepProps {
  onBack: () => void;
  onSubmit: (data: ExpenseFormValues) => void;
  mode?: "create" | "edit" | "view";
  loading: boolean;
  isReceiptReplaced?: boolean;
  setIsReceiptReplaced?: any;
  uploadedFile: File | null;
  previewUrl: string | null;
  foreign_currency?: string | null;
  currency?: string | null;
  expense?: any;
}

export function ExpenseDetailsStep2({
  onBack,
  onSubmit,
  mode,
  loading,
  isReceiptReplaced,
  setIsReceiptReplaced,
  uploadedFile,
  previewUrl,
  expense,
}: ExpenseDetailsStepProps) {
  const navigate = useNavigate();
  const { orgSettings } = useAuthStore();
  const baseCurrency = getOrgCurrency();
  const orgId = getOrgIdFromToken();
  const { parsedData, setParsedData } = useExpenseStore();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [duplicateReceiptUrl, setDuplicateReceiptUrl] = useState<string | null>(
    null
  );
  const readOnly = mode === "view";
  const [duplicateReceiptLoading, setDuplicateReceiptLoading] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [selectedCategory, setSelectedCategory] =
    useState<PolicyCategory | null>(null);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [entityDropdownOpen, setEntityDropdownOpen] = useState<
    Record<string, boolean>
  >({});
  const [replaceRecLoading, setReplaceRecLoading] = useState(false);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [shouldGetConversion, setShouldGetConversion] = useState(
    !Boolean(expense)
  );
  const [advanceAccounts, setAdvanceAccounts] = useState([]);
  const [selectedAdvanceAccount, setSelectedAdvanceAccount] =
    useState<any>(null);
  const [receiptSignedUrl, setReceiptSignedUrl] = useState<string[]>([]);
  const [showConversion, setShowConversion] = useState(false);
  const [templateEntities, setTemplateEntities] = useState<TemplateEntity[]>(
    []
  );
  const [entityOptions, setEntityOptions] = useState<
    Record<string, Array<{ id: string; label: string }>>
  >({});
  const [isReceiptReuploaded, setIsReceiptReuploaded] = useState(false);
  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: expense
      ? expense
      : {
          expense_policy_id: "",
          category_id: "",
          invoiceNumber: "",
          merchant: "",
          amount: "",
          expense_date: new Date(),
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

  const fetchReceipt = async (receiptId: string, orgId: string) => {
    try {
      const response: any = await expenseService.fetchReceiptPreview(
        receiptId,
        orgId
      );
      setReceiptSignedUrl([response.data.data.signed_url]);
      console.log("fetch receipt", response);
      console.log(form.getValues("receipt_id"));
    } catch (error) {
      console.log(error);
      toast.error("Failed to fetch receipt image");
    }
  };

  const setPolicyCategory = async (data: any) => {
    if (!data) return;
    if (data.ocr_result.invoice_number) {
      form.setValue("invoice_number", data.ocr_result.invoice_number);
    }
    if (data.recommended_policy_id && data.recommended_category) {
      const selectedPolicy = policies.find(
        (policy) => policy.id === data.recommended_policy_id
      );
      const selectedCategory = selectedPolicy?.categories.find(
        (category) => category.id === data.recommended_category.category_id
      );
      if (selectedPolicy && selectedCategory) {
        setSelectedCategory(selectedCategory);
        setSelectedPolicy(selectedPolicy);
        form.setValue("expense_policy_id", selectedPolicy.id);
        form.setValue("category_id", selectedCategory.id);
      }
    }
  };

  const reuploadReceipt = async (file: File) => {
    const orgId = getOrgIdFromToken();
    try {
      setReplaceRecLoading(true);
      const parsedData = await fileParseService.parseInvoiceFile(file);
      if (parsedData.is_duplicate_receipt) {
        setSemiParsedData(parsedData);
        console.log(parsedData);
        setShowDuplicateDialog(true);
      } else {
        fetchReceipt(parsedData.id, orgId || "");
        form.setValue("receipt_id", parsedData.id);
        setPolicyCategory(parsedData);
        setIsReceiptReplaced(true);
      }
      setIsReceiptReuploaded(true);
    } catch (error) {
      console.log(error);
    } finally {
      setReplaceRecLoading(false);
    }
  };

  const uploadReceipt = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf,image/*";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        reuploadReceipt(file);
      }
    };
    input.click();
  };

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
      !receiptSignedUrl.length &&
      !duplicateReceiptUrl &&
      !duplicateReceiptLoading
    ) {
      fetchDuplicateReceiptUrl(parsedData.id);
    }
  }, [
    parsedData?.id,
    readOnly,
    receiptSignedUrl.length,
    duplicateReceiptUrl,
    duplicateReceiptLoading,
    fetchDuplicateReceiptUrl,
  ]);

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
        "amount",
        `${(+conversion * +form.getValues("amount")).toFixed(3)}`
      );
      form.setValue("user_conversion_rate", conversion);
      form.setValue("api_conversion_rate", conversion);
      setShowConversion(true);
    } catch (error) {
      console.log(error);
    }
  };

  const getAccounts = async () => {
    try {
      const res = await AdvanceService.getAccounts();
      setAdvanceAccounts(res.data.data);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    if (form.watch("currency") !== baseCurrency) {
      setShowConversion(true);
      setShouldGetConversion(true);
    } else {
      setShowConversion(false);
    }
  }, [form.watch("currency")]);

  useEffect(() => {
    if (form.getValues("currency") !== baseCurrency && shouldGetConversion) {
      const yesterday = getYesterday();
      getCurrencyConversion({
        date: yesterday,
        from: form.getValues("currency"),
        to: getOrgCurrency(),
      });
      setShowConversion(true);
    } else {
      form.setValue("api_conversion_rate", "0");
      setShowConversion(false);
    }
  }, [form.watch("currency")]);

  useEffect(() => {
    if (form.getValues("user_conversion_rate") && form.getValues("amount")) {
      form.setValue(
        "amount",
        `${(
          +(form.getValues("user_conversion_rate") || 0) *
          +(form.getValues("foreign_amount") || 0)
        ).toFixed(3)}`
      );
    }
  }, [form.watch("user_conversion_rate"), form.watch("foreign_amount")]);

  useEffect(() => {
    loadPoliciesWithCategories();
    getAccounts();
  }, []);

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const [templatesRes, entitiesRes] = await Promise.all([
          getTemplates(),
          getEntities(),
        ]);

        const expenseTemplate = Array.isArray(templatesRes)
          ? templatesRes.find((t) => t.module_type === "expense")
          : null;

        if (expenseTemplate?.entities) {
          setTemplateEntities(expenseTemplate.entities);

          // Set default values for template entities only if they don't already have values
          expenseTemplate.entities.forEach((entity) => {
            const entityId = getEntityId(entity);
            if (entityId) {
              const currentValue = form.getValues(entityId as any);
              // Only set empty string if no value exists (don't overwrite expense data)
              if (currentValue === undefined || currentValue === null) {
                form.setValue(entityId as any, "");
              }
            }
          });
        }

        const entityMap: Record<
          string,
          Array<{ id: string; label: string }>
        > = {};
        entitiesRes.forEach((ent: Entity) => {
          if (ent.id && Array.isArray(ent.attributes)) {
            entityMap[ent.id] = ent.attributes.map((attr) => ({
              id: attr.id,
              label: attr.display_value ?? attr.value ?? "—",
            }));
          }
        });

        const mappedOptions: Record<
          string,
          Array<{ id: string; label: string }>
        > = {};
        expenseTemplate?.entities?.forEach((entity) => {
          const entityId = getEntityId(entity);
          if (entityId) {
            mappedOptions[entityId] = entityMap[entityId] || [];
          }
        });

        setEntityOptions(mappedOptions);
      } catch (error) {
        console.error("Failed to load templates:", error);
      }
    };

    loadTemplates();
  }, []);

  useEffect(() => {
    if (expense?.custom_attributes?.advance_account_id && advanceAccounts?.length > 0) {
      form.setValue('advance_account_id', expense?.custom_attributes?.advance_account_id);
      const selAdv = advanceAccounts.find((adv: any) => adv.id === expense?.custom_attributes?.advance_account_id);
      if (selAdv) setSelectedAdvanceAccount(selAdv);
    }
  }, [expense, advanceAccounts])

  // Update form values when expense changes
  useEffect(() => {
    console.log(expense);
    if (expense && !isReceiptReplaced) {
      form.reset(expense);
      // Set selected policy and category based on form data
      if (expense.foreign_amount && expense.foreign_currency) {
        setShowConversion(true);
        form.setValue("currency", expense.foreign_currency);
      }
      if (!expense.currency) {
        form.setValue("currency", baseCurrency || "INR");
      }
      if (expense.expense_policy_id && policies.length > 0) {
        const policy = policies.find((p) => p.id === expense.expense_policy_id);
        if (policy) {
          setSelectedPolicy(policy);
          form.setValue("expense_policy_id", expense.expense_policy_id);

          if (expense.category_id) {
            const category = policy.categories.find(
              (c) => c.id === expense.category_id
            );
            if (category) {
              setSelectedCategory(category);
              form.setValue("category_id", expense.category_id);
            }
          }
        }
      }

      // Prefill custom attributes from expense.custom_attributes
      if (
        expense.custom_attributes &&
        typeof expense.custom_attributes === "object"
      ) {
        Object.entries(expense.custom_attributes).forEach(
          ([entityId, value]) => {
            if (
              entityId &&
              value !== null &&
              value !== undefined &&
              value !== ""
            ) {
              form.setValue(entityId as any, String(value));
            }
          }
        );
      }
    }
  }, [form, policies, expense, isReceiptReplaced]);
  form.getValues('advance_account_id');

  // Prefill custom attributes when both expense and template entities are available
  useEffect(() => {
    if (
      expense &&
      templateEntities.length > 0 &&
      expense.custom_attributes &&
      typeof expense.custom_attributes === "object"
    ) {
      Object.entries(expense.custom_attributes).forEach(([entityId, value]) => {
        if (entityId && value !== null && value !== undefined && value !== "") {
          // Verify this entityId exists in template entities
          const entityExists = templateEntities.some(
            (entity) => (entity?.entity_id || entity?.id) === entityId
          );
          if (entityExists) {
            form.setValue(entityId as any, String(value));
          }
        }
      });
    }
  }, [expense, templateEntities, form]);

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

      form.setValue("receipt_id", parsedData.id);

      if (ocrData.vendor) {
        form.setValue("vendor", ocrData.vendor);
      }

      if (ocrData.invoice_number) {
        form.setValue("invoice_number", ocrData.invoice_number);
      }

      if (ocrData.date) {
        // Parse the date string and convert to Date object
        const parsedDate = new Date(parsedData.extracted_date || "");
        if (!isNaN(parsedDate.getTime())) {
          form.setValue("expense_date", parsedDate);
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
      (readOnly && receiptSignedUrl && receiptSignedUrl.length > 0
        ? receiptSignedUrl[0]
        : null);

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
        fetchReceipt(parsedData.id, orgId || "");
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
        form.setValue("expense_policy_id", selectedPolicy.id);
        form.setValue("category_id", selectedCategory.id);
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
    (receiptSignedUrl && receiptSignedUrl.length > 0
      ? receiptSignedUrl[0]
      : null);

  const receiptDisplayName =
    uploadedFile?.name ||
    (readOnly && receiptSignedUrl.length > 0
      ? `Receipt ${receiptSignedUrl && receiptSignedUrl.length > 1 ? "1" : ""}`
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
    <div className="space-y-6">
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
              <div className="flex items-center gap-1">
                {[
                  { key: "receipt", label: "Receipt" },
                  { key: "comments", label: "Comments" },
                  { key: "validation", label: "Validation" }
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() =>
                      setActiveReceiptTab(tab.key as "receipt" | "comments")
                    }
                    className={cn(
                      "rounded-full px-2 py-2 text-sm font-medium transition-all",
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
                      <div className="space-y-6">
                        <div>
                          <p className="text-sm font-medium text-gray-700">
                            No receipt uploaded
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Upload the receipt to see a preview here.
                          </p>
                        </div>
                        <Button onClick={uploadReceipt}>Upload Receipt</Button>
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
            ) : activeReceiptTab === "comments" ? (
              <ExpenseComments
                expenseId={expense?.id}
                readOnly={false}
                autoFetch={activeReceiptTab === "comments"}
              />
            ) : <ExpenseValidation expenseId={expense?.id} />}
          </div>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((data) => {
              // Get all form values including custom attributes that might not be in schema
              const allFormValues = form.getValues();
              // Merge validated data with all form values to include custom attributes
              const mergedData = { ...allFormValues, ...data };
              onSubmit(mergedData);
            })}
            className={`rounded-2xl border border-gray-200 bg-white shadow-sm p-2 ${
              expense?.original_expense_id
                ? "md:h-[calc(100vh-21rem)]"
                : "md:h-[calc(100vh-16rem)]"
            } md:overflow-y-auto`}
          >
            <div className="md:min-h-full">
              <div className="divide-y divide-gray-100">
                <section className="space-y-4 p-6">
                  <div>
                    <h2 className="text-sm font-semibold tracking-wide text-gray-500">
                      CATEGORY
                    </h2>
                  </div>

                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="expense_policy_id"
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
                              form.setValue("category_id", "");
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
                      name="category_id"
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
                      name="expense_date"
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
                                    format(new Date(field.value), "PPP")
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
                                selected={new Date(field.value)}
                                onSelect={(date) => field.onChange(date)}
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
                                value={
                                  expense?.forerign_currency
                                    ? expense?.foreign_currency
                                    : field.value
                                    ? field.value
                                    : "INR"
                                }
                                onValueChange={(value) => {
                                  field.onChange(value);
                                  if (value !== baseCurrency) {
                                    form.setValue("foreign_currency", value);
                                  }
                                }}
                                disabled={
                                  readOnly ||
                                  !orgSettings.currency_conversion_settings
                                    .enabled
                                }
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
                      {!showConversion ? (
                        <FormField
                          control={form.control}
                          name="amount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Amount</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder="Base Amount"
                                  type="string"
                                  value={
                                    form.watch("amount") ?? expense?.amount
                                  }
                                  readOnly={showConversion}
                                  disabled={readOnly}
                                  className={inputFieldClass}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      ) : (
                        <FormField
                          control={form.control}
                          name="foreign_amount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Amount *</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  value={field.value ?? ""}
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
                            </FormItem>
                          )}
                        />
                      )}
                      {showConversion && (
                        <>
                          <FormField
                            control={form.control}
                            name="user_conversion_rate"
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
                                      expense?.user_conversion_rate ??
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
                            name="amount"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{`Amount (in ${baseCurrency}) *`}</FormLabel>
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
                                    readOnly={showConversion}
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
                        name="invoice_number"
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
                        name="vendor"
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
                    <FormField
                      control={form.control}
                      name="description"
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

                    {orgSettings?.advance_settings?.enabled && <FormField
                      control={form.control}
                      name="advance_account_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Advance Account</FormLabel>
                          <Select
                            value={field.value || ""}
                            onValueChange={(value) => {
                              field.onChange(value);
                              const acc = advanceAccounts.find(
                                (p: any) => p.id === value
                              );
                              setSelectedAdvanceAccount(acc || null);
                            }}
                            disabled={readOnly}
                          >
                            <FormControl>
                              <SelectTrigger className={selectTriggerClass}>
                                <SelectValue placeholder="Select an advance">
                                  {field.value && selectedAdvanceAccount
                                    ? selectedAdvanceAccount.account_name
                                    : "Select an advance"}
                                </SelectValue>
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {advanceAccounts.map((adv: any) => (
                                <SelectItem key={adv.id} value={adv.id}>
                                  <div>{adv.account_name}</div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />}

                    {templateEntities?.map((entity) => {
                      const entityId = getEntityId(entity);
                      const fieldName = getFieldName(entity);
                      if (!entityId) return null;

                      return (
                        <FormField
                          key={entityId}
                          control={form.control}
                          name={entityId as any}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                {fieldName}
                                {entity.is_mandatory && (
                                  <span className="text-destructive"> *</span>
                                )}
                              </FormLabel>
                              {entity.field_type === "SELECT" ? (
                                <Popover
                                  open={entityDropdownOpen[entityId] || false}
                                  onOpenChange={(open) =>
                                    setEntityDropdownOpen((prev) => ({
                                      ...prev,
                                      [entityId]: open,
                                    }))
                                  }
                                >
                                  <PopoverTrigger asChild>
                                    <FormControl>
                                      <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={
                                          entityDropdownOpen[entityId]
                                        }
                                        className="h-11 w-full justify-between"
                                        disabled={readOnly}
                                      >
                                        <span className="truncate max-w-[85%] overflow-hidden text-ellipsis text-left">
                                          {field.value
                                            ? entityOptions[entityId]?.find(
                                                (opt) => opt.id === field.value
                                              )?.label || `Select ${fieldName}`
                                            : `Select ${fieldName}`}
                                        </span>
                                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                      </Button>
                                    </FormControl>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                    <Command>
                                      <CommandInput
                                        placeholder={`Search ${fieldName}...`}
                                      />
                                      <CommandList className="max-h-[180px] overflow-y-auto">
                                        <CommandEmpty>
                                          No {fieldName.toLowerCase()} found.
                                        </CommandEmpty>
                                        <CommandGroup>
                                          {entityOptions[entityId]?.map(
                                            (opt) => (
                                              <CommandItem
                                                key={opt.id}
                                                value={opt.label}
                                                onSelect={() => {
                                                  field.onChange(opt.id);
                                                  setEntityDropdownOpen(
                                                    (prev) => ({
                                                      ...prev,
                                                      [entityId]: false,
                                                    })
                                                  );
                                                }}
                                              >
                                                {opt.label}
                                              </CommandItem>
                                            )
                                          )}
                                        </CommandGroup>
                                      </CommandList>
                                    </Command>
                                  </PopoverContent>
                                </Popover>
                              ) : (
                                <FormControl>
                                  <Input
                                    {...field}
                                    placeholder={`Enter ${fieldName}`}
                                    disabled={readOnly}
                                    className={inputFieldClass}
                                  />
                                </FormControl>
                              )}
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      );
                    })}
                  </div>
                </section>
              </div>

              <div className="fixed inset-x-4 bottom-4 z-30 flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white/95 p-4 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-white/80 md:hidden">
                <Button type="button" variant="outline" onClick={onBack}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                {mode !== "view" && (
                  <Button type="submit" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {mode === "edit" ? "Updating..." : "Creating..."}
                      </>
                    ) : mode === "edit" ? (
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
                          {mode === "edit" ? "Updating..." : "Creating..."}
                        </>
                      ) : mode === "edit" ? (
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
                if (!isReceiptReuploaded) setParsedData(semiParsedData);
                console.log(semiParsedData);
                fetchReceipt(semiParsedData?.id || "", orgId || "");
                setPolicyCategory(semiParsedData);
                form.setValue("receipt_id", semiParsedData?.id || "");
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
