import { useEffect, useState } from "react";
import { expenseService } from "@/services/expenseService";
import { ReportsPageWrapper } from "@/components/reports/ReportsPageWrapper";
import { useExpenseStore } from "@/store/expenseStore";
import { Box } from "@mui/material";
import {
  DataGrid,
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
import { Badge } from "@/components/ui/badge";
import {
  formatCurrency,
  formatDate,
  getStatusColor,
  getOrgCurrency,
} from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import ExpensesSkeletonOverlay from "@/components/expenses/ExpenseSkeletonOverlay";
import CustomNoRows from "@/components/shared/CustomNoRows";
import CustomExpenseToolbar from "@/components/expenses/CustomExpenseToolbar";

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
    // 🔍 SPECIAL CASE: search query
    if (key === "q") {
      const value = fieldFilters?.[0]?.value;

      if (typeof value !== "string" || value.trim() === "") {
        return;
      }

      const finalValue = value.endsWith(":*") ? value : `${value}:*`;

      params.push(`q=${finalValue}`);
      return;
    }

    // ✅ Normal filters
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

const DRAFT_EXPENSE_STATUSES = ["COMPLETE", "INCOMPLETE"];

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
    field: "policy",
    headerName: "POLICY",
    minWidth: 140,
    flex: 1,
    valueGetter: (params: any) => params?.name || "No Policy",
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
      <Badge className={getStatusColor(params.value)}>
        {params.value.replace("_", " ")}
      </Badge>
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

  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [rowSelection, setRowSelection] = useState<GridRowSelectionModel>({
    type: "include",
    ids: new Set(),
  });
  const [rowsCalculated, setRowsCalculated] = useState(false);
  console.log(buildBackendQuery(query));
  const allExpensesQuery = query;

  const draftExpensesQuery: FilterMap = {
    status: [{ operator: "in", value: DRAFT_EXPENSE_STATUSES }],
  };

  const completedExpensesQuery: FilterMap = {
    status: [
      {
        operator: "in",
        value: REPORTED_EXPENSE_STATUSES,
      },
    ],
  };

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

  const [paginationModel, setPaginationModel] =
    useState<GridPaginationModel | null>({
      page: 0,
      pageSize: 10,
    });

  const getFilteredExpenses = async ({
    query,
    limit,
    offset,
  }: {
    query: string;
    limit: number;
    offset: number;
  }) => {
    try {
      const res = await expenseService.getFilteredExpenses({
        query,
        limit,
        offset,
      });
      console.log(res);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    if (paginationModel && rowsCalculated) {
      const limit = paginationModel?.pageSize || 10;
      const offset = (paginationModel?.page || 0) * limit;
      const frido = buildBackendQuery(query);
      getFilteredExpenses({ query: frido, limit, offset });
    }
    setRowSelection({ type: "include", ids: new Set() });
  }, [paginationModel?.page, paginationModel?.pageSize, rowsCalculated]);

  useEffect(() => {
    const gridHeight = window.innerHeight - 340;
    const rowHeight = 36;
    const calculatedPageSize = Math.floor(gridHeight / rowHeight);
    setRowsCalculated(true);
    setPaginationModel({ page: 0, pageSize: calculatedPageSize });
  }, [activeTab]);

  const fetchAllExpenses = async () => {
    const limit = paginationModel?.pageSize ?? 10;
    const offset = (paginationModel?.page ?? 0) * limit;

    const response: any = await expenseService.getFilteredExpenses({
      query: buildBackendQuery(allExpensesQuery),
      limit,
      offset,
    });
    console.log(response);

    setAllExpenses(response.data.data);
    setAllExpensesPagination({ total: response.data.count });
  };

  const fetchDraftExpenses = async () => {
    const limit = paginationModel?.pageSize ?? 10;
    const offset = (paginationModel?.page ?? 0) * limit;

    const response = await expenseService.getFilteredExpenses({
      query: buildBackendQuery(draftExpensesQuery),
      limit,
      offset,
    });

    setDraftExpenses(response.data.data);
    setDraftExpensesPagination({ total: response.data.count });
  };

  const fetchCompletedExpenses = async () => {
    const limit = paginationModel?.pageSize ?? 10;
    const offset = (paginationModel?.page ?? 0) * limit;

    const response = await expenseService.getFilteredExpenses({
      query: buildBackendQuery(completedExpensesQuery),
      limit,
      offset,
    });

    setReportedExpenses(response.data.data);
    setReportedExpensesPagination({ total: response.data.count });
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchAllExpenses(),
        fetchDraftExpenses(),
        fetchCompletedExpenses(),
      ]);
      setIsInitialLoad(false);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (paginationModel && rowsCalculated) {
      fetchData();
    }
    setRowSelection({ type: "include", ids: new Set() });
  }, [paginationModel?.page, paginationModel?.pageSize, rowsCalculated]);

  useEffect(() => {
    setRowSelection({ type: "include", ids: new Set() });

    const filter =
      activeTab === "all"
        ? []
        : activeTab === "draft"
        ? ["COMPLETE", "INCOMPLETE"]
        : ["APPROVED", "REJECTED", "PENDING_APPROVAL"];
    updateQuery("status", "in", filter);
  }, [activeTab]);

  const tabs = [
    { key: "all", label: "All", count: allExpensesPagination?.total },
    { key: "draft", label: "Drafts", count: draftExpensesPagination.total },
    {
      key: "reported",
      label: "Reported",
      count: reportedExpensesPagination.total,
    },
  ];

  return (
    <ReportsPageWrapper
      title="Expenses"
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={(tabId) =>
        setActiveTab(tabId as "all" | "draft" | "reported")
      }
      showFilters={false}
      showDateFilter={false}
      showCreateButton={true}
      createButtonText="Create New Expense"
      marginBottom="mb-0"
      createButtonLink="/expenses/create"
    >
      <Box
        sx={{
          height: "calc(100vh - 160px)",
          width: "100%",
        }}
      >
        <DataGrid
          className="rounded border-[0.2px] border-[#f3f4f6] h-full"
          rows={loading ? [] : rows}
          columns={columns}
          loading={loading}
          slots={{
            toolbar: CustomExpenseToolbar,
            noRowsOverlay: () => (
              <CustomNoRows
                title={"No expenses found"}
                description={"There are currently no expenses"}
              />
            ),
            loadingOverlay:
              loading && isInitialLoad
                ? () => (
                    <ExpensesSkeletonOverlay
                      rowCount={paginationModel?.pageSize}
                    />
                  )
                : undefined,
          }}
          slotProps={{
            toolbar: {
              allStatuses: allowedStatus,
              query,
              updateQuery,
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
            "& .MuiDataGrid-main": {
              border: "0.2px solid #f3f4f6",
            },
            "& .MuiDataGrid-columnHeader": {
              backgroundColor: "#f3f4f6",
              border: "none",
            },
            "& .MuiDataGridToolbar-root": {
              paddingX: "2px",
              width: "100%",
              justifyContent: "start",
            },
            "& .MuiDataGridToolbar": {
              justifyContent: "start",
              border: "none !important",
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
            "& .MuiDataGrid-cell:focus, & .MuiDataGrid-columnHeader:focus": {
              outline: "none",
            },
            "& .MuiDataGrid-cell:focus-within": {
              outline: "none",
            },
            "& .MuiDataGrid-columnSeparator": {
              color: "#f3f4f6",
            },
          }}
          density="compact"
          getRowClassName={(params) =>
            params.row.original_expense_id ? "bg-yellow-50" : ""
          }
          showToolbar
          checkboxSelection
          disableRowSelectionOnClick
          showCellVerticalBorder
          onRowClick={(params) => navigate(`/expenses/${params.id}`)}
          rowSelectionModel={rowSelection}
          onRowSelectionModelChange={setRowSelection}
          pagination
          paginationMode="server"
          paginationModel={paginationModel || { page: 0, pageSize: 0 }}
          onPaginationModelChange={setPaginationModel}
          rowCount={
            (activeTab === "all"
              ? allExpensesPagination?.total
              : activeTab === "draft"
              ? draftExpensesPagination?.total
              : reportedExpensesPagination?.total) || 0
          }
        />
      </Box>
    </ReportsPageWrapper>
  );
}
