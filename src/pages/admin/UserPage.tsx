import { useEffect, useMemo, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  DataGrid,
  GridColDef,
  GridPaginationModel,
  GridRowSelectionModel,
  GridRowParams,
} from "@mui/x-data-grid";
import { Download, Plus } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { toast } from "sonner";
import { getOrgIdFromToken } from "@/lib/jwtUtils";
import { bulkUploadService } from "@/services/admin/bulkUploadService";
import { getTemplates } from "@/services/admin/templates";
import { Box } from "@mui/material";
import CustomNoRows from "@/components/shared/CustomNoRows";
import SkeletonLoaderOverlay from "@/components/shared/SkeletonLoaderOverlay";
import CustomUsersToolbar from "@/components/admin/CustomUsersToolbar";
import { useUsersStore } from "@/store/admin/usersStore";
import { Badge } from "@/components/ui/badge";

type APIUser = {
  id?: string | number;
  email?: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  is_active: boolean;
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
  is_active: boolean;
  status?: string;
  [entityKey: string]: string | boolean | undefined;
};

const UserPage = () => {
  const navigate = useNavigate();
  const { setSelectedUsers } = useUsersStore();
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [entityCols, setEntityCols] = useState<any>([]);
  const [rowCount, setRowCount] = useState<number>(0);
  const [rowSelection, setRowSelection] = useState<GridRowSelectionModel>({
    type: "include",
    ids: new Set(),
  });

  const GRID_OFFSET = 190;
  const ROW_HEIGHT = 38;
  const HEADER_HEIGHT = 56;

  const calculatePageSize = () => {
    const availableHeight = window.innerHeight - GRID_OFFSET - HEADER_HEIGHT;
    return Math.max(1, Math.floor(availableHeight / ROW_HEIGHT));
  };

  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: calculatePageSize(),
  });

  const baseColumns = useMemo<GridColDef<UserRow>[]>(
    () => [
      { field: "name", headerName: "NAME", minWidth: 240, flex: 1 },
      { field: "email", headerName: "EMAIL", minWidth: 260, flex: 1 },
      { field: "role", headerName: "ROLE", minWidth: 160, flex: 1 },
      { field: "phone", headerName: "PHONE", minWidth: 200, flex: 1 },
      {
        field: "is_active",
        headerName: "STATUS",
        minWidth: 120,
        flex: 1,
        renderCell: ({ value }) => {
          return (
            <Badge
              className={
                value
                  ? "bg-green-100 text-green-800 hover:bg-green-100"
                  : "bg-gray-100 text-gray-800 hover:bg-gray-100"
              }
            >
              {value ? "ACTIVE" : "INACTIVE"}
            </Badge>
          );
        },
      },
    ],
    []
  );

  const templatesLoadedRef = useRef(false);

  const getTemps = async () => {
    if (templatesLoadedRef.current) return;
    try {
      templatesLoadedRef.current = true;
      const res = await getTemplates();
      const selectedEntities = res.find(
        (p) => p.module_type === "user"
      )?.entities;
      const uniqueEntities = Array.from(
        new Map(selectedEntities?.map((e) => [e.entity_id, e])).values()
      );
      if (uniqueEntities) {
        const cols = uniqueEntities.map((ent) => {
          return {
            field: ent.field_name,
            headerName: ent.display_name,
            minWidth: 120,
            flex: 1,
          };
        });
        setEntityCols(cols);
      }
    } catch (error) {
      console.log(error);
      templatesLoadedRef.current = false;
    }
  };

  const columns = useMemo(
    () => [...baseColumns, ...entityCols],
    [baseColumns, entityCols]
  );

  useEffect(() => {
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
          is_active: user.is_active,
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
    setRowSelection({ type: "include", ids: new Set() });
  }, [paginationModel?.page, paginationModel?.pageSize]);

  const handleRowClick = (params: GridRowParams) => {
    const userId = params.id as string | number | undefined;
    if (!userId) return;
    navigate(`/admin-settings/users/${userId}`);
  };

  return (
    <>
      <div className="flex justify-between items-center mb-1">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild>
            <Link to="/admin-settings/users/create">
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
      </div>

      <Box
        sx={{
          height: "calc(100vh - 120px)",
          width: "100%",
        }}
      >
        <DataGrid
          className="rounded border-[0.2px] border-[#f3f4f6] h-full"
          columns={columns}
          rows={loading ? [] : rows}
          loading={loading}
          slots={{
            noRowsOverlay: () => (
              <CustomNoRows
                title="No users found"
                description="There are currently no users."
              />
            ),
            loadingOverlay: () => (
              <SkeletonLoaderOverlay rowCount={paginationModel.pageSize} />
            ),
            toolbar: CustomUsersToolbar,
          }}
          showToolbar
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
            "& .MuiDataGrid-virtualScroller": {
              overflow: loading ? "hidden" : "auto",
            },
            "& .MuiDataGrid-columnHeaders": {
              border: "none",
              borderTop: "none",
              borderBottom: "none",
            },
            "& .MuiDataGrid-row:hover": {
              cursor: "pointer",
              backgroundColor: "#f5f5f5",
            },
            "& .MuiDataGrid-cell": {
              color: "#2E2E2E",
              border: "0.2px solid #f3f4f6",
            },
            "& .MuiDataGrid-cell:focus, & .MuiDataGrid-columnHeader:focus": {
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
          rowSelectionModel={rowSelection}
          onRowSelectionModelChange={(val) => {
            const users = rows.filter((user) => val.ids.has(user.id));
            setSelectedUsers(users);
            setRowSelection(val);
          }}
          disableRowSelectionExcludeModel
          pagination
          paginationMode="server"
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[10, 25, 50, 100]}
          rowCount={rowCount}
          disableRowSelectionOnClick
          onRowClick={handleRowClick}
          showCellVerticalBorder
        />
      </Box>
    </>
  );
};

export default UserPage;
