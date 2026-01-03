import {
  DataGrid,
  GridColDef,
  GridOverlay,
  GridPaginationModel,
  GridRowSelectionModel,
  GridRowParams,
} from "@mui/x-data-grid";
import { Button } from "@/components/ui/button";
import { CheckCircle, Plus } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { getEntities } from "@/services/admin/entities";
import { Box } from "@mui/material";

type APIEntity = {
  id: string;
  name: string;
  description?: string;
  display_name?: string;
  status?: string;
  type?: string;
  attributes?: {
    id: string;
    value: string;
    display_value: string;
    is_active?: boolean;
  }[];
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  org_id?: string;
};

type EntityRow = {
  id: string;
  entity_name: string;
  description?: string;
  type?: string;
  value?: string;
};

function CustomNoRows() {
  return (
    <GridOverlay>
      <Box className="w-full">
        <div className="text-center">
          <CheckCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No entities found</h3>
          <p className="text-muted-foreground">
            There are currently no entities.
          </p>
        </div>
      </Box>
    </GridOverlay>
  );
}

const columns: GridColDef<EntityRow>[] = [
  { field: "entity_name", headerName: "ENTITY NAME", minWidth: 300, flex: 1 },
  { field: "description", headerName: "DESC", minWidth: 300, flex: 1 },
  { field: "type", headerName: "TYPE", minWidth: 300, flex: 1 },
  { field: "value", headerName: "VALUE", minWidth: 300, flex: 1 },
];

export const EntityPage = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<EntityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [rowSelection, setRowSelection] = useState<GridRowSelectionModel>({
    type: "include",
    ids: new Set(),
  });
  const [paginationModel, setPaginationModel] =
    useState<GridPaginationModel | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const data = await getEntities();
      const mapped: EntityRow[] = data.map((e: APIEntity, idx: number) => ({
        id: e.id || String(idx),
        entity_name: e.name,
        description: e.description,
        type: e.type || e.status,
        value: Array.isArray(e.attributes)
          ? e.attributes.map((a) => a.display_value || a.value).join(", ")
          : e.display_name || "",
      }));
      setRows(mapped);
    } catch (err) {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const gridHeight = window.innerHeight - 300;
    const rowHeight = 36;
    const calculatedPageSize = Math.floor(gridHeight / rowHeight);
    setPaginationModel({ page: 0, pageSize: calculatedPageSize });

    load();
  }, []);

  useEffect(() => {
    setRowSelection({ type: "include", ids: new Set() });
  }, [paginationModel?.page, paginationModel?.pageSize]);

  const handleRowClick = (params: GridRowParams) => {
    const entityId = params.id as string;
    if (!entityId) return;
    navigate(`/admin-settings/entities/${entityId}`);
  };

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Entities</h1>
        <Button asChild>
          <Link to="/admin-settings/entities/create">
            <Plus className="mr-2 h-4 w-4" />
            CREATE
          </Link>
        </Button>
      </div>
{/* 
      <div className="bg-gray-100 rounded-md p-4">
        <p className="text-sm text-gray-600">
          Setup custom entities required to be allocated to users, expenses,
          transaction etc. These entities can be used for workflows, accounting
          or any custom purposes.
        </p>
      </div> */}
      <Box
        sx={{
          height: "calc(100vh - 120px)",
          width: "100%",
        }}
      >
        <DataGrid
          className="rounded border-[0.2px] border-[#f3f4f6] h-full"
          columns={columns}
          rows={rows}
          loading={loading}
          slots={{ noRowsOverlay: CustomNoRows }}
          sx={{
            border: 0,
            "& .MuiDataGrid-columnHeaderTitle": {
              color: "#9AA0A6",
              fontWeight: "bold",
              fontSize: "12px",
            },
            "& .MuiToolbar-root": {
              paddingX: 0,
            },
            "& .MuiDataGrid-panel .MuiSelect-select": {
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
          rowSelectionModel={rowSelection}
          onRowSelectionModelChange={setRowSelection}
          paginationModel={paginationModel || { page: 0, pageSize: 0 }}
          onPaginationModelChange={setPaginationModel}
          density="compact"
          checkboxSelection
          disableRowSelectionOnClick
          onRowClick={handleRowClick}
          showCellVerticalBorder
        />
      </Box>
    </>
  );
};
