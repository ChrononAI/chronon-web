import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { DataGrid, GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import { Download, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { toast } from "sonner";
import { getOrgIdFromToken } from "@/lib/jwtUtils";
import { ReportTabs } from "@/components/reports/ReportTabs";
import { bulkUploadService } from "@/services/admin/bulkUploadService";
import { getTemplates } from "@/services/admin/templates";
import { Box } from "@mui/material";

type APIUser = {
  id?: string | number;
  email?: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  role?: string;
  status?: string;
  entity_assignments: Record<string, string | undefined>;
};

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  status?: string;
  [entityKey: string]: string | undefined;
};

const TABS = [
  { key: "userAll", label: "User All", count: 0 },
  { key: "templateUser", label: "Template User", count: 0 },
];

const UserPage = () => {
  const [activeTab, setActiveTab] = useState<"userAll" | "templateUser">(
    "userAll"
  );
  const [rows, setRows] = useState<UserRow[]>([]);
  const [templateRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [paginationModel, setPaginationModel] =
    useState<GridPaginationModel | null>(null);
  const [entityCols, setEntityCols] = useState<any>([]);
  const [rowCount, setRowCount] = useState<number>();
  const [templateRowCount] = useState(0);

  const baseColumns = useMemo<GridColDef<UserRow>[]>(
    () => [
      { field: "name", headerName: "NAME", width: 240 },
      { field: "email", headerName: "EMAIL", width: 260 },
      { field: "role", headerName: "ROLE", width: 160 },
      { field: "phone", headerName: "PHONE", width: 200 },
      { field: "status", headerName: "STATUS", width: 160 },
    ],
    []
  );

  const buildColumns = () => {
    return [...baseColumns, ...entityCols];
  };

  const getTemps = async () => {
    try {
      const res = await getTemplates();
      const selectedEntities = res.find(
        (p) => p.module_type === "user"
      )?.entities;
      if (selectedEntities) {
        const cols = selectedEntities.map((ent) => {
          return {
            field: ent.field_name,
            headerName: ent.display_name,
            width: 160,
          };
        });
        setEntityCols(cols);
      }
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    const gridHeight = window.innerHeight - 360;
    const rowHeight = 36;
    const calculatedPageSize = Math.floor(gridHeight / rowHeight);
    setPaginationModel({ page: 0, pageSize: calculatedPageSize });
    getTemps();
  }, []);

  const handleBulkUserDownload = async () => {
    try {
      await bulkUploadService.downloadUsersData();
    } catch (error: any) {
      console.log(error);
      toast.error(error?.response?.data?.message || error.message);
    }
  };

  const loadUsers = async (paginationModel: GridPaginationModel) => {
    setLoading(true);
    try {
      const orgId = getOrgIdFromToken();
      if (!orgId) {
        toast.error("Organization ID not found");
        setRows([]);
        return;
      }
      const limit = paginationModel?.pageSize;
      const offset = paginationModel?.page * limit;
      const response = await api.get(
        `/auth/em/users?org_id=${orgId}&limit=${limit}&offset=${offset}`
      );
      setRowCount(response.data.count);
      const users: APIUser[] = response.data?.data || [];
      const mappedRows: UserRow[] = users.map((user, index) => {
        const id = user.id ?? index;
        const firstName = user.first_name?.trim() || "";
        const lastName = user.last_name?.trim() || "";
        const fullName = `${firstName} ${lastName}`.trim();

        return {
          id: String(id),
          name: fullName || user.email || `User ${index + 1}`,
          email: user.email || "-",
          role: (user.role || "-").toUpperCase(),
          phone: user.phone_number || "-",
          status: user.status || "-",
          ...user.entity_assignments,
        };
      });
      setRows(mappedRows);
    } catch (error) {
      console.error("Failed to load users:", error);
      toast.error("Failed to load users");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (paginationModel) {
      loadUsers(paginationModel);
    }
  }, [paginationModel?.page, paginationModel?.pageSize]);

  const columns = buildColumns();

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-sm text-gray-600 mt-1">
            View and manage the users in your organization.
          </p>
        </div>
        {activeTab === "userAll" && (
          <div className="flex items-center gap-2">
            <Button asChild>
              <Link to="/admin/users/create">
                <Plus className="mr-2 h-4 w-4" />
                CREATE
              </Link>
            </Button>
            <Button
              className="bg-transparent hover:bg-transparent text-gray-600"
              onClick={handleBulkUserDownload}
            >
              <Download className="mr-2 h-4 w-4" />
              Download Users Data
            </Button>
          </div>
        )}
      </div>

      <ReportTabs
        className="mb-6"
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab as typeof activeTab)}
        tabs={TABS}
      />

      {activeTab === "userAll" && (
        <>
          <div className="bg-gray-100 rounded-md p-4 mb-6">
            <p className="text-sm text-gray-600">
              Review user access and create new users to grant access to
              Chronon.
            </p>
          </div>
          <Box
            sx={{
              height: "calc(100vh - 232px)",
              width: "100%",
              marginTop: "-32px",
            }}
          >
            <DataGrid
              className="rounded border-[0.2px] border-[#f3f4f6] h-full"
              columns={columns}
              rows={rows}
              loading={loading}
              sx={{
                border: 0,
                "& .MuiDataGrid-columnHeaderTitle": {
                  color: "#9AA0A6",
                  fontWeight: "bold",
                  fontSize: "12px",
                },
                "& .MuiDataGrid-main": {
                  border: "0.2px solid #f3f4f6",
                },
                "& .MuiDataGrid-columnHeader": {
                  backgroundColor: "#f3f4f6",
                  border: "none",
                },
                "& .MuiDataGrid-columnHeaders": {
                  border: "none",
                  borderTop: "none",
                  borderBottom: "none",
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
                  border: "0.2px solid #f3f4f6",
                },
                "& .MuiDataGrid-cell:focus, & .MuiDataGrid-columnHeader:focus":
                  {
                    outline: "none",
                  },
                "& .MuiDataGrid-cell:focus-within": {
                  outline: "none",
                },
                "& .MuiDataGrid-columnSeparator": {
                  color: "#f3f4f6",
                },
              }}
              density="compact"
              checkboxSelection
              showToolbar
              pagination
              paginationMode="server"
              paginationModel={paginationModel || { page: 0, pageSize: 0 }}
              onPaginationModelChange={setPaginationModel}
              rowCount={rowCount}
              disableRowSelectionOnClick
              showCellVerticalBorder
            />
          </Box>
        </>
      )}

      {activeTab === "templateUser" && (
        <div>
          <div className="bg-gray-100 rounded-md p-4 mb-6">
            <p className="text-sm text-gray-600">
              Configure template users. This view mirrors the user listing UI
              for preview purposes.
            </p>
          </div>
          <Box
            sx={{
              height: "calc(100vh - 232px)",
              width: "100%",
              marginTop: "-32px",
            }}
          >
            <DataGrid
              className="rounded border-[0.2px] border-[#f3f4f6] h-full"
              columns={columns}
              rows={templateRows}
              sx={{
                border: 0,
                "& .MuiDataGrid-columnHeaderTitle": {
                  color: "#9AA0A6",
                  fontWeight: "bold",
                  fontSize: "12px",
                },
                "& .MuiDataGrid-main": {
                  border: "0.2px solid #f3f4f6",
                },
                "& .MuiDataGrid-columnHeader": {
                  backgroundColor: "#f3f4f6",
                  border: "none",
                },
                "& .MuiDataGrid-columnHeaders": {
                  border: "none",
                  borderTop: "none",
                  borderBottom: "none",
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
                  border: "0.2px solid #f3f4f6",
                },
                "& .MuiDataGrid-cell:focus, & .MuiDataGrid-columnHeader:focus":
                  {
                    outline: "none",
                  },
                "& .MuiDataGrid-cell:focus-within": {
                  outline: "none",
                },
                "& .MuiDataGrid-columnSeparator": {
                  color: "#f3f4f6",
                },
              }}
              density="compact"
              checkboxSelection
              pagination
              paginationMode="server"
              paginationModel={paginationModel || { page: 0, pageSize: 0 }}
              onPaginationModelChange={setPaginationModel}
              rowCount={templateRowCount}
              showToolbar
              disableRowSelectionOnClick
              showCellVerticalBorder
            />
          </Box>
        </div>
      )}
    </>
  );
};

export default UserPage;
