import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ReportTabs } from "@/components/reports/ReportTabs";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useReportsStore } from "@/store/reportsStore";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { DataGrid, GridColDef, GridRowSelectionModel } from "@mui/x-data-grid";
import { Report } from "@/types/expense";
import { GridPaginationModel } from "@mui/x-data-grid";
import { Box } from "@mui/material";
import { useAuthStore } from "@/store/authStore";
import CustomReportsToolbar from "@/components/reports/CustomReportsToolbar";
import CustomNoRows from "@/components/shared/CustomNoRows";
import { toast } from "sonner";
import {
  buildBackendQuery,
  FieldFilter,
  FilterMap,
  FilterValue,
  Operator,
} from "./MyExpensesPage";
import { settlementsService } from "@/services/settlementsService";
import SkeletonLoaderOverlay from "@/components/shared/SkeletonLoaderOverlay";

const columns: GridColDef[] = [
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
    field: "created_at",
    headerName: "CREATED DATE",
    minWidth: 120,
    flex: 1,
    valueFormatter: (params) => formatDate(params),
  },
];

const REPORT_STATUSES = [
  "DRAFT",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
  "SENT_BACK",
];

const UNSUBMITTED_REPORT_STATUSES = ["DRAFT"];

const SUBMITTED_REPORT_STATUSES = ["APPROVED", "REJECTED", "UNDER_REVIEW"];

export function MyReportsPage() {
  const {
    allReports,
    unsubmittedReports,
    submittedReports,
    setAllReports,
    setUnsubmittedReports,
    setSubmittedReports,
    setAllReportsPagination,
    setUnsubmittedReportsPagination,
    setSubmittedReportsPagination,
    allReportsPagination,
    unsubmittedReportsPagination,
    submittedReportsPagination,
    query,
    setQuery,
  } = useReportsStore();
  const navigate = useNavigate();
  const { orgSettings } = useAuthStore();
  const customIdEnabled = orgSettings?.custom_report_id_settings?.enabled ?? false;
  const showDescription = orgSettings?.report_description_settings?.enabled ?? true;

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
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
    activeTab === "all"
      ? REPORT_STATUSES
      : activeTab === "unsubmitted"
        ? UNSUBMITTED_REPORT_STATUSES
        : SUBMITTED_REPORT_STATUSES;

  const newCols = useMemo<GridColDef[]>(() => {
    return [
      {
        field: "sequence_number",
        headerName: "SEQUENCE NUMBER",
        minWidth: 160,
        flex: 1,
        renderCell: (params: any) => (
          <span className="whitespace-nowrap">{params.value || "-"}</span>
        ),
      } as GridColDef,
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
      ...[{
        field: "title",
        headerName: "TITLE",
        minWidth: 200,
        flex: 1,
        renderCell: (params: any) => (
          <span className="font-medium hover:underline whitespace-nowrap">
            {params.value}
          </span>
        ),
      }],
      ...(showDescription ? [{
        field: "description",
        headerName: "DESCRIPTION",
        minWidth: 180,
        flex: 1,
        renderCell: (params: any) => (
          <span className="whitespace-nowrap">{params.value}</span>
        ),
      },] : []),
      ...columns,
    ];
  }, [columns, customIdEnabled, showDescription]);

  function updateQuery(key: string, operator: Operator, value: FilterValue) {
    setQuery((prev) => {
      const prevFilters: FieldFilter[] = prev[key] ?? [];

      if (
        value == null ||
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
    const filter =
      tab === "all"
        ? []
        : tab === "unsubmitted"
          ? ["DRAFT"]
          : ["APPROVED", "REJECTED", "UNDER_REVIEW"];

    updateQuery("status", "in", filter);
  };

  const fetchFilteredReports = useCallback(
    async ({ signal }: { signal: AbortSignal }) => {
      try {
        const limit = paginationModel?.pageSize ?? 10;
        const offset = (paginationModel?.page ?? 0) * limit;

        let newQuery: FilterMap = query;

        if (!query?.status) {
          if (activeTab === "unsubmitted") {
            newQuery = { ...query, status: [{ operator: "in", value: UNSUBMITTED_REPORT_STATUSES }] }
          } else if (activeTab === "submitted") {
            newQuery = { ...query, status: [{ operator: "in", value: SUBMITTED_REPORT_STATUSES }] }
          } else newQuery = query;
        }

        const res = await settlementsService.getFilteredReports({
          limit,
          offset,
          query: buildBackendQuery(newQuery),
          signal,
          role: "spender",
        });

        if (activeTab === "all") {
          setAllReports(res.data.data);
          setAllReportsPagination({
            count: res.data.count,
            offset: res.data.offset,
          });
        } else if (activeTab === "unsubmitted") {
          setUnsubmittedReports(res.data.data);
          setUnsubmittedReportsPagination({
            count: res.data.count,
            offset: res.data.offset,
          });
        } else {
          setSubmittedReports(res.data.data);
          setSubmittedReportsPagination({
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

  const reportsArr =
    activeTab === "all"
      ? allReports
      : activeTab === "unsubmitted"
        ? unsubmittedReports
        : submittedReports;

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

  const handleReportClick = (report: Report) => {
    if (report.status === "DRAFT" || report.status === "SENT_BACK") {
      navigate("/reports/create", {
        state: {
          editMode: true,
          reportData: {
            id: report.id,
            title: report.title,
            description: report.description,
            custom_attributes: report.custom_attributes,
            expenses: report.expenses || [],
          },
        },
      });
    } else {
      navigate(`/reports/${report.id}`);
    }
  };

  useEffect(() => {
    setQuery((prev) => {
      const { status, ...rest } = prev;
      return { ...rest };
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
          { key: "all", label: "All", count: allReportsPagination.count },
          {
            key: "unsubmitted",
            label: "Unsubmitted",
            count: unsubmittedReportsPagination.count,
          },
          {
            key: "submitted",
            label: "Submitted",
            count: submittedReportsPagination.count,
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
            if (report.status === "DRAFT" || report.status === "SENT_BACK") {
              handleReportClick(report);
            } else {
              navigate(`/reports/${report.id}`);
            }
          }}
          slots={{
            toolbar: CustomReportsToolbar,
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
            activeTab === "all"
              ? allReportsPagination.count
              : activeTab === "unsubmitted"
                ? unsubmittedReportsPagination.count
                : submittedReportsPagination.count
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
