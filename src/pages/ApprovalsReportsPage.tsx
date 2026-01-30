import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { approvalService } from "@/services/approvalService";
import { Report } from "@/types/expense";
import {
  formatDate,
  formatCurrency,
  getStatusColor,
  buildApprovalBackendQuery,
} from "@/lib/utils";
import { ReportsPageWrapper } from "@/components/reports/ReportsPageWrapper";
import { Badge } from "@/components/ui/badge";
import { DataGrid, GridColDef, GridRowSelectionModel } from "@mui/x-data-grid";
import { Box } from "@mui/material";
import { GridPaginationModel } from "@mui/x-data-grid";
import { useAuthStore } from "@/store/authStore";
import CustomNoRows from "@/components/shared/CustomNoRows";
import SkeletonLoaderOverlay from "@/components/shared/SkeletonLoaderOverlay";
import CustomReportsApprovalToolbar from "@/components/reports/CustomReportsApprovalToolbar";
import { useReportsStore } from "@/store/reportsStore";
import {
  FieldFilter,
  FilterMap,
  FilterValue,
  Operator,
} from "./MyExpensesPage";
import { PaginationInfo } from "@/store/expenseStore";

const REPORT_STATUSES = ["PENDING_APPROVAL", "APPROVED", "REJECTED"];

const PENDING_REPORT_STATUSES = ["PENDING_APPROVAL"];

const PROCESSED_REPORT_STATUSES = ["APPROVED", "REJECTED", "PENDING_APPROVAL"];
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { ExportDialog } from "@/components/reports/ExportDialog";
import { ExportSuccessDialog } from "@/components/reports/ExportSuccessDialog";
import { toast } from "sonner";

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

