import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { approvalService } from "@/services/approvalService";
import { NewPaginationMeta, Report } from "@/types/expense";
import { formatDate, formatCurrency, getStatusColor } from "@/lib/utils";
import { ReportsPageWrapper } from "@/components/reports/ReportsPageWrapper";
import { Badge } from "@/components/ui/badge";
import { DataGrid, GridColDef, GridRowSelectionModel } from "@mui/x-data-grid";
import { Box } from "@mui/material";
import { GridPaginationModel } from "@mui/x-data-grid";
import { useAuthStore } from "@/store/authStore";
import CustomNoRows from "@/components/shared/CustomNoRows";
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
  const { orgSettings } = useAuthStore();
  const customIdEnabled = orgSettings?.custom_report_id_settings?.enabled ?? false;
  const showDescription = orgSettings?.report_description_settings?.enabled ?? true;
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<
    "unsubmitted" | "submitted" | "all"
  >("all");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [allReports, setAllReports] = useState<Report[]>([]);
  const [allReportsPagination, setAllReportsPagination] =
    useState<NewPaginationMeta>();
  const [pendingReports, setPendingReports] = useState<Report[]>([]);
  const [pendingReportsPagination, setPendingReportsPagination] =
    useState<NewPaginationMeta>();
  const [processedReports, setProcessedReports] = useState<Report[]>([]);
  const [processedReportsPagination, setProcessedReportsPagination] =
    useState<NewPaginationMeta>();
  const rows =
    activeTab === "all"
      ? allReports
      : activeTab === "unsubmitted"
        ? pendingReports
        : processedReports;
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

  useEffect(() => {
    setRowSelection({
      type: "include",
      ids: new Set(),
    });
  }, [activeTab]);

  const fetchAllReports = async () => {
    try {
      const limit = paginationModel?.pageSize || 10;
      const offset = (paginationModel?.page || 0) * limit;
      const response = await approvalService.getReportsByStatus(
        limit,
        offset,
        "IN_PROGRESS,APPROVED,REJECTED"
      );
      setAllReports(response?.data.data);
      setAllReportsPagination({
        count: response?.data.count,
        offset: response?.data.offset,
      });
    } catch (error) {
      console.log(error);
    }
  };

  const fetchUnsubmittedReports = async () => {
    try {
      const limit = paginationModel?.pageSize || 10;
      const offset = (paginationModel?.page || 0) * limit;
      const response = await approvalService.getReportsByStatus(
        limit,
        offset,
        "IN_PROGRESS"
      );
      setPendingReports(response.data.data);
      setPendingReportsPagination({
        count: response?.data.count,
        offset: response?.data.offset,
      });
    } catch (error) {
      console.log(error);
    }
  };

  const fetchSubmittedReports = async () => {
    try {
      const limit = paginationModel?.pageSize || 10;
      const offset = (paginationModel?.page || 0) * limit;
      const response = await approvalService.getReportsByStatus(
        limit,
        offset,
        "APPROVED,REJECTED"
      );
      setProcessedReports(response.data.data);
      setProcessedReportsPagination({
        count: response?.data.count,
        offset: response?.data.offset,
      });
    } catch (error) {
      console.log(error);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchAllReports(),
        fetchSubmittedReports(),
        fetchUnsubmittedReports(),
      ]);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (paginationModel) {
      fetchData();
    }
    setRowSelection({
      type: "include",
      ids: new Set(),
    });
  }, [paginationModel?.page, paginationModel?.pageSize]);

  const handleViewDetails = (reportId: string) => {
    navigate(`/approvals/reports/${reportId}?from=approvals`);
  };

  const tabs = [
    { key: "all", label: "All", count: allReportsPagination?.count || 0 },
    {
      key: "unsubmitted",
      label: "Pending",
      count: pendingReportsPagination?.count || 0,
    },
    {
      key: "submitted",
      label: "Processed",
      count: processedReportsPagination?.count || 0,
    },
  ];

  const statusOptions = [
    { value: "all", label: "All" },
    { value: "pending", label: "Pending" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" },
  ];

  return (
    <ReportsPageWrapper
      title="Approver Dashboard"
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={(tabId) =>
        setActiveTab(tabId as "unsubmitted" | "submitted")
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
            noRowsOverlay: () => <CustomNoRows title="No reports found" description="There are currently no reports." />,
            loadingOverlay: () => <SkeletonLoaderOverlay rowCount={paginationModel.pageSize} />
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
              ? allReportsPagination?.count
              : activeTab === "unsubmitted"
                ? pendingReportsPagination?.count
                : processedReportsPagination?.count) || 0
          }
        />
      </Box>
    </ReportsPageWrapper>
  );
}
