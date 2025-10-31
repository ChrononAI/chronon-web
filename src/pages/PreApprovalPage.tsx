import { useEffect, useState } from "react";
import { ReportsPageWrapper } from "@/components/reports/ReportsPageWrapper";
import { DataGrid, GridColDef, GridPaginationModel, GridRowModel } from "@mui/x-data-grid";
import { Box } from "@mui/material";
import { formatDate, getStatusColor } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { preApprovalService, PreApprovalType } from "@/services/preApprovalService";
import { Badge } from "@/components/ui/badge";
import { usePreApprovalStore } from "@/store/preApprovalStore";
import { PaginationInfo } from "@/store/expenseStore";

function PreApprovalPage() {
    const navigate = useNavigate();
    const { setSelectedPreApproval } = usePreApprovalStore()

    const [activeTab, setActiveTab] = useState<"all" | "pending" | "approved">("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [selectedDate, setSelectedDate] = useState<Date | undefined>();

    const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
        page: 0,
        pageSize: 10,
    });

    const statusOptions = [
        { value: "all", label: "All" },
        { value: "PENDING", label: "Pending" },
        { value: "APPROVED", label: "approved" }
    ];

    const handleRowClick = ({ row }: GridRowModel) => {
        setSelectedPreApproval(row);
        navigate(`/pre-approvals/${row.id}`);
    }

    const columns: GridColDef[] = [
        {
            field: "sequence_number",
            headerName: "PRE APPROVAL ID",
            width: 160
        },
        {
            field: "title",
            headerName: "TITLE",
            width: 200
        },
        {
            field: 'start_date',
            headerName: 'START',
            width: 120,
            renderCell: ({ value }) => {
                return formatDate(value)
            }
        },
        {
            field: 'end_date',
            headerName: 'END',
            width: 120,
            renderCell: ({ value }) => {
                return formatDate(value)
            }
        },
        {
            field: 'policy_name',
            headerName: 'POLICY',
            width: 150
        },
        {
            field: 'status',
            headerName: 'STATUS',
            width: 170,
            renderCell: ({ value }) => {
                return (
                    <Badge className={getStatusColor(value)}>
                        {value.replace('_', ' ')}
                    </Badge>
                )
            }
        },
        {
            field: 'created_at',
            headerName: 'CREATED AT',
            width: 150,
            renderCell: ({ value }) => {
                return formatDate(value)
            }
        },
        {
            field: 'description',
            headerName: 'PURPOSE',
            flex: 1,
            minWidth: 150
        }
    ];

    const [allRows, setAllRows] = useState<PreApprovalType[]>([]);
    const [allPagination, setAllPagination] = useState<PaginationInfo | null>(null);
    const [pendingRows, setPendingRows] = useState<PreApprovalType[]>([]);
    const [pendingPagination, setPendingPagination] = useState<PaginationInfo | null>(null);
    const [processedRows, setProcessedRows] = useState<PreApprovalType[]>([]);
    const [processedPagination, setProcessedPagination] = useState<PaginationInfo | null>(null)
    const rows = activeTab === "all" ? allRows : activeTab === "pending" ? pendingRows : processedRows;

    const tabs = [
        { key: 'all', label: 'All', count: allPagination?.total || 0 },
        { key: "pending", label: "Pending", count: pendingPagination?.total || 0 },
        { key: "processed", label: "Processed", count: processedPagination?.total || 0 }
    ];

    const getAllPreApprovals = async ({ page, perPage }: {
        perPage: number;
        page: number;
    }) => {
        try {
            const response: any = await preApprovalService.getAllPreApprovals({ page, perPage });
            setAllPagination(response?.data.pagination);
            setAllRows(response?.data.data);
        } catch (error) {
            console.log(error);
        }
    }
    const getPendingPreApprovals = async ({ page, perPage }: {
        page: number;
        perPage: number;
    }) => {
        try {
            const response: any = await preApprovalService.getPreApprovalsByStatus({ status: "PENDING_APPROVAL", page, perPage });
            setPendingPagination(response?.data.pagination);
            setPendingRows(response?.data.data);
        } catch (error) {
            console.log(error);
        }
    }

    const getProcessedPreApprovals = async ({ page, perPage }: {
        page: number;
        perPage: number;
    }) => {
        try {
            const response: any = await preApprovalService.getPreApprovalsByStatus({ status: "APPROVED,REJECTED", page, perPage });
            setProcessedPagination(response?.data.pagination);
            setProcessedRows(response?.data.data);
        } catch (error) {
            console.log(error);
        }
    }

    useEffect(() => {
        getAllPreApprovals({ page: 1, perPage: 10 });
        getPendingPreApprovals({ page: 1, perPage: 10 });
        getProcessedPreApprovals({ page: 1, perPage: 10 });
    }, [])

    return (
        <ReportsPageWrapper
            title="Pre Approval"
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={(tabId) => setActiveTab(tabId as "all" | "pending" | "approved")}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Search expenses..."
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            statusOptions={statusOptions}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            showFilters={false}
            showDateFilter={false}
            showCreateButton={true}
            createButtonText="Create Pre Approval"
            createButtonLink="/pre-approvals/create"
        >
            <Box sx={{ height: "calc(100vh - 160px)", width: "100%", marginTop: '-32px' }}>
                <DataGrid
                    className="rounded border h-full"
                    columns={columns}
                    rows={rows}
                    sx={{
                        border: 0,
                        "& .MuiDataGrid-columnHeaderTitle": {
                            color: '#9AA0A6',
                            fontWeight: 505,
                            fontSize: "14px"
                        },
                        "& .MuiDataGrid-main": {
                            border: '1px solid #F1F3F4'
                        },
                        "& .MuiDataGrid-columnHeader": {
                            backgroundColor: '#f3f4f6'
                        },
                        "& .MuiCheckbox-root": {
                            color: '#9AA0A6'
                        },
                        "& .MuiDataGrid-row:hover": {
                            cursor: "pointer",
                            backgroundColor: "#f5f5f5",
                        },
                        "& .MuiDataGrid-cell": {
                            color: '#2E2E2E'
                        },
                        "& .MuiDataGrid-cell:focus, & .MuiDataGrid-columnHeader:focus": {
                            outline: "none",
                        },
                        "& .MuiDataGrid-cell:focus-within": {
                            outline: "none",
                        },
                    }}
                    showToolbar
                    density="compact"
                    checkboxSelection
                    disableRowSelectionOnClick
                    onRowClick={handleRowClick}
                    pagination
                    paginationMode='server'
                    paginationModel={paginationModel}
                    onPaginationModelChange={setPaginationModel}
                    rowCount={activeTab === "all" ? allPagination?.total : activeTab === "pending" ? pendingPagination?.total : processedPagination?.total}
                    autoPageSize
                />
            </Box>
        </ReportsPageWrapper>
    )
}

export default PreApprovalPage