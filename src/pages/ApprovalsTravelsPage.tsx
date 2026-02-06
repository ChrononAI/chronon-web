import { useCallback, useEffect, useState } from "react";
import { travelService, TravelRequest, TravelResponse } from "@/services/travelService";
import { ReportsPageWrapper } from "@/components/reports/ReportsPageWrapper";
import { Box } from "@mui/material";
import {
  DataGrid,
  GridColDef,
  GridPaginationModel,
} from "@mui/x-data-grid";
import { Badge } from "@/components/ui/badge";
import {
  formatDate,
  getStatusColor,
} from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import CustomNoRows from "@/components/shared/CustomNoRows";

export function ApprovalsTravelsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TravelRequest[]>([]);
  const [pagination, setPagination] = useState({ total: 0 });
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "rejected">("pending");

  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 10,
  });

  const fetchApprovals = useCallback(async () => {
    setLoading(true);
    try {
      const statusMap: Record<string, string> = {
        pending: "IN_PROGRESS",
        approved: "APPROVED",
        rejected: "REJECTED",
      };
      const status = statusMap[activeTab];

      const response: TravelResponse = await travelService.getApprovals({
         page: paginationModel.page + 1,
         limit: paginationModel.pageSize,
         status
      });
      
      setData(response.data || []);
      setPagination({ total: response.count || 0 });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [activeTab, paginationModel]);

  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  const columns: GridColDef[] = [
    {
      field: "trip_name",
      headerName: "Trip Name",
      minWidth: 200,
      flex: 1,
    },
    {
      field: "employee_id",
      headerName: "Employee",
      minWidth: 150,
      flex: 1,
    },
    {
      field: "source",
      headerName: "Source",
      minWidth: 150,
      flex: 1,
    },
    {
      field: "destination",
      headerName: "Destination",
      minWidth: 150,
      flex: 1,
    },
    {
      field: "created_at",
      headerName: "Requested Date",
      minWidth: 150,
      flex: 1,
      valueFormatter: (params: any) => formatDate(params),
    },
    {
        field: "status",
        headerName: "Status",
        minWidth: 150,
        flex: 1,
        renderCell: (params) => (
          <Badge className={getStatusColor(params.value)}>
            {params.value?.replace?.("_", " ") || "UNKNOWN"}
          </Badge>
        ),
    }
  ];

  const tabs = [
    { key: "pending", label: "Pending", count: activeTab === "pending" ? pagination.total : 0 },
    { key: "approved", label: "Approved", count: activeTab === "approved" ? pagination.total : 0 },
    { key: "rejected", label: "Rejected", count: activeTab === "rejected" ? pagination.total : 0 },
  ];

  return (
    <ReportsPageWrapper
      title="Travel Approvals"
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={(tab: string) => setActiveTab(tab as any)}
      showFilters={false}
      showDateFilter={false}
      showCreateButton={false}
      marginBottom="mb-0"
    >
      <Box
        sx={{
          height: "calc(100vh - 160px)",
          width: "100%",
        }}
      >
        <DataGrid
          className="rounded border-[0.2px] border-[#f3f4f6] h-full"
          rows={data}
          columns={columns}
          loading={loading}
          slots={{
            noRowsOverlay: () => (
                <CustomNoRows
                  title={"No approvals found"}
                  description={"You have no travel requests pending approval"}
                />
              ),
          }}
          sx={{
            border: 0,
            "& .MuiDataGrid-columnHeaderTitle": {
              color: "#9AA0A6",
              fontWeight: "bold",
              fontSize: "12px",
            },
            "& .MuiDataGrid-columnHeader": {
              backgroundColor: "#f3f4f6",
              border: "none",
            },
             "& .MuiDataGrid-row:hover": {
              cursor: "pointer",
              backgroundColor: "#f5f5f5",
            },
          }}
          density="compact"
          disableRowSelectionOnClick
          onRowClick={(params) => navigate(`/requests/travels/${params.id}`)}
          pagination
          paginationMode="server"
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          rowCount={pagination.total}
        />
      </Box>
    </ReportsPageWrapper>
  );
}
