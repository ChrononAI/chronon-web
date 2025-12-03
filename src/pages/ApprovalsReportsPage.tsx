import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle } from "lucide-react";
import { approvalService } from "@/services/approvalService";
import { NewPaginationMeta, Report } from "@/types/expense";
import { formatDate, formatCurrency, getStatusColor } from "@/lib/utils";
import { ReportsPageWrapper } from "@/components/reports/ReportsPageWrapper";
import { Badge } from "@/components/ui/badge";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { GridOverlay } from "@mui/x-data-grid";
import { Box } from "@mui/material";
import { GridPaginationModel } from "@mui/x-data-grid";

function CustomNoRows() {
  return (
    <GridOverlay>
      <Box className="w-full">
        <div className="text-center">
          <CheckCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No expenses found</h3>
          <p className="text-muted-foreground">
            There are currently no expenses.
          </p>
        </div>
      </Box>
    </GridOverlay>
  );
}

const columns: GridColDef[] = [
  {
    field: "title",
    headerName: "REPORT NAME",
    minWidth: 200,
    flex: 1,
  },
  {
    field: "created_by",
    headerName: "SUBMITTER",
    minWidth: 160,
    flex: 1,
    renderCell: (params) => <p>{params.row.created_by?.email || "-"}</p>,
  },
  {
    field: "total_amount",
    headerName: "AMOUNT",
    minWidth: 120,
    flex: 1,
    align: "right",
    headerAlign: "right",
    valueFormatter: (val) => formatCurrency(val),
  },
  {
    field: "submitted_at",
    headerName: "SUBMITTED ON",
    minWidth: 120,
    flex: 1,
    renderCell: (params) => (
      <p className="text-gray-900 whitespace-nowrap">
        {params.value ? formatDate(params.value) : "Not submitted"}
      </p>
    ),
  },
  {
    field: "expense_count",
    headerName: "EXPENSES",
    minWidth: 60,
    flex: 1,
    align: "center",
    renderCell: (params) => <p className="text-gray-900">{params.value}</p>,
  },
  {
    field: "status",
    headerName: "STATUS",
    minWidth: 180,
    flex: 1,
    renderCell: (params) => (
      <Badge className={getStatusColor(params.value)}>{params.value}</Badge>
    ),
  },
];

export function ApprovalsReportsPage() {
  const navigate = useNavigate();
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
  const [paginationModel, setPaginationModel] =
    useState<GridPaginationModel | null>({
      page: 0,
      pageSize: 10,
    });

  useEffect(() => {
    const gridHeight = window.innerHeight - 300;
    const rowHeight = 36;
    const calculatedPageSize = Math.floor(gridHeight / rowHeight);
    setPaginationModel({ page: 0, pageSize: calculatedPageSize });
  }, [activeTab]);

  const fetchAllReports = async () => {
    try {
      const limit = paginationModel?.pageSize || 10;
      const offset = (paginationModel?.page || 0) * limit;
      const response = await approvalService.getAllReports(limit, offset);
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
          marginTop: "-32px",
        }}
      >
        <DataGrid
          className="rounded border-[0.2px] border-[#f3f4f6] h-full"
          rows={rows}
          columns={columns}
          loading={loading}
          slots={{
            noRowsOverlay: CustomNoRows,
          }}
          sx={{
            border: 0,
            fontFamily: 'Poppins, sans-serif',
            "& .MuiDataGrid-columnHeaderTitle": {
              color: "#9AA0A6",
              fontWeight: "bold",
              fontSize: "12px",
              fontFamily: 'Poppins, sans-serif',
            },
            "& .MuiDataGrid-cell": {
              fontFamily: 'Poppins, sans-serif',
              color: "#2E2E2E",
              border: "0.2px solid #f3f4f6",
            },
            "& .MuiDataGrid-main": {
              border: "0.2px solid #f3f4f6",
            },
            "& .MuiDataGrid-columnHeader": {
              backgroundColor: "#EAF0EE",
              border: "none",
            },
            "& .MuiDataGrid-columnHeaders": {
              border: "none",
            },
            "& .MuiDataGrid-row:hover": {
              cursor: "pointer",
              backgroundColor: "#f5f5f5",
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
          checkboxSelection
          disableRowSelectionOnClick
          showCellVerticalBorder
          onRowClick={(params) => handleViewDetails(params.row.id)}
          pagination
          paginationMode="server"
          paginationModel={paginationModel || { page: 0, pageSize: 0 }}
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
