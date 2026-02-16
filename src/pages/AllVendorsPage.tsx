import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  GridColDef,
  GridPaginationModel,
  GridOverlay,
} from "@mui/x-data-grid";
import { InvoicePageWrapper } from "@/components/invoice/InvoicePageWrapper";
import CustomInvoiceToolbar from "@/components/invoice/CustomInvoiceToolbar";
import { vendorService, VendorData } from "@/services/vendorService";
import { toast } from "sonner";
import { FileText } from "lucide-react";
import { DataTable } from "@/components/shared/DataTable";
import { useLayoutStore } from "@/store/layoutStore";

interface VendorRow {
  id: number;
  vendorCode: string;
  vendorName: string;
  gstin: string;
  status: string;
}

function CustomNoRows() {
  return (
    <GridOverlay>
      <div className="w-full">
        <div className="text-center">
          <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No vendors found</h3>
          <p className="text-muted-foreground">
            There are currently no vendors.
          </p>
        </div>
      </div>
    </GridOverlay>
  );
}

export function AllVendorsPage() {
  const navigate = useNavigate();
  const setNoPadding = useLayoutStore((s) => s.setNoPadding);
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [rowsCalculated, setRowsCalculated] = useState(false);
  const [rowCount, setRowCount] = useState(0);
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

  const fetchVendors = async (paginationModel: GridPaginationModel) => {
    try {
      setLoading(true);
      const limit = paginationModel.pageSize;
      const offset = paginationModel.page * limit;
      
      const response = await vendorService.getVendors(limit, offset);
      const apiVendors: VendorData[] = response?.data || [];
      
      const mappedVendors: VendorRow[] = apiVendors.map((vendor) => ({
        id: vendor.id,
        vendorCode: vendor.vendor_code,
        vendorName: vendor.vendor_name,
        gstin: vendor.gstin,
        status: vendor.status,
      }));

      setVendors(mappedVendors);
      setRowCount(response.count);
    } catch (error: any) {
      console.error("Failed to fetch vendors:", error);
      toast.error(error?.response?.data?.message || "Failed to load vendors");
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
    }
  };

  useEffect(() => {
    fetchVendors(paginationModel);
  }, [paginationModel]);

  const handleCreateVendor = () => {
    navigate("/flow/vendors/new");
  };

  const handleRowClick = (params: any) => {
    navigate(`/flow/vendors/${params.row.id}`);
  };

  const columns: GridColDef[] = useMemo(() => {
    return [
      {
        field: "vendorCode",
        headerName: "VENDOR CODE",
        flex: 1,
        minWidth: 140,
        renderCell: (params) => {
          return (
            <div className="flex items-center h-full w-full overflow-hidden">
              <span 
                style={{
                  fontFamily: "Inter",
                  fontWeight: 500,
                  fontSize: "14px",
                  lineHeight: "100%",
                  letterSpacing: "0%",
                  textTransform: "capitalize",
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
          );
        },
      },
      {
        field: "vendorName",
        headerName: "VENDOR NAME",
        flex: 1.4,
        minWidth: 200,
        renderCell: (params) => {
          return (
            <div className="flex items-center h-full w-full overflow-hidden">
              <span 
                style={{
                  fontFamily: "Inter",
                  fontWeight: 500,
                  fontSize: "14px",
                  lineHeight: "100%",
                  letterSpacing: "0%",
                  textTransform: "capitalize",
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
          );
        },
      },
      {
        field: "gstin",
        headerName: "GSTIN",
        flex: 1,
        minWidth: 140,
        renderCell: (params) => {
          return (
            <div className="flex items-center h-full">
              <span className="text-sm">{params.value}</span>
            </div>
          );
        },
      },
      {
        field: "status",
        headerName: "STATUS",
        flex: 1,
        minWidth: 120,
        renderCell: (params) => {
          return (
            <div className="flex items-center h-full">
              <span className="text-sm">{params.value}</span>
            </div>
          );
        },
      },
    ];
  }, []);

  return (
    <>
      <InvoicePageWrapper
        title="Vendors"
        showCreateButton={false}
        showFilters={false}
        showDateFilter={false}
        marginBottom="mb-0"
      >
        <DataTable
          rows={loading && isInitialLoad ? [] : vendors}
          columns={columns}
          loading={loading}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          onRowClick={handleRowClick}
          firstColumnField="vendorCode"
          emptyStateComponent={<CustomNoRows />}
          rowCount={rowCount}
          paginationMode="server"
          slots={{
            toolbar: CustomInvoiceToolbar,
          }}
          slotProps={{
            toolbar: {
              onFilterClick: () => {
                // Handle filter click
              },
              onShareClick: () => {
                // Handle share click
              },
              onDownloadClick: () => {
                // Handle download click
              },
              onCreateClick: handleCreateVendor,
              createButtonText: "Create Vendor",
            } as any,
          }}
          showToolbar
        />
      </InvoicePageWrapper>
    </>
  );
}

