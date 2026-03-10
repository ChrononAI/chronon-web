import CustomNoRows from "@/components/shared/CustomNoRows";
import SkeletonLoaderOverlay from "@/components/shared/SkeletonLoaderOverlay";
import { Button } from "@/components/ui/button";
import { policyRulesService } from "@/services/admin/policyRulesService";
import { useCategoryLimitStore } from "@/store/admin/categoryLimitStore";
import { GridColDef, GridPaginationModel, GridRowSelectionModel } from "@mui/x-data-grid";
import { DataTable } from "@/components/shared/DataTable";
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
          Category Limits
        </h1>
        <Button
          onClick={() =>
            navigate("/admin-settings/product-config/category-limits/create")
          }
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
          <Plus className="mr-2 h-4 w-4" />
          Category Limits
        </Button>
      </div>
      <DataTable
        rows={loading ? [] : policyRules}
        columns={columns}
        loading={loading}
        height="calc(100vh - 100px)"
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        onRowClick={handleRowClick}
        emptyStateComponent={
          <CustomNoRows title="No rules found" description="There are currently no rules" />
        }
        slots={{
          loadingOverlay: () => <SkeletonLoaderOverlay rowCount={paginationModel.pageSize} />
        }}
        checkboxSelection
        rowSelectionModel={rowSelection}
        onRowSelectionModelChange={setRowSelection}
        disableRowSelectionOnClick
      />
    </div>
  );
}

export default CategoryLimitPage;
