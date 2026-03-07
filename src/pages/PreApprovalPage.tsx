import { useEffect, useState } from "react";
import { InvoicePageWrapper } from "@/components/invoice/InvoicePageWrapper";
import { useLayoutStore } from "@/store/layoutStore";
import {
  GridColDef,
  GridPaginationModel,
  GridRowModel,
  GridRowSelectionModel,
} from "@mui/x-data-grid";
import { formatDate } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import {
  preApprovalService,
  PreApprovalType,
} from "@/services/preApprovalService";
import { usePreApprovalStore } from "@/store/preApprovalStore";
import { PaginationInfo } from "@/store/expenseStore";
import SkeletonLoaderOverlay from "@/components/shared/SkeletonLoaderOverlay";
import CustomNoRows from "@/components/shared/CustomNoRows";
import { DataTable } from "@/components/shared/DataTable";
import CustomInvoiceToolbar from "@/components/invoice/CustomInvoiceToolbar";
import { StatusPill } from "@/components/shared/StatusPill";

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
      return <StatusPill status={value} />;
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
  const [loading, setLoading] = useState<boolean>(true);
  const setNoPadding = useLayoutStore((s) => s.setNoPadding);

  useEffect(() => {
    setNoPadding(true);
    return () => {
      setNoPadding(false);
    };
  }, [setNoPadding]);

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
  const [rowSelection, setRowSelection] = useState<GridRowSelectionModel>({ type: "include", ids: new Set() })
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
    setRowSelection({ type: "include", ids: new Set() });
  }, [paginationModel.page, paginationModel.pageSize]);

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
      title="Pre Approval"
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
            title="No pre approvals found"
            description="There are currently no pre approvals."
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
            onCreateClick: () => navigate("/requests/pre-approvals/create"),
            createButtonText: "Create Pre Approval",
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

export default PreApprovalPage;
