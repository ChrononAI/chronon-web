import CustomNoRows from "@/components/shared/CustomNoRows";
import SkeletonLoaderOverlay from "@/components/shared/SkeletonLoaderOverlay";
import { Button } from "@/components/ui/button";
import { policyRulesService } from "@/services/admin/policyRulesService";
import { useCategoryLimitStore } from "@/store/admin/categoryLimitStore";
import { Box } from "@mui/material";
import { DataGrid, GridColDef, GridPaginationModel, GridRowSelectionModel } from "@mui/x-data-grid";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const columns: GridColDef[] = [
  {
    field: "name",
    headerName: "NAME",
    minWidth: 160,
    flex: 1,
  },
  {
    field: "description",
    headerName: "DESCRIPTION",
    minWidth: 200,
    flex: 1,
  },
  {
    field: "created_by",
    headerName: "CREATED BY",
    flex: 1,
    minWidth: 150,
    renderCell: ({ value }) => {
      return value.email;
    },
  },
];

function CategoryLimitPage() {
  const navigate = useNavigate();
  const { setSelectedLimit } = useCategoryLimitStore();

  const [loading, setLoading] = useState(true);
  const [rowSelection, setRowSelection] = useState<GridRowSelectionModel>({ type: "include", ids: new Set() });
  const [policyRules, setPolicyRules] = useState([]);

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

  const getPolicyRules = async () => {
    try {
      setLoading(true);
      const res = await policyRulesService.getPolicyRules();
      setPolicyRules(res.data.data);
    } catch (error: any) {
      console.log(error);
      toast.error(
        error?.response?.data.message ||
        error.message ||
        "Failed to get policy rules"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = ({ row }: any) => {
    setSelectedLimit(row);
    navigate(`/admin-settings/product-config/category-limits/${row.id}`);
  };

  useEffect(() => {
    getPolicyRules();
  }, []);

  useEffect(() => {
    setRowSelection({ type: "include", ids: new Set() });
  }, [paginationModel?.page, paginationModel?.pageSize]);

  return (
    <div>
      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Category Limits</h1>
        <Button
          onClick={() =>
            navigate("/admin-settings/product-config/category-limits/create")
          }
        >
          <Plus className="mr-2 h-4 w-4" />
          Category Limits
        </Button>
      </div>
      <Box
        sx={{
          height: "calc(100vh - 100px)",
          width: "100%",
        }}
      >
        <DataGrid
          className="rounded border-[0.2px] border-[#f3f4f6] h-full"
          columns={columns}
          rows={loading ? [] : policyRules}
          loading={loading}
          slots={{
            noRowsOverlay: () => <CustomNoRows title="No rules found" description="There are currently no rules" />,
            loadingOverlay: () => <SkeletonLoaderOverlay rowCount={paginationModel.pageSize} />
          }}
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
          disableRowSelectionOnClick
          showCellVerticalBorder
          onRowClick={handleRowClick}
          rowSelectionModel={rowSelection}
          onRowSelectionModelChange={setRowSelection}
          pagination
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
        />
      </Box>
    </div>
  );
}

export default CategoryLimitPage;
