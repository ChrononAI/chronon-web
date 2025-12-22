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
import { useCallback, useEffect, useRef, useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ReportTabs } from "@/components/reports/ReportTabs";
import { useNavigate } from "react-router-dom";

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
  rowCount,
}: {
  onCustomClick: (data: any) => void;
  rowSelection: GridRowSelectionModel;
  activeTab: "paid" | "unpaid";
  marking: boolean;
  rowCount: number;
}) {
  const disabled =
    marking ||
    (rowSelection.type === "include"
      ? Array.from(rowSelection.ids).length === 0
      : Array.from(rowSelection.ids).length === rowCount);
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
            {marking ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Marking...
              </>
            ) : (
              "Mark As Paid"
            )}
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
    minWidth: 180,
    flex: 1,
    renderCell: (params: any) => (
      <Badge className={getStatusColor(params.value)}>
        {params.value.replace("_", " ")}
      </Badge>
    ),
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
];

function Settlements() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"paid" | "unpaid">("unpaid");
  const [paidExpenseCount, setPaidExpenseCount] = useState(0);
  const [unpaidExpenseCount, setUnpaidExpenseCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
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
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [uploadingBulk, setUploadingBulk] = useState(false);
  const [bulkInputKey, setBulkInputKey] = useState(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const rows: any = activeTab === "paid" ? paidRows : unpaidRows;

  const handleBulkDialogChange = useCallback((open: boolean) => {
    setShowBulkUpload(open);
    if (!open) {
      setBulkFile(null);
      setBulkInputKey((key) => key + 1);
      setUploadingBulk(false);
    }
  }, []);

  const handleDownloadTemplate = useCallback(async () => {
    try {
      const response = await settlementsService.downloadBulkMarkTemplate();

      const blob = new Blob([response.data], {
        type: response.headers["content-type"] || "application/octet-stream",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "bulk-settle-expenses-template.xlsx");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download bulk upload template:", error);
      toast.error("Failed to download template");
    }
  }, []);

  const uploadBulkFile = useCallback(
    async (file: File) => {
      if (uploadingBulk) return;

      setUploadingBulk(true);
      try {
        await settlementsService.uploadBulkSettleExpense(file);
        toast.success("Bulk settlement submitted successfully");
        handleBulkDialogChange(false);
      } catch (error) {
        console.error("Failed to upload file in:", error);
        toast.error("Failed to upload file");
      } finally {
        setUploadingBulk(false);
      }
    },
    [handleBulkDialogChange, uploadingBulk]
  );

  const handleBulkUpload = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!bulkFile) {
        toast.error("Please select a file to upload");
        return;
      }

      await uploadBulkFile(bulkFile);
    },
    [bulkFile, uploadBulkFile]
  );

  const handleBulkFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0] ?? null;
      setBulkFile(file);
    },
    []
  );

  const handleBrowseClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleClearFile = useCallback(() => {
    setBulkFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setBulkInputKey((key) => key + 1);
  }, []);

  useEffect(() => {
    const gridHeight = window.innerHeight - 300;
    const rowHeight = 38;
    const calculatedPageSize = Math.floor(gridHeight / rowHeight);
    setPaginationModel({ page: 0, pageSize: calculatedPageSize });
  }, []);

  const handleRowClick = ({ id }: GridRowParams) => {
    console.log(id);
    navigate(`/admin/settlements/${id}`);
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
    setRowSelection({ type: "include", ids: new Set() });
  }, [paginationModel?.page, paginationModel?.pageSize]);

  useEffect(() => {
    setRowSelection({ type: "include", ids: new Set() });
  }, [activeTab]);

  return (
    <div>
      <div className="flex gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Settlements</h1>
        </div>
        <Button
          type="button"
          className="self-start sm:self-auto bg-blue-600 text-white hover:bg-blue-700 px-6 py-2 text-[14px]"
          onClick={() => handleBulkDialogChange(true)}
        >
          Bulk Mark Paid
        </Button>
      </div>
      <ReportTabs
        activeTab={activeTab}
        onTabChange={(tabId) => setActiveTab(tabId as "paid" | "unpaid")}
        tabs={tabs}
        className="mb-8"
      />
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
                rowCount={rows.length}
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
      <Dialog open={showBulkUpload} onOpenChange={handleBulkDialogChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Bulk Upload Settlement Expenses</DialogTitle>
            <DialogDescription>
              Upload an Excel file to settle expenses in bulk. Use the template
              for the required format.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-6" onSubmit={handleBulkUpload}>
            <div className="flex flex-col gap-3">
              <input
                key={bulkInputKey}
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleBulkFileSelect}
                className="hidden"
              />
              <div className="rounded-lg border border-dashed border-muted-foreground/40 bg-muted/30 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      Upload spreadsheet
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {bulkFile
                        ? bulkFile.name
                        : "Supported formats: .xlsx, .xls, .csv"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {bulkFile ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleClearFile}
                        disabled={uploadingBulk}
                      >
                        Clear
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleBrowseClick}
                      disabled={uploadingBulk}
                    >
                      {bulkFile ? "Change file" : "Browse"}
                    </Button>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDownloadTemplate}
                  className="sm:w-auto"
                >
                  Download Unsettled Expenses
                </Button>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleBulkDialogChange(false)}
                disabled={uploadingBulk}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!bulkFile || uploadingBulk}>
                {uploadingBulk ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  "Upload"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Settlements;
