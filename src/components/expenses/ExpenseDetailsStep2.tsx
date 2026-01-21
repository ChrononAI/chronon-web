import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { getOrgIdFromToken } from "@/lib/jwtUtils";
import api from "@/lib/api";
import {
  Calendar,
  Loader2,
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
import { FormFooter } from "../layout/FormFooter";
import ReceiptViewer from "./ReceiptViewer";
import { AdvanceService, AdvanceType } from "@/services/advanceService";

export type Attachment = {
  fileId: string;
  url: string;
};


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
    z.date({ required_error: "Date is required" }).refine(
      (date) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const selectedDate = new Date(date);
        selectedDate.setHours(0, 0, 0, 0);

        return selectedDate <= today;
      },
      {
        message: "Date cannot exceed today's date",
      }
    )
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
  receiptLoading?: boolean;
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
  receiptLoading,
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
  const [isConversionRateReadOnly, setIsConversionRateReadOnly] =
    useState(false);
  const [fetchingConversion, setFetchingConversion] = useState(false);

  const [fileIds, setFileIds] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const dupeCheckAcrossOrg =
    orgSettings?.org_level_duplicate_check_settings?.enabled || true;

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
        expense_date: undefined,
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
  const currency = form.watch("currency");
  const foreignAmount = form.watch("foreign_amount");
  const hasAdvanceOnExpense = Boolean(expense?.advance_account_id);
  const hasResolvedAdvanceRef = useRef(false);

  const fetchReceipt = async (receiptId: string, orgId: string) => {
    try {
      const response: any = await expenseService.fetchReceiptPreview(
        receiptId,
        orgId
      );
      setReceiptSignedUrl([response.data.data.signed_url]);
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

  const generateUploadUrl = async (file: File): Promise<{
    downloadUrl: string;
    uploadUrl: string;
    fileId: string;
  }> => {
    try {
      const res = await expenseService.getUploadUrl({ type: "RECEIPT", name: file.name });
      return { uploadUrl: res.data.data.upload_url, downloadUrl: res.data.data.download_url, fileId: res.data.data.id };
    } catch (error) {
      console.log(error);
      throw error;
    }
  };

  const [activeReceiptTab, setActiveReceiptTab] = useState<
    "receipt" | "comments"
  >("receipt");
  const [receiptZoom, setReceiptZoom] = useState(1);
  const [receiptRotation, setReceiptRotation] = useState(0);

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
    const currentApiRate = form.getValues("api_conversion_rate");
    if (currentApiRate) return;
    setFetchingConversion(true);
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
      form.setValue("user_conversion_rate", Number(conversion).toFixed(4).toString());
      form.setValue("api_conversion_rate", Number(conversion).toFixed(4).toString());
      setShowConversion(true);
    } catch (error: any) {
      console.log(error);
      toast.error(error?.response?.data?.message || error.message);
    } finally {
      setFetchingConversion(false);
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
    if (!currency) return;

    const isBase = currency === baseCurrency;

    if (isBase) {
      form.setValue("foreign_currency", null);
      form.setValue("foreign_amount", null);
      form.setValue("user_conversion_rate", null);
      form.setValue("api_conversion_rate", null);
      setIsConversionRateReadOnly(false);
      setShowConversion(false);
      return;
    }

    setShowConversion(true);
    form.setValue("foreign_currency", currency);

    if (!form.getValues("foreign_amount")) {
      form.setValue("foreign_amount", form.getValues("amount"));
    }

    if (
      hasAdvanceOnExpense &&
      !selectedAdvanceAccount &&
      !hasResolvedAdvanceRef.current
    ) {
      return;
    }

    const accountRate = selectedAdvanceAccount?.currency_conversion_rates?.find(
      (item: any) => item.currency === currency
    )?.rate;

    if (accountRate !== undefined) {
      form.setValue("user_conversion_rate", String(accountRate));
      form.setValue("api_conversion_rate", null);
      setIsConversionRateReadOnly(true);
      return;
    }

    setIsConversionRateReadOnly(false);

    const yesterday = getYesterday();
    getCurrencyConversion({
      date: yesterday,
      from: currency,
      to: baseCurrency,
    });
  }, [currency, baseCurrency, selectedAdvanceAccount, hasAdvanceOnExpense]);

  useEffect(() => {
    if (!foreignAmount || !userRate) return;

    form.setValue("amount", `${(+foreignAmount * +userRate).toFixed(3)}`);
  }, [foreignAmount, userRate]);

  useEffect(() => {
    if (expense && advanceAccounts.length > 0 && expense?.advance_account_id) {
      const adv = advanceAccounts.find(
        (adv: AdvanceType) => adv.id === expense.advance_account_id
      );
      setSelectedAdvanceAccount(adv);
    }
  }, [expense, advanceAccounts]);

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

          expenseTemplate.entities.forEach((entity) => {
            const entityId = getEntityId(entity);
            if (entityId) {
              const currentValue = form.getValues(entityId as any);
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

      if (expense.file_ids && expense.file_ids.length > 0) {
        setFileIds(expense.file_ids);
      }

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

  useEffect(() => {
    if (
      expense &&
      templateEntities.length > 0 &&
      expense.custom_attributes &&
      typeof expense.custom_attributes === "object"
    ) {
      Object.entries(expense.custom_attributes).forEach(([entityId, value]) => {
        if (entityId && value !== null && value !== undefined && value !== "") {
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

  useEffect(() => {
    if (parsedData && parsedData.ocr_result) {
      const ocrData = parsedData.ocr_result;

      const canSetAmount =
        !!ocrData.amount && (!expense || expense.transaction_id == null);

      if (canSetAmount) {
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
        const parsedDate = new Date(parsedData.extracted_date ?? "");
        if (!isNaN(parsedDate.getTime())) {
          const today = new Date();
          parsedDate.setHours(0, 0, 0, 0);
          today.setHours(0, 0, 0, 0);
          if (parsedDate <= today) {
            form.setValue("expense_date", parsedDate);
          }
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
    if (
      parsedData?.recommended_policy_id &&
      parsedData?.recommended_category &&
      (!expense || !("transaction_id" in expense))
    ) {
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

type Attachment = {
  fileId: string;
  url: string;
};

useEffect(() => {
  if (!fileIds.length) return;

  const existingMap = new Map(
    attachments.map((a) => [a.fileId, a.url])
  );

  const fileIdsToFetch = fileIds.filter(
    (id) => !existingMap.has(id) || !existingMap.get(id)
  );

  if (!fileIdsToFetch.length) return;

  let cancelled = false;

  const fetchUrls = async () => {
    try {
      const fetched = await Promise.all(
        fileIdsToFetch.map(async (fileId) => {
          const res = await expenseService.generatePreviewUrl(fileId);
          console.log(res);
          return { fileId, url: res.data.data.download_url };
        })
      );

      if (cancelled) return;

      setAttachments((prev) => {
        const map = new Map(prev.map((a) => [a.fileId, a]));

        fetched.forEach((a) => {
          map.set(a.fileId, a);
        });

        return Array.from(map.values());
      });
    } catch (err) {
      console.error("Failed to fetch attachment URLs", err);
    }
  };

  fetchUrls();

  return () => {
    cancelled = true;
  };
}, [fileIds]);



  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const activeReceiptUrl =
    (receiptSignedUrl && receiptSignedUrl.length > 0
      ? receiptSignedUrl[0]
      : null) ||
    previewUrl ||
    duplicateReceiptUrl;

  const receiptDisplayName =
    uploadedFile?.name ||
    (readOnly && receiptSignedUrl.length > 0
      ? `Receipt ${receiptSignedUrl && receiptSignedUrl.length > 1 ? "1" : ""}`
      : activeReceiptUrl
        ? "Receipt preview"
        : "No receipt uploaded");

  const hasReceipt = Boolean(activeReceiptUrl);
  const isLoadingReceipt =
    replaceRecLoading || duplicateReceiptLoading || receiptLoading;
  const inputFieldClass =
    "border border-gray-200 bg-white px-4 text-sm shadow-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0";
  const selectTriggerClass =
    "border border-gray-200 bg-white flex items-center w-full justify-between px-4 text-sm shadow-none focus:outline-none focus:ring-1 focus:ring-primary focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0";
  const textareaClass =
    "border border-gray-200 bg-white px-4 py-3 text-sm shadow-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0";

  return (
    <>
      <div className="space-y-6 md:space-y-6">
        {expense?.original_expense_id && (
          <Alert className="bg-yellow-50 border-yellow-200">
            <Copy className="h-4 w-4 text-yellow-600" />
            <AlertTitle className="text-yellow-800">
              Duplicate Expense Detected
            </AlertTitle>
            <AlertDescription className="text-yellow-700">
              This expense has been flagged as a duplicate.
              {!dupeCheckAcrossOrg && (
                <Button
                  variant="link"
                  className="p-0 h-auto text-yellow-700 underline ml-1"
                  onClick={() =>
                    navigate(`/expenses/${expense.original_expense_id}`)
                  }
                >
                  View original expense{" "}
                  <ExternalLink className="ml-1 h-3 w-3" />
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <div
            className={`rounded-2xl border border-gray-200 bg-white shadow-sm min-h-full ${expense?.original_expense_id
              ? "md:h-[calc(100vh-18rem)]"
              : "md:h-[calc(100vh-13rem)]"
              } md:overflow-y-auto`}
          >
            <ReceiptViewer
              activeReceiptTab={activeReceiptTab}
              setActiveReceiptTab={setActiveReceiptTab}
              readOnly={readOnly}
              hasReceipt={hasReceipt}
              handleReplaceReceipt={handleReplaceReceipt}
              replaceRecLoading={replaceRecLoading}
              loading={loading}
              isLoadingReceipt={isLoadingReceipt}
              activeReceiptUrl={activeReceiptUrl}
              attachments={attachments}
              receiptZoom={receiptZoom}
              receiptRotation={receiptRotation}
              handleReceiptDownload={handleReceiptDownload}
              uploadReceipt={uploadReceipt}
              receiptDisplayName={receiptDisplayName}
              expense={expense}
              uploadedFile={uploadedFile}
              handleReceiptRotate={handleReceiptRotate}
              handleReceiptZoomIn={handleReceiptZoomIn}
              handleReceiptZoomOut={handleReceiptZoomOut}
              setAttachments={setAttachments}
              fileIds={fileIds}
              setFileIds={setFileIds}
              generateUploadUrl={generateUploadUrl}
            />
          </div>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((data) => {
                const allFormValues = form.getValues();
                const mergedData = { ...allFormValues, ...data, file_ids: fileIds };
                onSubmit(mergedData);
              })}
              className={`rounded-2xl border border-gray-200 bg-white shadow-sm p-2 ${expense?.original_expense_id
                ? "md:h-[calc(100vh-18rem)]"
                : "md:h-[calc(100vh-13rem)]"
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
                              disabled={readOnly || expense?.transaction_id}
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
                                    disabled={
                                      !selectedPolicy ||
                                      readOnly ||
                                      expense?.transaction_id
                                    }
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
                                    disabled={
                                      readOnly || expense?.transaction_id
                                    }
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
                                    !orgSettings?.currency_conversion_settings
                                      ?.enabled
                                  }
                                >
                                  <SelectTrigger className={selectTriggerClass}>
                                    <SelectValue placeholder="Select a currency" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="INR">INR (₹)</SelectItem>
                                    <SelectItem value="USD">USD ($)</SelectItem>
                                    {/* <SelectItem value="EUR">EUR (€)</SelectItem> */}
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
                                    disabled={
                                      readOnly || expense?.transaction_id
                                    }
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
                                      disabled={
                                        readOnly || isConversionRateReadOnly
                                      }
                                      className={inputFieldClass}
                                      value={
                                        (
                                          userRate ??
                                          expense?.user_conversion_rate ??
                                          apiRate ??
                                          ""
                                        )?.toString() !== ""
                                          ? Number(
                                            userRate ??
                                            expense?.user_conversion_rate ??
                                            apiRate ??
                                            0
                                          )
                                          : ""
                                      }
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

                      {orgSettings?.advance_settings?.enabled &&
                        advanceAccounts.length > 0 && (
                          <FormField
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
                                    hasResolvedAdvanceRef.current = true;
                                  }}
                                  disabled={readOnly}
                                >
                                  <FormControl>
                                    <SelectTrigger
                                      className={`${selectTriggerClass} relative`}
                                    >
                                      <SelectValue placeholder="Select an advance">
                                        {field.value && selectedAdvanceAccount
                                          ? selectedAdvanceAccount.account_name
                                          : "Select an advance"}
                                      </SelectValue>

                                      {field.value && !readOnly && (
                                        <button
                                          type="button"
                                          onPointerDown={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            field.onChange("");
                                            setSelectedAdvanceAccount(null);
                                            hasResolvedAdvanceRef.current =
                                              true;
                                          }}
                                          className="absolute right-8 top-1/2 mr-2 -translate-y-1/2 text-muted-foreground hover:text-foreground pointer-events-auto"
                                        >
                                          <X className="h-4 w-4" />
                                        </button>
                                      )}
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
                          />
                        )}

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
                                  {entity.is_mandatory && <span>*</span>}
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
                                                (opt) =>
                                                  opt.id === field.value
                                              )?.label ||
                                              `Select ${fieldName}`
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

                <FormFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onBack}
                    className="px-6 py-2"
                  >
                    Back
                  </Button>
                  {!readOnly && (
                    <Button
                      type="submit"
                      disabled={loading || fetchingConversion}
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
                </FormFooter>
              </div>
            </form>
          </Form>
        </div>
      </div>
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
    </>
  );
}
