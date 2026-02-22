import { useState, useEffect } from "react";
import {
  GridColDef,
  GridPaginationModel,
  GridOverlay,
} from "@mui/x-data-grid";
import { InvoicePageWrapper } from "@/components/invoice/InvoicePageWrapper";
import CustomInvoiceToolbar from "@/components/invoice/CustomInvoiceToolbar";
import { itemsCodeService, ItemData } from "@/services/items/itemsCodeService";
import { toast } from "sonner";
import SkeletonLoaderOverlay from "@/components/shared/SkeletonLoaderOverlay";
import { ItemDialog } from "@/components/items/ItemDialog";
import { GridRowParams } from "@mui/x-data-grid";
import { useLayoutStore } from "@/store/layoutStore";
import { DataTable } from "@/components/shared/DataTable";

function CustomNoRows() {
  return (
    <GridOverlay>
      <div className="w-full">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">No items found</h3>
          <p className="text-muted-foreground">
            There are currently no items.
          </p>
        </div>
      </div>
    </GridOverlay>
  );
}

const columns: GridColDef<ItemData>[] = [
  {
    field: "item_code",
    headerName: "ITEM CODE",
    flex: 1,
    minWidth: 150,
    renderCell: (params) => (
      <div className="flex items-center h-full w-full overflow-hidden">
        <span 
          style={{
            fontFamily: "Inter",
            fontWeight: 500,
            fontSize: "14px",
            lineHeight: "100%",
            letterSpacing: "0%",
            color: "#1A1A1A",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: "100%",
          }}
          title={params.value}
        >
          {params.value}
        </span>
      </div>
    ),
  },
  {
    field: "description",
    headerName: "DESCRIPTION",
    flex: 1,
    minWidth: 200,
    renderCell: (params) => (
      <div className="flex items-center h-full w-full overflow-hidden">
        <span 
          style={{
            fontFamily: "Inter",
            fontWeight: 500,
            fontSize: "14px",
            lineHeight: "100%",
            letterSpacing: "0%",
            color: "#1A1A1A",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: "100%",
          }}
          title={params.value}
        >
          {params.value || "-"}
        </span>
      </div>
    ),
  },
  {
    field: "tax_code",
    headerName: "TAX CODE",
    flex: 1,
    minWidth: 120,
    renderCell: (params) => (
      <div className="flex items-center h-full w-full overflow-hidden">
        <span 
          style={{
            fontFamily: "Inter",
            fontWeight: 500,
            fontSize: "14px",
            lineHeight: "100%",
            letterSpacing: "0%",
            color: "#1A1A1A",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: "100%",
          }}
          title={params.value}
        >
          {params.value || "-"}
        </span>
      </div>
    ),
  },
  {
    field: "hsn_sac_code",
    headerName: "HSN/SAC CODE",
    flex: 1,
    minWidth: 150,
    renderCell: (params) => (
      <div className="flex items-center h-full w-full overflow-hidden">
        <span 
          style={{
            fontFamily: "Inter",
            fontWeight: 500,
            fontSize: "14px",
            lineHeight: "100%",
            letterSpacing: "0%",
            color: "#1A1A1A",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: "100%",
          }}
          title={params.value}
        >
          {params.value || "-"}
        </span>
      </div>
    ),
  },
];

export const ItemsPage = () => {
  const setNoPadding = useLayoutStore((s) => s.setNoPadding);
  const [rows, setRows] = useState<ItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ItemData | null>(null);
  const [rowsCalculated, setRowsCalculated] = useState(false);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 10,
  });

  useEffect(() => {
    setNoPadding(true);
    return () => {
      setNoPadding(false);
    };
  }, [setNoPadding]);

  const [rowCount, setRowCount] = useState(0);

  const loadData = async (paginationModel: GridPaginationModel) => {
    try {
      setLoading(true);
      const limit = paginationModel.pageSize;
      const offset = paginationModel.page * limit;
      
      const response = searchTerm.trim()
        ? await itemsCodeService.searchItems(searchTerm, limit, offset)
        : await itemsCodeService.getItems(limit, offset);
      
      const mappedRows = response.data.map((item) => ({
        ...item,
        id: item.id,
        is_active: item.is_active ?? false,
      }));
      setRows(mappedRows);
      setRowCount(response.count);
    } catch (error: any) {
      console.error("Error loading items:", error);
      toast.error(error?.response?.data?.message || "Failed to load items");
      setRows([]);
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
    }
  };

  useEffect(() => {
    loadData(paginationModel);
  }, [paginationModel, searchTerm]);

  useEffect(() => {
    const calculatePageSize = () => {
      const headerHeight = 80;
      const paginationHeight = 52;
      const padding = 48;
      const gridHeight = window.innerHeight - headerHeight - paginationHeight - padding;
      const rowHeight = 41;
      const calculatedPageSize = Math.floor(gridHeight / rowHeight);
      const pageSize = Math.max(calculatedPageSize, 10);
      setPaginationModel((prev) => ({ ...prev, pageSize }));
    };

    if (!rowsCalculated) {
      calculatePageSize();
      setRowsCalculated(true);
    }

    window.addEventListener("resize", calculatePageSize);
    return () => window.removeEventListener("resize", calculatePageSize);
  }, [rowsCalculated]);

<<<<<<< HEAD
  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return rows;
    const searchLower = searchTerm.toLowerCase();
    return rows.filter(
      (row) =>
        row.item_code?.toLowerCase().includes(searchLower) ||
        row.description?.toLowerCase().includes(searchLower) ||
        row.tax_code?.toLowerCase().includes(searchLower) ||
        row.tds_code?.toLowerCase().includes(searchLower) ||
        row.hsn_sac_code?.toLowerCase().includes(searchLower)
    );
  }, [rows, searchTerm]);
=======
>>>>>>> f59baa283a6320101c10052dfc1352b6cfcd6c2e

  const handleRowClick = (params: GridRowParams<ItemData>) => {
    setSelectedItem(params.row);
    setUpdateDialogOpen(true);
  };

  return (
    <InvoicePageWrapper
      title="Items"
      showCreateButton={false}
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      searchPlaceholder="Search by item code, description, tax code, or HSN/SAC code..."
      showFilters={false}
      showDateFilter={false}
      marginBottom="mb-0"
    >
      <DataTable
        rows={loading && isInitialLoad ? [] : rows}
        columns={columns}
        loading={loading}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        onRowClick={handleRowClick}
        firstColumnField="item_code"
        emptyStateComponent={<CustomNoRows />}
        rowCount={rowCount}
        paginationMode="server"
        slots={{
          toolbar: CustomInvoiceToolbar,
          loadingOverlay:
            loading && isInitialLoad
              ? () => (
                  <SkeletonLoaderOverlay
                    rowCount={paginationModel?.pageSize || 10}
                  />
                )
              : undefined,
        }}
        slotProps={{
          toolbar: {
            searchTerm,
            onSearchChange: setSearchTerm,
            onFilterClick: () => {
              // Handle filter click
            },
            onCreateClick: () => {
              setCreateDialogOpen(true);
            },
            createButtonText: "Create Item",
          } as any,
        }}
        showToolbar
      />
      <ItemDialog
        open={createDialogOpen || updateDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setCreateDialogOpen(false);
            setUpdateDialogOpen(false);
            setSelectedItem(null);
          }
        }}
        onSuccess={() => {
          loadData(paginationModel);
          setSelectedItem(null);
        }}
        item={updateDialogOpen ? selectedItem : null}
      />
    </InvoicePageWrapper>
  );
};

