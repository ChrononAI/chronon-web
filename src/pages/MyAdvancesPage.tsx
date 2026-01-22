import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ReportsPageWrapper } from "@/components/reports/ReportsPageWrapper";
import {
  DataGrid,
  GridColDef,
  GridPaginationModel,
  GridRowModel,
  GridRowSelectionModel,
} from "@mui/x-data-grid";
import { Box } from "@mui/material";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { AdvanceService } from "@/services/advanceService";
import { useAdvanceStore } from "@/store/advanceStore";
import { PaginationInfo } from "@/store/expenseStore";
import CustomNoRows from "@/components/shared/CustomNoRows";
import SkeletonLoaderOverlay from "@/components/shared/SkeletonLoaderOverlay";
import CustomAdvanceToolbar from "@/components/advances/CustomAdvanceToolbar";
import { buildBackendQuery, FieldFilter, FilterMap, FilterValue, Operator } from "./MyExpensesPage";

const ADVANCE_STATUSES = ["APPROVED", "REJECTED", "PENDING_APPROVAL", "COMPLETE"];
const PENDING_STATUSES = ["PENDING_APPROVAL"];
const PROCESSED_STATUSES = ["APPROVED", "REJECTED"];

const columns: GridColDef[] = [
  {
    field: "sequence_number",
    headerName: "ADVANCE ID",
    minWidth: 160,
    flex: 1,
  },
  {
    field: "title",
    headerName: "TITLE",
    minWidth: 200,
    flex: 1,
  },
  {
    field: "policy_name",
    headerName: "POLICY",
    minWidth: 150,
    flex: 1,
    renderCell: ({ value }) => {
      return value || "Not Selected";
    },
  },
  {
    field: "status",
    headerName: "STATUS",
    minWidth: 170,
    flex: 1,
    renderCell: ({ value }) => {
      return (
        <Badge className={getStatusColor(value)}>
          {value.replace("_", " ")}
        </Badge>
      );
    },
  },
  {
    field: "amount",
    headerName: "AMOUNT",
    minWidth: 150,
    flex: 1,
    align: "right",
    headerAlign: "right",
    renderCell: ({ value }) => {
      return value ? formatCurrency(value) : "-";
    },
  },
  {
    field: "claimed_amount",
    headerName: "CLAIMED AMOUNT",
    minWidth: 150,
    flex: 1,
    align: "right",
    headerAlign: "right",
    renderCell: ({ value }) => {
      return value ? formatCurrency(value) : "-";
    },
  },
  {
    field: "created_at",
    headerName: "CREATED AT",
    minWidth: 150,
    flex: 1,
    renderCell: ({ value }) => {
      return formatDate(value || new Date());
    },
  },
  {
    field: "description",
    headerName: "PURPOSE",
    flex: 1,
    minWidth: 150,
  },
];

