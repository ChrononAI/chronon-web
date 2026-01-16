import { useEffect, useState } from "react";
import {
  useParams,
  useSearchParams,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  AlertCircle,
  XCircle,
  Undo,
  AlertTriangle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { approvalService } from "@/services/approvalService";
import { reportService } from "@/services/reportService";
import {
  ReportWithExpenses,
  ApprovalWorkflow,
  Expense,
  ExpenseComment,
} from "@/types/expense";
import {
  formatDate,
  formatCurrency,
  getStatusColor,
  getOrgCurrency,
} from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";
import { WorkflowTimeline } from "@/components/expenses/WorkflowTimeline";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getExpenseType } from "./MyExpensesPage";
import { Input } from "@/components/ui/input";
import { ReportTabs } from "@/components/reports/ReportTabs";
import { trackEvent } from "@/mixpanel";
import { FormFooter } from "@/components/layout/FormFooter";
import ExpenseLogs from "@/components/expenses/ExpenseLogs";
import { ExpenseComments } from "@/components/expenses/ExpenseComments";

const columns: GridColDef[] = [
  {
    field: "sequence_number",
    headerName: "EXPENSE ID",
    minWidth: 150,
    flex: 1,
    renderCell: (params) => {
      const expense = params.row;
      return (
        <div className="flex items-center gap-2">
          {expense.original_expense_id && (
            <TooltipProvider>
              <Tooltip delayDuration={50}>
                <TooltipTrigger asChild>
                  <div className="relative cursor-pointer">
                    <AlertTriangle
                      className="h-4 w-4 text-yellow-400"
                      fill="currentColor"
                      stroke="none"
                    />
                    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-yellow-800 text-[8px] font-bold">
                      !
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  align="center"
                  className="bg-yellow-100 border-yellow-300 text-yellow-800"
                >
                  <p>Duplicate expense</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <span>{expense.sequence_number}</span>
        </div>
      );
    },
  },
  {
    field: "expense_type",
    headerName: "TYPE",
    minWidth: 120,
    flex: 1,
    renderCell: (params) => getExpenseType(params.row.expense_type),
  },
  {
    field: "policy",
    headerName: "POLICY",
    minWidth: 140,
    flex: 1,
    valueGetter: (params: any) => params?.name || "No Policy",
  },
  {
    field: "category",
    headerName: "CATEGORY",
    minWidth: 140,
    flex: 1,
  },
  {
    field: "vendor",
    headerName: "VENDOR",
    minWidth: 200,
    flex: 1,
    renderCell: (params) => {
      const { vendor, expense_type } = params.row;
      if (vendor) return vendor;
      if (expense_type === "RECEIPT_BASED") {
        return <span className="text-gray-600 italic">Unknown Vendor</span>;
      }
      return "NA";
    },
  },
  {
    field: "expense_date",
    headerName: "DATE",
    minWidth: 120,
    flex: 1,
    valueFormatter: (params: any) => formatDate(params),
  },
  {
    field: "amount",
    headerName: "AMOUNT",
    minWidth: 120,
    flex: 1,
    type: "number",
    align: "right",
    headerAlign: "right",
    valueFormatter: (params: any) => formatCurrency(params),
  },
  {
    field: "currency",
    headerName: "CURRENCY",
    minWidth: 100,
    flex: 1,
    renderCell: () => getOrgCurrency(),
  },
  {
    field: "status",
    headerName: "STATUS",
    flex: 1,
    minWidth: 180,
    renderCell: (params) => (
      <Badge className={getStatusColor(params.value)}>
        {params.value.replace("_", " ")}
      </Badge>
    ),
  },
];

export function ReportDetailPage2() {
  const { id } = useParams<{ id: string }>();
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isFromApprovals = searchParams.get("from") === "approvals";
  const { user, orgSettings } = useAuthStore();
  const customIdEnabled =
    orgSettings?.custom_report_id_settings?.enabled ?? false;

  const isAdmin = user?.role === "ADMIN";
  console.log(isAdmin);

  const showDescription = orgSettings?.report_description_settings?.enabled ?? true;
  const [report, setReport] = useState<ReportWithExpenses | null>(null);
  const [approvalWorkflow, setApprovalWorkflow] =
    useState<ApprovalWorkflow | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionType, setActionType] = useState<
    "approve" | "reject" | "send_back" | null
  >(null);
  const [comments, setComments] = useState("");
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "expenses" | "history" | "comments" | "logs"
  >("expenses");
  const [loadingReportComments, setLoadingReportComments] = useState(false);
  const [commentError, setCommentError] = useState<string | null>();
  const [reportComments, setReportComments] = useState<ExpenseComment[]>([]);
  const [reportLogs, setReportLogs] = useState<ExpenseComment[]>([]);
  const [postingComment, setPostingComment] = useState(false);
  const [newComment, setNewComment] = useState<string>();

  const tabs = [
    { key: "expenses", label: "Expenses", count: 0 },
    { key: "history", label: "Audit History", count: 0 },
    { key: "comments", label: "Comments", count: 0 },
    { key: "logs", label: "Logs", count: 0 },
  ];

  const fetchReport = async () => {
    if (!id) {
      console.error("Report ID is missing");
      setLoading(false);
      return;
    }

    try {
      const [reportResponse, workflowResponse] = await Promise.all([
        reportService.getReportWithExpenses(id),
        reportService.getReportApprovalWorkflow(id),
      ]);

      if (reportResponse.success && reportResponse.data) {
        setReport(reportResponse.data);
      } else {
        console.error(
          "Failed to fetch report details:",
          reportResponse.message
        );
        toast.error(reportResponse.message || "Failed to fetch report details");
      }
      if (workflowResponse.success && workflowResponse.data) {
        const getAllApprovalSteps = (data: any) => {
          return data
            .reverse()
            .flatMap((item: any) =>
              item.approval_steps.filter(
                (step: any) => step.status !== "ABORTED"
              )
            );
        };
        const newSteps = getAllApprovalSteps(workflowResponse.data);
        const currentStepIdx = newSteps.findIndex(
          (step: any) => step.status === "IN_PROGRESS"
        );
        setApprovalWorkflow({
          report_id: reportResponse.data.id,
          approval_steps: newSteps,
          total_steps: newSteps.length,
          current_step: currentStepIdx !== -1 ? currentStepIdx + 1 : 0,
          // ...workflowResponse.data[0]
        });
      } else {
        console.warn(
          "Failed to fetch approval workflow:",
          workflowResponse.message
        );
      }
    } catch (error) {
      console.error("Failed to fetch report details", error);
      toast.error("Failed to fetch report details");
    } finally {
      setLoading(false);
    }
  };

  const handlePostComment = async () => {
    if (!id || !newComment?.trim() || postingComment) return;

    setPostingComment(true);
    setCommentError(null);

    try {
      await reportService.postReportComment(
        id,
        newComment.trim(),
        false // notify: false
      );

      const fetchedComments = await reportService.getReportComments(id);

      const sortedComments = [...fetchedComments.filter((c) => !c.action)].sort(
        (a, b) => {
          const dateA = new Date(a.created_at).getTime();
          const dateB = new Date(b.created_at).getTime();
          return dateA - dateB;
        }
      );
      setReportComments(sortedComments);
      setNewComment("");
      toast.success("Comment posted successfully");
    } catch (error: any) {
      console.error("Error posting comment:", error);
      const errorMessage =
        error.response?.data?.message || "Failed to post comment";
      setCommentError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setPostingComment(false);
    }
  };

  const fetchComments = async (id: string) => {
    if (id) {
      setLoadingReportComments(true);
      setCommentError(null);
      try {
        const fetchedComments = await reportService.getReportComments(id);
        // Sort comments by created_at timestamp (oldest first)
        const sortedComments = [
          ...fetchedComments.filter((c) => c.creator_type === "USER"),
        ].sort((a, b) => {
          const dateA = new Date(a.created_at).getTime();
          const dateB = new Date(b.created_at).getTime();
          return dateA - dateB;
        });
        setReportComments(sortedComments);
        const sortedLogs = [
          ...fetchedComments.filter((c) => c.creator_type === "SYSTEM"),
        ].sort((a, b) => {
          const dateA = new Date(a.created_at).getTime();
          const dateB = new Date(b.created_at).getTime();
          return dateA - dateB;
        });
        setReportLogs(sortedLogs);
      } catch (error: any) {
        console.error("Error fetching comments:", error);
        setCommentError(
          error.response?.data?.message || "Failed to load comments"
        );
      } finally {
        setLoadingReportComments(false);
      }
    }
  };

  useEffect(() => {
    fetchReport();
    if (id) {
      fetchComments(id);
    }
  }, [id]);

  // Redirect to edit mode if report is DRAFT
  useEffect(() => {
    if (report && report.status === "DRAFT" && !isFromApprovals) {
      navigate("/reports/create", {
        state: {
          editMode: true,
          reportData: {
            id: report.id,
            title: report.title,
            description: report.description,
            custom_attributes: report.custom_attributes,
            expenses: report.expenses,
          },
        },
        replace: true,
      });
    }
  }, [report, isFromApprovals, navigate]);

  const handleAction = (type: "approve" | "reject" | "send_back") => {
    const text =
      type === "approve"
        ? "Approve Report"
        : type === "reject"
        ? "Reject Report"
        : "Send Back Report";
    trackEvent(text + " Button Clicked", {
      button_name: text,
    });
    setActionType(type);
    setComments("");
    setShowActionDialog(true);
  };

  const executeAction = async () => {
    if (!report || !actionType) return;

    if (!comments.trim()) {
      toast.error("Comments are required");
      return;
    }

    setActionLoading(true);
    try {
      let result;
      if (actionType === "approve") {
        result = await approvalService.approveReport(report.id, comments);
      } else if (actionType === "reject") {
        result = await approvalService.rejectReport(report.id, comments);
      } else {
        result = await approvalService.sendBackReport(report.id, comments);
      }
      toast.success(result.message);
      setShowActionDialog(false);
      await fetchReport();
    } catch (error: any) {
      console.error(`Failed to ${actionType} report`, error);
      toast.error(
        error?.response?.data?.message || `Failed to ${actionType} report`
      );
    } finally {
      setActionLoading(false);
    }
  };

  // Check if user can approve any expense in the report
  const canApproveReport = () => {
    if (!report || !user) return false;

    // Check if report is in a state that allows approval
    if (report.status === "DRAFT" || report.status === "SUBMITTED") {
      return false; // Can't approve draft or already submitted reports
    }

    // Check if there are pending expenses
    const pendingExpenses = report.expenses.filter(
      (exp) => exp.status === "PENDING" || exp.status === "PENDING_APPROVAL"
    ).length;
    const isUserInCurrentStep = approvalWorkflow?.approval_steps
      .find((step) => step.status === "IN_PROGRESS")
      ?.approvers.some((approver) => approver.user_id === user.id.toString());

    return pendingExpenses > 0 && (isUserInCurrentStep || !approvalWorkflow);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading report details...</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto" />
          <div>
            <h3 className="text-lg font-semibold">Report Not Found</h3>
            <p className="text-muted-foreground">
              The report you're looking for doesn't exist.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const totalAmount = report.expenses.reduce(
    (sum, expense) => sum + parseFloat(expense.amount.toString()),
    0
  );
  const pendingExpenses = report.expenses.filter(
    (exp) => exp.status === "PENDING" || exp.status === "PENDING_APPROVAL"
  ).length;

  const adminApprover = isAdmin && pathname.includes("admin-reports") && report.status === "UNDER_REVIEW";

  const handleViewExpense = async (expense: Expense) => {
    if (pathname.includes("/approvals/")) {
      navigate(`/approvals/reports/${report.id}/${expense.id}`);
    } else if (pathname.includes("/admin/settlements")) {
      navigate(`/admin/settlements/${report.id}/${expense.id}`);
    } else {
      navigate(`/reports/${report.id}/${expense.id}`);
    }
  };

  return (
    <>
      <div className="flex flex-col space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Report Approval</h1>
          {((isFromApprovals && canApproveReport()) || adminApprover) && (
            <div className="flex gap-2">
              <Button
                onClick={() => handleAction("approve")}
                disabled={actionLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </Button>
              <Button
                onClick={() => handleAction("reject")}
                disabled={actionLoading}
                className="bg-red-600 hover:bg-red-700"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
              <Button
                onClick={() => handleAction("send_back")}
                disabled={actionLoading}
                className="bg-orange-600 hover:bg-orange-700"
              >
                <Undo className="h-4 w-4 mr-2" />
                Send Back
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 lg:col-span-2 gap-4">
          {/* Report Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Report Name</label>
            <Input value={report.title} disabled />
          </div>

          {/* Description */}
          {showDescription && <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Input value={report.description} disabled />
          </div>}
          {customIdEnabled && report?.custom_report_id && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Custom Report ID</label>
              <Input value={report?.custom_report_id ?? ""} disabled />
            </div>
          )}
        </div>
        {report.custom_attributes &&
          Object.keys(report.custom_attributes).length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                Custom Fields
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                {Object.entries(report.custom_attributes).map(
                  ([key, value]) => (
                    <div key={key} className="space-y-2">
                      <label className="text-sm font-medium capitalize">
                        {key.replace(/_/g, " ")}
                      </label>
                      {/* <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-md"> */}
                      <Input value={value} disabled />
                      {/* </div> */}
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        <div className="flex flex-col flex-1 min-h-0">
          <ReportTabs
            activeTab={activeTab}
            onTabChange={(tabId) =>
              setActiveTab(
                tabId as "expenses" | "history" | "comments" | "logs"
              )
            }
            tabs={tabs}
            className="mb-0"
          />
          {activeTab === "expenses" && (
            <div className="space-y-6 mt-6">
              <div className="rounded-lg border">
                <DataGrid
                  className="rounded border-[0.2px] border-[#f3f4f6] h-full"
                  rows={report.expenses}
                  columns={columns}
                  sx={{
                    minHeight: "84px",
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
                    "& .MuiDataGrid-cell:focus, & .MuiDataGrid-columnHeader:focus":
                      {
                        outline: "none",
                      },
                    "& .MuiDataGrid-cell:focus-within": {
                      outline: "none",
                    },
                    "& .MuiDataGrid-columnSeparator": {
                      color: "#f3f4f6",
                    },
                  }}
                  density="compact"
                  getRowClassName={(params) =>
                    params.row.original_expense_id ? "bg-yellow-50" : ""
                  }
                  hideFooter
                  disableRowSelectionOnClick
                  showCellVerticalBorder
                  onRowClick={(params) => handleViewExpense(params.row)}
                />
              </div>
            </div>
          )}

          {activeTab === "history" && (
            <div className="w-1/3">
              {approvalWorkflow && approvalWorkflow.approval_steps && (
                <div className="mt-6">
                  <WorkflowTimeline approvalWorkflow={approvalWorkflow} />
                </div>
              )}
            </div>
          )}

          {activeTab === "comments" && (
            <div className="flex flex-col h-[40vh] overflow-hidden">
              <ExpenseComments
                expenseId={id}
                loadingComments={loadingReportComments}
                comments={reportComments}
                commentError={commentError || ""}
                postComment={handlePostComment}
                postingComment={postingComment}
                newComment={newComment || ""}
                setNewComment={setNewComment}
              />
            </div>
          )}

          {activeTab === "logs" && (
            <div className="flex flex-col h-[40vh] overflow-hidden">
              <ExpenseLogs
                logs={reportLogs}
                loading={loadingReportComments}
                error={commentError || ""}
                className="px-0"
              />
            </div>
          )}
        </div>
        <FormFooter>
          <div className="w-full flex items-center justify-between">
            <div>
              <span className="text-gray-600">Total Amount: </span>
              <span className="text-lg font-bold text-primary">
                {formatCurrency(totalAmount || 0)}
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
              className="px-6 py-2"
            >
              Back
            </Button>
          </div>
        </FormFooter>
      </div>

      {/* Action Dialog */}
      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionType === "approve" ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : actionType === "reject" ? (
                <XCircle className="h-5 w-5 text-red-600" />
              ) : (
                <Undo className="h-5 w-5 text-orange-600" />
              )}
              {actionType === "approve"
                ? "Approve"
                : actionType === "reject"
                ? "Reject"
                : "Send Back"}{" "}
              Report
            </DialogTitle>
          </DialogHeader>

          {report && (
            <div className="space-y-4">
              <div className="bg-muted/30 rounded-lg p-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Report:
                    </span>
                    <span className="text-sm font-medium">{report.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Total Value:
                    </span>
                    <span className="text-sm font-medium">
                      {formatCurrency(totalAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Pending Expenses:
                    </span>
                    <span className="text-sm font-medium">
                      {pendingExpenses}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="comments">
                      Comments <span className="text-red-500">*</span>
                    </Label>
                    <span className="text-xs text-muted-foreground">
                      {comments.length}/500 characters
                    </span>
                  </div>
                  <Textarea
                    id="comments"
                    placeholder={
                      actionType === "approve"
                        ? "Please provide comments for approval..."
                        : actionType === "reject"
                        ? "Please provide reason for rejection..."
                        : "Please provide reason for sending back to draft..."
                    }
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    rows={3}
                    maxLength={500}
                    className="resize-none"
                  />
                </div>
              </div>
              <div className="flex flex-col-reverse sm:flex-row gap-3 pt-6 w-full text-center">
                <div className="flex flex-row gap-3 justify-center w-full">
                  <Button
                    variant="outline"
                    onClick={() => setShowActionDialog(false)}
                    disabled={actionLoading}
                    className="w-full sm:w-auto px-6 py-2.5 border-gray-300 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={executeAction}
                    disabled={actionLoading || !comments.trim()}
                    className={`w-full sm:w-auto px-6 py-2.5 font-medium transition-all duration-200 ${
                      actionType === "approve"
                        ? "bg-green-600 hover:bg-green-700 text-white shadow-sm hover:shadow-md"
                        : actionType === "reject"
                        ? "bg-red-600 hover:bg-red-700 text-white shadow-sm hover:shadow-md"
                        : "bg-orange-600 hover:bg-orange-700 text-white shadow-sm hover:shadow-md"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {actionLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        {actionType === "approve"
                          ? "Approving..."
                          : actionType === "reject"
                          ? "Rejecting..."
                          : "Sending Back..."}
                      </>
                    ) : (
                      <>
                        {actionType === "approve" ? (
                          <CheckCircle className="h-4 w-4 mr-2" />
                        ) : actionType === "reject" ? (
                          <XCircle className="h-4 w-4 mr-2" />
                        ) : (
                          <Undo className="h-4 w-4 mr-2" />
                        )}
                        {actionType === "approve"
                          ? "Approve Report"
                          : actionType === "reject"
                          ? "Reject Report"
                          : "Send Back"}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
