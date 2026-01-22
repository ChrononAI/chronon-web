import { useCallback, useEffect, useRef, useState } from "react";
import { ReportsPageWrapper } from "@/components/reports/ReportsPageWrapper";
import { DataGrid, GridColDef, GridPaginationModel, GridRowSelectionModel } from "@mui/x-data-grid";
import { buildApprovalBackendQuery, formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { PaginationInfo } from "@/store/expenseStore";
import { useAdvanceStore } from "@/store/advanceStore";
import { AdvanceService } from "@/services/advanceService";
import { Box } from "@mui/material";
import CustomNoRows from "@/components/shared/CustomNoRows";
import SkeletonLoaderOverlay from "@/components/shared/SkeletonLoaderOverlay";
import CustomAdvanceApprovalToolbar from "@/components/advances/CustomAdvanceApprovalToolbar";
import { FieldFilter, FilterMap, FilterValue, Operator } from "./MyExpensesPage";

const ADVANCE_STATUSES = ["APPROVED", "REJECTED", "IN_PROGRESS"];
const PENDING_STATUSES = ["IN_PROGRESS"];
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
  },
  {
    field: "status",
    headerName: "STATUS",
    minWidth: 180,
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
    field: "created_by",
    headerName: "CREATED BY",
    minWidth: 150,
    flex: 1,
    renderCell: ({ value }) => {
      return value?.email || "NA";
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

function ApprovalsAdvancesPage() {
  const navigate = useNavigate();
  const { approvalQuery, setApprovalQuery, setSelectedAdvanceToApprove } = useAdvanceStore();

  const [loading, setLoading] = useState(true);
  const [allRows, setAllRows] = useState([]);
  const [allPagination, setAllPagination] = useState<PaginationInfo | null>(
    null
  );
  const [pendingRows, setPendingRows] = useState([]);
  const [pendingPagination, setPendingPagination] =
    useState<PaginationInfo | null>(null);
  const [processedRows, setProcessedRows] = useState([]);
  const [processedPagination, setProcessedPagination] =
    useState<PaginationInfo | null>(null);

  const [activeTab, setActiveTab] = useState<"pending" | "processed" | "all">(
    "all"
  );
  const [rowSelection, setRowSelection] = useState<GridRowSelectionModel>({ type: "include", ids: new Set() });

  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const GRID_OFFSET = 240;
  const ROW_HEIGHT = 38;
  const HEADER_HEIGHT = 0;

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

  useEffect(() => {
    setRowSelection({ type: "include", ids: new Set() });
  }, [activeTab]);

  const allowedStatus =
    activeTab === "all"
      ? ADVANCE_STATUSES
      : activeTab === "pending"
        ? PENDING_STATUSES
        : PROCESSED_STATUSES;

  const rows =
    activeTab === "all"
      ? allRows
      : activeTab === "pending"
        ? pendingRows
        : processedRows;

  const tabs = [
    { key: "all", label: "All", count: allPagination?.total || 0 },
    { key: "pending", label: "Pending", count: pendingPagination?.total || 0 },
    {
      key: "processed",
      label: "Processed",
      count: processedPagination?.total || 0,
    },
  ];

  function updateQuery(key: string, operator: Operator, value: FilterValue) {
    setApprovalQuery((prev) => {
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

  const onRowClick = ({ row }: { row: any }) => {
    setSelectedAdvanceToApprove(row);
    navigate(`/approvals/advances/${row.id}`);
  };

  const fetchFilteredAdvances = useCallback(
    async ({ signal }: { signal: AbortSignal }) => {
      const limit = paginationModel?.pageSize ?? 10;
      const offset = (paginationModel?.page ?? 0) * limit;

      let newQuery: FilterMap = approvalQuery;

      if (!approvalQuery?.status) {
        if (activeTab === "pending") {
          newQuery = { ...approvalQuery, status: [{ operator: "in", value: ["IN_PROGRESS"] }] }
        } else if (activeTab === "processed") {
          newQuery = { ...approvalQuery, status: [{ operator: "in", value: ["APPROVED", "REJECTED"] }] }
        } else if (activeTab === "all") {
          newQuery = { ...approvalQuery, status: [{ operator: "in", value: ["APPROVED", "REJECTED", "IN_PROGRESS"] }] }
        } else newQuery = approvalQuery;
      }

      const response = await AdvanceService.getFilteredAdvancesToApprove({
        query: buildApprovalBackendQuery(newQuery),
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
    [approvalQuery, activeTab, paginationModel?.page, paginationModel?.pageSize]
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
    setApprovalQuery((prev) => {
      const { status, ...rest } = prev;
      return { ...rest }
    })
  }, []);

  return (
    <ReportsPageWrapper
      title="Approver Dashboard"
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={(tabId) => {
        setLoading(true);
        setActiveTab(tabId as "all" | "pending" | "processed");
        const filter =
          tabId === "all"
            ? []
            : tabId === "pending"
              ? ["IN_PROGRESS"]
              : ["APPROVED", "REJECTED"];

        updateQuery("status", "in", filter);
        setPaginationModel((prev) => ({
          ...prev,
          page: 0,
        }));
      }}
      showDateFilter={true}
      showFilters={false}
      searchTerm={""}
      onSearchChange={function (): void {
        throw new Error("Function not implemented.");
      }}
    >
      <Box
        sx={{
          height: "calc(100vh - 160px)",
          width: "100%",
          marginTop: "-30px",
        }}
      >
        <DataGrid
          className="rounded border h-full"
          columns={columns}
          rows={loading ? [] : rows}
          loading={loading}
          slots={{
            toolbar: CustomAdvanceApprovalToolbar,
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
            "& .MuiDataGrid-main": {
              border: "0.2px solid #f3f4f6",
            },
            "& .MuiDataGrid-virtualScroller": {
              overflow: loading ? "hidden" : "auto",
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
          onRowClick={onRowClick}
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

export default ApprovalsAdvancesPage;
