import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Box, useTheme, useMediaQuery } from "@mui/material";
import {
  DataGrid,
  GridColDef,
  GridPaginationModel,
  GridOverlay,
} from "@mui/x-data-grid";
import { InvoicePageWrapper } from "@/components/invoice/InvoicePageWrapper";
import CustomInvoiceToolbar from "@/components/invoice/CustomInvoiceToolbar";
import { vendorService, VendorData } from "@/services/vendorService";
import { toast } from "sonner";
import { FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
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
      <Box className="w-full">
        <div className="text-center">
          <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No vendors found</h3>
          <p className="text-muted-foreground">
            There are currently no vendors.
          </p>
        </div>
      </Box>
    </GridOverlay>
  );
}

export function AllVendorsPage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.between("sm", "md"));
  const setNoPadding = useLayoutStore((s) => s.setNoPadding);
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    fetchVendors();
  }, []);

  useEffect(() => {
    const calculatePageSize = () => {
      const headerHeight = 80;
      const paginationHeight = 52;
      const padding = 48;
      const gridHeight = window.innerHeight - headerHeight - paginationHeight - padding;
      const rowHeight = 41;
      const calculatedPageSize = Math.floor(gridHeight / rowHeight);
      const pageSize = isMobile ? 10 : isTablet ? 15 : Math.max(calculatedPageSize, 10);
      setPaginationModel((prev) => ({ ...prev, pageSize }));
    };

    if (!rowsCalculated) {
      calculatePageSize();
      setRowsCalculated(true);
    }

    window.addEventListener("resize", calculatePageSize);
    return () => window.removeEventListener("resize", calculatePageSize);
  }, [isMobile, isTablet, rowsCalculated]);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const response = await vendorService.getVendors();
      const apiVendors: VendorData[] = response?.data || [];
      
      const mappedVendors: VendorRow[] = apiVendors.map((vendor) => ({
        id: vendor.id,
        vendorCode: vendor.vendor_code,
        vendorName: vendor.vendor_name,
        gstin: vendor.gstin,
        status: vendor.status,
      }));

      setVendors(mappedVendors);
    } catch (error: any) {
      console.error("Failed to fetch vendors:", error);
      toast.error(error?.response?.data?.message || "Failed to load vendors");
    } finally {
      setLoading(false);
    }
  };

  const filtered = vendors;

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
        <Box
          sx={{
            height: "calc(100vh - 160px)",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            paddingLeft: "10px",
          }}
        >
          <DataGrid
            className="rounded h-full"
            rows={filtered}
            columns={columns}
            loading={loading}
            getRowHeight={() => 41}
            slots={{
              noRowsOverlay: CustomNoRows,
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
            sx={{
              "& .MuiDataGridToolbar-root": {
                paddingLeft: "0",
                paddingRight: "0",
                width: "100%",
                justifyContent: "start",
              },
              "& .MuiDataGridToolbar": {
                justifyContent: "start",
                border: "none !important",
                paddingLeft: "0",
                paddingRight: "0",
              },
              border: 0,
              outline: "none",
              "& .MuiDataGrid-root": {
                border: "none",
                outline: "none",
              },
              "& .MuiDataGrid-columnHeaderTitle": {
                fontFamily: "Inter",
                fontWeight: 600,
                fontSize: "12px",
                lineHeight: "100%",
                letterSpacing: "0%",
                textTransform: "uppercase",
                color: "#8D94A2",
              },
              "& .MuiDataGrid-main": {
                border: "none",
                outline: "none",
              },
              "& .MuiDataGrid-columnHeader": {
                backgroundColor: "transparent",
                border: "none",
                borderTop: "none",
                borderBottom: "0.7px solid #EBEBEB",
                borderLeft: "none",
                borderRight: "none",
                outline: "none",
                height: "39px",
                minHeight: "39px",
                maxHeight: "39px",
                paddingTop: "12px",
                paddingRight: "18px",
                paddingBottom: "12px",
                paddingLeft: "18px",
              },
              "& .MuiDataGrid-columnHeader[data-field='vendorCode']": {
                paddingLeft: "12px",
              },
              "& .MuiDataGrid-columnHeaders": {
                border: "none",
                borderTop: "none",
                borderBottom: "none",
                outline: "none",
              },
              "& .MuiDataGrid-columnHeader:focus": {
                outline: "none",
              },
              "& .MuiDataGrid-columnHeader:focus-within": {
                outline: "none",
              },
              "& .MuiDataGrid-row": {
                height: "41px",
                minHeight: "41px",
                maxHeight: "41px",
                borderBottom: "0.7px solid #EBEBEB",
              },
              "& .MuiDataGrid-row:hover": {
                cursor: "pointer",
                backgroundColor: "#f5f5f5",
              },
              "& .MuiDataGrid-cell": {
                color: "#1A1A1A",
                border: "none",
                borderBottom: "0.7px solid #EBEBEB",
                paddingTop: "12px",
                paddingRight: "18px",
                paddingBottom: "12px",
                paddingLeft: "18px",
                fontFamily: "Inter",
                fontWeight: 500,
                fontSize: "14px",
                lineHeight: "100%",
                letterSpacing: "0%",
                textTransform: "capitalize",
              },
              "& .MuiDataGrid-cell[data-field='vendorCode']": {
                paddingLeft: "12px",
              },
              "& .MuiDataGrid-cellContent": {
                fontFamily: "Inter",
                fontWeight: 500,
                fontSize: "14px",
                lineHeight: "100%",
                letterSpacing: "0%",
                textTransform: "capitalize",
                color: "#1A1A1A",
              },
              "& .MuiDataGrid-cell > *": {
                fontFamily: "Inter",
                fontWeight: 500,
                fontSize: "14px",
                lineHeight: "100%",
                letterSpacing: "0%",
                textTransform: "capitalize",
                color: "#1A1A1A",
              },
              "& .MuiDataGrid-cell:focus, & .MuiDataGrid-columnHeader:focus": {
                outline: "none",
              },
              "& .MuiDataGrid-cell:focus-within": {
                outline: "none",
              },
              "& .MuiDataGrid-columnSeparator": {
                display: "none",
              },
              "& .MuiDataGrid-columnsContainer": {
                gap: "10px",
              },
              "& .MuiDataGrid-footerContainer": {
                borderTop: "0.7px solid #EBEBEB",
                minHeight: "52px",
              },
            }}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            density="compact"
            disableRowSelectionOnClick
            onRowClick={handleRowClick}
            showCellVerticalBorder={false}
            autoHeight={false}
            showToolbar
          />
        </Box>
      </InvoicePageWrapper>
    </>
  );
}

