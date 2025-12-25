import { useEffect, useState } from "react";
import { expenseService } from "@/services/expenseService";
import { ReportsPageWrapper } from "@/components/reports/ReportsPageWrapper";
import { useExpenseStore } from "@/store/expenseStore";
import { Box, Skeleton } from "@mui/material";
import {
  DataGrid,
  GridColDef,
  GridPaginationModel,
  GridRowSelectionModel,
} from "@mui/x-data-grid";
import { AlertTriangle, CheckCircle } from "lucide-react";
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
import { GridOverlay } from "@mui/x-data-grid";

export function getExpenseType(type: string) {
  if (type === "RECEIPT_BASED") return "Expense";
  if (type === "MILEAGE_BASED") return "Mileage";
  if (type === "PER_DIEM") return "Per Diem";
  return type;
}

function ExpensesSkeletonOverlay({ rowCount = 8 }) {
  return (
    <GridOverlay>
      <div className="w-full py-3 space-y-0">
        {Array.from({ length: rowCount }).map((_, rowIndex) => (
          <div
            key={rowIndex}
            className="flex items-center gap-4 w-full py-3 px-2 border-[0.5px] border-gray"
          >
            <Skeleton
              variant="rectangular"
              height={10}
              width="2%"
              className="rounded-full"
            />
            {/* EXPENSE ID */}
            <Skeleton
              variant="rectangular"
              height={10}
              width="10%"
              className="rounded-full"
            />

            {/* TYPE */}
            <Skeleton
              variant="rectangular"
              height={10}
              width="8%"
              className="rounded-full"
            />

            {/* POLICY */}
            <Skeleton
              variant="rectangular"
              height={10}
              width="10%"
              className="rounded-full"
            />

            {/* CATEGORY */}
            <Skeleton
              variant="rectangular"
              height={10}
              width="10%"
              className="rounded-full"
            />

            {/* VENDOR */}
            <Skeleton
              variant="rectangular"
              height={10}
              width="16%"
              className="rounded-full"
            />

            {/* DATE */}
            <Skeleton
              variant="rectangular"
              height={10}
              width="8%"
              className="rounded-full"
            />

            {/* AMOUNT */}
            <Skeleton
              variant="rectangular"
              height={10}
              width="8%"
              className="rounded-full"
            />

            {/* CURRENCY */}
            <Skeleton
              variant="rectangular"
              height={10}
              width="6%"
              className="rounded-full"
            />

            {/* STATUS */}
            <Skeleton
              variant="rectangular"
              height={10}
              width="12%"
              className="rounded-full"
            />
          </div>
        ))}
      </div>
    </GridOverlay>
  );
}

function CustomNoRows() {
  return (
    <GridOverlay>
      <Box className="w-full">
        <div className="text-center">
          <CheckCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No expenses found</h3>
          <p className="text-muted-foreground">
            There are currently no expenses.
          </p>
        </div>
      </Box>
    </GridOverlay>
  );
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
    draftExpenses,
    reportedExpenses,
    allExpensesPagination,
    draftExpensesPagination,
    reportedExpensesPagination,
    setAllExpenses,
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
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [rowSelection, setRowSelection] = useState<GridRowSelectionModel>({
    type: "include",
    ids: new Set(),
  });
  const [rowsCalculated, setRowsCalculated] = useState(false);

  const rows =
    activeTab === "all"
      ? allExpenses
      : activeTab === "draft"
      ? draftExpenses
      : reportedExpenses;

  const [paginationModel, setPaginationModel] =
    useState<GridPaginationModel | null>({
      page: 0,
      pageSize: 10,
    });

  useEffect(() => {
    const gridHeight = window.innerHeight - 300;
    const rowHeight = 36;
    const calculatedPageSize = Math.floor(gridHeight / rowHeight);
    setRowsCalculated(true);
    setPaginationModel({ page: 0, pageSize: calculatedPageSize });
  }, [activeTab]);

  const fetchAllExpenses = async () => {
    try {
      const response = await expenseService.fetchAllExpenses(
        (paginationModel?.page || 0) + 1,
        paginationModel?.pageSize
      );
      setAllExpenses(response.data);
      setAllExpensesPagination(response.pagination);
    } catch (error) {
      console.log(error);
    }
  };

  const fetchDraftExpenses = async () => {
    try {
      const response = await expenseService.getExpensesByStatus(
        "COMPLETE,INCOMPLETE",
        (paginationModel?.page || 0) + 1,
        paginationModel?.pageSize
      );
      setDraftExpenses(response.data);
      setDraftExpensesPagination(response.pagination);
    } catch (error) {
      console.log(error);
    }
  };

  const fetchCompletedExpenses = async () => {
    try {
      const response = await expenseService.getExpensesByStatus(
        "APPROVED,REJECTED,PENDING_APPROVAL",
        (paginationModel?.page || 0) + 1,
        paginationModel?.pageSize
      );
      setReportedExpenses(response.data);
      setReportedExpensesPagination(response.pagination);
    } catch (error) {
      console.log(error);
    }
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
  }, [activeTab]);

  const tabs = [
    { key: "all", label: "All", count: allExpensesPagination.total },
    { key: "draft", label: "Drafts", count: draftExpensesPagination.total },
    {
      key: "reported",
      label: "Reported",
      count: reportedExpensesPagination.total,
    },
  ];

  const statusOptions = [
    { value: "all", label: "All" },
    { value: "COMPLETE", label: "Complete" },
    { value: "INCOMPLETE", label: "Incomplete" },
    { value: "PENDING_APPROVAL", label: "Pending Approval" },
    { value: "APPROVED", label: "Approved" },
    { value: "REJECTED", label: "Rejected" },
  ];

  return (
    <ReportsPageWrapper
      title="Expenses"
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={(tabId) =>
        setActiveTab(tabId as "all" | "draft" | "reported")
      }
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      searchPlaceholder="Search expenses..."
      statusFilter={statusFilter}
      onStatusChange={setStatusFilter}
      statusOptions={statusOptions}
      selectedDate={selectedDate}
      onDateChange={setSelectedDate}
      showFilters={false}
      showDateFilter={false}
      showCreateButton={true}
      createButtonText="Create New Expense"
      createButtonLink="/expenses/create"
    >
      <Box
        sx={{
          height: "calc(100vh - 160px)",
          width: "100%",
          marginTop: "-30px",
        }}
      >
        <DataGrid
          className="rounded border-[0.2px] border-[#f3f4f6] h-full"
          rows={loading ? [] : rows}
          columns={columns}
          loading={loading}
          slots={{
            noRowsOverlay: CustomNoRows,
            loadingOverlay:
              loading && isInitialLoad
                ? () => (
                    <ExpensesSkeletonOverlay
                      rowCount={paginationModel?.pageSize}
                    />
                  )
                : undefined,
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
