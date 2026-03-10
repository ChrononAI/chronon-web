import {
  GridColDef,
  GridPaginationModel,
  GridRowSelectionModel,
  GridRowParams,
} from "@mui/x-data-grid";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { getEntities } from "@/services/admin/entities";
import CustomNoRows from "@/components/shared/CustomNoRows";
import SkeletonLoaderOverlay from "@/components/shared/SkeletonLoaderOverlay";
import { DataTable } from "@/components/shared/DataTable";

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

  const GRID_OFFSET = 190;
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
        <h1 
          className="text-2xl"
          style={{
            fontFamily: "Inter",
            fontWeight: 600,
            fontSize: "24px",
            lineHeight: "100%",
            letterSpacing: "0%",
            color: "#1A1A1A",
          }}
        >
          Entities
        </h1>
        <Button 
          asChild
          style={{
            backgroundColor: "#0D9C99",
            color: "#FFFFFF",
            fontFamily: "Inter",
            fontWeight: 600,
            fontSize: "12px",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#0b8a87";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "#0D9C99";
          }}
        >
          <Link to="/admin-settings/entities/create">
            <Plus className="mr-2 h-4 w-4" />
            CREATE
          </Link>
        </Button>
      </div>
      <DataTable
        rows={loading ? [] : rows}
        columns={columns}
        loading={loading}
        height="calc(100vh - 120px)"
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        onRowClick={handleRowClick}
        emptyStateComponent={
          <CustomNoRows title="No entities found" description="There are currently no entities." />
        }
        slots={{
          loadingOverlay: () => <SkeletonLoaderOverlay rowCount={paginationModel.pageSize} />
        }}
        checkboxSelection
        rowSelectionModel={rowSelection}
        onRowSelectionModelChange={setRowSelection}
        disableRowSelectionOnClick
      />
    </>
  );
};
