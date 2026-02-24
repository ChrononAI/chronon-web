import { useCallback, useEffect, useRef, useState } from "react";
import { expenseService } from "@/services/expenseService";
import { InvoicePageWrapper } from "@/components/invoice/InvoicePageWrapper";
import { useExpenseStore } from "@/store/expenseStore";
import {
  GridColDef,
  GridPaginationModel,
  GridRowSelectionModel,
} from "@mui/x-data-grid";
import { AlertTriangle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  formatCurrency,
  formatDate,
  getOrgCurrency,
} from "@/lib/utils";
import { StatusPill } from "@/components/shared/StatusPill";
import { useNavigate } from "react-router-dom";
import CustomNoRows from "@/components/shared/CustomNoRows";
import CustomExpenseToolbar from "@/components/expenses/CustomExpenseToolbar";
import SkeletonLoaderOverlay from "@/components/shared/SkeletonLoaderOverlay";
import { DataTable } from "@/components/shared/DataTable";
import { useLayoutStore } from "@/store/layoutStore";

export function getExpenseType(type: string) {
  if (type === "RECEIPT_BASED") return "Expense";
  if (type === "MILEAGE_BASED") return "Mileage";
  if (type === "PER_DIEM") return "Per Diem";
  return type;
}

export type Operator =
  | "eq"
  | "neq"
  | "lt"
  | "lte"
  | "gt"
  | "gte"
  | "in"
  | "like"
  | "ilike";

export type FilterValue = string | number | (string | number)[];

export type FieldFilter = {
  operator: Operator;
  value: FilterValue;
};

export type FilterMap = Record<string, FieldFilter[]>;

export function getFilterValue(
  query: FilterMap,
  key: string,
  operator: Operator
): FilterValue | undefined {
  return query[key]?.find((f) => f.operator === operator)?.value;
}

export function buildBackendQuery(filters: FilterMap): string {
  const params: string[] = [];

  Object.entries(filters).forEach(([key, fieldFilters]) => {
    if (key === "q") {
      const value = fieldFilters?.[0]?.value;

      if (typeof value !== "string" || value.trim() === "") {
        return;
      }

      const finalValue = value.endsWith(":*") ? value : `${value}:*`;

      params.push(`q=${finalValue}`);
      return;
    }

    fieldFilters?.forEach(({ operator, value }) => {
      if (
        value === undefined ||
        value === null ||
        (typeof value === "string" && value.trim() === "") ||
        (Array.isArray(value) && value.length === 0)
      ) {
        return;
      }

      switch (operator) {
        case "in":
          params.push(
            `${key}=in.(${(value as (string | number)[]).join(",")})`
          );
          break;

        case "ilike":
          params.push(`${key}=ilike.%${value}%`);
          break;

        default:
          params.push(`${key}=${operator}.${value}`);
      }
    });
  });

  return params.join("&");
}

const EXPENSE_STATUSES = [
  "COMPLETE",
  "INCOMPLETE",
  "PENDING_APPROVAL",
  "APPROVED",
  "REJECTED",
  "SENT_BACK",
];

const DRAFT_EXPENSE_STATUSES = ["COMPLETE", "INCOMPLETE", "SENT_BACK"];

const REPORTED_EXPENSE_STATUSES = ["APPROVED", "REJECTED", "PENDING_APPROVAL"];

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
    minWidth: 80,
    flex: 1,
    renderCell: () => getOrgCurrency(),
  },
  {
    field: "status",
    headerName: "STATUS",
    flex: 1,
    minWidth: 180,
    renderCell: (params) => (
      <StatusPill status={params.value} />
    ),
  },
];

