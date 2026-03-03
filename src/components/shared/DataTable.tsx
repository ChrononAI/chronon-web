import { Box } from "@mui/material";
import {
  DataGrid,
  GridColDef,
  GridPaginationModel,
  GridSlots,
} from "@mui/x-data-grid";
import { ReactNode } from "react";

interface DataTableProps {
  rows: any[];
  columns: GridColDef[];
  loading?: boolean;
  paginationModel?: GridPaginationModel;
  onPaginationModelChange?: (model: GridPaginationModel) => void;
  height?: string;
  onRowClick?: (params: any) => void;
  getRowClassName?: (params: any) => string;
  firstColumnField?: string;
  emptyStateComponent?: ReactNode;
  slots?: Partial<GridSlots>;
  slotProps?: any;
  showToolbar?: boolean;
  rowHeight?: number;
  hoverCursor?: "pointer" | "default";
  [key: string]: any; // Allow other DataGrid props
}

export function DataTable({
  rows,
  columns,
  loading = false,
  paginationModel,
  onPaginationModelChange,
  height = "calc(100vh - 160px)",
  onRowClick,
  getRowClassName,
  firstColumnField,
  emptyStateComponent,
  slots,
  slotProps,
  showToolbar = false,
  rowHeight = 41,
  hoverCursor = "pointer",
  ...otherProps
}: DataTableProps) {
  const baseSx = {
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
    ...(firstColumnField && {
      [`& .MuiDataGrid-columnHeader[data-field='${firstColumnField}']`]: {
        paddingLeft: "12px",
      },
    }),
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
      height: `${rowHeight}px`,
      minHeight: `${rowHeight}px`,
      maxHeight: `${rowHeight}px`,
      borderBottom: "0.7px solid #EBEBEB",
    },
    "& .MuiDataGrid-row:hover": {
      cursor: hoverCursor,
      backgroundColor: "#f5f5f5",
    },
    "& .invoice-uploading-row": {
      backgroundColor: "#E6FFFA",
      borderLeft: "3px solid #0D9C99",
    },
    "& .invoice-uploading-row:hover": {
      cursor: "not-allowed",
      backgroundColor: "#E6FFFA",
    },
    "& .invoice-uploading-row .MuiDataGrid-cell": {
      color: "#6B7280",
    },
    "& .invoice-processing-row": {
      backgroundColor: "#E6FFFA",
      borderLeft: "3px solid #0D9C99",
    },
    "& .invoice-processing-row:hover": {
      cursor: "not-allowed",
      backgroundColor: "#E6FFFA",
    },
    "& .invoice-processing-row .MuiDataGrid-cell": {
      color: "#6B7280",
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
    ...(firstColumnField && {
      [`& .MuiDataGrid-cell[data-field='${firstColumnField}']`]: {
        paddingLeft: "12px",
      },
    }),
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
  };

  const mergedSlots = {
    ...(emptyStateComponent && { noRowsOverlay: () => emptyStateComponent }),
    ...slots,
  };

  return (
    <Box
      sx={{
        height,
        width: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        paddingLeft: "10px",
      }}
    >
      <DataGrid
        className="rounded h-full"
        rows={rows}
        columns={columns}
        loading={loading}
        getRowHeight={() => rowHeight}
        getRowClassName={getRowClassName}
        slots={mergedSlots}
        slotProps={slotProps}
        sx={baseSx}
        paginationModel={paginationModel}
        onPaginationModelChange={onPaginationModelChange}
        density="compact"
        disableRowSelectionOnClick
        onRowClick={onRowClick}
        showCellVerticalBorder={false}
        autoHeight={false}
        showToolbar={showToolbar}
        {...otherProps}
      />
    </Box>
  );
}

