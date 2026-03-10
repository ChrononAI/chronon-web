import { useState, useEffect, useCallback, useRef } from "react";
import { ReportTabs } from "@/components/reports/ReportTabs";
import { Button } from "@/components/ui/button";
import {
  getAllWorkflows,
  type WorkflowConfig,
  getWorkflowRules,
} from "@/services/admin/workflows";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { GridColDef, GridRowSelectionModel, GridPaginationModel } from "@mui/x-data-grid";
import { DataTable } from "@/components/shared/DataTable";
import { formatDate } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import CustomNoRows from "@/components/shared/CustomNoRows";
import SkeletonLoaderOverlay from "@/components/shared/SkeletonLoaderOverlay";

type TabKey = "workflow" | "config" | "rules" | "all_workflows" | "all_rules";

const getWorkflowColumns = (): GridColDef[] => [
  {
    field: "name",
    headerName: "NAME",
    flex: 1,
    minWidth: 150,
  },
  {
    field: "entity_type",
    headerName: "ENTITY TYPE",
    flex: 1,
    minWidth: 150,
    renderCell: ({ value }) => <Badge variant="outline">{value}</Badge>,
  },
  {
    field: "is_active",
    headerName: "STATUS",
    flex: 1,
    minWidth: 120,
    renderCell: ({ value }) => (
      <Badge
        className={
          value
            ? "bg-green-100 text-green-800 hover:bg-green-100"
            : "bg-gray-100 hover:bg-gray-100 text-gray-800"
        }
      >
        {value ? "Active" : "Inactive"}
      </Badge>
    ),
  },
  {
    field: "created_at",
    headerName: "CREATED AT",
    flex: 1,
    minWidth: 160,
    renderCell: (params) => (
      <span className="text-sm text-gray-500">{formatDate(params.value)}</span>
    ),
  },
  {
    field: "updated_at",
    headerName: "UPDATED AT",
    flex: 1,
    minWidth: 160,
    renderCell: (params) => (
      <span className="text-sm text-gray-500">{formatDate(params.value)}</span>
    ),
  },
];

const rulesColumns: GridColDef[] = [
  {
    field: "name",
    headerName: "NAME",
    flex: 1,
    minWidth: 150,
  },
  {
    field: "approval_type",
    headerName: "APPROVAL TYPE",
    flex: 1,
    minWidth: 150,
  },
  {
    field: "policy_type",
    headerName: "POLICY TYPE",
    flex: 1,
    minWidth: 150,
  },
  {
    field: "is_active",
    headerName: "STATUS",
    flex: 1,
    minWidth: 120,
    renderCell: ({ value }) => (
      <Badge
        className={
          value
            ? "bg-green-100 text-green-800 hover:bg-green-100"
            : "bg-gray-100 hover:bg-gray-100 text-gray-800"
        }
      >
        {value ? "Active" : "Inactive"}
      </Badge>
    ),
  },
  {
    field: "created_by",
    headerName: "CREATED BY",
    flex: 1,
    minWidth: 150,
    renderCell: ({ value }) => {
      return <span>{value.email}</span>;
    },
  },
  {
    field: "created_at",
    headerName: "CREATED AT",
    flex: 1,
    minWidth: 160,
    renderCell: (params) => <span>{formatDate(params.value)}</span>,
  },
  {
    field: "updated_at",
    headerName: "UPDATED AT",
    flex: 1,
    minWidth: 160,
    renderCell: (params) => <span>{formatDate(params.value)}</span>,
  },
];

const WorkFlowPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>("workflow");
  const [workflows, setWorkflows] = useState<WorkflowConfig[]>([]);
  const [rules, setRules] = useState([]);
  const [workflowsLoading, setWorkflowsLoading] = useState(true);
  const isFetchingWorkflowsRef = useRef(false);
  const workflowsFetchedRef = useRef(false);
  const [rowSelection, setRowSelection] = useState<GridRowSelectionModel>({
    type: "include",
    ids: new Set(),
  });

  const [rulePaginationInfo, setRulePaginationInfo] = useState<any>();

  const GRID_OFFSET = 260;
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
  const [workflowPaginationModel, setWorkflowPaginationModel] =
    useState<GridPaginationModel>({
      page: 0,
      pageSize: calculatePageSize(),
    });

  useEffect(() => {
    setRowSelection({ type: "include", ids: new Set() });
    setPaginationModel((prev) => ({
      ...prev,
      page: 0,
    }));
    setWorkflowPaginationModel((prev) => ({
      ...prev,
      page: 0,
    }));
  }, [activeTab]);

  const fetchWorkflows = useCallback(async (force = false) => {
    if (isFetchingWorkflowsRef.current) return;
    if (!force && workflowsFetchedRef.current) return;

    isFetchingWorkflowsRef.current = true;
    workflowsFetchedRef.current = true;
    setWorkflowsLoading(true);

    try {
      const workflowsData = await getAllWorkflows();
      setWorkflows(workflowsData.data.data);
    } catch (error) {
      console.error("Error fetching workflows:", error);
      toast.error("Failed to fetch workflows");
      workflowsFetchedRef.current = false;
    } finally {
      setWorkflowsLoading(false);
      isFetchingWorkflowsRef.current = false;
    }
  }, []);

  const fetchRules = async () => {
    if (paginationModel) {
      try {
        const limit = paginationModel?.pageSize || 10;
        const offset = (paginationModel?.page || 0) * limit;
        const res = await getWorkflowRules({ limit, offset });
        setRules(res.data);
        setRulePaginationInfo({ total: res.count });
      } catch (error) {
        console.log(error);
      }
    }
  };

  const handleWorkflowClick = ({ row }: any) => {
    navigate(
      `/admin-settings/product-config/workflow/create-workflow/${row.id}`,
      { state: row }
    );
  };

  const handleRuleClick = ({ row }: any) => {
    navigate(`/admin-settings/product-config/workflow/create-rule/${row.id}`, {
      state: row,
    });
  };

  const fetchData = async () => {
    try {
      setWorkflowsLoading(true);
      await Promise.all([fetchWorkflows(), fetchRules()]);
    } catch (error) {
      toast.error("Error fetching data");
    } finally {
      setWorkflowsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [paginationModel?.page, paginationModel?.pageSize]);

  useEffect(() => {
    setRowSelection({ type: "include", ids: new Set() });
  }, [
    paginationModel?.page,
    paginationModel?.pageSize,
    workflowPaginationModel?.page,
    workflowPaginationModel?.pageSize,
  ]);

  return (
    <>
      <div className="flex flex-col gap-3 max-w-full">
        <div className="flex items-center justify-between">
          <h1 
            className="text-2xl mb-3"
            style={{
              fontFamily: "Inter",
              fontWeight: 600,
              fontSize: "24px",
              lineHeight: "100%",
              letterSpacing: "0%",
              color: "#1A1A1A",
            }}
          >
            New Workflow
          </h1>
          {activeTab === "workflow" && (
            <Button
              onClick={() =>
                navigate(
                  "/admin-settings/product-config/workflow/create-workflow"
                )
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
              Create Workflow
            </Button>
          )}
          {activeTab === "rules" && (
            <Button
              onClick={() =>
                navigate("/admin-settings/product-config/workflow/create-rule")
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
              Create Rule
            </Button>
          )}
        </div>

        <ReportTabs
          activeTab={activeTab}
          onTabChange={(t) => setActiveTab(t as TabKey)}
          tabs={[
            { key: "workflow", label: "Workflows", count: workflows?.length },
            { key: "rules", label: "Rules", count: rulePaginationInfo?.total },
          ]}
          className="mb-2"
        />

        {activeTab === "workflow" && (
          <div style={{ marginTop: "-18px" }}>
            <DataTable
              rows={workflowsLoading ? [] : workflows}
              columns={getWorkflowColumns()}
              loading={workflowsLoading}
              height="calc(100vh - 180px)"
              paginationModel={workflowPaginationModel}
              onPaginationModelChange={setWorkflowPaginationModel}
              onRowClick={handleWorkflowClick}
              emptyStateComponent={
                <CustomNoRows title="No entries found" description="There are currently no entries" />
              }
              slots={{
                loadingOverlay: () => <SkeletonLoaderOverlay rowCount={workflowPaginationModel.pageSize} />
              }}
              getRowClassName={(params) =>
                params.row.original_expense_id ? "bg-yellow-50" : ""
              }
              checkboxSelection
              rowSelectionModel={rowSelection}
              onRowSelectionModelChange={setRowSelection}
              disableRowSelectionOnClick
            />
          </div>
        )}

        {activeTab === "rules" && (
          <div style={{ marginTop: "-18px" }}>
            <DataTable
              rows={workflowsLoading ? [] : rules}
              columns={rulesColumns}
              loading={workflowsLoading}
              height="calc(100vh - 180px)"
              paginationModel={paginationModel}
              onPaginationModelChange={setPaginationModel}
              onRowClick={handleRuleClick}
              rowCount={rulePaginationInfo?.total}
              paginationMode="server"
              emptyStateComponent={
                <CustomNoRows title="No entries found" description="There are currently no entries" />
              }
              slots={{
                loadingOverlay: () => <SkeletonLoaderOverlay rowCount={paginationModel.pageSize} />
              }}
              getRowClassName={(params) =>
                params.row.original_expense_id ? "bg-yellow-50" : ""
              }
              checkboxSelection
              rowSelectionModel={rowSelection}
              onRowSelectionModelChange={setRowSelection}
              disableRowSelectionOnClick
            />
          </div>
        )}
      </div>
    </>
  );
};

export default WorkFlowPage;
