import FinalisedFileAlert from "@/components/bulk-upload/FinalisedFileAlert";
import { FormFooter } from "@/components/layout/FormFooter";
import { Button } from "@/components/ui/button";
import { bulkImportService } from "@/services/bulkImportService";
import { Box, Tooltip } from "@mui/material";
import { DataGrid, GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import { AlertTriangle, CheckCircleIcon, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

const hasCellError = (
  rowId: number | string,
  field: string,
  issueRows: any[]
) => {
  return issueRows?.find(
    (issue) => issue.bulk_import_row_id === rowId && issue.field === field
  );
};

function generateHeaders(headers: any[], issueRows: any): GridColDef[] {
  return headers
    .filter(
      (item, index, arr) =>
        !item.entity_id ||
        index === arr.findIndex((i) => i.entity_id === item.entity_id)
    )
    .map(
      (header): GridColDef => ({
        field: header.field_key,
        headerName: header.display_name,
        flex: 1,
        minWidth: 180,
        editable: true,
        renderCell: (params: GridRenderCellParams) => {
          const issue = hasCellError(params.id, params.field, issueRows);
          if (!issue) {
            return params.value ?? "";
          }

          return (
            <Tooltip title={issue.message || "Invalid value"}>
              <div className="flex items-center gap-2">
                <AlertTriangle className="text-red-500 h-4 w-4 flex-shrink-0" />
                {params.value ? (
                  <span className="truncate">{params.value}</span>
                ) : (
                  <span className="truncate italic">No value</span>
                )}
              </div>
            </Tooltip>
          );
        },
      })
    );
}

function ValidateFile() {
  const { fileid } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"NEED_FIXES" | "COMPLETED" | string>("");
  const [rows, setRows] = useState<any>([]);
  const [mappedRows, setMappedRows] = useState([]);
  const [issueRows, setIssueRows] = useState<any[]>([]);
  const [fileData, setFileData] = useState<any>();
  const [loading, setLoading] = useState(false);
  const [finalising, setFinalising] = useState(false);
  const [validating, setValidating] = useState(false);

  const [showActionDialog, setShowActionDialog] = useState(false);

  const handleConfirm = () => {
    setShowActionDialog(false);
    navigate('/admin-settings/product-config/bulk-uploads');
  }

  const buildErrorCellMap = (errors: any[]): any => {
    const map: any = {};

    errors.forEach((err) => {
      if (!map[err.bulk_import_row_id]) {
        map[err.bulk_import_row_id] = new Set();
      }
      map[err.bulk_import_row_id].add(err.field);
    });

    return map;
  };

  const errorCellMap = useMemo(() => buildErrorCellMap(issueRows), [issueRows]);

  const columns = useMemo(() => {
    if (!fileData?.template_headers) return [];
    return generateHeaders(fileData.template_headers, issueRows);
  }, [fileData?.template_headers, issueRows]);

  const validateFile = async (fileid: string) => {
    try {
      const res = await bulkImportService.validateFile(fileid);
      setStatus(res.data.data.status);
    } catch (error: any) {
      console.log(error);
      toast.error(
        error?.response?.data?.message ||
          error.message ||
          "Failed to validate file"
      );
    }
  };

  const finalizeFile = async (fileid: string) => {
    setFinalising(true);
    try {
      await bulkImportService.finalizeFile(fileid);
      
    } catch (error: any) {
      console.log(error);
      toast.error(error?.response?.data?.message || error.message);
    } finally {
      setFinalising(false);
    }
  };

  const getMappedRows = async (fileid: string) => {
    try {
      const fileData = await bulkImportService.getFileDetailsById(fileid);
      setFileData(fileData.data.data[0]);
      const res = await bulkImportService.getMappedData(fileid);
      setMappedRows(res.data.data);
    } catch (error) {
      console.log(error);
    }
  };

  const getMappedRowIssues = async (fileid: string) => {
    try {
      const res = await bulkImportService.getMappedRowIssues(fileid);
      setIssueRows(res.data.data);
    } catch (error) {
      console.log(error);
    }
  };

  const processRowUpdate = async (newRow: any, oldRow: any) => {
    const editedField = Object.keys(newRow).find(
      (key) => newRow[key] !== oldRow[key]
    );

    if (!editedField || !fileid) return oldRow;

    const rowId = newRow.id;

    try {
      await bulkImportService.updateMappedRow({
        fileid,
        rowId,
        data: {
          data: {
            [editedField]: newRow[editedField],
          },
        },
      });

      // 🔥 REMOVE issues for this row locally
      setIssueRows((prev: any[]) =>
        prev.filter(
          (issue) =>
            !(issue.bulk_import_row_id === rowId && issue.field === editedField)
        )
      );

      return newRow;
    } catch (err) {
      toast.error("Failed to update row");
      return oldRow;
    }
  };

  useEffect(() => {
    const rowsWithIssues: any[] = mappedRows.filter((row: any) => {
      const hasIssue = issueRows.find(
        (issueRow: any) => issueRow.bulk_import_row_id === row.id
      );
      if (hasIssue) {
        return row;
      }
    });
    const sortedIssueRows = [...rowsWithIssues].sort(
      (a, b) => a.row_number - b.row_number
    );
    const tableRows = sortedIssueRows.map((row: any) => {
      return { ...row.data, id: row.id };
    });
    setRows(tableRows);
  }, [mappedRows]);

  const loadData = async (fileid: string) => {
    try {
      setLoading(true);
      await Promise.all([
        validateFile(fileid),
        getMappedRows(fileid),
        getMappedRowIssues(fileid),
      ]);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message);
    } finally {
      setLoading(false);
      setValidating(false);
    }
  };

  useEffect(() => {
    if (fileid) {
      loadData(fileid);
    }
  }, []);

  if (status === "NEED_FIXES") {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold capitalize">Validate File</h1>
        </div>
        <div>
          <p className="text-sm mb-4">
            Your file has vaidation issues in below rows. Please double click on
            the cell to fix the issue and revalidate file.
          </p>
        </div>
        <Box
          sx={{
            height: "calc(100vh - 220px)",
            width: "100%",
          }}
        >
          <DataGrid
            columns={columns}
            rows={rows || []}
            loading={loading}
            sx={{
              border: 0,
              "& .MuiDataGrid-columnHeaderTitle": {
                color: "#9AA0A6",
                fontWeight: "bold",
                fontSize: "12px",
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
              "& .error-cell": {
                backgroundColor: "#fdecea",
                color: "#b71c1c",
              },
            }}
            getCellClassName={(params) => {
              const rowErrors = errorCellMap[params.id as string];

              if (rowErrors?.has(params.field)) {
                return "error-cell";
              }

              return "";
            }}
            onCellClick={(params, event) => {
              const hasError = errorCellMap[params.id as string]?.has(
                params.field
              );

              if (!hasError) {
                event.stopPropagation();
                event.preventDefault();
              }
            }}
            onCellDoubleClick={(params, event) => {
              const hasError = errorCellMap[params.id as string]?.has(
                params.field
              );

              if (!hasError) {
                event.stopPropagation();
                event.preventDefault();
              }
            }}
            onCellKeyDown={(params, event) => {
              const hasError = errorCellMap[params.id as string]?.has(
                params.field
              );

              if (!hasError) {
                event.stopPropagation();
                event.preventDefault();
              }
            }}
            density="compact"
            disableRowSelectionOnClick
            processRowUpdate={processRowUpdate}
          />
        </Box>
        <FormFooter>
          <Button variant="outline" onClick={() => navigate(-1)}>
            Back
          </Button>
          <Button
            onClick={() => {
              if (fileid) {
                setValidating(true);
                loadData(fileid);
              } else {
                toast.error("Failed to find import id");
              }
            }}
            disabled={validating}
          >
            {validating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Revalidating...
              </>
            ) : (
              "Revalidate"
            )}
          </Button>
        </FormFooter>
      </div>
    );
  } else if (status === "COMPLETED") {
    return (
      <>
        <div>
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold capitalize">Validate File</h1>
          </div>
          <div className="flex flex-col items-center justify-center p-10 border rounded-md bg-white">
            <CheckCircleIcon className="text-green-600" fontSize="large" />

            <h2 className="mt-4 text-xl font-semibold">
              All set! No issues found
            </h2>

            <p className="mt-1 text-gray-600 text-center max-w-md">
              We’ve validated all rows in your file. You can now finalise the
              import and make the data available in the system.
            </p>
          </div>
        </div>
        <FormFooter>
          <Button variant="outline" onClick={() => navigate(-1)}>
            Back
          </Button>
          <Button
            onClick={() => {
              if (fileid) {
                finalizeFile(fileid);
              } else {
                toast.error("Failed find import id");
              }
            }}
            disabled={finalising}
          >
            {finalising ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Finalising...
              </>
            ) : (
              "FInalise Import"
            )}
          </Button>
        </FormFooter>
        <FinalisedFileAlert showActionDialog={showActionDialog} setShowActionDialog={setShowActionDialog} handleConfirm={handleConfirm} />
      </>
    );
  }
}

export default ValidateFile;
