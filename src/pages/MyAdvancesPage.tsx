import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ReportsPageWrapper } from "@/components/reports/ReportsPageWrapper";
import {
  DataGrid,
  GridColDef,
  GridPaginationModel,
  GridRowModel,
  GridRowSelectionModel,
} from "@mui/x-data-grid";
import { Box } from "@mui/material";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { AdvanceService } from "@/services/advanceService";
import { useAdvanceStore } from "@/store/advanceStore";
import { PaginationInfo } from "@/store/expenseStore";
import CustomNoRows from "@/components/shared/CustomNoRows";
import SkeletonLoaderOverlay from "@/components/shared/SkeletonLoaderOverlay";

const columns: GridColDef[] = [
  {
    field: "sequence_number",
    headerName: "ADVANCE ID",
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
    field: "policy_name",
    headerName: "POLICY",
    minWidth: 150,
    flex: 1,
    renderCell: ({ value }) => {
      return value || "Not Selected";
    },
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
    field: "amount",
    headerName: "AMOUNT",
    minWidth: 150,
    flex: 1,
    align: "right",
    headerAlign: "right",
    renderCell: ({ value }) => {
      return value ? formatCurrency(value) : "-";
    },
  },
  {
    field: "claimed_amount",
    headerName: "CLAIMED AMOUNT",
    minWidth: 150,
    flex: 1,
    align: "right",
    headerAlign: "right",
    renderCell: ({ value }) => {
      return value ? formatCurrency(value) : "-";
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

export function MyAdvancesPage() {
  const navigate = useNavigate();
  const { setSelectedAdvance } = useAdvanceStore();

  const [activeTab, setActiveTab] = useState<"all" | "pending" | "approved">(
    "all"
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
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

  const statusOptions = [
    { value: "all", label: "All" },
    { value: "PENDING", label: "Pending" },
    { value: "APPROVED", label: "approved" },
  ];

  const handleRowClick = ({ row }: GridRowModel) => {
    setSelectedAdvance(row);
    navigate(`/requests/advances/${row.id}`);
  };

  const [allRows, setAllRows] = useState<any[]>([]);
  const [allPagination, setAllPagination] = useState<PaginationInfo | null>(
    null
  );
  const [pendingRows, setPendingRows] = useState<any[]>([]);
  const [pendingPagination, setPendingPagination] =
    useState<PaginationInfo | null>(null);
  const [processedRows, setProcessedRows] = useState<any[]>([]);
  const [processedPagination, setProcessedPagination] =
    useState<PaginationInfo | null>(null);

  const tabs = [
    { key: "all", label: "All", count: allPagination?.total || 0 },
    { key: "pending", label: "Pending", count: pendingPagination?.total || 0 },
    {
      key: "processed",
      label: "Processed",
      count: processedPagination?.total || 0,
    },
  ];

  const rows =
    activeTab === "all"
      ? allRows
      : activeTab === "pending"
        ? pendingRows
        : processedRows;

  const getAllAdvances = async ({
    page,
    perPage,
  }: {
    page: number;
    perPage: number;
  }) => {
    try {
      const response: any = await AdvanceService.getAllAdvances({
        page,
        perPage,
      });
      setAllRows(response.data.data);
      setAllPagination(response.data.pagination);
    } catch (error) {
      console.log(error);
    }
  };

  const getPendingAdvances = async ({
    page,
    perPage,
  }: {
    page: number;
    perPage: number;
  }) => {
    try {
      const response: any = await AdvanceService.getAdvancesByStatus({
        status: "PENDING_APPROVAL",
        page,
        perPage,
      });
      setPendingRows(response?.data.data);
      setPendingPagination(response?.data.pagination);
    } catch (error) {
      console.log(error);
    }
  };

  const getProcessedAdvances = async ({
    page,
    perPage,
  }: {
    page: number;
    perPage: number;
  }) => {
    try {
      const response: any = await AdvanceService.getAdvancesByStatus({
        status: "APPROVED,REJECTED",
        page,
        perPage,
      });
      setProcessedRows(response?.data.data);
      setProcessedPagination(response?.data.pagination);
    } catch (error) {
      console.log(error);
    }
  };

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        await Promise.all([
          getAllAdvances({
            page: (paginationModel?.page || 0) + 1,
            perPage: paginationModel?.pageSize || 0,
          }),
          getPendingAdvances({
            page: (paginationModel?.page || 0) + 1,
            perPage: paginationModel?.pageSize || 0,
          }),
          getProcessedAdvances({
            page: (paginationModel?.page || 0) + 1,
            perPage: paginationModel?.pageSize || 0,
          }),
        ]);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    setRowSelection({ type: "include", ids: new Set() });
  }, [paginationModel?.page, paginationModel?.pageSize]);

  useEffect(() => {
    setRowSelection({ type: "include", ids: new Set() });
  }, [activeTab]);

  return (
    <ReportsPageWrapper
      title="Advances"
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={(tabId) => {
        setActiveTab(tabId as "all" | "pending" | "approved");
        setPaginationModel((prev) => ({
          ...prev,
          page: 0,
        }));
      }}
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
      createButtonText="Create Advance"
      createButtonLink="/requests/advances/create"
    >
      <Box
        sx={{
          height: "calc(100vh - 160px)",
          width: "100%",
          marginTop: "-30px",
          color: "#2E2E2E",
        }}
      >
        <DataGrid
          className="rounded border border-[#F1F3F4] h-full"
          columns={columns}
          rows={loading ? [] : rows}
          loading={loading}
          slots={{
            noRowsOverlay: () => <CustomNoRows title="No advances found" description="There are currently no advances." />,
            loadingOverlay: () => <SkeletonLoaderOverlay rowCount={paginationModel.pageSize} />
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
            "& .MuiDataGrid-virtualScroller": {
              overflow: loading ? "hidden" : "auto",
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
          density="compact"
          checkboxSelection
          disableRowSelectionOnClick
          onRowClick={handleRowClick}
          rowSelectionModel={rowSelection}
          onRowSelectionModelChange={setRowSelection}
          pagination
          paginationMode="server"
          paginationModel={paginationModel}
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
