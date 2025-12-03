import { useEffect, useState } from "react";
import { ReportsPageWrapper } from "@/components/reports/ReportsPageWrapper";
import { DataGrid, GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import { formatDate, getStatusColor } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  preApprovalService,
  PreApprovalType,
} from "@/services/preApprovalService";
import { useNavigate } from "react-router-dom";
import { usePreApprovalStore } from "@/store/preApprovalStore";
import { PaginationInfo } from "@/store/expenseStore";
import { Box } from "@mui/material";
import { GridOverlay } from "@mui/x-data-grid";
import { CheckCircle } from "lucide-react";

function CustomNoRows() {
  return (
    <GridOverlay>
      <Box className="w-full">
        <div className="text-center">
          <CheckCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No pre approvals found</h3>
          <p className="text-muted-foreground">
            There are currently no pre approvals.
          </p>
        </div>
      </Box>
    </GridOverlay>
  );
}

function ApprovalsPreApprovalsPage() {
  const navigate = useNavigate();
  const { setSelectedPreApprovalToApprove } = usePreApprovalStore();

  const columns: GridColDef[] = [
    {
      field: "sequence_number",
      headerName: "PRE APPROVAL ID",
      minWidth: 160,
      flex: 1
    },
    {
      field: "title",
      headerName: "TITLE",
      minWidth: 200,
      flex: 1
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
      field: "policy_name",
      headerName: "POLICY",
      minWidth: 150,
      flex: 1
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
      field: "created_by",
      headerName: "CREATED BY",
      minWidth: 150,
      flex: 1,
      renderCell: ({ value }) => {
        return value.email;
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
      field: "description",
      headerName: "PURPOSE",
      flex: 1,
      minWidth: 150,
    },
  ];
  const [loading, setLoading] = useState(true);
  const [allRows, setAllRows] = useState([]);
  const [allPagination, setAllPagination] = useState<PaginationInfo | null>(
    null
  );
  const [pendingRows, setPendingRows] = useState([]);
  const [pendingPagination, setPendingPagination] =
    useState<PaginationInfo | null>(null);
  const [processedRows, setProcessedRows] = useState([]);
  const [processedPagination, setProcessedPagination] =
    useState<PaginationInfo | null>(null);

  const [paginationModel, setPaginationModel] = useState<GridPaginationModel | null>(null);

  const [activeTab, setActiveTab] = useState<"pending" | "processed" | "all">(
    "all"
  );

  useEffect(() => {
    const gridHeight = window.innerHeight - 300;
    const rowHeight = 36;
    const calculatedPageSize = Math.floor(gridHeight / rowHeight);
    setPaginationModel({ page: 0, pageSize: calculatedPageSize });
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

  const onRowClick = ({ row }: { row: PreApprovalType }) => {
    setSelectedPreApprovalToApprove(row);
    navigate(`/approvals/pre-approvals/${row.id}`);
  };

  const getAllPreApprovalsToApprove = async () => {
    try {
      const res: any = await preApprovalService.getPreApprovalToApprove();
      setAllRows(res.data.data);
      setAllPagination(res.data.pagination);
    } catch (error) {
      console.log(error);
    }
  };

  const getPendingPreApprovalsToApprove = async () => {
    try {
      const res: any = await preApprovalService.getPreApprovalToApproveByStatus(
        "IN_PROGRESS"
      );
      setPendingRows(res.data.data);
      setPendingPagination(res.data.pagination);
    } catch (error) {
      console.log(error);
    }
  };

  const getProcessedApprovals = async () => {
    try {
      const res: any = await preApprovalService.getPreApprovalToApproveByStatus(
        "APPROVED,REJECTED"
      );
      setProcessedRows(res.data.data);
      setProcessedPagination(res.data.pagination);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
  const fetchAll = async () => {
    try {
      setLoading(true);
      await Promise.all([
        getAllPreApprovalsToApprove(),
        getPendingPreApprovalsToApprove(),
        getProcessedApprovals(),
      ]);
    } catch (error) {
      console.error("Failed to fetch approvals:", error);
    } finally {
      setLoading(false);
    }
  };

  fetchAll();

  }, []);
  return (
    <ReportsPageWrapper
      title="Approver Dashboard"
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={(tabId) =>
        setActiveTab(tabId as "all" | "pending" | "processed")
      }
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
          marginTop: "-32px",
        }}
      >
        <DataGrid
          className="rounded border h-full"
          columns={columns}
          rows={rows}
          loading={loading}
          slots={{
            noRowsOverlay: CustomNoRows
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
            },
            "& .MuiDataGrid-main": {
              border: "1px solid #F1F3F4",
            },
            "& .MuiDataGrid-columnHeader": {
              backgroundColor: "#EAF0EE",
            },
            "& .MuiCheckbox-root": {
              color: "#9AA0A6",
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
          }}
          showToolbar
          density="compact"
          checkboxSelection
          disableRowSelectionOnClick
          onRowClick={onRowClick}
          pagination
          // paginationMode="server"
          paginationModel={paginationModel || { page: 0, pageSize: 0 }}
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

export default ApprovalsPreApprovalsPage;
