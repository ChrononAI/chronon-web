import { useCallback, useEffect, useRef, useState } from "react";
import { ReportsPageWrapper } from "@/components/reports/ReportsPageWrapper";
import {
  DataGrid,
  GridColDef,
  GridPaginationModel,
  GridRowSelectionModel,
} from "@mui/x-data-grid";
import { formatDate, getStatusColor, buildApprovalBackendQuery } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { tripService, TripType } from "@/services/tripService";
import { useNavigate } from "react-router-dom";
import { useTripStore } from "@/store/tripStore";
import { PaginationInfo } from "@/store/expenseStore";
import { Box } from "@mui/material";
import CustomNoRows from "@/components/shared/CustomNoRows";
import SkeletonLoaderOverlay from "@/components/shared/SkeletonLoaderOverlay";
import {
  FieldFilter,
  FilterMap,
  FilterValue,
  Operator,
} from "./MyExpensesPage";

const columns: GridColDef[] = [
  {
    field: "sequence_number",
    headerName: "TRIP ID",
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
    field: "start_date",
    headerName: "START",
    minWidth: 120,
    flex: 1,
    renderCell: ({ value }) => {
      return formatDate(value);
    },
  },
  {
    field: "end_date",
    headerName: "END",
    minWidth: 120,
    flex: 1,
    renderCell: ({ value }) => {
      return formatDate(value);
    },
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
    field: "created_at",
    headerName: "CREATED AT",
    minWidth: 150,
    flex: 1,
    renderCell: ({ value }) => {
      return formatDate(value);
    },
  },
  {
    field: "purpose",
    headerName: "PURPOSE",
    flex: 1,
    minWidth: 150,
  },
];

function ApprovalsTripsPage() {
  const navigate = useNavigate();
  const { setSelectedTripToApprove } = useTripStore();

  const [loading, setLoading] = useState(true);
  const [allRows, setAllRows] = useState<TripType[]>([]);
  const [allPagination, setAllPagination] = useState<PaginationInfo | null>(
    null
  );
  const [pendingRows, setPendingRows] = useState<TripType[]>([]);
  const [pendingPagination, setPendingPagination] =
    useState<PaginationInfo | null>(null);
  const [processedRows, setProcessedRows] = useState<TripType[]>([]);
  const [processedPagination, setProcessedPagination] =
    useState<PaginationInfo | null>(null);

  const [activeTab, setActiveTab] = useState<"pending" | "processed" | "all">(
    "all"
  );
  const [approvalQuery, setApprovalQuery] = useState<FilterMap>({});
  const [rowSelection, setRowSelection] = useState<GridRowSelectionModel>({
    type: "include",
    ids: new Set(),
  });

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

  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  function updateQuery(key: string, operator: Operator, value: FilterValue) {
    setApprovalQuery((prev) => {
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

      if (existingIndex >= 0) {
        const nextFilters = [...prevFilters];
        nextFilters[existingIndex] = { operator, value };
        return {
          ...prev,
          [key]: nextFilters,
        };
      }

      return {
        ...prev,
        [key]: [...prevFilters, { operator, value }],
      };
    });
  }

  useEffect(() => {
    setRowSelection({ type: "include", ids: new Set() });
  }, [activeTab]);

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

  const onRowClick = ({ row }: { row: TripType }) => {
    setSelectedTripToApprove(row);
    navigate(`/approvals/trips/${row.id}`);
  };

  const fetchFilteredTrips = useCallback(
    async ({ signal }: { signal: AbortSignal }) => {
      const limit = paginationModel?.pageSize ?? 10;
      const offset = (paginationModel?.page ?? 0) * limit;

      let newQuery: FilterMap = approvalQuery;

      if (!approvalQuery?.status) {
        if (activeTab === "pending") {
          newQuery = {
            ...approvalQuery,
            status: [{ operator: "in", value: ["IN_PROGRESS"] }],
          };
        } else if (activeTab === "processed") {
          newQuery = {
            ...approvalQuery,
            status: [{ operator: "in", value: ["APPROVED", "REJECTED"] }],
          };
        } else if (activeTab === "all") {
          newQuery = {
            ...approvalQuery,
            status: [
              {
                operator: "in",
                value: ["APPROVED", "REJECTED", "IN_PROGRESS"],
              },
            ],
          };
        } else newQuery = approvalQuery;
      }

      const response = await tripService.getTripRequestsForApproval({
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

      fetchFilteredTrips({ signal: controller.signal })
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
  }, [fetchFilteredTrips]);

  useEffect(() => {
    setApprovalQuery((prev) => {
      const { status, ...rest } = prev;
      return { ...rest };
    });
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
            noRowsOverlay: () => <CustomNoRows title="No trips found" description="There are currently no trips awaiting approval." />,
            loadingOverlay: () => <SkeletonLoaderOverlay rowCount={paginationModel.pageSize} />
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
            "& .MuiDataGrid-virtualScroller": {
              overflow: loading ? "hidden" : "auto",
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

export default ApprovalsTripsPage;
