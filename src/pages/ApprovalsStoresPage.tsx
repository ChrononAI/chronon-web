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
import { useNavigate } from "react-router-dom";
import { Box } from "@mui/material";
import { storesService } from "@/services/storeService";
import { useStoreStore } from "@/store/storeStore";
import CustomNoRows from "@/components/shared/CustomNoRows";
import SkeletonLoaderOverlay from "@/components/shared/SkeletonLoaderOverlay";

const columns: GridColDef[] = [
  {
    field: "name",
    headerName: "NAME",
    minWidth: 120,
    flex: 1,
  },
  {
    field: "description",
    headerName: "DESCRIPTION",
    minWidth: 140,
    flex: 1,
  },
  {
    field: "address",
    headerName: "ADDRESS",
    minWidth: 140,
    flex: 1,
  },
  {
    field: "city",
    headerName: "CITY",
    minWidth: 120,
    flex: 1,
  },
  {
    field: "status",
    headerName: "STATUS",
    flex: 1,
    minWidth: 180,
    renderCell: (params) => (
      <Badge className={getStatusColor(params.value)}>
        {params.value.replace("_", " ")}
      </Badge>
    ),
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
    field: "created_by",
    headerName: "CREATED BY",
    minWidth: 150,
    flex: 1,
    renderCell: ({ value }) => {
      return value.email;
    },
  },
];

function ApprovalsStoresPage() {
  const navigate = useNavigate();
  const { setSelectedStoreToApprove } = useStoreStore();

  const [loading, setLoading] = useState(true);
  const [allRows, setAllRows] = useState([]);
  const [allCount, setAllCount] = useState<number>(0);
  const [pendingRows, setPendingRows] = useState([]);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [processedRows, setProcessedRows] = useState([]);
  const [processedCount, setProcessedCount] = useState<number>(0);

  const [activeTab, setActiveTab] = useState<"pending" | "processed" | "all">(
    "all"
  );
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

  useEffect(() => {
    setRowSelection({ type: "include", ids: new Set() });
  }, [activeTab]);

  const rows =
    activeTab === "all"
      ? allRows
      : activeTab === "pending"
        ? pendingRows
        : processedRows;
  const tabs = [
    { key: "all", label: "All", count: allCount || 0 },
    { key: "pending", label: "Pending", count: pendingCount || 0 },
    {
      key: "processed",
      label: "Processed",
      count: processedCount || 0,
    },
  ];

  const onRowClick = ({ row }: { row: any }) => {
    setSelectedStoreToApprove(row);
    navigate(`/approvals/stores/${row.id}`);
  };

  const getAllStoresToApprove = async ({
    limit,
    offset,
  }: {
    limit: number;
    offset: number;
  }) => {
    try {
      const res: any = await storesService.getStoresToApprove({
        limit,
        offset,
      });
      setAllRows(res.data.data);
      setAllCount(res.data.count);
    } catch (error) {
      console.log(error);
    }
  };

  const getPendingStoresToApprove = async ({
    limit,
    offset,
  }: {
    limit: number;
    offset: number;
  }) => {
    try {
      const res: any = await storesService.getStoresToApproveByStatus({
        status: "IN_PROGRESS",
        limit,
        offset,
      });
      setPendingRows(res.data.data);
      setPendingCount(res.data.count);
    } catch (error) {
      console.log(error);
    }
  };

  const getProcessedStores = async ({
    limit,
    offset,
  }: {
    limit: number;
    offset: number;
  }) => {
    try {
      const res: any = await storesService.getStoresToApproveByStatus({
        status: "APPROVED,REJECTED",
        limit,
        offset,
      });
      setProcessedRows(res.data.data);
      setProcessedCount(res.data.count);
    } catch (error) {
      console.log(error);
    }
  };

  const fetchData = async (limit: number, offset: number) => {
    try {
      setLoading(true);
      await Promise.all([
        getAllStoresToApprove({
          limit,
          offset,
        }),
        getPendingStoresToApprove({
          limit,
          offset,
        }),
        getProcessedStores({
          limit,
          offset,
        }),
      ]);
    } catch (error) {
      console.error("Error fetching advances:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (paginationModel) {
      const limit = paginationModel?.pageSize || 10;
      const offset = (paginationModel?.page || 0) * limit;
      fetchData(limit, offset);
    }
    setRowSelection({ type: "include", ids: new Set() });
  }, [paginationModel?.page, paginationModel?.pageSize]);
  return (
    <ReportsPageWrapper
      title="Approver Dashboard"
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={(tabId) => {
        setActiveTab(tabId as "all" | "pending" | "processed");
        setPaginationModel((prev) => ({
          ...prev,
          page: 0,
        }));
      }}
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
          marginTop: "-30px",
        }}
      >
        <DataGrid
          className="rounded border h-full"
          columns={columns}
          rows={loading ? [] : rows}
          loading={loading}
          slots={{
            noRowsOverlay: () => <CustomNoRows title="No stores found" description="There are currently no stores." />,
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
          onRowClick={onRowClick}
          rowSelectionModel={rowSelection}
          onRowSelectionModelChange={setRowSelection}
          pagination
          paginationMode="server"
          paginationModel={paginationModel || { page: 0, pageSize: 0 }}
          onPaginationModelChange={setPaginationModel}
          rowCount={
            (activeTab === "all"
              ? allCount
              : activeTab === "pending"
                ? pendingCount
                : processedCount) || 0
          }
        />
      </Box>
    </ReportsPageWrapper>
  );
}

export default ApprovalsStoresPage;
