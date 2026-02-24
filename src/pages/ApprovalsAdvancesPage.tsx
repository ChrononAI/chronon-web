import { useEffect, useState } from "react";
import { InvoicePageWrapper } from "@/components/invoice/InvoicePageWrapper";
import { useLayoutStore } from "@/store/layoutStore";
import { GridColDef, GridPaginationModel, GridRowSelectionModel } from "@mui/x-data-grid";
import { formatDate } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { PaginationInfo } from "@/store/expenseStore";
import { useAdvanceStore } from "@/store/advanceStore";
import { AdvanceService } from "@/services/advanceService";
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
  },
  {
    field: "status",
    headerName: "STATUS",
    minWidth: 180,
    flex: 1,
    renderCell: ({ value }) => {
      return <StatusPill status={value} />;
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

function ApprovalsAdvancesPage() {
  const navigate = useNavigate();
  const { setSelectedAdvanceToApprove } = useAdvanceStore();

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

  const [activeTab, setActiveTab] = useState<"pending" | "processed" | "all">(
    "all"
  );
  const [rowSelection, setRowSelection] = useState<GridRowSelectionModel>({ type: "include", ids: new Set() });

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

  const setNoPadding = useLayoutStore((s) => s.setNoPadding);

  useEffect(() => {
    setNoPadding(true);
    return () => {
      setNoPadding(false);
    };
  }, [setNoPadding]);

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

  const onRowClick = ({ row }: { row: any }) => {
    setSelectedAdvanceToApprove(row);
    navigate(`/approvals/advances/${row.id}`);
  };

  const getAllAdvancesToApprove = async ({
    page,
    perPage,
  }: {
    page: number;
    perPage: number;
  }) => {
    try {
      const res: any = await AdvanceService.getAdvanceToApprove({
        page,
        perPage,
      });
      setAllRows(res.data.data);
      setAllPagination(res.data.pagination);
    } catch (error) {
      console.log(error);
    }
  };

  const getPendingAdvancesToApprove = async ({
    page,
    perPage,
  }: {
    page: number;
    perPage: number;
  }) => {
    try {
      const res: any = await AdvanceService.getAdvanceToApproveByStatus({
        status: "IN_PROGRESS",
        page,
        perPage,
      });
      setPendingRows(res.data.data);
      setPendingPagination(res.data.pagination);
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
      const res: any = await AdvanceService.getAdvanceToApproveByStatus({
        status: "APPROVED,REJECTED",
        page,
        perPage,
      });
      setProcessedRows(res.data.data);
      setProcessedPagination(res.data.pagination);
    } catch (error) {
      console.log(error);
    }
  };

  const fetchData = async (page: number, perPage: number) => {
    try {
      setLoading(true);
      await Promise.all([
        getAllAdvancesToApprove({
          page,
          perPage,
        }),
        getPendingAdvancesToApprove({
          page,
          perPage,
        }),
        getProcessedAdvances({
          page,
          perPage,
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
      fetchData(paginationModel.page + 1, paginationModel.pageSize);
    }
    setRowSelection({ type: "include", ids: new Set() });
  }, [paginationModel?.page, paginationModel?.pageSize]);

  const rowCount =
    activeTab === "all"
      ? allPagination?.total
      : activeTab === "pending"
        ? pendingPagination?.total
        : processedPagination?.total || 0;

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
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        onRowClick={onRowClick}
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

export default ApprovalsAdvancesPage;
