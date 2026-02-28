import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { InvoicePageWrapper } from "@/components/invoice/InvoicePageWrapper";
import { useLayoutStore } from "@/store/layoutStore";
import {
  GridColDef,
  GridPaginationModel,
  GridRowModel,
  GridRowSelectionModel,
} from "@mui/x-data-grid";
import { formatCurrency, formatDate } from "@/lib/utils";
import { AdvanceService } from "@/services/advanceService";
import { useAdvanceStore } from "@/store/advanceStore";
import { PaginationInfo } from "@/store/expenseStore";
import CustomNoRows from "@/components/shared/CustomNoRows";
import SkeletonLoaderOverlay from "@/components/shared/SkeletonLoaderOverlay";
import { DataTable } from "@/components/shared/DataTable";
import CustomInvoiceToolbar from "@/components/invoice/CustomInvoiceToolbar";
import { StatusPill } from "@/components/shared/StatusPill";

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
      return <StatusPill status={value} />;
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
    field: "updated_at",
    headerName: "APPROVED AT",
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
  const setNoPadding = useLayoutStore((s) => s.setNoPadding);

  useEffect(() => {
    setNoPadding(true);
    return () => {
      setNoPadding(false);
    };
  }, [setNoPadding]);

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

  const rowCount =
    activeTab === "all"
      ? allPagination?.total
      : activeTab === "pending"
        ? pendingPagination?.total
        : processedPagination?.total || 0;

  return (
    <InvoicePageWrapper
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
        firstColumnField="sequence_number"
        emptyStateComponent={
          <CustomNoRows
            title="No advances found"
            description="There are currently no advances."
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
            searchTerm,
            onSearchChange: setSearchTerm,
            onCreateClick: () => navigate("/requests/advances/create"),
            createButtonText: "Create Advance",
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
