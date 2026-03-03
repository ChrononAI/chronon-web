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
import { Badge } from "@/components/ui/badge";
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
import CustomNoRows from "@/components/shared/CustomNoRows";
import SkeletonLoaderOverlay from "@/components/shared/SkeletonLoaderOverlay";

const columns: GridColDef[] = [
  {
    field: "sequence_number",
    headerName: "REPORT ID",
    minWidth: 160,
    flex: 1,
    renderCell: (params: any) => (
      <span className="whitespace-nowrap">{params.value || "-"}</span>
    ),
  },
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
  const [rowSelection, setRowSelection] = useState<GridRowSelectionModel>({
    type: "include",
    ids: new Set<GridRowId>(),
  });

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
    setPaginationModel((prev) => ({
      ...prev,
      page: 0,
    }));

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
    activeTab,
  ]);

  useEffect(() => {
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
  }, [fetchFilteredReports]);

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
            noRowsOverlay: () => <CustomNoRows title="No reports Found" description="There are currently no reports." />,
            toolbar: CustomSettlementsToolbar,
            loadingOverlay: () => <SkeletonLoaderOverlay rowCount={paginationModel.pageSize} />
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
            "& .MuiDataGrid-virtualScroller": {
              overflow: loading ? "hidden" : "auto",
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
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          rowCount={
            (activeTab === "paid" ? paidExpenseCount : unpaidExpenseCount) || 0
          }
        />
      </Box>
    </div>
  );
}

export default Settlements;
