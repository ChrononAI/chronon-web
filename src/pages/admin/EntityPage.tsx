import { DataGrid, GridColDef, GridOverlay } from "@mui/x-data-grid";
import { Button } from "@/components/ui/button";
import { CheckCircle, Plus } from "lucide-react";
import { Link } from "react-router-dom";
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
          <h3 className="text-lg font-semibold mb-2">No advances found</h3>
          <p className="text-muted-foreground">
            There are currently no advances.
          </p>
        </div>
      </Box>
    </GridOverlay>
  );
}

export const EntityPage = () => {
  const [rows, setRows] = useState<EntityRow[]>([]);
  const columns: GridColDef<EntityRow>[] = [
    { field: "entity_name", headerName: "ENTITY NAME", width: 300 },
    { field: "description", headerName: "DESC", width: 300 },
    { field: "type", headerName: "TYPE", width: 300 },
    { field: "value", headerName: "VALUE", width: 300 },
  ];

  useEffect(() => {
    const load = async () => {
      try {
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
      }
    };
    load();
  }, []);
  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Entities</h1>
        <Button asChild>
          <Link to="/admin/entities/create">
            <Plus className="mr-2 h-4 w-4" />
            CREATE
          </Link>
        </Button>
      </div>

      <div className="bg-gray-100 rounded-md p-4 mb-6">
        <p className="text-sm text-gray-600">
          Setup custom entities required to be allocated to users, expenses,
          transaction etc. These entities can be used for workflows, accounting
          or any custom purposes.
        </p>
      </div>

      <DataGrid
        className="rounded border-[0.2px] border-[#f3f4f6] h-full"
        columns={columns}
        rows={rows}
        slots={{ noRowsOverlay: CustomNoRows }}
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
        showToolbar
        density="compact"
        checkboxSelection
        disableRowSelectionOnClick
        showCellVerticalBorder
      />
    </>
  );
};
