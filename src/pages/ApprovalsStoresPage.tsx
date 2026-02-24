import { useEffect, useState } from "react";
import { InvoicePageWrapper } from "@/components/invoice/InvoicePageWrapper";
import { useLayoutStore } from "@/store/layoutStore";
import {
  GridColDef,
  GridPaginationModel,
  GridRowSelectionModel,
} from "@mui/x-data-grid";
import { formatDate } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { storesService } from "@/services/storeService";
import { useStoreStore } from "@/store/storeStore";
import CustomNoRows from "@/components/shared/CustomNoRows";
import SkeletonLoaderOverlay from "@/components/shared/SkeletonLoaderOverlay";
import { DataTable } from "@/components/shared/DataTable";
import CustomInvoiceToolbar from "@/components/invoice/CustomInvoiceToolbar";
import { StatusPill } from "@/components/shared/StatusPill";

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
      <StatusPill status={params.value} />
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
  const rowCount =
    activeTab === "all"
      ? allCount
      : activeTab === "pending"
        ? pendingCount
        : processedCount || 0;

  return (
    <InvoicePageWrapper
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
      showFilters={false}
      showDateFilter={false}
      showCreateButton={false}
      marginBottom="mb-0"
    >
      <DataTable
        rows={loading ? [] : rows}
        columns={columns}
        loading={loading}
        paginationModel={paginationModel || { page: 0, pageSize: 0 }}
        onPaginationModelChange={setPaginationModel}
        onRowClick={onRowClick}
        rowCount={rowCount}
        paginationMode="server"
        firstColumnField="name"
        emptyStateComponent={
          <CustomNoRows
            title="No stores found"
            description="There are currently no stores."
          />
        }
        slots={{
          toolbar: CustomInvoiceToolbar,
          loadingOverlay: () => (
            <SkeletonLoaderOverlay rowCount={paginationModel.pageSize} />
          ),
        }}
        slotProps={{
          toolbar: {
            searchTerm: "",
            onSearchChange: () => {},
          } as any,
        }}
        showToolbar
        checkboxSelection
        rowSelectionModel={rowSelection}
        onRowSelectionModelChange={setRowSelection}
      />
    </InvoicePageWrapper>
  );
}

export default ApprovalsStoresPage;
