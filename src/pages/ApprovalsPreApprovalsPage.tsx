import { useEffect, useState } from "react";
import { ReportsPageWrapper } from "@/components/reports/ReportsPageWrapper";
import {
  DataGrid,
  GridColDef,
  GridPaginationModel,
  GridRowSelectionModel,
} from "@mui/x-data-grid";
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

const columns: GridColDef[] = [
  {
    field: "sequence_number",
    headerName: "PRE APPROVAL ID",
    minWidth: 160,
    flex: 1,
  },
  {
    field: "title",
    headerName: "TITLE",
    minWidth: 200,
    flex: 1,
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
    flex: 1,
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

function ApprovalsPreApprovalsPage() {
  const navigate = useNavigate();
  const { setSelectedPreApprovalToApprove } = usePreApprovalStore();

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

  const [paginationModel, setPaginationModel] =
    useState<GridPaginationModel | null>(null);

  const [activeTab, setActiveTab] = useState<"pending" | "processed" | "all">(
    "all"
  );
  const [rowSelection, setRowSelection] = useState<GridRowSelectionModel>({
    type: "include",
    ids: new Set(),
  });

  useEffect(() => {
    const gridHeight = window.innerHeight - 300;
    const rowHeight = 36;
    const calculatedPageSize = Math.floor(gridHeight / rowHeight);
    setPaginationModel({ page: 0, pageSize: calculatedPageSize });
    setRowSelection({ type: "include", ids: new Set() });
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

  const getAllPreApprovalsToApprove = async ({
    page,
    perPage,
  }: {
    page: number;
    perPage: number;
  }) => {
    try {
      const res: any = await preApprovalService.getPreApprovalToApprove({
        page,
        perPage,
      });
      setAllRows(res.data.data);
      setAllPagination(res.data.pagination);
    } catch (error) {
      console.log(error);
    }
  };

  const getPendingPreApprovalsToApprove = async ({
    page,
    perPage,
  }: {
    page: number;
    perPage: number;
  }) => {
    try {
      const res: any = await preApprovalService.getPreApprovalToApproveByStatus(
        {
          status: "IN_PROGRESS",
          page,
          perPage,
        }
      );
      setPendingRows(res.data.data);
      setPendingPagination(res.data.pagination);
    } catch (error) {
      console.log(error);
    }
  };

  const getProcessedApprovals = async ({
    page,
    perPage,
  }: {
    page: number;
    perPage: number;
  }) => {
    try {
      const res: any = await preApprovalService.getPreApprovalToApproveByStatus(
        { status: "APPROVED,REJECTED", page, perPage }
      );
      setProcessedRows(res.data.data);
      setProcessedPagination(res.data.pagination);
    } catch (error) {
      console.log(error);
    }
  };

  const fetchAll = async ({
    page,
    perPage,
  }: {
    page: number;
    perPage: number;
  }) => {
    try {
      setLoading(true);
      await Promise.all([
        getAllPreApprovalsToApprove({ page, perPage }),
        getPendingPreApprovalsToApprove({ page, perPage }),
        getProcessedApprovals({ page, perPage }),
      ]);
    } catch (error) {
      console.error("Failed to fetch approvals:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (paginationModel) {
      fetchAll({
        page: paginationModel?.page + 1,
        perPage: paginationModel.pageSize,
      });
    }
    setRowSelection({ type: "include", ids: new Set() });
  }, [paginationModel?.page, paginationModel?.pageSize]);
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
            noRowsOverlay: CustomNoRows,
          }}
          sx={{
            border: 0,
            "& .MuiDataGrid-columnHeaderTitle": {
              color: "#9AA0A6",
              fontWeight: "bold",
              fontSize: "12px",
            },
            "& .MuiDataGrid-panel .MuiSelect-select": {
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
          density="compact"
          checkboxSelection
          disableRowSelectionOnClick
          onRowClick={onRowClick}
          rowSelectionModel={rowSelection}
          onRowSelectionModelChange={setRowSelection}
          pagination
          paginationMode="server"
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
