import { useEffect, useState } from "react";
import { InvoicePageWrapper } from "@/components/invoice/InvoicePageWrapper";
import { useLayoutStore } from "@/store/layoutStore";
import {
  GridColDef,
  GridPaginationModel,
  GridRowSelectionModel,
  GridRowModel,
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
];

export default function Stores() {
  const navigate = useNavigate();
  const { setSelectedStore } = useStoreStore();
  const setNoPadding = useLayoutStore((s) => s.setNoPadding);
  const [loading, setLoading] = useState(true);

  // Tab and filter states
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "processed">(
    "all"
  );

  const [allRows, setAllRows] = useState([]);
  const [pendingRows, setPendingRows] = useState([]);
  const [processedRows, setProcessedRows] = useState([]);
  const [allCount, setAllCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);
  const [rowSelection, setRowSelection] = useState<GridRowSelectionModel>({
    type: "include",
    ids: new Set(),
  });

  const rows =
    activeTab === "all"
      ? allRows
      : activeTab === "pending"
        ? pendingRows
        : processedRows;

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
    setNoPadding(true);
    return () => {
      setNoPadding(false);
    };
  }, [setNoPadding]);

  const fetchAllStores = async () => {
    setLoading(true);
    try {
      const limit = paginationModel?.pageSize || 10;
      const offset = (paginationModel?.page || 0) * limit;
      const res = await storesService.getStores({ limit, offset });
      setAllRows(res.data.data);
      setAllCount(res.data.count);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingStores = async () => {
    setLoading(true);
    try {
      const limit = paginationModel?.pageSize || 10;
      const offset = (paginationModel?.page || 0) * limit;
      const res = await storesService.getStoresByStatus({
        limit,
        offset,
        status: "PENDING_APPROVAL",
      });
      setPendingRows(res.data.data);
      setPendingCount(res.data.count);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProcessedStores = async () => {
    setLoading(true);
    try {
      const limit = paginationModel?.pageSize || 10;
      const offset = (paginationModel?.page || 0) * limit;
      const res = await storesService.getStoresByStatus({
        limit,
        offset,
        status: "APPROVED,REJECTED",
      });
      setProcessedRows(res.data.data);
      setProcessedCount(res.data.count);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = ({ row }: GridRowModel) => {
    setSelectedStore(row);
    navigate(`/requests/stores/${row.id}`);
  };

  const fetchStores = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchAllStores(),
        fetchPendingStores(),
        fetchProcessedStores(),
      ]);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (paginationModel) {
      fetchStores();
    }
    setRowSelection({ type: "include", ids: new Set() });
  }, [paginationModel?.page, paginationModel?.pageSize]);

  const tabs = [
    { key: "all", label: "All", count: allCount || 0 },
    { key: "pending", label: "Pending", count: pendingCount || 0 },
    { key: "processed", label: "Processed", count: processedCount || 0 },
  ];

  useEffect(() => {
    setRowSelection({ type: "include", ids: new Set() });
    setPaginationModel((prev) => ({
      ...prev,
      page: 0,
    }));
  }, [activeTab]);

  const rowCount =
    activeTab === "all"
      ? allCount
      : activeTab === "pending"
        ? pendingCount
        : processedCount || 0;

  return (
    <InvoicePageWrapper
      title="Stores"
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={(tabId) => setActiveTab(tabId as "all" | "pending" | "processed")}
      showFilters={false}
      showDateFilter={false}
      showCreateButton={false}
      marginBottom="mb-0"
    >
      <DataTable
        rows={loading ? [] : rows}
        columns={columns}
        loading={loading}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        onRowClick={handleRowClick}
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
            onCreateClick: () => navigate("/requests/stores/create"),
            createButtonText: "Create New Store",
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
