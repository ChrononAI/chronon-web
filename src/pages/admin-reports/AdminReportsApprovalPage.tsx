import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ReportTabs } from "@/components/reports/ReportTabs";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { DataGrid, GridColDef, GridRowSelectionModel } from "@mui/x-data-grid";
import { GridPaginationModel } from "@mui/x-data-grid";
import { Box } from "@mui/material";
import { useAuthStore } from "@/store/authStore";
import CustomNoRows from "@/components/shared/CustomNoRows";
import { toast } from "sonner";
import { settlementsService } from "@/services/settlementsService";
import SkeletonLoaderOverlay from "@/components/shared/SkeletonLoaderOverlay";
import { buildBackendQuery, FieldFilter, FilterMap, FilterValue, Operator } from "../MyExpensesPage";
import { useAdminReportsStore } from "@/store/adminReportsStore";
import CustomAdminReportsToolbar from "@/components/admin-reports/CustomAdminReportsToolbar";

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
    field: "status",
    headerName: "STATUS",
    flex: 1,
    minWidth: 180,
    renderCell: (params) => (
      <Badge className={getStatusColor(params.value)}>{params.value}</Badge>
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

const PENDING_REPORT_STATUSES = ["UNDER_REVIEW"];

const PROCESSED_REPORT_STATUSES = ["APPROVED", "REJECTED"];

export function AdminReportsApprovalPage() {
  const {
    pendingReports,
    processedReports,
    setPendingReports,
    setProcessedReports,
    pendingReportsPagination,
    processedReportsPagination,
    setPendingReportsPagination,
    setProcessedReportsPagination,
    query,
    setQuery,
  } = useAdminReportsStore();
  const navigate = useNavigate();
  const { orgSettings } = useAuthStore();
  const customIdEnabled =
    orgSettings?.custom_report_id_settings?.enabled ?? false;
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");
  const [rowSelection, setRowSelection] = useState<GridRowSelectionModel>({
    type: "include",
    ids: new Set(),
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

  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const allowedStatus =
    activeTab === "pending"
      ? PENDING_REPORT_STATUSES
        : PROCESSED_REPORT_STATUSES;

  const newCols = useMemo<GridColDef[]>(() => {
    return [
      ...columns,
      ...(customIdEnabled
        ? [
          {
            field: "custom_report_id",
            headerName: "CUSTOM REPORT ID",
            minWidth: 140,
            flex: 1,
          } as GridColDef,
        ]
        : []),
    ];
  }, [columns, customIdEnabled]);

  function updateQuery(key: string, operator: Operator, value: FilterValue) {
    setQuery((prev) => {
      const prevFilters: FieldFilter[] = prev[key] ?? [];

      if (
        value === undefined ||
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

  const handleTabChange = (tab: any) => {
    setActiveTab(tab);
    setLoading(true);
    setRowSelection({ type: "include", ids: new Set() });
    setPaginationModel((prev) => ({
      ...prev,
      page: 0,
    }));
    const filter = tab === "pending"
          ? ["UNDER_REVIEW"]
          : ["APPROVED", "REJECTED"];

    updateQuery("status", "in", filter);
  };

  const fetchFilteredReports = useCallback(
    async ({ signal }: { signal: AbortSignal }) => {
      try {
        const limit = paginationModel?.pageSize ?? 10;
        const offset = (paginationModel?.page ?? 0) * limit;

        let newQuery: FilterMap = query;

        if (!query?.status) {
          if (activeTab === "pending") {
            newQuery = { ...query, status: [{ operator: "in", value: PENDING_REPORT_STATUSES }] }
          } else if (activeTab === "processed") {
            newQuery = { ...query, status: [{ operator: "in", value: PROCESSED_REPORT_STATUSES }] }
          }
        }

        const res = await settlementsService.getFilteredReports({
          limit,
          offset,
          query: buildBackendQuery(newQuery),
          signal,
          role: "admin",
        });

        if (activeTab === "pending") {
          setPendingReports(res.data.data);
          setPendingReportsPagination({
            count: res.data.count,
            offset: res.data.offset,
          });
        } else {
          setProcessedReports(res.data.data);
          setProcessedReportsPagination({
            count: res.data.count,
            offset: res.data.offset,
          });
        }
      } catch (error: any) {
        console.log(error);
        if (error.name !== "CanceledError") {
          toast.error(error?.response?.data?.message || error?.message);
        }
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

  const reportsArr = activeTab === "pending" ? pendingReports : processedReports;

  useEffect(() => {
    setRowSelection({
      type: "include",
      ids: new Set(),
    });
  }, [paginationModel?.page, paginationModel?.pageSize]);

  useEffect(() => {
    setRowSelection({
      type: "include",
      ids: new Set(),
    });
  }, [activeTab]);

  useEffect(() => {
    const filter: FieldFilter[] = [
      {
        operator: "in",
        value: [
          "UNDER_REVIEW"
        ]
      }
    ]
    setQuery((prev) => {
      const { status, ...rest } = prev;
      return { status: filter, ...rest };
    });
  }, []);

  return (
    <>
      {/* Header Section */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Expense Reports</h1>
        <Button asChild>
          <Link to="/reports/create">
            <Plus className="mr-2 h-4 w-4" />
            Create New Report
          </Link>
        </Button>
      </div>

      {/* Tabs Section */}
      <ReportTabs
        activeTab={activeTab}
        onTabChange={handleTabChange}
        tabs={[
          { key: "pending", label: "Pending", count: pendingReportsPagination.count },
          {
            key: "processed",
            label: "Processed",
            count: processedReportsPagination.count,
          },
        ]}
        className="mb-8"
      />
      <Box
        sx={{
          height: "calc(100vh - 160px)",
          width: "100%",
          marginTop: "-30px",
        }}
      >
        <DataGrid
          rows={loading ? [] : reportsArr}
          columns={newCols}
          loading={loading}
          onRowClick={(params, event) => {
            event.stopPropagation();
            const report = params.row;
            navigate(`/admin/admin-reports/${report.id}`);
          }}
          slots={{
            toolbar: CustomAdminReportsToolbar,
            noRowsOverlay: () => (
              <CustomNoRows
                title="No reports found"
                description="There are currently no reports"
              />
            ),
            loadingOverlay: () => <SkeletonLoaderOverlay rowCount={paginationModel.pageSize} />,
          }}
          slotProps={{
            toolbar: {
              allStatuses: allowedStatus,
            } as any,
          }}
          className="rounded border-[0.2px] border-[#f3f4f6] h-full"
          sx={{
            border: 0,
            "& .MuiDataGrid-columnHeaderTitle": {
              color: "#9AA0A6",
              fontWeight: "bold",
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
          showToolbar
          checkboxSelection
          rowCount={
            activeTab === "pending"
              ? pendingReportsPagination.count
                : processedReportsPagination.count
          }
          rowSelectionModel={rowSelection}
          onRowSelectionModelChange={setRowSelection}
          pagination
          paginationMode="server"
          disableRowSelectionOnClick
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          density="compact"
          showCellVerticalBorder
        />
      </Box>
    </>
  );
}
