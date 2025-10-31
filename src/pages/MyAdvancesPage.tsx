import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ReportsPageWrapper } from '@/components/reports/ReportsPageWrapper';
import { DataGrid, GridColDef, GridOverlay, GridPaginationModel, GridRowModel } from '@mui/x-data-grid';
import { Box, CircularProgress } from '@mui/material';
import { formatDate, getStatusColor } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { AdvanceService } from '@/services/advanceService';
import { useAdvanceStore } from '@/store/advanceStore';
import { PaginationInfo } from '@/store/expenseStore';
import { CheckCircle } from 'lucide-react';

function CustomLoader() {
  return (
    <GridOverlay>
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(255,255,255,0.6)',
        }}
      >
        <CircularProgress size={28} thickness={4} />
      </Box>
    </GridOverlay>
  );
}

function CustomNoRows() {
  return (
    <GridOverlay>
      <Box className='w-full'><div className="text-center">
          <CheckCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            No advances found
          </h3>
          <p className="text-muted-foreground">
          There are currently no expenses.
          </p>
        </div></Box>
    </GridOverlay>
  );
}


export function MyAdvancesPage() {
  const navigate = useNavigate();
  const { setSelectedAdvance } = useAdvanceStore();

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

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        await Promise.all([
          getAllAdvances({ page: paginationModel.page + 1, perPage: paginationModel.pageSize }),
          getPendingAdvances({ page: paginationModel.page + 1, perPage: paginationModel.pageSize }),
          getProcessedAdvances({ page: paginationModel.page + 1, perPage: paginationModel.pageSize }),
        ]);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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
      <Box sx={{ height: "calc(100vh - 160px)", width: "100%", marginTop: '-32px', color: '#2E2E2E' }}>
        <DataGrid
          className="rounded border border-[#F1F3F4] h-full"
          columns={columns}
          rows={rows}
          loading={loading}
          slots={{
            loadingOverlay: CustomLoader,
            noRowsOverlay: CustomNoRows   
          }}
          sx={{
            border: 0,
            "& .MuiDataGrid-columnHeaderTitle": {
              color: '#9AA0A6',
              fontWeight: 505,
              fontSize: "14px"
            },
            "& .MuiDataGrid-main": {
              border: '1px solid #F1F3F4'
            },
            "& .MuiDataGrid-columnHeader": {
              backgroundColor: '#f3f4f6'
            },
            "& .MuiCheckbox-root": {
              color: '#9AA0A6'
            },
            "& .MuiDataGrid-row:hover": {
              cursor: "pointer",
              backgroundColor: "#f5f5f5",
            },
            "& .MuiDataGrid-cell": {
              color: '#2E2E2E'
            },
            "& .MuiDataGrid-cell:focus, & .MuiDataGrid-columnHeader:focus": {
              outline: "none",
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