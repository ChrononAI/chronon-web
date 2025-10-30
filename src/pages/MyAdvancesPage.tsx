import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { ReportsPageWrapper } from '@/components/reports/ReportsPageWrapper';
import { DataGrid, GridColDef, GridPaginationModel, GridRowModel } from '@mui/x-data-grid';
import { Box } from '@mui/material';
import { formatDate, getStatusColor } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { AdvanceService } from '@/services/advanceService';
import { useAdvanceStore } from '@/store/advanceStore';
import { PaginationInfo } from '@/store/expenseStore';

export function MyAdvancesPage() {
  const navigate = useNavigate();
  const { setSelectedAdvance } = useAdvanceStore();
  const loading = false;

  const [activeTab, setActiveTab] = useState<"all" | "pending" | "approved">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();

  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 10,
  });

  const statusOptions = [
    { value: "all", label: "All" },
    { value: "PENDING", label: "Pending" },
    { value: "APPROVED", label: "approved" }
  ];

  const handleRowClick = ({ row }: GridRowModel) => {
    setSelectedAdvance(row);
    navigate(`/advances/${row.id}`);
  }

  const columns: GridColDef[] = [
    {
      field: "sequence_number",
      headerName: "ADVANCE ID",
      width: 160
    },
    {
      field: "title",
      headerName: "TITLE",
      width: 200
    },
    {
      field: 'policy_name',
      headerName: 'POLICY',
      width: 150,
      renderCell: ({ value }) => {
        return value || 'Not Selected'
      }
    },
    {
      field: 'status',
      headerName: 'STATUS',
      width: 170,
      renderCell: ({ value }) => {
        return (
          <Badge className={getStatusColor(value)}>
            {value.replace('_', ' ')}
          </Badge>
        )
      }
    },
    {
      field: 'created_at',
      headerName: 'CREATED AT',
      width: 150,
      renderCell: ({ value }) => {
        return formatDate(value)
      }
    },
    {
      field: 'description',
      headerName: 'PURPOSE',
      flex: 1,
      minWidth: 150
    }
  ];

  // const [rows, setRows] = useState<any[]>([]);
  const [allRows, setAllRows] = useState<any[]>([]);
  const [allPagination, setAllPagination] = useState<PaginationInfo | null>(null);
  const [pendingRows, setPendingRows] = useState<any[]>([]);
  const [pendingPagination, setPendingPagination] = useState<PaginationInfo | null>(null);
  const [processedRows, setProcessedRows] = useState<any[]>([]);
  const [processedPagination, setProcessedPagination] = useState<PaginationInfo | null>(null);

  const tabs = [
    { key: 'all', label: 'All', count: allPagination?.total || 0 },
    { key: "pending", label: "Pending", count: pendingPagination?.total || 0 },
    { key: "processed", label: "Processed", count: processedPagination?.total || 0 }
  ];

  const rows = activeTab === "all" ? allRows : activeTab === "pending" ? pendingRows : processedRows;

  const getAllAdvances = async ({ page, perPage }: { page: number, perPage: number }) => {
    try {
      const response: any = await AdvanceService.getAllAdvances({ page, perPage });
      setAllRows(response.data.data);
      setAllPagination(response.data.pagination);
    } catch (error) {
      console.log(error);
    }
  };

  const getPendingAdvances = async ({ page, perPage }: {
    page: number;
    perPage: number;
  }) => {
    try {
      const response: any = await AdvanceService.getAdvancesByStatus({ status: "PENDING_APPROVAL", page, perPage });
      setPendingRows(response?.data.data);
      setPendingPagination(response?.data.pagination);
    } catch (error) {
      console.log(error);
    }
  }

  const getProcessedAdvances = async ({ page, perPage }: {
    page: number;
    perPage: number;
  }) => {
    try {
      const response: any = await AdvanceService.getAdvancesByStatus({ status: "APPROVED,REJECTED", page, perPage });
      setProcessedRows(response?.data.data);
      setProcessedPagination(response?.data.pagination);
    } catch (error) {
      console.log(error);
    }
  }

  useEffect(() => {
    getAllAdvances({ page: paginationModel.page + 1, perPage: paginationModel.pageSize });
    getPendingAdvances({ page: paginationModel.page + 1, perPage: paginationModel.pageSize });
    getProcessedAdvances({ page: paginationModel.page + 1, perPage: paginationModel.pageSize });
  }, []);

  if (loading) {
    return (
      <Layout>
        <div>Loading...</div>
      </Layout>
    );
  }

  return (
    <ReportsPageWrapper
      title="Advances"
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={(tabId) => setActiveTab(tabId as "all" | "pending" | "approved")}
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
      createButtonLink="/advances/create"
    >
      <Box sx={{ height: "calc(100vh - 160px)", width: "100%", marginTop: '-32px' }}>
        <DataGrid
          className="rounded border h-full"
          columns={columns}
          rows={rows}
          sx={{
            border: 0,
            "& .MuiDataGrid-columnSeparator": {
              // display: "none",
            },
            "& .MuiDataGrid-columnHeaderTitle": {
              fontWeight: 400,
              fontSize: "14px"
            },
            "& .MuiDataGrid-toolbarContainer": {
              // border: "none"
            },
            "& .MuiDataGrid-row:hover": {
              cursor: "pointer",
              backgroundColor: "#f5f5f5",
            },
            "& .MuiDataGrid-cell:focus, & .MuiDataGrid-columnHeader:focus": {
              outline: "none", // removes blue focus ring
            },
            "& .MuiDataGrid-cell:focus-within": {
              outline: "none",
            },
          }}
          showToolbar
          density="compact"
          checkboxSelection
          disableRowSelectionOnClick
          onRowClick={handleRowClick}
          pagination
          paginationMode='server'
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          rowCount={activeTab === "all" ? allPagination?.total : activeTab === "pending" ? pendingPagination?.total : processedPagination?.total}
          autoPageSize
        />
      </Box>
    </ReportsPageWrapper>
  );
}