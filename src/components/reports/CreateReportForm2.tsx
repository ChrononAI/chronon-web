import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { AlertTriangle, Calendar, Loader2, Trash2, X } from "lucide-react";

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
import { toast } from "sonner";
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
import { Calendar as CalendarComponent } from "@/components/ui/calendar";

import { reportService } from "@/services/reportService";
import {
  Expense,
  ApprovalWorkflow,
  ExpenseComment,
  PolicyCategory,
} from "@/types/expense";
import { AdditionalFieldMeta, CustomAttribute } from "@/types/report";
import { useAuthStore } from "@/store/authStore";
import {
  formatDate,
  formatCurrency,
  getStatusColor,
  cn,
  getOrgCurrency,
  parseLocalDate,
} from "@/lib/utils";
import { DynamicCustomField } from "./DynamicCustomField";
import { ReportTabs } from "./ReportTabs";
import { WorkflowTimeline } from "@/components/expenses/WorkflowTimeline";
import { DataGrid, GridColDef, GridRowId } from "@mui/x-data-grid";
import { Badge } from "../ui/badge";
import { GridPaginationModel } from "@mui/x-data-grid";
import { Box, Toolbar } from "@mui/material";
import { categoryService } from "@/services/admin/categoryService";
import { SearchableSelect } from "./SearchableSelect";
import { trackEvent } from "@/mixpanel";
import { FormFooter } from "../layout/FormFooter";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { format } from "date-fns";
import { ExpenseComments } from "../expenses/ExpenseComments";
import ExpenseLogs from "../expenses/ExpenseLogs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { FilterMap, getExpenseType } from "@/pages/MyExpensesPage";
import CustomReportExpenseToolbar from "./CustomReportExpenseToolbar";
import { useReportsStore } from "@/store/reportsStore";
import { expenseService } from "@/services/expenseService";
import { Entity, getEntities } from "@/services/admin/entities";
import { getTemplates, Template } from "@/services/admin/templates";

// Dynamic form schema creation function
const createReportSchema = (customAttributes: CustomAttribute[]) => {
  const baseSchema = {
    reportName: z.string().min(1, "Report name is required"),
    description: z.string().optional(),
  };

  // Add dynamic fields based on custom attributes
  const dynamicFields: Record<string, z.ZodTypeAny> = {};
  customAttributes.forEach((attr) => {
    const fieldName = attr.name;
    dynamicFields[fieldName] = z
      .string()
      .min(1, `${attr.display_name} is required`);
  });
  return z.object({ ...baseSchema, ...dynamicFields });
};

type TemplateEntity = NonNullable<Template["entities"]>[0];

const getEntityId = (entity: TemplateEntity): string => {
  return entity?.entity_id || entity?.id || "";
};

type ReportFormValues = {
  reportName: string;
  description: string;
  [key: string]: string | undefined;
};

interface CreateReportFormProps {
  editMode?: boolean;
  reportData?: {
    id: string;
    title: string;
    description: string;
    custom_attributes?: Record<string, string>;
    expenses?: Expense[];
  };
}

