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
import { AdminUpdateModal } from "@/components/travel/AdminUpdateModal";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/authStore";
import { Edit } from "lucide-react";

export function TravelListPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TravelRequest[]>([]);
  const [pagination, setPagination] = useState({ total: 0 });
  const [activeTab, setActiveTab] = useState<"all" | "draft" | "approved" | "rejected">("all");
  
  // Admin Modal State
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<TravelRequest | null>(null);

  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 10,
  });

  const fetchTravels = useCallback(async () => {
    setLoading(true);
    try {
      const statusMap: Record<string, string> = {
        draft: "DRAFT",
        approved: "APPROVED",
        rejected: "REJECTED",
      };
      const status = statusMap[activeTab];

      const response: TravelResponse = await travelService.getTravels({
         page: paginationModel.page + 1,
         per_page: paginationModel.pageSize,
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
    fetchTravels();
  }, [fetchTravels]);

  const columns: GridColDef[] = [
    {
      field: "id",
      headerName: "Travel ID",
      minWidth: 150,
      flex: 1,
    },
    {
      field: "trip_name",
      headerName: "Trip Name",
      minWidth: 200,
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
      headerName: "Created Date",
      minWidth: 150,
      flex: 1,
      valueFormatter: (params: any) => params ? formatDate(params) : "-",
    },
    {
        field: "status",
        headerName: "Status",
        minWidth: 150,
        flex: 1,
        renderCell: (params) => (
          <Badge className={getStatusColor(params.value)}>
            {params.value?.replace("_", " ") || "-"}
          </Badge>
        ),
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 100,
      sortable: false,
      renderCell: (params) => {
        if (user?.role === "ADMIN" || user?.role === "SUPER_ADMIN") {
          return (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation(); // Prevent row click navigation
                setSelectedRequest(params.row);
                setShowAdminModal(true);
              }}
            >
              <Edit className="h-4 w-4" />
            </Button>
          );
        }
        return null;
      }
    }
  ];

  const tabs = [
    { key: "all", label: "All", count: activeTab === "all" ? pagination.total : 0 },
    { key: "draft", label: "Drafts", count: activeTab === "draft" ? pagination.total : 0 },
    { key: "approved", label: "Approved", count: activeTab === "approved" ? pagination.total : 0 },
    { key: "rejected", label: "Rejected", count: activeTab === "rejected" ? pagination.total : 0 },
  ];

  return (
    <ReportsPageWrapper
      title="Travel Requests"
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={(tab: string) => setActiveTab(tab as any)}
      showFilters={false}
      showDateFilter={false}
      showCreateButton={true}
      createButtonText="Create Travel Request"
      marginBottom="mb-0"
      createButtonLink="/requests/travels/create"
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
                  title={"No travel requests found"}
                  description={"Create a new travel request to get started"}
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

      {selectedRequest && (
        <AdminUpdateModal
          open={showAdminModal}
          onClose={() => {
            setShowAdminModal(false);
            setSelectedRequest(null);
          }}
          travelId={selectedRequest.id}
          currentData={{
            admin_amount: selectedRequest.admin_amount,
            admin_notes: selectedRequest.admin_notes,
            file_ids: selectedRequest.file_ids,
          }}
          onSuccess={() => {
            fetchTravels();
          }}
        />
      )}
    </ReportsPageWrapper>
  );
}