export function ApprovalsReportsPage() {
  const navigate = useNavigate();
  const { orgSettings, user } = useAuthStore();
  const { approvalQuery, setApprovalQuery } = useReportsStore();
  const customIdEnabled =
    orgSettings?.custom_report_id_settings?.enabled ?? false;
  const showDescription = orgSettings?.report_description_settings?.enabled ?? true;
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"processed" | "pending" | "all">(
    "all"
  );
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [allReports, setAllReports] = useState<Report[]>([]);
  const [allReportsPagination, setAllReportsPagination] =
    useState<PaginationInfo>();
  const [pendingReports, setPendingReports] = useState<Report[]>([]);
  const [pendingReportsPagination, setPendingReportsPagination] =
    useState<PaginationInfo>();
  const [processedReports, setProcessedReports] = useState<Report[]>([]);
  const [processedReportsPagination, setProcessedReportsPagination] =
    useState<PaginationInfo>();
  const rows =
    activeTab === "all"
      ? allReports
      : activeTab === "pending"
      ? pendingReports
      : processedReports;
  const [rowSelection, setRowSelection] = useState<GridRowSelectionModel>({
    type: "include",
    ids: new Set(),
  });
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  const GRID_OFFSET = 240;
  const ROW_HEIGHT = 38;
  const HEADER_HEIGHT = 56;

  const allowedStatus =
    activeTab === "all"
      ? REPORT_STATUSES
      : activeTab === "pending"
      ? PENDING_REPORT_STATUSES
      : PROCESSED_REPORT_STATUSES;

  const calculatePageSize = () => {
    const availableHeight = window.innerHeight - GRID_OFFSET - HEADER_HEIGHT;
    return Math.max(1, Math.floor(availableHeight / ROW_HEIGHT));
  };

  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: calculatePageSize(),
  });

  const newCols = useMemo<GridColDef[]>(() => {
    return [
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
      },],
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
    setRowSelection({
      type: "include",
      ids: new Set(),
    });
  }, [activeTab]);

  useEffect(() => {
    setRowSelection({
      type: "include",
      ids: new Set(),
    });
  }, [paginationModel?.page, paginationModel?.pageSize]);

  const handleViewDetails = (reportId: string) => {
    navigate(`/approvals/reports/${reportId}?from=approvals`);
  };

  const tabs = [
    { key: "all", label: "All", count: allReportsPagination?.total || 0 },
    {
      key: "pending",
      label: "Pending",
      count: pendingReportsPagination?.total || 0,
    },
    {
      key: "processed",
      label: "Processed",
      count: processedReportsPagination?.total || 0,
    },
  ];

  const statusOptions = [
    { value: "all", label: "All" },
    { value: "pending", label: "Pending" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" },
  ];

  const fetchFilteredReports = useCallback(
    async ({ signal }: { signal: AbortSignal }) => {
      const limit = paginationModel?.pageSize ?? 10;
      const offset = (paginationModel?.page ?? 0) * limit;

      let newQuery: FilterMap = approvalQuery;

      if (!approvalQuery?.status) {
        if (activeTab === "pending") {
          newQuery = {
            ...approvalQuery,
            status: [{ operator: "in", value: ["PENDING_APPROVAL"] }],
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
                value: ["APPROVED", "REJECTED", "PENDING_APPROVAL"],
              },
            ],
          };
        } else newQuery = approvalQuery;
      }

      const response = await approvalService.getFilteredReportsToApprove({
        query: buildApprovalBackendQuery(newQuery),
        limit,
        offset,
        signal,
      });

      switch (activeTab) {
        case "pending":
          setPendingReports(response.data.data);
          setPendingReportsPagination({ total: response.data.count });
          break;

        case "processed":
          setProcessedReports(response.data.data);
          setProcessedReportsPagination({ total: response.data.count });
          break;

        case "all":
        default:
          setAllReports(response.data.data);
          setAllReportsPagination({ total: response.data.count });
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
    setApprovalQuery((prev) => {
      const { status, ...rest } = prev;
      return { ...rest };
    });
  }, []);

  const selectedCount =
    rowSelection.ids instanceof Set ? rowSelection.ids.size : 0;
  const hasSelection = selectedCount > 0;

  const getSelectedReportIds = (): string[] => {
    if (rowSelection.ids instanceof Set) {
      return Array.from(rowSelection.ids) as string[];
    }
    return [];
  };

  // Handle export
  const handleExport = async (includeReceipts: boolean) => {
    const selectedIds = getSelectedReportIds();
    if (selectedIds.length === 0) {
      toast.error("Please select at least one report to export");
      return;
    }

    try {
      const response = await approvalService.exportReports(
        selectedIds,
        includeReceipts
      );
      if (response.success) {
        setShowSuccessDialog(true);
        // Clear selection after successful export
        setRowSelection({
          type: "include",
          ids: new Set(),
        });
      }
    } catch (error: any) {
      console.error("Export failed:", error);
      toast.error(
        error?.response?.data?.message ||
          "Failed to export reports. Please try again."
      );
    }
  };

  return (
    <>
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
              ? ["PENDING_APPROVAL"]
              : ["APPROVED", "REJECTED"];

          updateQuery("status", "in", filter);
          setPaginationModel((prev) => ({
            ...prev,
            page: 0,
          }));
        }}
        tabsRightContent={
          hasSelection ? (
            <Button
              onClick={() => setShowExportDialog(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Download className="mr-2 h-4 w-4" />
              Download ({selectedCount})
            </Button>
          ) : undefined
        }
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search reports..."
        statusOptions={statusOptions}
        selectedDate={selectedDate}
        showFilters={false}
        showDateFilter={false}
        onDateChange={setSelectedDate}
      >
        <Box
          sx={{
            height: "calc(100vh - 160px)",
            width: "100%",
            marginTop: "-30px",
          }}
        >
          <DataGrid
            className="rounded border-[0.2px] border-[#f3f4f6] h-full"
            rows={loading ? [] : rows}
            columns={newCols}
            loading={loading}
            slots={{
              toolbar: CustomReportsApprovalToolbar,
              noRowsOverlay: () => (
                <CustomNoRows
                  title="No reports found"
                  description="There are currently no reports."
                />
              ),
              loadingOverlay: () => (
                <SkeletonLoaderOverlay rowCount={paginationModel.pageSize} />
              ),
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
            showCellVerticalBorder
            onRowClick={(params) => handleViewDetails(params.row.id)}
            rowSelectionModel={rowSelection}
            onRowSelectionModelChange={setRowSelection}
            pagination
            paginationMode="server"
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            rowCount={
              (activeTab === "all"
                ? allReportsPagination?.total
                : activeTab === "pending"
                ? pendingReportsPagination?.total
                : processedReportsPagination?.total) || 0
            }
          />
        </Box>
      </ReportsPageWrapper>

      <ExportDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        onExport={handleExport}
        selectedCount={selectedCount}
      />

      <ExportSuccessDialog
        open={showSuccessDialog}
        onOpenChange={setShowSuccessDialog}
        email={user?.email || ""}
      />
    </>
  );
}