const columns: GridColDef[] = [
  {
    field: "sequence_number",
    headerName: "EXPENSE ID",
    minWidth: 150,
    flex: 1,
    renderCell: (params) => {
      const expense = params.row;
      return (
        <div className="flex items-center gap-2">
          {expense.original_expense_id && (
            <TooltipProvider>
              <Tooltip delayDuration={50}>
                <TooltipTrigger asChild>
                  <div className="relative cursor-pointer">
                    <AlertTriangle
                      className="h-4 w-4 text-yellow-400"
                      fill="currentColor"
                      stroke="none"
                    />
                    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-yellow-800 text-[8px] font-bold">
                      !
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  align="center"
                  className="bg-yellow-100 border-yellow-300 text-yellow-800"
                >
                  <p>Duplicate expense</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <span>{expense.sequence_number}</span>
        </div>
      );
    },
  },
  {
    field: "expense_type",
    headerName: "TYPE",
    minWidth: 120,
    flex: 1,
    renderCell: (params) => getExpenseType(params.row.expense_type),
  },
  {
    field: "policy_name",
    headerName: "POLICY",
    minWidth: 140,
    flex: 1,
    valueGetter: (params: any) => params || "No Policy",
  },
  {
    field: "category",
    headerName: "CATEGORY",
    minWidth: 140,
    flex: 1,
  },
  {
    field: "vendor",
    headerName: "VENDOR",
    minWidth: 200,
    flex: 1,
    renderCell: (params) => {
      const { vendor, expense_type } = params.row;
      if (vendor) return vendor;
      if (expense_type === "RECEIPT_BASED") {
        return <span className="text-gray-600 italic">Unknown Vendor</span>;
      }
      return "NA";
    },
  },
  {
    field: "expense_date",
    headerName: "DATE",
    minWidth: 120,
    flex: 1,
    valueFormatter: (params: any) => formatDate(params),
  },
  {
    field: "amount",
    headerName: "AMOUNT",
    minWidth: 120,
    flex: 1,
    type: "number",
    align: "right",
    headerAlign: "right",
    valueFormatter: (params: any) => formatCurrency(params),
  },
  {
    field: "currency",
    headerName: "CURRENCY",
    minWidth: 100,
    flex: 1,
    renderCell: () => getOrgCurrency(),
  },
  {
    field: "status",
    headerName: "STATUS",
    flex: 1,
    minWidth: 180,
    renderCell: (params) => (
      <Badge className={getStatusColor(params.value)}>
        {params.value.replace("_", " ")}
      </Badge>
    ),
  },
];

function CustomToolbar({
  categories,
  selectedCategory,
  setSelectedCategory,
  dateFrom,
  dateTo,
  setDateFrom,
  setDateTo,
}: any) {
  return (
    <Toolbar
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        height: "52px",
        p: 1,
        gap: 2,
        backgroundColor: "background.paper",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <SearchableSelect
          categories={categories}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
        />
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "h-11 w-full justify-between gap-3 pl-3 text-left font-normal",
                !dateFrom && "text-muted-foreground"
              )}
            >
              {dateFrom ? (
                format(parseLocalDate(dateFrom), "PPP")
              ) : (
                <span>From</span>
              )}
              <span className="flex items-center gap-2">
                <Calendar className="h-4 w-4 opacity-50" />
                <X
                  className="h-4 w-4 opacity-50"
                  onClick={() => setDateFrom("")}
                />
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              mode="single"
              selected={dateFrom ? parseLocalDate(dateFrom) : undefined}
              onSelect={(date: any) => setDateFrom(date)}
            />
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "h-11 w-full justify-between gap-3 pl-3 text-left font-normal",
                !dateTo && "text-muted-foreground"
              )}
            >
              {dateTo ? format(parseLocalDate(dateTo), "PPP") : <span>To</span>}
              <span className="flex items-center gap-2">
                <Calendar className="h-4 w-4 opacity-50" />
                <X
                  className="h-4 w-4 opacity-50"
                  onClick={() => setDateTo("")}
                />
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              mode="single"
              selected={dateTo ? parseLocalDate(dateTo) : undefined}
              onSelect={(date: any) => setDateTo(date)}
            />
          </PopoverContent>
        </Popover>
      </Box>
    </Toolbar>
  );
}

type FilterOperator = "gte" | "lte" | "in" | string;

type QueryFilters = Record<
  string,
  Array<{ operator: FilterOperator; value: any }>
>;

function buildCustomAttributesFromFilters(
  filters: QueryFilters
): Record<string, any> {
  const result: Record<string, any> = {};

  Object.entries(filters).forEach(([key, conditions]) => {
    if (key === "vendor" || key === "amount") return;

    if (key === "expense_date") {
      conditions.forEach(({ operator, value }) => {
        if (!value) return;

        if (operator === "gte") {
          result.from = value;
        }

        if (operator === "lte") {
          result.to = value;
        }
      });
      return;
    }

    if (key === "category") {
      const inFilter = conditions.find(
        (c) => c.operator === "in" && Array.isArray(c.value)
      );

      if (inFilter) {
        result.category = inFilter.value;
      }
      return;
    }

    conditions.forEach(({ value }) => {
      if (value !== undefined && value !== null) {
        result[key] = value;
      }
    });
  });

  return result;
}

