import { ReportsPageWrapper } from "@/components/reports/ReportsPageWrapper";
import {
  formatCurrency,
  formatDate,
  getOrgCurrency,
  getStatusColor,
} from "@/lib/utils";
import { Box, Toolbar } from "@mui/material";
import {
  DataGrid,
  FilterPanelTrigger,
  GridColDef,
  GridExpandMoreIcon,
  GridFilterListIcon,
  GridPaginationModel,
  GridRowId,
  GridRowParams,
  GridRowSelectionModel,
} from "@mui/x-data-grid";
import { useEffect, useState } from "react";
import { getExpenseType } from "../MyExpensesPage";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { GridOverlay } from "@mui/x-data-grid";
import { toast } from "sonner";
import { settlementsService } from "@/services/settlementsService";
import { ExportCsv } from "@mui/x-data-grid";
import { Button } from "@/components/ui/button";
import { ViewExpenseWindow } from "@/components/expenses/ViewExpenseWindow";

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

function CustomToolbar({
  onCustomClick,
  rowSelection,
  activeTab,
  marking,
}: {
  onCustomClick: (data: any) => void;
  rowSelection: GridRowSelectionModel;
  activeTab: "paid" | "unpaid";
  marking: boolean;
}) {
  const disabled =
    marking ||
    (rowSelection.type === "include"
      ? Array.from(rowSelection.ids).length === 0
      : Array.from(rowSelection.ids).length !== 0);
  return (
    <Toolbar
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        p: 1,
        gap: 2,
        backgroundColor: "background.paper",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        {activeTab === "unpaid" && (
          <Button disabled={disabled} onClick={onCustomClick}>
            {marking ? <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Marking...
            </> : "Mark As Paid"}
          </Button>
        )}
      </Box>

      <Box className="flex items-center gap-2">
        <FilterPanelTrigger
          size="small"
          startIcon={<GridFilterListIcon className="text-gray-500" />} // 👈 custom icon
        >
          <span className="text-gray-500">Filter</span>
        </FilterPanelTrigger>

        <ExportCsv
          size="small"
          startIcon={<GridExpandMoreIcon className="text-gray-500" />} // 👈 custom icon
        >
          <span className="text-gray-500">Export CSV</span>
        </ExportCsv>
      </Box>
    </Toolbar>
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
    renderCell: (params: any) => getExpenseType(params.row.expense_type),
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
    renderCell: (params: any) => {
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
    field: "payment_state",
    headerName: "PAYMENT STATE",
    minWidth: 120,
    flex: 1,
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
    renderCell: (params: any) => (
      <Badge className={getStatusColor(params.value)}>
        {params.value.replace("_", " ")}
      </Badge>
    ),
  },
];

function Settlements() {
  const [activeTab, setActiveTab] = useState<"paid" | "unpaid">("unpaid");
  const [paidExpenseCount, setPaidExpenseCount] = useState(0);
  const [unpaidExpenseCount, setUnpaidExpenseCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<any>(null);
  const tabs = [
    {
      key: "unpaid",
      label: "Unpaid",
      count: unpaidExpenseCount,
    },
    { key: "paid", label: "Paid", count: paidExpenseCount },
  ];
  const [paidRows, setPaidRows] = useState([]);
  const [unpaidRows, setUnpaidRows] = useState([]);
  const [paginationModel, setPaginationModel] =
    useState<GridPaginationModel | null>(null);
  const [rowSelection, setRowSelection] = useState<GridRowSelectionModel>({
    type: "include",
    ids: new Set<GridRowId>(),
  });
  const rows: any = activeTab === "paid" ? paidRows : unpaidRows;

  useEffect(() => {
    const gridHeight = window.innerHeight - 300;
    const rowHeight = 36;
    const calculatedPageSize = Math.floor(gridHeight / rowHeight);
    setPaginationModel({ page: 0, pageSize: calculatedPageSize });
  }, []);

  const handleRowClick = ({ row }: GridRowParams) => {
    setSelectedExpense(row);
    setOpen(true);
  };

  const fetchPaidExpenses = async ({
    limit,
    offset,
  }: {
    limit: number;
    offset: number;
  }) => {
    try {
      const res = await settlementsService.getSettlementsByStatus({
        limit,
        offset,
        state: "PAID",
      });
      setPaidRows(res.data.data);
      setPaidExpenseCount(res.data.count);
    } catch (error) {
      console.log(error);
    }
  };

  const fetchUnpaidExpenses = async ({
    limit,
    offset,
  }: {
    limit: number;
    offset: number;
  }) => {
    try {
      const res = await settlementsService.getSettlementsByStatus({
        limit,
        offset,
        state: "PAYMENT_PENDING",
        status: "APPROVED",
      });
      setUnpaidRows(res.data.data);
      setUnpaidExpenseCount(res.data.count);
    } catch (error) {
      console.log(error);
    }
  };

  const fetchData = async ({
    limit,
    offset,
  }: {
    limit: number;
    offset: number;
  }) => {
    try {
      setLoading(true);
      await Promise.all([
        fetchPaidExpenses({ limit, offset }),
        fetchUnpaidExpenses({ limit, offset }),
      ]);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };

  const markAspaid = async (ids: string[]) => {
    setMarking(true);
    try {
      await settlementsService.markAsPaid(ids);
      const limit = paginationModel?.pageSize || 10;
      const offset = (paginationModel?.page || 0) * limit;
      fetchData({ limit, offset });
      toast.success("Expenses marked as paid");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error.message);
    } finally {
      setMarking(false);
    }
  };

  const onCustomClick = async () => {
    let expense_ids: GridRowId[];
    if (rowSelection.type === "include") {
      expense_ids = Array.from(rowSelection.ids);
    } else {
      expense_ids = rows
        .filter((exp: any) => !rowSelection.ids.has(exp.id))
        .map((exp: any) => exp.id);
    }
    markAspaid(expense_ids as string[]);
  };

  useEffect(() => {
    const limit = paginationModel?.pageSize || 10;
    const offset = (paginationModel?.page || 0) * limit;
    fetchData({ limit, offset });
  }, [paginationModel?.page, paginationModel?.pageSize]);

  return (
    <ReportsPageWrapper
      title="Expenses"
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={(tabId) => setActiveTab(tabId as "paid" | "unpaid")}
      showFilters={false}
      showDateFilter={false}
    >
      <Box
        sx={{
          height: "calc(100vh - 160px)",
          width: "100%",
          marginTop: "-32px",
        }}
      >
        <DataGrid
          className="rounded border-[0.2px] border-[#f3f4f6] h-full"
          rows={loading ? [] : rows}
          columns={columns}
          loading={loading}
          slots={{
            noRowsOverlay: CustomNoRows,
            toolbar: () => (
              <CustomToolbar
                onCustomClick={onCustomClick}
                rowSelection={rowSelection}
                activeTab={activeTab}
                marking={marking}
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
            "& .MuiToolbar-root": {
              paddingX: 0,
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
          showToolbar
          density="compact"
          getRowClassName={(params: any) =>
            params.row.original_expense_id ? "bg-yellow-50" : ""
          }
          checkboxSelection
          rowSelectionModel={rowSelection}
          onRowSelectionModelChange={setRowSelection}
          disableRowSelectionOnClick
          showCellVerticalBorder
          onRowClick={handleRowClick}
          pagination
          paginationMode="server"
          paginationModel={paginationModel || { page: 0, pageSize: 0 }}
          onPaginationModelChange={setPaginationModel}
          rowCount={
            (activeTab === "paid" ? paidExpenseCount : unpaidExpenseCount) || 0
          }
        />
      </Box>
      <ViewExpenseWindow
        open={open}
        onOpenChange={setOpen}
        data={selectedExpense}
      />
    </ReportsPageWrapper>
  );
}

export default Settlements;
