import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Box } from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { ReportsPageWrapper } from "@/components/reports/ReportsPageWrapper";
import { vendorService, VendorData } from "@/services/vendorService";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface VendorRow {
  id: number;
  vendorCode: string;
  vendorName: string;
  gstin: string;
  status: string;
}

const columns: GridColDef[] = [
  { field: "vendorCode", headerName: "VENDOR CODE", flex: 1, minWidth: 140 },
  { field: "vendorName", headerName: "VENDOR NAME", flex: 1.4, minWidth: 200 },
  { field: "gstin", headerName: "GSTIN", flex: 1, minWidth: 140 },
  { field: "status", headerName: "STATUS", flex: 1, minWidth: 120 },
];

export function AllVendorsPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVendors();
  }, []);

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

  const filtered = vendors.filter((v) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      v.vendorCode.toLowerCase().includes(q) ||
      v.vendorName.toLowerCase().includes(q) ||
      v.gstin.toLowerCase().includes(q)
    );
  });

  const handleCreateVendor = () => {
    navigate("/flow/vendors/new");
  };

  return (
    <>
      <ReportsPageWrapper
        title="Vendors"
        showCreateButton
        createButtonText="Create Vendor"
        onCreateButtonClick={handleCreateVendor}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search by vendor id/code/name/GSTIN"
        showFilters={true}
        showDateFilter={false}
      >
        <Box
          sx={{
            height: "calc(100vh - 240px)",
            width: "100%",
          }}
        >
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                <p className="text-sm text-gray-500">Loading vendors...</p>
              </div>
            </div>
          ) : (
            <DataGrid
              className="rounded border-[0.2px] border-[#f3f4f6] h-full"
              rows={filtered}
              columns={columns}
              hideFooterPagination
              onRowClick={(params) => {
                navigate(`/flow/vendors/${params.row.id}`);
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
              disableRowSelectionOnClick
              density="compact"
              showCellVerticalBorder
            />
          )}
        </Box>
      </ReportsPageWrapper>
    </>
  );
}

