import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { ReportTabs } from "@/components/reports/ReportTabs";
import { expenseService } from "@/services/expenseService";
import { Button } from "@/components/ui/button";
import { CheckCircle, Plus } from "lucide-react";
import { useReportsStore } from "@/store/reportsStore";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { Report } from "@/types/expense";
import { GridPaginationModel } from "@mui/x-data-grid";
import { Box, CircularProgress } from "@mui/material";
import { GridOverlay } from "@mui/x-data-grid";

export function CustomLoader() {
  return (
    <GridOverlay>
      <Box
        sx={{
          position: "absolute",
          top: 0,
          width: "100%",
          height: "100%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "rgba(255,255,255,0.6)",
        }}
      >
        <CircularProgress size={28} thickness={4} />
      </Box>
    </GridOverlay>
  );
}

function CustomNoRows() {
  return (
    <GridOverlay>
      <Box className="w-full">
        <div className="text-center">
          <CheckCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No reports found</h3>
          <p className="text-muted-foreground">
            There are currently no reportrs.
          </p>
        </div>
      </Box>
    </GridOverlay>
  );
}

const columns: GridColDef[] = [
  {
    field: "title",
    headerName: "TITLE",
    flex: 1.5,
    renderCell: (params) => (
      <span className="font-medium hover:underline whitespace-nowrap">
        {params.value}
      </span>
    ),
  },
  {
    field: "description",
    headerName: "DESCRIPTION",
    flex: 2,
    renderCell: (params) => (
      <span className="whitespace-nowrap">{params.value}</span>
    ),
  },
  {
    field: "status",
    headerName: "STATUS",
    flex: 1,
    renderCell: (params) => (
      <Badge className={getStatusColor(params.value)}>{params.value}</Badge>
    ),
  },
  {
    field: "total_amount",
    headerName: "TOTAL AMOUNT",
    flex: 1,
    align: "right",
    headerAlign: "right",
    valueFormatter: (params) => formatCurrency(params),
  },
  {
    field: "created_by",
    headerName: "CREATED BY",
    flex: 1.5,
    renderCell: (params) => (
      <span className="whitespace-nowrap">{params.row.created_by?.email}</span>
    ),
  },
  {
    field: "created_at",
    headerName: "CREATED DATE",
    flex: 1.2,
    valueFormatter: (params) => formatDate(params),
  },
];

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
  } = useReportsStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 10,
  });

  useEffect(() => {
    setPaginationModel((prev) => {
      return { ...prev, page: 0 };
    });
  }, [activeTab]);

  useEffect(() => {
    const gridHeight = window.innerHeight - 300;
    const rowHeight = 36;
    const calculatedPageSize = Math.floor(gridHeight / rowHeight);
    setPaginationModel((prev) => ({ ...prev, pageSize: calculatedPageSize }));
  }, [activeTab]);

  const reportsArr =
    activeTab === "all"
      ? allReports
      : activeTab === "unsubmitted"
      ? unsubmittedReports
      : submittedReports;

  const fetchAllReports = async () => {
    try {
      const response = await expenseService.getMyReports(
        paginationModel.page + 1,
        paginationModel.pageSize
      );
      console.log(response);
      setAllReports(response.reports);
      setAllReportsPagination(response.pagination);
    } catch (error) {
      console.log(error);
    }
  };

  const fetchUnsubmittedReports = async () => {
    try {
      const response = await expenseService.getReportsByStatus(
        "DRAFT",
        paginationModel.page + 1,
        paginationModel.pageSize
      );
      setUnsubmittedReports(response.reports);
      setUnsubmittedReportsPagination(response.pagination);
    } catch (error) {
      console.log(error);
    }
  };

  const fetchSubmittedReports = async () => {
    try {
      const response = await expenseService.getReportsByStatus(
        "UNDER_REVIEW,APPROVED,REJECTED",
        paginationModel.page + 1,
        paginationModel.pageSize
      );
      setSubmittedReports(response.reports);
      setSubmittedReportsPagination(response.pagination);
    } catch (error) {
      console.log(error);
    }
  };

  const fetchData = async () => {
    try {
      await Promise.all([
        fetchAllReports(),
        fetchUnsubmittedReports(),
        fetchSubmittedReports(),
      ]);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [paginationModel.page, paginationModel.pageSize]);

  const handleReportClick = (report: Report) => {
    if (report.status === "DRAFT") {
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

  return (
    <Layout>
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
        onTabChange={setActiveTab}
        tabs={[
          { key: "all", label: "All", count: allReportsPagination.total },
          {
            key: "unsubmitted",
            label: "Unsubmitted",
            count: unsubmittedReportsPagination.total,
          },
          {
            key: "submitted",
            label: "Submitted",
            count: submittedReportsPagination.total,
          },
        ]}
        className="mb-8"
      />
      <Box
        sx={{
          height: "calc(100vh - 160px)",
          width: "100%",
          marginTop: "-32px",
        }}
      >
        <DataGrid
          rows={loading ? [] : reportsArr}
          columns={columns}
          loading={loading}
          onRowClick={(params, event) => {
            event.stopPropagation();
            const report = params.row;
            if (report.status === "DRAFT") {
              handleReportClick(report);
            } else {
              navigate(`/reports/${report.id}`);
            }
          }}
          slots={{
            loadingOverlay: CustomLoader,
            noRowsOverlay: CustomNoRows,
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
          checkboxSelection
          showToolbar
          rowCount={
            activeTab === "all"
              ? allReportsPagination.total
              : activeTab === "unsubmitted"
              ? unsubmittedReportsPagination.total
              : submittedReportsPagination.total
          }
          pagination
          paginationMode="server"
          disableRowSelectionOnClick
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          density="compact"
          showCellVerticalBorder
        />
      </Box>
    </Layout>
  );
}
