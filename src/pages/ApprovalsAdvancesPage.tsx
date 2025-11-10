import { useEffect, useState } from "react";
import { ReportsPageWrapper } from "@/components/reports/ReportsPageWrapper";
import { DataGrid, GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import { formatDate, getStatusColor } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { PreApprovalType } from "@/services/preApprovalService";
import { useNavigate } from "react-router-dom";
import { PaginationInfo } from "@/store/expenseStore";
import { useAdvanceStore } from "@/store/advanceStore";
import { AdvanceService } from "@/services/advanceService";
import { Box } from "@mui/material";
import { createTheme, ThemeProvider } from "@mui/material/styles";

const theme = createTheme({
  components: {
    MuiSelect: {
      styleOverrides: {
        select: {
          fontFamily: "Inter, sans-serif",
          fontSize: "12px !important",
        },
      },
    },
  },
});

function ApprovalsAdvancesPage() {
  const navigate = useNavigate();
  const { setSelectedAdvanceToApprove } = useAdvanceStore();

  const columns: GridColDef[] = [
    {
      field: "sequence_number",
      headerName: "PRE APPROVAL ID",
      width: 160,
    },
    {
      field: "title",
      headerName: "TITLE",
      width: 200,
    },
    {
      field: "policy_name",
      headerName: "POLICY",
      width: 150,
    },
    {
      field: "status",
      headerName: "STATUS",
      width: 170,
      renderCell: ({ value }) => {
        return (
          <Badge className={getStatusColor(value)}>
            {value.replace("_", " ")}
          </Badge>
        );
      },
    },
    {
      field: "created_by",
      headerName: "CREATED BY",
      width: 150,
      renderCell: ({ value }) => {
        return value.email;
      },
    },
    {
      field: "created_at",
      headerName: "CREATED AT",
      width: 150,
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

  const [paginationModel, setPaginationModel] =
    useState<GridPaginationModel | null>(null);

  const [activeTab, setActiveTab] = useState<"pending" | "processed" | "all">(
    "all"
  );

  useEffect(() => {
    const gridHeight = window.innerHeight - 300;
    const rowHeight = 36;
    const calculatedPageSize = Math.floor(gridHeight / rowHeight);
    setPaginationModel({ page: 0, pageSize: calculatedPageSize });
  }, [activeTab]);

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

  const onRowClick = ({ row }: { row: PreApprovalType }) => {
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

  useEffect(() => {
    const fetchData = async (page: number, perPage: number) => {
      try {
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
      }
    };
    if (paginationModel) {
      fetchData(paginationModel.page + 1, paginationModel.pageSize);
    }
  }, [paginationModel?.page, paginationModel?.pageSize]);
  return (
    <ReportsPageWrapper
      title="Approver Dashboard"
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={(tabId) =>
        setActiveTab(tabId as "all" | "pending" | "processed")
      }
      showDateFilter={true}
      showFilters={false}
      searchTerm={""}
      onSearchChange={function (): void {
        throw new Error("Function not implemented.");
      }}
    >
      <ThemeProvider theme={theme}>
        <Box
          sx={{
            height: "calc(100vh - 160px)",
            width: "100%",
            marginTop: "-32px",
          }}
        >
          <DataGrid
            className="rounded border h-full"
            columns={columns}
            rows={rows}
            sx={{
              border: 0,
              "& .MuiDataGrid-columnHeaderTitle": {
                color: "#9AA0A6",
                fontWeight: "bold",
                fontSize: "12px",
              },
              "& .MuiDataGrid-main": {
                border: "1px solid #F1F3F4",
              },
              "& .MuiDataGrid-columnHeader": {
                backgroundColor: "#f3f4f6",
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
            onRowClick={onRowClick}
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
      </ThemeProvider>
    </ReportsPageWrapper>
  );
}

export default ApprovalsAdvancesPage;
