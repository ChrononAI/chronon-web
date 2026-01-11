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
import { Box, Skeleton } from "@mui/material";
import { GridOverlay } from "@mui/x-data-grid";
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

function ExpensesSkeletonOverlay({ rowCount = 8 }) {
  return (
    <GridOverlay>
      <div className="w-full py-3 space-y-0">
        {Array.from({ length: rowCount }).map((_, rowIndex) => (
          <div
            key={rowIndex}
            className="flex items-center gap-4 w-full py-4 px-2 border-[0.5px] border-gray"
          >
            <Skeleton
              variant="rectangular"
              height={10}
              width="2%"
              className="rounded-full"
            />
            <Skeleton
              variant="rectangular"
              height={10}
              width="15%"
              className="rounded-full"
            />
            <Skeleton
              variant="rectangular"
              height={10}
              width="16%"
              className="rounded-full"
            />
            <Skeleton
              variant="rectangular"
              height={10}
              width="16%"
              className="rounded-full"
            />
            <Skeleton
              variant="rectangular"
              height={10}
              width="14%"
              className="rounded-full"
            />
            <Skeleton
              variant="rectangular"
              height={10}
              width="16%"
              className="rounded-full"
            />
            <Skeleton
              variant="rectangular"
              height={10}
              width="16%"
              className="rounded-full"
            />
          </div>
        ))}
      </div>
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

const TAB_QUERY_OVERRIDES: Record<string, FilterMap> = {
  all: {},
  submitted: {
    status: [
      {
        operator: "in",
        value: ["UNDER_REVIEW", "APPROVED", "REJECTED"],
      },
    ],
  },
  unsubmitted: {
    status: [
      {
        operator: "in",
        value: ["DRAFT"],
      },
    ],
  },
};

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
  const customIdEnabled =
    orgSettings?.custom_report_id_settings?.enabled ?? false;
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [rowsCalculated, setRowsCalculated] = useState(false);
  const [paginationModel, setPaginationModel] =
    useState<GridPaginationModel | null>(null);
  const [rowSelection, setRowSelection] = useState<GridRowSelectionModel>({
    type: "include",
    ids: new Set(),
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

        const effectiveQuery = {
          ...query,
          ...TAB_QUERY_OVERRIDES[activeTab],
        };

        const res = await settlementsService.getFilteredReports({
          limit,
          offset,
          query: buildBackendQuery(effectiveQuery),
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
            setIsInitialLoad(false);
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

  const reportsArr =
    activeTab === "all"
      ? allReports
      : activeTab === "unsubmitted"
      ? unsubmittedReports
      : submittedReports;

  // const fetchAllReports = async () => {
  //   try {
  //     const limit = paginationModel?.pageSize || 10;
  //     const offset = (paginationModel?.page || 0) * limit;
  //     const response = await expenseService.getMyReports(limit, offset);
  //     setAllReports(response.reports);
  //     setAllReportsPagination(response.pagination);
  //   } catch (error) {
  //     console.log(error);
  //   }
  // };

  // const fetchUnsubmittedReports = async () => {
  //   try {
  //     const limit = paginationModel?.pageSize || 10;
  //     const offset = (paginationModel?.page || 0) * limit;
  //     const response = await expenseService.getReportsByStatus(
  //       "DRAFT",
  //       limit,
  //       offset
  //     );
  //     setUnsubmittedReports(response.reports);
  //     setUnsubmittedReportsPagination(response.pagination);
  //   } catch (error) {
  //     console.log(error);
  //   }
  // };

  // const fetchSubmittedReports = async () => {
  //   try {
  //     const limit = paginationModel?.pageSize || 10;
  //     const offset = (paginationModel?.page || 0) * limit;
  //     const response = await expenseService.getReportsByStatus(
  //       "UNDER_REVIEW,APPROVED,REJECTED",
  //       limit,
  //       offset
  //     );
  //     setSubmittedReports(response.reports);
  //     setSubmittedReportsPagination(response.pagination);
  //   } catch (error) {
  //     console.log(error);
  //   }
  // };

  // const fetchData = async () => {
  //   try {
  //     await Promise.all([
  //       fetchAllReports(),
  //       fetchUnsubmittedReports(),
  //       fetchSubmittedReports(),
  //     ]);
  //     setIsInitialLoad(false);
  //   } catch (error) {
  //     console.log(error);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  useEffect(() => {
    setRowSelection({
      type: "include",
      ids: new Set(),
    });
  }, [paginationModel?.page, paginationModel?.pageSize]);

  useEffect(() => {
    const gridHeight = window.innerHeight - 348;
    const rowHeight = 36;
    const calculatedPageSize = Math.floor(gridHeight / rowHeight);
    setPaginationModel({ page: 0, pageSize: calculatedPageSize });
    setRowsCalculated(true);
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
            loadingOverlay:
              loading && isInitialLoad
                ? () => (
                    <ExpensesSkeletonOverlay
                      rowCount={paginationModel?.pageSize}
                    />
                  )
                : undefined,
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
          paginationModel={paginationModel || { page: 0, pageSize: 0 }}
          onPaginationModelChange={setPaginationModel}
          density="compact"
          showCellVerticalBorder
        />
      </Box>
    </>
  );
}