export function MyExpensesPage() {
  const {
    allExpenses,
    query,
    draftExpenses,
    reportedExpenses,
    allExpensesPagination,
    draftExpensesPagination,
    reportedExpensesPagination,
    setAllExpenses,
    setQuery,
    setDraftExpenses,
    setReportedExpenses,
    setAllExpensesPagination,
    setDraftExpensesPagination,
    setReportedExpensesPagination,
  } = useExpenseStore();
  const navigate = useNavigate();
  const setNoPadding = useLayoutStore((s) => s.setNoPadding);
  const [loading, setLoading] = useState(true);

  // Tab and filter states
  const [activeTab, setActiveTab] = useState<"all" | "draft" | "reported">(
    "all"
  );

  const allowedStatus =
    activeTab === "all"
      ? EXPENSE_STATUSES
      : activeTab === "draft"
        ? DRAFT_EXPENSE_STATUSES
        : REPORTED_EXPENSE_STATUSES;

  const [rowSelection, setRowSelection] = useState<GridRowSelectionModel>({
    type: "include",
    ids: new Set(),
  });

  const rows =
    activeTab === "all"
      ? allExpenses
      : activeTab === "draft"
        ? draftExpenses
        : reportedExpenses;

  function updateQuery(key: string, operator: Operator, value: FilterValue) {
    setQuery((prev) => {
      const prevFilters: FieldFilter[] = prev[key] ?? [];

      if (
        value === undefined ||
        value === null ||
        (typeof value === "string" && value.trim() === "") ||
        (Array.isArray(value) && value.length === 0)
      ) {
        const nextFilters = prevFilters.filter((f) => f.operator !== operator);

        if (nextFilters.length === 0) {
          const { [key]: _, ...rest } = prev;
          return rest;
        }

        return {
          ...prev,
          [key]: nextFilters,
        };
      }

      const existingIndex = prevFilters.findIndex(
        (f) => f.operator === operator
      );

      const nextFilters =
        existingIndex >= 0
          ? prevFilters.map((f, i) =>
            i === existingIndex ? { operator, value } : f
          )
          : [...prevFilters, { operator, value }];

      return {
        ...prev,
        [key]: nextFilters,
      };
    });
  }

  const GRID_OFFSET = 240;
  const ROW_HEIGHT = 38;
  const HEADER_HEIGHT = 56;

  const calculatePageSize = () => {
    const availableHeight =
      window.innerHeight - GRID_OFFSET - HEADER_HEIGHT;
    return Math.max(1, Math.floor(availableHeight / ROW_HEIGHT));
  };

  const [paginationModel, setPaginationModel] =
    useState<GridPaginationModel>({
      page: 0,
      pageSize: calculatePageSize(),
    });


  const fetchFilteredExpenses = useCallback(
    async ({ signal }: { signal: AbortSignal }) => {
      const limit = paginationModel?.pageSize ?? 10;
      const offset = (paginationModel?.page ?? 0) * limit;

      let newQuery: FilterMap = query;

      if (!query?.status) {
        if (activeTab === "draft") {
          newQuery = { ...query, status: [{ operator: "in", value: ["COMPLETE", "INCOMPLETE", "SENT_BACK"] }] }
        } else if (activeTab === "reported") {
          newQuery = { ...query, status: [{ operator: "in", value: ["APPROVED", "REJECTED", "PENDING_APPROVAL"] }] }
        } else newQuery = query;
      }

      const response = await expenseService.getFilteredExpenses({
        query: buildBackendQuery(newQuery),
        limit,
        offset,
        signal,
      });

      switch (activeTab) {
        case "draft":
          setDraftExpenses(response.data.data);
          setDraftExpensesPagination({ total: response.data.count });
          break;

        case "reported":
          setReportedExpenses(response.data.data);
          setReportedExpensesPagination({ total: response.data.count });
          break;

        case "all":
        default:
          setAllExpenses(response.data.data);
          setAllExpensesPagination({ total: response.data.count });
      }
    },
    [query, activeTab, paginationModel?.page, paginationModel?.pageSize]
  );

  useEffect(() => {
    setRowSelection({ type: "include", ids: new Set() });
  }, [paginationModel?.page, paginationModel?.pageSize]);

  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear pending debounce
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
            setRowSelection({ type: "include", ids: new Set() });
          }
        });
    }, 400);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [fetchFilteredExpenses]);

  useEffect(() => {
    setRowSelection({ type: "include", ids: new Set() });
  }, [activeTab]);

  useEffect(() => {
    setNoPadding(true);
    return () => {
      setNoPadding(false);
    };
  }, [setNoPadding]);

  const tabs = [
    { key: "all", label: "All", count: allExpensesPagination?.total },
    { key: "draft", label: "Drafts", count: draftExpensesPagination.total },
    {
      key: "reported",
      label: "Reported",
      count: reportedExpensesPagination.total,
    },
  ];

  const handleTabChange = (tab: any) => {
    setActiveTab(tab);
    setLoading(true); setPaginationModel((prev) => ({
      ...prev,
      page: 0,
    }));
    setRowSelection({ type: "include", ids: new Set() });

    const filter =
      tab === "all"
        ? []
        : tab === "draft"
          ? ["COMPLETE", "INCOMPLETE", "SENT_BACK"]
          : ["APPROVED", "REJECTED", "PENDING_APPROVAL"];

    updateQuery("status", "in", filter);
  };

  useEffect(() => {
    setQuery((prev) => {
      const { status, ...rest } = prev;
      return { ...rest }
    })
  }, []);

  const rowCount =
    activeTab === "all"
      ? allExpensesPagination?.total
      : activeTab === "draft"
        ? draftExpensesPagination?.total
        : reportedExpensesPagination?.total || 0;

  return (
    <InvoicePageWrapper
      title="Expenses"
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={handleTabChange}
      showFilters={false}
      showDateFilter={false}
      showCreateButton={false}
      marginBottom="mb-0"
    >
      <DataTable
        rows={loading ? [] : rows}
        columns={columns}
        loading={loading}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        onRowClick={(params) => navigate(`/expenses/${params.id}`)}
        rowCount={rowCount}
        paginationMode="server"
        getRowClassName={(params) =>
          params.row.original_expense_id ? "bg-yellow-50" : ""
        }
        firstColumnField="sequence_number"
        emptyStateComponent={
          <CustomNoRows
            title="No expenses found"
            description="There are currently no expenses"
          />
        }
        slots={{
          toolbar: CustomExpenseToolbar,
          loadingOverlay: () => (
            <SkeletonLoaderOverlay
              rowCount={paginationModel?.pageSize}
            />
          ),
        }}
        slotProps={{
          toolbar: {
            allStatuses: allowedStatus,
            onCreateClick: () => navigate("/expenses/create"),
            createButtonText: "Create New Expense",
          } as any,
        }}
        showToolbar
        checkboxSelection
        rowSelectionModel={rowSelection}
        onRowSelectionModelChange={setRowSelection}
      />
    </InvoicePageWrapper>
  );
}
