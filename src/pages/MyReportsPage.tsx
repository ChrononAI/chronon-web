import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { InvoicePageWrapper } from "@/components/invoice/InvoicePageWrapper";
import { useReportsStore } from "@/store/reportsStore";
import { formatCurrency, formatDate } from "@/lib/utils";
import { GridColDef, GridRowSelectionModel, GridPaginationModel } from "@mui/x-data-grid";
import { Report } from "@/types/expense";
import { useAuthStore } from "@/store/authStore";
import { useLayoutStore } from "@/store/layoutStore";
import CustomReportsToolbar from "@/components/reports/CustomReportsToolbar";
import CustomNoRows from "@/components/shared/CustomNoRows";
import { toast } from "sonner";
import { DataTable } from "@/components/shared/DataTable";
import { StatusPill } from "@/components/shared/StatusPill";
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
      <div className="flex items-center h-full">
        <StatusPill status={params.value} />
      </div>
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
  const setNoPadding = useLayoutStore((s) => s.setNoPadding);
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

  useEffect(() => {
    setNoPadding(true);
    return () => {
      setNoPadding(false);
    };
  }, [setNoPadding]);

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
        headerName: "REPORT ID",
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

  const tabs = [
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
  ];

  const rowCount =
    activeTab === "all"
      ? allReportsPagination.count
      : activeTab === "unsubmitted"
        ? unsubmittedReportsPagination.count
        : submittedReportsPagination.count;

  return (
    <InvoicePageWrapper
      title="Expense Reports"
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={handleTabChange}
      showFilters={false}
      showDateFilter={false}
      showCreateButton={false}
      marginBottom="mb-0"
    >
      <DataTable
        rows={loading ? [] : reportsArr}
        columns={newCols}
        loading={loading}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        onRowClick={(params, event) => {
          event?.stopPropagation();
          const report = params.row;
          if (report.status === "DRAFT" || report.status === "SENT_BACK") {
            handleReportClick(report);
          } else {
            navigate(`/reports/${report.id}`);
          }
        }}
        rowCount={rowCount}
        paginationMode="server"
        firstColumnField="sequence_number"
        emptyStateComponent={
          <CustomNoRows
            title="No reports found"
            description="There are currently no reports"
          />
        }
        slots={{
          toolbar: CustomReportsToolbar,
          loadingOverlay: () => (
            <SkeletonLoaderOverlay rowCount={paginationModel.pageSize} />
          ),
        }}
        slotProps={{
          toolbar: {
            allStatuses: allowedStatus,
            onCreateClick: () => navigate("/reports/create"),
            createButtonText: "Create New Report",
          } as any,
        }}
        showToolbar
        checkboxSelection
        rowSelectionModel={rowSelection}
        onRowSelectionModelChange={setRowSelection}
      />
    </InvoicePageWrapper>
  );
}
