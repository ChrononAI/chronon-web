import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ReportTabs } from "@/components/reports/ReportTabs";
import { expenseService } from "@/services/expenseService";
import { Button } from "@/components/ui/button";
import { CheckCircle, Plus } from "lucide-react";
import { useReportsStore } from "@/store/reportsStore";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { DataGrid, GridColDef, GridRowSelectionModel } from "@mui/x-data-grid";
import { Report } from "@/types/expense";
import { GridPaginationModel } from "@mui/x-data-grid";
import { Box, Skeleton } from "@mui/material";
import { GridOverlay } from "@mui/x-data-grid";
import { useAuthStore } from "@/store/authStore";

function ExpensesSkeletonOverlay({ rowCount = 8 }) {
  return (
    <GridOverlay>
      <div className="w-full py-3 space-y-0">
        {Array.from({ length: rowCount - 1 }).map((_, rowIndex) => (
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
  const { orgSettings } = useAuthStore();
  const customIdEnabled = orgSettings?.custom_report_id_settings?.enabled ?? false;
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [paginationModel, setPaginationModel] =
    useState<GridPaginationModel | null>(null);
  const [rowSelection, setRowSelection] = useState<GridRowSelectionModel>({
    type: "include",
    ids: new Set(),
  });

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

  useEffect(() => {
    const gridHeight = window.innerHeight - 300;
    const rowHeight = 36;
    const calculatedPageSize = Math.floor(gridHeight / rowHeight);
    setPaginationModel({ page: 0, pageSize: calculatedPageSize });
    setRowSelection({
      type: "include",
      ids: new Set(),
    });
  }, [activeTab]);

  const reportsArr =
    activeTab === "all"
      ? allReports
      : activeTab === "unsubmitted"
      ? unsubmittedReports
      : submittedReports;

  const fetchAllReports = async () => {
    try {
      const limit = paginationModel?.pageSize || 10;
      const offset = (paginationModel?.page || 0) * limit;
      const response = await expenseService.getMyReports(limit, offset);
      setAllReports(response.reports);
      setAllReportsPagination(response.pagination);
    } catch (error) {
      console.log(error);
    }
  };

  const fetchUnsubmittedReports = async () => {
    try {
      const limit = paginationModel?.pageSize || 10;
      const offset = (paginationModel?.page || 0) * limit;
      const response = await expenseService.getReportsByStatus(
        "DRAFT",
        limit,
        offset
      );
      setUnsubmittedReports(response.reports);
      setUnsubmittedReportsPagination(response.pagination);
    } catch (error) {
      console.log(error);
    }
  };

  const fetchSubmittedReports = async () => {
    try {
      const limit = paginationModel?.pageSize || 10;
      const offset = (paginationModel?.page || 0) * limit;
      const response = await expenseService.getReportsByStatus(
        "UNDER_REVIEW,APPROVED,REJECTED",
        limit,
        offset
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
      setIsInitialLoad(false);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    setRowSelection({
      type: "include",
      ids: new Set(),
    });
  }, [paginationModel?.page, paginationModel?.pageSize]);

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
        onTabChange={setActiveTab}
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
            noRowsOverlay: CustomNoRows,
            loadingOverlay:
              loading && isInitialLoad
                ? () => (
                    <ExpensesSkeletonOverlay
                      rowCount={paginationModel?.pageSize}
                    />
                  )
                : undefined,
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