export function MyAdvancesPage() {
  const navigate = useNavigate();
  const { query, setQuery, setSelectedAdvance } = useAdvanceStore();

  const [activeTab, setActiveTab] = useState<"all" | "pending" | "processed">(
    "all"
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [rowSelection, setRowSelection] = useState<GridRowSelectionModel>({
    type: "include",
    ids: new Set(),
  });
  const [allRows, setAllRows] = useState<any[]>([]);
  const [allPagination, setAllPagination] = useState<PaginationInfo | null>(
    null
  );
  const [pendingRows, setPendingRows] = useState<any[]>([]);
  const [pendingPagination, setPendingPagination] =
    useState<PaginationInfo | null>(null);
  const [processedRows, setProcessedRows] = useState<any[]>([]);
  const [processedPagination, setProcessedPagination] =
    useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

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

  const allowedStatus =
    activeTab === "all"
      ? ADVANCE_STATUSES
      : activeTab === "pending"
        ? PENDING_STATUSES
        : PROCESSED_STATUSES;

  const statusOptions = [
    { value: "all", label: "All" },
    { value: "PENDING", label: "Pending" },
    { value: "APPROVED", label: "approved" },
  ];

  function updateQuery(key: string, operator: Operator, value: FilterValue) {
    setQuery((prev) => {
      const prevFilters: FieldFilter[] = prev[key] ?? [];

      if (
        !value ||
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

  const handleRowClick = ({ row }: GridRowModel) => {
    setSelectedAdvance(row);
    navigate(`/requests/advances/${row.id}`);
  };

  const tabs = [
    { key: "all", label: "All", count: allPagination?.total || 0 },
    { key: "pending", label: "Pending", count: pendingPagination?.total || 0 },
    {
      key: "processed",
      label: "Processed",
      count: processedPagination?.total || 0,
    },
  ];

  const rows =
    activeTab === "all"
      ? allRows
      : activeTab === "pending"
        ? pendingRows
        : processedRows;

  const fetchFilteredAdvances = useCallback(
    async ({ signal }: { signal: AbortSignal }) => {
      const limit = paginationModel?.pageSize ?? 10;
      const offset = (paginationModel?.page ?? 0) * limit;

      let newQuery: FilterMap = query;

      if (!query?.status) {
        if (activeTab === "pending") {
          newQuery = { ...query, status: [{ operator: "in", value: ["PENDING_APPROVAL"] }] }
        } else if (activeTab === "processed") {
          newQuery = { ...query, status: [{ operator: "in", value: ["APPROVED", "REJECTED"] }] }
        } else newQuery = query;
      }

      const response = await AdvanceService.getFilteredAdvances({
        query: buildBackendQuery(newQuery),
        limit,
        offset,
        signal,
      });

      switch (activeTab) {
        case "pending":
          setPendingRows(response.data.data);
          setPendingPagination({ total: response.data.count });
          break;

        case "processed":
          setProcessedRows(response.data.data);
          setProcessedPagination({ total: response.data.count });
          break;

        case "all":
        default:
          setAllRows(response.data.data);
          setAllPagination({ total: response.data.count });
      }
    },
    [query, activeTab, paginationModel?.page, paginationModel?.pageSize]
  );

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

      fetchFilteredAdvances({ signal: controller.signal })
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
  }, [fetchFilteredAdvances]);

  useEffect(() => {
    setRowSelection({ type: "include", ids: new Set() });
  }, [activeTab]);

  useEffect(() => {
    setQuery((prev) => {
      const { status, ...rest } = prev;
      return { ...rest }
    })
  }, []);

  return (
    <ReportsPageWrapper
      title="Advances"
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={(tabId) => {
        setLoading(true);
        setActiveTab(tabId as "all" | "pending" | "processed");
        const filter =
          tabId === "all"
            ? []
            : tabId === "pending"
              ? ["PENDING_APPROVAL"]
              : ["APPROVED", "REJECTED"];

        updateQuery("status", "in", filter);
        setPaginationModel((prev) => ({
          ...prev,
          page: 0,
        }));
      }}
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
      createButtonText="Create Advance"
      createButtonLink="/requests/advances/create"
    >
      <Box
        sx={{
          height: "calc(100vh - 160px)",
          width: "100%",
          marginTop: "-30px",
          color: "#2E2E2E",
        }}
      >
        <DataGrid
          className="rounded border border-[#F1F3F4] h-full"
          columns={columns}
          rows={loading ? [] : rows}
          loading={loading}
          slots={{
            toolbar: CustomAdvanceToolbar,
            noRowsOverlay: () => <CustomNoRows title="No advances found" description="There are currently no advances." />,
            loadingOverlay: () => <SkeletonLoaderOverlay rowCount={paginationModel.pageSize} />
          }}
          slotProps={{
            toolbar: {
              allStatuses: allowedStatus,
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
          density="compact"
          showToolbar
          checkboxSelection
          disableRowSelectionOnClick
          onRowClick={handleRowClick}
          rowSelectionModel={rowSelection}
          onRowSelectionModelChange={setRowSelection}
          pagination
          paginationMode="server"
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          rowCount={
            (activeTab === "all"
              ? allPagination?.total
              : activeTab === "pending"
                ? pendingPagination?.total
                : processedPagination?.total) || 0
          }
        />
      </Box>
    </ReportsPageWrapper>
  );
}