export function CreateReportForm2({
  editMode = false,
  reportData,
}: CreateReportFormProps) {
  const navigate = useNavigate();
  const { user, orgSettings } = useAuthStore();
  const { expenseQuery } = useReportsStore();

  const showDescription =
    orgSettings?.report_description_settings?.enabled ?? true;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingExpenses, setLoadingExpenses] = useState(true);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const additionalFields: AdditionalFieldMeta[] = [];
  const [customAttributes, setCustomAttributes] = useState<CustomAttribute[]>(
    []
  );
  const [expAttributes, setExpAttributes] = useState<any[]>();
  const [formSchema, setFormSchema] = useState(createReportSchema([]));
  const [markedExpenses, setMarkedExpenses] = useState<Expense[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [totalAmount, setTotalAmount] = useState(0);
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 10,
  });
  const [selectedIds, setSelectedIds] = useState<any>([]);
  const [selectedCategory, setSelectedCategory] = useState<any>();
  const [reportStatus, setReportStatus] = useState<string | null>(null);
  const [approvalWorkflow, setApprovalWorkflow] =
    useState<ApprovalWorkflow | null>(null);
  const [activeTab, setActiveTab] = useState<
    "expenses" | "history" | "comments" | "logs"
  >("expenses");
  const [dateFrom, setDateFrom] = useState<string | Date>("");
  const [dateTo, setDateTo] = useState<string | Date>("");
  const [mappedOptions, setMappedOptions] = useState<Record<any, any>>({});

  const [loadingReportComments, setLoadingReportComments] = useState(false);
  const [commentError, setCommentError] = useState<string | null>();
  const [reportComments, setReportComments] = useState<ExpenseComment[]>([]);
  const [reportLogs, setReportLogs] = useState<ExpenseComment[]>([]);
  const [postingComment, setPostingComment] = useState(false);
  const [newComment, setNewComment] = useState<string>();

  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  function buildBackendQuery(filters: FilterMap): string {
    const params: string[] = [];

    Object.entries(filters).forEach(([key, fieldFilters]) => {
      if (key === "q") {
        const value = fieldFilters?.[0]?.value;

        if (typeof value !== "string" || value.trim() === "") return;

        const finalValue = value.endsWith(":*") ? value : `${value}:*`;
        params.push(`q=${finalValue}`);
        return;
      }

      const entity = expAttributes?.find((ent) => ent.field_name === key);
      const isCustomAttribute = Boolean(entity);

      const options =
        entity && mappedOptions?.[entity.entity_id]
          ? mappedOptions[entity.entity_id]
          : [];

      fieldFilters?.forEach(({ operator, value }) => {
        if (
          value === undefined ||
          value === null ||
          (typeof value === "string" && value.trim() === "") ||
          (Array.isArray(value) && value.length === 0)
        ) {
          return;
        }

        const resolveValue = (val: any) => {
          const opt = options.find((o: any) => o.label === val);
          return opt?.id ?? val;
        };

        const resolvedValue = Array.isArray(value)
          ? value.map(resolveValue)
          : resolveValue(value);

        const backendKey =
          isCustomAttribute && entity
            ? `custom_attributes->${entity.entity_id}`
            : key;

        switch (operator) {
          case "in":
            params.push(
              `${backendKey}=in.(${(resolvedValue as (string | number)[]).join(
                ","
              )})`
            );
            break;

          case "ilike":
            params.push(`${backendKey}=ilike.%${resolvedValue}%`);
            break;

          default:
            params.push(`${backendKey}=${operator}.${resolvedValue}`);
        }
      });
    });

    return params.join("&");
  }

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

        const selectEntity = expenseTemplate?.entities?.filter(
          (ent) => ent.field_type === "SELECT"
        );

        if (selectEntity) setExpAttributes(selectEntity);

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
        setMappedOptions(mappedOptions);
      } catch (error) {
        console.error("Failed to load templates:", error);
      }
    };

    loadTemplates();
  }, []);

  const fetchFilteredExpenses = useCallback(
    async ({ signal }: { signal: AbortSignal }) => {
      const statusQuery: FilterMap = {
        status: [
          {
            operator: "in",
            value: ["COMPLETE"],
          },
        ],
      };
      let newQuery: FilterMap = { ...expenseQuery, ...statusQuery };
      const query = reportData
        ? `${buildBackendQuery(newQuery)}&or=(report_id.eq.null,report_id.eq.${
            reportData?.id
          })`
        : `${buildBackendQuery(newQuery)}&or=(report_id.eq.null)`;

      const response = await expenseService.getFilteredExpenses({
        query: query,
        limit: 200,
        offset: 0,
        signal,
      });

      setExpenses(response?.data?.data);
    },
    [expenseQuery]
  );

  useEffect(() => {
    if (!expAttributes) return;
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      setLoading(true);

      fetchFilteredExpenses({ signal: controller.signal })
        .catch((err) => {
          if (err.name !== "AbortError") {
            console.error(err);
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setLoading(false);
          }
        });
    }, 400);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [fetchFilteredExpenses, expAttributes]);

  const filteredExpenses = allExpenses
    .filter((exp) =>
      selectedCategory ? exp.category_id === selectedCategory.id : true
    )
    .filter((exp) => {
      if (!dateFrom && !dateTo) return true;
      const expDate = exp.expense_date
        ? parseLocalDate(exp.expense_date)
        : null;
      if (!expDate || isNaN(expDate.getTime())) return false;
      const fromOk = dateFrom ? expDate >= parseLocalDate(dateFrom) : true;
      const toOk = dateTo ? expDate <= parseLocalDate(dateTo) : true;
      return fromOk && toOk;
    });

  const [categories, setCategories] = useState([]);

  const showTabs =
    editMode &&
    reportData &&
    ["SENT_BACK", "APPROVED", "REJECTED"].includes(
      (reportStatus || "").toUpperCase()
    );

  const getAllCategories = async () => {
    try {
      const res = await categoryService.getAllCategories();
      const newCategories = res.data.data.map(
        (cat: PolicyCategory) => cat.name
      );
      setCategories(newCategories);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    getAllCategories();
  }, []);

  const [rowSelection, setRowSelection] = useState<any>({
    type: "include",
    ids: new Set<GridRowId>(),
  });

  useEffect(() => {

      setRowSelection({
        type: "include",
        ids: new Set(markedExpenses.map((exp) => exp.id)),
      });
  }, [markedExpenses]);

  useEffect(() => {
    if (rowSelection.type === "include") {
      const ids = Array.from(rowSelection.ids);
      setSelectedIds(ids);
    } else {
      const ids = Array.from(rowSelection.ids);
      const filteredExpenses = allExpenses.filter(
        (expense) => !ids.includes(expense.id)
      );
      const idArr = filteredExpenses.map((exp) => exp.id);
      setSelectedIds(idArr);
    }
  }, [rowSelection]);

  useEffect(() => {
    if (selectedCategory) {
      setSelectedIds([]);
      setRowSelection({ type: "include", ids: new Set([]) });
    }
  }, [selectedCategory]);

  // Determine if Hospital Name and Campaign Code should be shown
  const userDept = user?.department?.toLowerCase() || "";
  const showHospitalAndCampaign =
    userDept === "operations" || userDept === "sales";

  // Create default values for dynamic form
  const createDefaultValues = (attributes: CustomAttribute[]) => {
    const defaults: ReportFormValues = {
      reportName: editMode && reportData ? reportData.title : "",
      description: editMode && reportData ? reportData.description : "",
    };

    // Set custom attribute values if in edit mode
    if (editMode && reportData?.custom_attributes) {
      Object.entries(reportData.custom_attributes).forEach(([key, value]) => {
        defaults[key] = value;
      });
    }

    // Set default empty values for other attributes
    attributes.forEach((attr) => {
      if (defaults[attr.name] === undefined) {
        defaults[attr.name] = "";
      }
    });

    return defaults;
  };

  const form = useForm<ReportFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: createDefaultValues(customAttributes),
  });

  // Re-initialize form when custom attributes change
  useEffect(() => {
    if (customAttributes.length > 0) {
      const newSchema = createReportSchema(customAttributes);
      setFormSchema(newSchema);

      // Reset form with new default values
      const newDefaultValues = createDefaultValues(customAttributes);
      form.reset(newDefaultValues);
    }
  }, [customAttributes, form]);

  const fetchComments = async (id: string) => {
    if (id) {
      setLoadingReportComments(true);
      setCommentError(null);
      try {
        const fetchedComments = await reportService.getReportComments(id);
        // Sort comments by created_at timestamp (oldest first)
        const sortedComments = [
          ...fetchedComments.filter((c) => c.creator_type === "USER"),
        ].sort((a, b) => {
          const dateA = new Date(a.created_at).getTime();
          const dateB = new Date(b.created_at).getTime();
          return dateA - dateB;
        });
        setReportComments(sortedComments);
        const sortedLogs = [
          ...fetchedComments.filter((c) => c.creator_type === "SYSTEM"),
        ].sort((a, b) => {
          const dateA = new Date(a.created_at).getTime();
          const dateB = new Date(b.created_at).getTime();
          return dateA - dateB;
        });
        setReportLogs(sortedLogs);
      } catch (error: any) {
        console.error("Error fetching comments:", error);
        setCommentError(
          error.response?.data?.message || "Failed to load comments"
        );
      } finally {
        setLoadingReportComments(false);
      }
    }
  };

  const handlePostComment = async () => {
    if (!reportData?.id || !newComment?.trim() || postingComment) return;

    setPostingComment(true);
    setCommentError(null);

    try {
      await reportService.postReportComment(
        reportData?.id,
        newComment.trim(),
        false // notify: false
      );

      const fetchedComments = await reportService.getReportComments(
        reportData?.id
      );

      const sortedComments = [...fetchedComments.filter((c) => !c.action)].sort(
        (a, b) => {
          const dateA = new Date(a.created_at).getTime();
          const dateB = new Date(b.created_at).getTime();
          return dateA - dateB;
        }
      );
      setReportComments(sortedComments);
      setNewComment("");
      toast.success("Comment posted successfully");
    } catch (error: any) {
      console.error("Error posting comment:", error);
      const errorMessage =
        error.response?.data?.message || "Failed to post comment";
      setCommentError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setPostingComment(false);
    }
  };

  useEffect(() => {
    const amt = allExpenses
      .filter((exp) => selectedIds.includes(exp.id))
      .reduce((sum, exp) => +sum + +exp.amount, 0);
    setTotalAmount(amt);
  }, [selectedIds, allExpenses]);

  const fetchData = async () => {
    try {
      setLoadingExpenses(true);
      setLoadingMeta(true);

      if (editMode && reportData) {
        // In edit mode, fetch the full report with expenses
        const fullReportResponse = await reportService.getReportWithExpenses(
          reportData.id
        );
        const reportExpenses = fullReportResponse.success
          ? fullReportResponse.data?.expenses || []
          : reportData.expenses || [];
        setMarkedExpenses([...reportExpenses]);
        setSelectedIds(reportExpenses.map((exp: any) => exp.id));

        if (fullReportResponse.success && fullReportResponse.data) {
          const currentStatus = (
            fullReportResponse.data.status || ""
          ).toUpperCase();
          setReportStatus(currentStatus);

          if (["SENT_BACK", "APPROVED", "REJECTED"].includes(currentStatus)) {
            try {
              const workflowResponse =
                await reportService.getReportApprovalWorkflow(reportData.id);
              if (workflowResponse.success && workflowResponse.data) {
                const getAllApprovalSteps = (data: any) => {
                  return data
                    .reverse()
                    .flatMap((item: any) =>
                      item.approval_steps.filter(
                        (step: any) => step.status !== "ABORTED"
                      )
                    );
                };
                const newSteps = getAllApprovalSteps(workflowResponse.data);
                const currentStepIdx = newSteps.findIndex(
                  (step: any) => step.status === "IN_PROGRESS"
                );
                setApprovalWorkflow({
                  report_id: reportData.id,
                  approval_steps: newSteps,
                  total_steps: newSteps.length,
                  current_step: currentStepIdx !== -1 ? currentStepIdx + 1 : 0,
                });
              }
            } catch (error) {
              console.error("Error fetching approval workflow:", error);
            }
          }
        }

        // Fetch all available expenses (unassigned)
        const unassignedExpenses = await reportService.getUnassignedExpenses();
        setAllExpenses([...reportExpenses, ...unassignedExpenses]);
      } else {
        // In create mode, fetch unassigned expenses
        const unassignedExpenses = await reportService.getUnassignedExpenses();
        setAllExpenses(unassignedExpenses);
        setMarkedExpenses([]);
        setSelectedIds([]);
      }

      const customAttrs = await reportService.getCustomAttributes(
        user?.organization?.id?.toString() || "5"
      );
      setCustomAttributes(customAttrs);

      const newSchema = createReportSchema(customAttrs);
      setFormSchema(newSchema);

      if (editMode && reportData) {
        const newDefaultValues = createDefaultValues(customAttrs);
        form.reset(newDefaultValues);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to fetch data");
    } finally {
      setLoadingExpenses(false);
      setLoadingMeta(false);
    }
  };

  useEffect(() => {
    fetchData();
    if (reportData && reportData.id) {
      fetchComments(reportData.id);
    }
  }, []);

  const getFieldMeta = (fieldName: string) => {
    return additionalFields.find((field) => field.name === fieldName);
  };

  const onSave = async () => {
    if (selectedIds.length === 0) {
      toast.error("Please add at least one expense to the report");
      return;
    }

    setSaving(true);
    try {
      const formData = form.getValues();

      // Check if required fields are selected
      const costCenterField = getFieldMeta("Cost Center");
      const expenseHeadField = getFieldMeta("Expense Head");

      if (costCenterField && !formData.costCenter) {
        toast.error("Please select a Cost Center");
        return;
      }

      if (expenseHeadField && !formData.expenseHead) {
        toast.error("Please select an Expense Head");
        return;
      }

      // Always send all additional fields, with empty string if not shown/selected
      const allFieldNames = [
        "Cost Center",
        "Expense Head",
        "Hospital Name",
        "Campaign Code",
      ];
      const additionalFieldsData: Record<string, string> = {};

      for (const name of allFieldNames) {
        const meta = getFieldMeta(name);
        if (meta) {
          // Only show value if field is visible, else empty string
          if (name === "Hospital Name" || name === "Campaign Code") {
            additionalFieldsData[meta.id] = showHospitalAndCampaign
              ? formData.hospitalName || formData.campaignCode || ""
              : "";
          } else if (name === "Cost Center") {
            additionalFieldsData[meta.id] = formData.costCenter || "";
          } else if (name === "Expense Head") {
            additionalFieldsData[meta.id] = formData.expenseHead || "";
          }
        }
      }

      // Add dynamic custom fields
      customAttributes.forEach((attr) => {
        additionalFieldsData[attr.name] = formData[attr.name] || "";
      });

      // Create custom_attributes object for the API
      const customAttributesData: Record<string, string> = {};
      customAttributes.forEach((attr) => {
        const value = formData[attr.name];
        if (value) {
          customAttributesData[attr.name] = value;
        }
      });
      if (editMode && reportData) {
        // Update existing report
        const updateData = {
          title: formData.reportName,
          description: formData.description,
          custom_attributes: {
            ...customAttributesData,
            ...buildCustomAttributesFromFilters(expenseQuery),
          },
          expense_ids: selectedIds,
        };
        const updateResponse = await reportService.updateReport(
          reportData.id,
          updateData
        );

        if (updateResponse.success) {
          toast.success("Report updated successfully");
          navigate("/reports");
        } else {
          toast.error(updateResponse.message);
        }
      } else {
        // Create new report
        const newReportData = {
          reportName: formData.reportName,
          description: formData.description,
          expenseIds: selectedIds,
          additionalFields: additionalFieldsData,
          customAttributes: {
            ...customAttributesData,
            ...buildCustomAttributesFromFilters(expenseQuery),
          },
        };

        const createResponse = await reportService.createReport(newReportData);

        if (createResponse.success) {
          toast.success("Report saved as draft");
          navigate("/reports");
        } else {
          toast.error(createResponse.message);
        }
      }
    } catch (error) {
      console.error("Failed to save report", error);
      toast.error("Failed to save report");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteReport = async () => {
    if (!reportData?.id) return;

    setIsDeleting(true);
    try {
      const response = await reportService.deleteReport(reportData.id);
      if (response.success) {
        toast.success("Report deleted successfully");
        navigate("/reports");
      } else {
        toast.error(response.message || "Failed to delete report");
        setShowDeleteDialog(false);
      }
    } catch (error) {
      console.error("Failed to delete report:", error);
      toast.error("Failed to delete report");
      setShowDeleteDialog(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const onSubmit = async (data: ReportFormValues) => {
    if (selectedIds.length === 0) {
      toast.error("Please add at least one expense to the report");
      return;
    }

    setLoading(true);
    try {
      // Always send all additional fields, with empty string if not shown/selected
      const allFieldNames = [
        "Cost Center",
        "Expense Head",
        "Hospital Name",
        "Campaign Code",
      ];
      const additionalFieldsData: Record<string, string> = {};

      for (const name of allFieldNames) {
        const meta = getFieldMeta(name);
        if (meta) {
          // Only show value if field is visible, else empty string
          if (name === "Hospital Name" || name === "Campaign Code") {
            additionalFieldsData[meta.id] = showHospitalAndCampaign
              ? data.hospitalName || data.campaignCode || ""
              : "";
          } else if (name === "Cost Center") {
            additionalFieldsData[meta.id] = data.costCenter || "";
          } else if (name === "Expense Head") {
            additionalFieldsData[meta.id] = data.expenseHead || "";
          }
        }
      }

      // Add dynamic custom fields
      customAttributes.forEach((attr) => {
        additionalFieldsData[attr.name] = data[attr.name] || "";
      });

      // Create custom_attributes object for the API
      const customAttributesData: Record<string, string> = {};
      customAttributes.forEach((attr) => {
        const value = data[attr.name];
        if (value) {
          customAttributesData[attr.name] = value;
        }
      });

      const reportData2 = {
        reportName: data.reportName,
        description: data.description,
        expenseIds: selectedIds,
        additionalFields: additionalFieldsData,
        customAttributes: {
          ...customAttributesData,
          ...buildCustomAttributesFromFilters(expenseQuery),
        },
      };

      // 1. Create report
      if (editMode && reportData) {
        trackEvent("Update Report Button Clicked", {
          button_name: "Update Report",
        });
        await reportService.updateReport(reportData.id, {
          title: data.reportName,
          description: data.description,
          custom_attributes: {
            ...customAttributesData,
            ...buildCustomAttributesFromFilters(expenseQuery),
          },
          expense_ids: selectedIds,
        });
        const submitReport = await reportService.submitReport(reportData.id);
        if (submitReport.success) {
          toast.success("Report submitted successfully");
          navigate("/reports");
        } else {
          toast.error("Failed to submit report");
        }
      } else {
        trackEvent("Create Report Button Clicked", {
          button_name: "Create Report",
        });
        const createResponse = await reportService.createReport(reportData2);
        if (createResponse.success && createResponse.reportId) {
          // 2. Submit report immediately
          const submitResponse = await reportService.submitReport(
            createResponse.reportId
          );

          if (submitResponse.success) {
            toast.success("Report created and submitted successfully!");
          } else {
            toast.success("Report created successfully!");
          }

          // 3. Navigate to reports page (this will refresh the table)
          navigate("/reports");
        } else {
          toast.error(createResponse.message);
        }
      }
    } catch (error) {
      console.error("Failed to create report", error);
      toast.error("Failed to create report");
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col space-y-6 min-h-[calc(100vh-40px)]">
      <h1 className="text-2xl font-bold">
        {editMode ? "Edit Report" : "Create Report"}
      </h1>

      <div>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid grid-cols-1 lg:grid-cols-2 lg:col-span-2 gap-4"
          >
            <div>
              <FormField
                control={form.control}
                name="reportName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Report Name *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter report name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {showDescription && (
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Enter report description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {loadingMeta && (
              <div className="flex items-center py-8 col-span-2">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span className="text-muted-foreground">
                  Loading additional fields...
                </span>
              </div>
            )}

            {/* Dynamic Custom Fields */}
            {customAttributes.length > 0 && (
              <div className="space-y-4 lg:col-span-2">
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {customAttributes.map((attribute) => (
                    <DynamicCustomField
                      key={attribute.id}
                      control={form.control}
                      name={attribute.name as any}
                      attribute={attribute}
                    />
                  ))}
                </div>
              </div>
            )}
          </form>
        </Form>
      </div>

      <div className="flex flex-col flex-1 min-h-[540px]">
        {showTabs ? (
          <div className="flex flex-col flex-1 min-h-0">
            <ReportTabs
              activeTab={activeTab}
              onTabChange={(tabId) =>
                setActiveTab(tabId as "expenses" | "history")
              }
              tabs={[
                {
                  key: "expenses",
                  label: "Expenses",
                  count: markedExpenses.length,
                },
                { key: "history", label: "Audit History", count: 0 },
                { key: "comments", label: "Comments", count: 0 },
                { key: "logs", label: "Logs", count: 0 },
              ]}
              className="mb-2"
            />
            {activeTab === "expenses" && (
              <div className="space-y-0 flex-1 h-full">
                <DataGrid
                  className="rounded border-[0.2px] border-[#f3f4f6] h-full"
                  rows={loadingExpenses ? [] : filteredExpenses}
                  columns={columns}
                  loading={loadingExpenses}
                  slots={{
                    toolbar: () => (
                      <CustomToolbar
                        categories={categories}
                        selectedCategory={selectedCategory}
                        setSelectedCategory={setSelectedCategory}
                        dateFrom={dateFrom}
                        dateTo={dateTo}
                        setDateFrom={setDateFrom}
                        setDateTo={setDateTo}
                      />
                    ),
                  }}
                  sx={{
                    border: 0,
                    "& .MuiDataGrid-columnHeaderTitle": {
                      color: "#9AA0A6",
                      fontWeight: "bold",
                      fontSize: "12px",
                    },
                    "& .MuiDataGrid-panel .MuiSelect-select": {
                      fontSize: "12px",
                    },
                    "& .MuiToolbar-root": {
                      paddingX: 0,
                      minHeight: "52px",
                    },
                    "& .MuiDataGrid-main": {
                      border: "0.2px solid #f3f4f6",
                    },
                    "& .MuiDataGrid-columnHeader": {
                      backgroundColor: "#f3f4f6",
                      border: "none",
                    },
                    "& .MuiDataGrid-columnHeaders": {
                      border: "none",
                    },
                    "& .MuiDataGrid-row:hover": {
                      cursor: "pointer",
                      backgroundColor: "#f5f5f5",
                    },
                    "& .MuiDataGrid-cell": {
                      color: "#2E2E2E",
                      border: "0.2px solid #f3f4f6",
                    },
                    "& .MuiDataGrid-cell:focus, & .MuiDataGrid-columnHeader:focus":
                      {
                        outline: "none",
                      },
                    "& .MuiDataGrid-cell:focus-within": {
                      outline: "none",
                    },
                    "& .MuiDataGrid-columnSeparator": {
                      color: "#f3f4f6",
                    },
                  }}
                  showToolbar
                  density="compact"
                  getRowClassName={(params) =>
                    params.row.original_expense_id ? "bg-yellow-50" : ""
                  }
                  checkboxSelection
                  rowSelectionModel={rowSelection}
                  onRowSelectionModelChange={(newSelection) => {
                    if (
                      newSelection.type !== "exclude" &&
                      newSelection.ids.size === 0 &&
                      rowSelection.ids.size > 0
                    )
                      return;
                    setRowSelection(newSelection);
                  }}
                  disableRowSelectionOnClick
                  showCellVerticalBorder
                  pagination
                  paginationModel={paginationModel}
                  onPaginationModelChange={setPaginationModel}
                  pageSizeOptions={[10, 15, 20]}
                />
              </div>
            )}
            {activeTab === "history" && (
              <div className="mt-6">
                {approvalWorkflow && approvalWorkflow.approval_steps ? (
                  <WorkflowTimeline approvalWorkflow={approvalWorkflow} />
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No audit history available
                  </div>
                )}
              </div>
            )}
            {activeTab === "comments" && (
              <div className="flex flex-col h-full overflow-hidden">
                <ExpenseComments
                  expenseId={reportData.id}
                  loadingComments={loadingReportComments}
                  comments={reportComments}
                  commentError={commentError || ""}
                  postComment={handlePostComment}
                  postingComment={postingComment}
                  newComment={newComment || ""}
                  setNewComment={setNewComment}
                />
              </div>
            )}

            {activeTab === "logs" && (
              <div className="flex flex-col h-full overflow-hidden">
                <ExpenseLogs
                  logs={reportLogs}
                  loading={loadingReportComments}
                  error={commentError || ""}
                  className="px-0"
                />
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 h-full">
            <DataGrid
              className="rounded border-[0.2px] border-[#f3f4f6] h-full"
              rows={loadingExpenses ? [] : expenses}
              columns={columns}
              loading={loadingExpenses}
              slots={{
                toolbar: CustomReportExpenseToolbar,
              }}
              slotProps={{
                toolbar: {
                  allCategories: categories,
                } as any,
              }}
              sx={{
                border: 0,
                "& .MuiDataGrid-columnHeaderTitle": {
                  color: "#9AA0A6",
                  fontWeight: "bold",
                  fontSize: "12px",
                },
                "& .MuiDataGrid-panel .MuiSelect-select": {
                  fontSize: "12px",
                },
                "& .MuiToolbar-root": {
                  paddingX: 0,
                  minHeight: "52px",
                },
                "& .MuiDataGrid-main": {
                  border: "0.2px solid #f3f4f6",
                  minHeight: "240px",
                },
                "& .MuiDataGrid-columnHeader": {
                  backgroundColor: "#f3f4f6",
                  border: "none",
                },
                "& .MuiDataGrid-columnHeaders": {
                  border: "none",
                },
                "& .MuiDataGrid-row:hover": {
                  cursor: "pointer",
                  backgroundColor: "#f5f5f5",
                },
                "& .MuiDataGrid-cell": {
                  color: "#2E2E2E",
                  border: "0.2px solid #f3f4f6",
                },
                "& .MuiDataGrid-cell:focus, & .MuiDataGrid-columnHeader:focus":
                  {
                    outline: "none",
                  },
                "& .MuiDataGrid-cell:focus-within": {
                  outline: "none",
                },
                "& .MuiDataGrid-columnSeparator": {
                  color: "#f3f4f6",
                },
              }}
              showToolbar
              density="compact"
              getRowClassName={(params) =>
                params.row.original_expense_id ? "bg-yellow-50" : ""
              }
              checkboxSelection
              rowSelectionModel={rowSelection}
              onRowSelectionModelChange={(newSelection) => {
                if (
                  newSelection.type !== "exclude" &&
                  newSelection.ids.size === 0 &&
                  rowSelection.ids.size > 0
                )
                  return;
                setRowSelection(newSelection);
              }}
              keepNonExistentRowsSelected
              disableRowSelectionOnClick
              showCellVerticalBorder
              pagination
              paginationModel={paginationModel}
              onPaginationModelChange={setPaginationModel}
              pageSizeOptions={[10, 15, 20]}
            />
          </div>
        )}
      </div>

      <FormFooter>
        <div className="flex w-full items-center justify-between gap-4">
          <div>
            <span className="text-gray-600">Total Amount: </span>
            <span className="text-lg font-bold text-primary">
              {formatCurrency(totalAmount || 0)}
            </span>
          </div>
          <div className="flex items-center gap-4">
            {editMode && reportData && (
              <AlertDialog
                open={showDeleteDialog}
                onOpenChange={setShowDeleteDialog}
              >
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="px-10 py-3 border-red-500 text-red-600 hover:bg-red-50"
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Report</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this report? This action
                      cannot be undone.
                      {reportData.title && (
                        <span className="block mt-2 font-medium">
                          Report: {reportData.title}
                        </span>
                      )}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteReport}
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
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/reports")}
              className="px-6 py-2"
            >
              Back
            </Button>
            <Button onClick={onSave} disabled={saving} variant="outline">
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {editMode ? "Updating..." : "Saving..."}
                </>
              ) : editMode ? (
                "Update Report"
              ) : (
                "Save Draft"
              )}
            </Button>
            <Button
              onClick={form.handleSubmit(onSubmit)}
              disabled={loading}
              className="px-10 py-3"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit"
              )}
            </Button>
          </div>
        </div>
      </FormFooter>
    </div>
  );
}
