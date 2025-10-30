import { useEffect, useState } from "react";
import { ReportsPageWrapper } from "@/components/reports/ReportsPageWrapper"
import { DataGrid, GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import { formatDate, getStatusColor } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { preApprovalService, PreApprovalType } from "@/services/preApprovalService";
import { useNavigate } from "react-router-dom";
import { PaginationInfo } from "@/store/expenseStore";
import { useAdvanceStore } from "@/store/advanceStore";
import { AdvanceService } from "@/services/advanceService";
import { Box } from "@mui/material";

function ApprovalsAdvancesPage() {
    const navigate = useNavigate();
    const { setSelectedAdvanceToApprove } = useAdvanceStore()

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
            field: 'created_by',
            headerName: 'CREATED BY',
            width: 150,
            renderCell: ({ value }) => {
                return value.email;
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

    const [allRows, setAllRows] = useState([]);
    const [allPagination, setAllPagination] = useState<PaginationInfo | null>(null);
    const [pendingRows, setPendingRows] = useState([]);
    const [pendingPagination, setPendingPagination] = useState<PaginationInfo | null>(null);
    const [processedRows, setProcessedRows] = useState([]);
    const [processedPagination, setProcessedPagination] = useState<PaginationInfo | null>(null);

    const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
        page: 0,
        pageSize: 10,
    });

    const [activeTab, setActiveTab] = useState<"pending" | "processed" | "all">("all");
    const rows = activeTab === "all" ? allRows : activeTab === "pending" ? pendingRows : processedRows;
    const tabs = [
        { key: "all", label: "All", count: allPagination?.total || 0 },
        { key: "pending", label: "Pending", count: pendingPagination?.total || 0 },
        { key: "processed", label: "Processed", count: processedPagination?.total || 0 }
    ];

    const onRowClick = ({ row }: { row: PreApprovalType }) => {
        setSelectedAdvanceToApprove(row);
        navigate(`/approvals/advances/${row.id}`);
    }

    const getAllAdvancesToApprove = async () => {
        try {
            const res: any = await AdvanceService.getAdvanceToApprove();
            setAllRows(res.data.data);
            setAllPagination(res.data.pagination);
        } catch (error) {
            console.log(error);
        }
    }

    const getPendingAdvancesToApprove = async () => {
        try {
            const res: any = await preApprovalService.getPreApprovalToApproveByStatus('IN_PROGRESS');
            setPendingRows(res.data.data);
            setPendingPagination(res.data.pagination);
        } catch (error) {
            console.log(error);
        }
    }

    const getProcessedAdvances = async () => {
        try {
            const res: any = await preApprovalService.getPreApprovalToApproveByStatus('APPROVED,REJECTED');
            setProcessedRows(res.data.data);
            setProcessedPagination(res.data.pagination);
        } catch (error) {
            console.log(error);
        }
    }

    useEffect(() => {
        getAllAdvancesToApprove();
        getPendingAdvancesToApprove()
        getProcessedAdvances();
    }, [activeTab]);
    return (
        <ReportsPageWrapper
            title="Approver Dashboard"
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={(tabId) => setActiveTab(tabId as "all" | "pending" | "processed")}
            showDateFilter={true}
            showFilters={false}
            searchTerm={""}
            onSearchChange={function (): void {
                throw new Error("Function not implemented.");
            }}
        >
            <Box sx={{ height: "calc(100vh - 160px)", width: "100%", marginTop: '-32px' }}>
                <DataGrid
                    className="rounded border h-full"
                    columns={columns}
                    rows={rows}
                    sx={{
                        border: 0,
                        "& .MuiDataGrid-columnHeaderTitle": {
                            fontWeight: 600,
                            fontSize: "14px"
                        },
                        "& .MuiDataGrid-toolbarContainer": {
                            border: "1px solid"
                        },
                        "& .MuiDataGrid-row:hover": {
                            cursor: "pointer",
                            backgroundColor: "#f5f5f5",
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
                    onRowClick={onRowClick}
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

export default ApprovalsAdvancesPage