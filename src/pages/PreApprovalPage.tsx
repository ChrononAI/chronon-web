import { useEffect, useState } from "react";
import { ReportsPageWrapper } from "@/components/reports/ReportsPageWrapper";
import {
  DataGrid,
  GridColDef,
  GridOverlay,
  GridPaginationModel,
  GridRowModel,
} from "@mui/x-data-grid";
import { Box } from "@mui/material";
import { formatDate, getStatusColor } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import {
  preApprovalService,
  PreApprovalType,
} from "@/services/preApprovalService";
import { Badge } from "@/components/ui/badge";
import { usePreApprovalStore } from "@/store/preApprovalStore";
import { PaginationInfo } from "@/store/expenseStore";
import { CheckCircle } from "lucide-react";

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
      minWidth: 170,
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

function PreApprovalPage() {
  const navigate = useNavigate();
  const { setSelectedPreApproval } = usePreApprovalStore();

  const [activeTab, setActiveTab] = useState<"all" | "pending" | "approved">(
    "all"
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [loading, setLoading] = useState<boolean>(true);

  const [paginationModel, setPaginationModel] = useState<GridPaginationModel | null>({
    page: 0,
    pageSize: 10,
  });

  useEffect(() => {
    const gridHeight = window.innerHeight - 300;
    const rowHeight = 36;
    const calculatedPageSize = Math.floor(gridHeight / rowHeight);
    setPaginationModel({ page: 0, pageSize: calculatedPageSize });
  }, [activeTab]);

  const statusOptions = [
    { value: "all", label: "All" },
    { value: "PENDING", label: "Pending" },
    { value: "APPROVED", label: "approved" },
  ];

  const handleRowClick = ({ row }: GridRowModel) => {
    setSelectedPreApproval(row);
    navigate(`/requests/pre-approvals/${row.id}`);
  };

  const [allRows, setAllRows] = useState<PreApprovalType[]>([]);
  const [allPagination, setAllPagination] = useState<PaginationInfo | null>(
    null
  );
  const [pendingRows, setPendingRows] = useState<PreApprovalType[]>([]);
  const [pendingPagination, setPendingPagination] =
    useState<PaginationInfo | null>(null);
  const [processedRows, setProcessedRows] = useState<PreApprovalType[]>([]);
  const [processedPagination, setProcessedPagination] =
    useState<PaginationInfo | null>(null);
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

  const getAllPreApprovals = async ({
    page,
    perPage,
  }: {
    perPage: number;
    page: number;
  }) => {
    try {
      const response: any = await preApprovalService.getAllPreApprovals({
        page,
        perPage,
      });
      setAllPagination(response?.data.pagination);
      setAllRows(response?.data.data);
    } catch (error) {
      console.log(error);
    }
  };
  const getPendingPreApprovals = async ({
    page,
    perPage,
  }: {
    page: number;
    perPage: number;
  }) => {
    try {
      const response: any = await preApprovalService.getPreApprovalsByStatus({
        status: "PENDING_APPROVAL",
        page,
        perPage,
      });
      setPendingPagination(response?.data.pagination);
      setPendingRows(response?.data.data);
    } catch (error) {
      console.log(error);
    }
  };

  const getProcessedPreApprovals = async ({
    page,
    perPage,
  }: {
    page: number;
    perPage: number;
  }) => {
    try {
      const response: any = await preApprovalService.getPreApprovalsByStatus({
        status: "APPROVED,REJECTED",
        page,
        perPage,
      });
      setProcessedPagination(response?.data.pagination);
      setProcessedRows(response?.data.data);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        await Promise.all([
          getAllPreApprovals({
            page: (paginationModel?.page || 0) + 1,
            perPage: (paginationModel?.pageSize || 0),
          }),
          getPendingPreApprovals({
            page: (paginationModel?.page || 0) + 1,
            perPage: (paginationModel?.pageSize || 0),
          }),
          getProcessedPreApprovals({
            page: (paginationModel?.page || 0) + 1,
            perPage: (paginationModel?.pageSize || 0),
          }),
        ]);
      } catch (error) {
        console.error("Error fetching pre-approvals:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [paginationModel?.page, paginationModel?.pageSize]);

  return (
    <ReportsPageWrapper
      title="Pre Approval"
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={(tabId) =>
        setActiveTab(tabId as "all" | "pending" | "approved")
      }
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      searchPlaceholder="Search expenses..."
      statusFilter={statusFilter}
      onStatusChange={setStatusFilter}
      statusOptions={statusOptions}
      selectedDate={selectedDate}
      onDateChange={setSelectedDate}
      showFilters={false}
      showDateFilter={false}
      showCreateButton={true}
      createButtonText="Create Pre Approval"
      createButtonLink="/requests/pre-approvals/create"
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
            "& .MuiDataGrid-main": {
              border: "0.2px solid #f3f4f6",
            },
            "& .MuiDataGrid-columnHeader": {
              backgroundColor: "#f3f4f6",
              border: "none",
            },
            "& .MuiDataGrid-columnHeaders": {
              border: "none",
              borderTop: "none",
              borderBottom: "none",
            },
            "& .MuiCheckbox-root": {
              color: "#9AA0A6",
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
          showCellVerticalBorder
          onRowClick={handleRowClick}
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

export default PreApprovalPage;
