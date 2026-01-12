import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import { Box } from "@mui/material";
import {
  DataGrid,
  GridColDef,
  GridPaginationModel,
  GridRowId,
  GridRowParams,
  GridRowSelectionModel,
} from "@mui/x-data-grid";
import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { GridOverlay } from "@mui/x-data-grid";
import { toast } from "sonner";
import { settlementsService } from "@/services/settlementsService";
import { ReportTabs } from "@/components/reports/ReportTabs";
import { useNavigate } from "react-router-dom";
import CustomSettlementsToolbar from "@/components/settlements/CustomSettlementsToolbar";
import {
  buildBackendQuery,
  FieldFilter,
  FilterMap,
  FilterValue,
  Operator,
} from "../MyExpensesPage";
import { useSettlementStore } from "@/store/settlementsStore";

function CustomNoRows() {
  return (
    <GridOverlay>
      <Box className="w-full">
        <div className="text-center">
          <CheckCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No reports found</h3>
          <p className="text-muted-foreground">
            There are currently no reports.
          </p>
        </div>
      </Box>
    </GridOverlay>
  );
}

const columns: GridColDef[] = [
  {
    field: "title",
    headerName: "TITLE",
    minWidth: 200,
    flex: 1,
    renderCell: (params) => (
      <span className="font-medium hover:underline whitespace-nowrap">
        {params.value}
      </span>
    ),
  },
  {
    field: "description",
    headerName: "DESCRIPTION",
    minWidth: 180,
    flex: 1,
    renderCell: (params) => (
      <span className="whitespace-nowrap">{params.value}</span>
    ),
  },
  {
    field: "payment_state",
    headerName: "STATE",
    flex: 1,
    minWidth: 180,
    renderCell: (params) => (
      <Badge className={getStatusColor(params.value)}>
        {params.value || "N/A"}
      </Badge>
    ),
  },
  {
    field: "total_amount",
    headerName: "TOTAL AMOUNT",
    minWidth: 120,
    flex: 1,
    align: "right",
    headerAlign: "right",
    valueFormatter: (params) => formatCurrency(params),
  },
  {
    field: "created_by",
    headerName: "CREATED BY",
    minWidth: 140,
    flex: 1,
    renderCell: (params) => (
      <span className="whitespace-nowrap">{params.row.user_info?.email}</span>
    ),
  },
  {
    field: "created_at",
    headerName: "CREATED DATE",
    minWidth: 120,
    flex: 1,
    valueFormatter: (params) => formatDate(params),
  },
];

function Settlements() {
  const navigate = useNavigate();
  const { query, setQuery } = useSettlementStore();
  const [activeTab, setActiveTab] = useState<"paid" | "unpaid">("unpaid");
  const [rowsCalculated, setRowsCalculated] = useState(false);
  const [paidExpenseCount, setPaidExpenseCount] = useState(0);
  const [unpaidExpenseCount, setUnpaidExpenseCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
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

  const allowedStatus = activeTab === "paid" ? ["PAID"] : ["PAYMENT_PENDING"];

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

  useEffect(() => {
    const gridHeight = window.innerHeight - 300;
    const rowHeight = 38;
    const calculatedPageSize = Math.floor(gridHeight / rowHeight);
    setRowsCalculated(true);
    setPaginationModel({ page: 0, pageSize: calculatedPageSize });
  }, []);

  const handleRowClick = ({ id }: GridRowParams) => {
    navigate(`/admin/settlements/${id}`);
  };

  const fetchFilteredReports = useCallback(
    async ({ signal }: { signal: AbortSignal }) => {
      try {
        const limit = paginationModel?.pageSize ?? 10;
        const offset = (paginationModel?.page ?? 0) * limit;

        let newQuery: FilterMap = query;

        if (!query?.payment_state) {
          if (activeTab === "paid") {
            newQuery = { ...query, payment_state: [{ operator: "in", value: ["PAID"] }] }
          } else {
            newQuery = { ...query, payment_state: [{ operator: "in", value: ["PAYMENT_PENDING"] }] }
          }
        }
        const res = await settlementsService.getFilteredReports({
          limit,
          offset,
          query: buildBackendQuery(newQuery),
          signal,
          role: "admin"
        });

        if (activeTab === "paid") {
          setPaidRows(res.data.data);
          setPaidExpenseCount(res.data.count);
        } else if (activeTab === "unpaid") {
          setUnpaidRows(res.data.data);
          setUnpaidExpenseCount(res.data.count);
        }
      } catch (error: any) {
        console.log(error);
        toast.error(error?.response?.data?.message || error?.message);
      }
    },
    [query, activeTab, paginationModel?.page, paginationModel?.pageSize]
  );

  const handleFetchData = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);

    try {
      await fetchFilteredReports({ signal: controller.signal });
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error(err);
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
        setRowSelection({ type: "include", ids: new Set() });
      }
    }
  };

  const markAspaid = async (ids: string[]) => {
    setMarking(true);
    try {
      await settlementsService.markAsPaid(ids);
      handleFetchData();
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

  const handleTabChange = (tab: any) => {
    setActiveTab(tab);
    setLoading(true);
    setRowSelection({ type: "include", ids: new Set() });

    const filter =
      tab === "paid" ? ["PAID"] : ["PAYMENT_PENDING"];

    updateQuery("payment_state", "in", filter);
  };

  useEffect(() => {
    setRowSelection({ type: "include", ids: new Set() });
    setLoading(true);
  }, [
    paginationModel?.page,
    paginationModel?.pageSize,
    rowsCalculated,
    activeTab,
  ]);

  useEffect(() => {
    if (!rowsCalculated) return;

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

      fetchFilteredReports({ signal: controller.signal })
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
  }, [fetchFilteredReports, rowsCalculated]);

  useEffect(() => {
    const filter: FieldFilter[] = [
      {
        operator: "in",
        value: [
          "PAYMENT_PENDING"
        ]
      }
    ]
    setQuery((prev) => {
      const { payment_state, ...rest } = prev;
      return { payment_state: filter, ...rest };
    });
  }, []);

  return (
    <div>
      <div className="flex gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Settlements</h1>
        </div>
      </div>
      <ReportTabs
        activeTab={activeTab}
        onTabChange={handleTabChange}
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
            toolbar: CustomSettlementsToolbar,
          }}
          slotProps={{
            toolbar: {
              allStatuses: allowedStatus,
              query,
              updateQuery,
              onCustomClick,
              rowSelection,
              activeTab,
              marking,
              rowCount: rows.length,
            } as any,
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
              minHeight: "52px",
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
      {/* <Dialog open={showBulkUpload} onOpenChange={handleBulkDialogChange}>
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
      </Dialog> */}
    </div>
  );
}

export default Settlements;
