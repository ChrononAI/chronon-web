import CustomCategoryToolbar from "@/components/admin/categories/CustomCategoryToolbar";
import CustomNoRows from "@/components/shared/CustomNoRows";
import SkeletonLoaderOverlay from "@/components/shared/SkeletonLoaderOverlay";
import { Button } from "@/components/ui/button";
import { categoryService } from "@/services/admin/categoryService";
import { PaginationInfo } from "@/store/expenseStore";
import {
  GridColDef,
  GridPaginationModel,
  GridRowSelectionModel,
} from "@mui/x-data-grid";
import { DataTable } from "@/components/shared/DataTable";
import { Plus } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { buildBackendQuery, FilterMap } from "../MyExpensesPage";
import { useCaetgoryStore } from "@/store/admin/categoryStore";
import { toast } from "sonner";

const columns: GridColDef[] = [
  {
    field: "name",
    headerName: "NAME",
    minWidth: 200,
    flex: 1,
  },
  {
    field: "category_type",
    headerName: "TYPE",
    minWidth: 200,
    flex: 1,
  },
  {
    field: "description",
    headerName: "DESCRIPTION",
    flex: 1,
    minWidth: 200,
  },
];

function AdminExpenseCategories() {
  const navigate = useNavigate();
  const { query } = useCaetgoryStore();
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [rowSelection, setRowSelection] = useState<GridRowSelectionModel>({ type: "include", ids: new Set() });
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const GRID_OFFSET = 220;
  const ROW_HEIGHT = 38;
  const HEADER_HEIGHT = 56;

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

  const handleRowClick = ({ row }: any) => {
    console.log(row);
    navigate(`/admin-settings/product-config/expense-categories/create/${row.id}`, { state: row });
  };

  const fetchFilteredCategories = useCallback(
    async ({ signal }: { signal: AbortSignal }) => {
      const limit = paginationModel?.pageSize ?? 10;
      const offset = (paginationModel?.page ?? 0) * limit;

      let newQuery: FilterMap = query;

      const res = await categoryService.getFilteredCategories({
        query: buildBackendQuery(newQuery),
        limit,
        offset,
        signal,
      });
      setRows(res.data.data);
      setPagination({total: res.data.count});
    },
    [query, paginationModel?.page, paginationModel?.pageSize]
  );

  useEffect(() => {
    setRowSelection({ type: "include", ids: new Set() });
  }, [paginationModel?.page, paginationModel?.pageSize]);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;
      setLoading(true);
      fetchFilteredCategories({ signal: controller.signal })
        .catch((err) => {
          if (err.name !== "AbortError") {
            toast.error(err?.response?.data?.message || err?.message);
            console.error(err);
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setLoading(false);
            setRowSelection({ type: "include", ids: new Set() });
          }
        });
    }, 400);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [fetchFilteredCategories]);

  useEffect(() => {
    setRowSelection({ type: "include", ids: new Set() });
  }, [paginationModel?.page, paginationModel?.pageSize]);

  return (
    <div>
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
          Categories
        </h1>
        <Button
          onClick={() =>
            navigate("/admin-settings/product-config/expense-categories/create")
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
          Add Categories
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
        rowCount={pagination ? pagination.total : 0}
        paginationMode="server"
        emptyStateComponent={
          <CustomNoRows title="No categories found" description="There are currently no categories." />
        }
        slots={{
          toolbar: CustomCategoryToolbar,
          loadingOverlay: () => <SkeletonLoaderOverlay rowCount={paginationModel.pageSize} />
        }}
        showToolbar
        checkboxSelection
        rowSelectionModel={rowSelection}
        onRowSelectionModelChange={setRowSelection}
        disableRowSelectionOnClick
      />
    </div>
  );
}

export default AdminExpenseCategories;
