import { WorkflowTimeline } from "@/components/expenses/WorkflowTimeline";
import { CreateStoreForm } from "@/components/stores/CreateStoreForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, getStatusColor } from "@/lib/utils";
import { trackEvent } from "@/mixpanel";
import { storesService } from "@/services/storeService";
import { useAuthStore } from "@/store/authStore";
import { useStoreStore } from "@/store/storeStore";
import { ApprovalWorkflow } from "@/types/expense";
import { StoreComments } from "@/components/stores/StoreComments";
import { cn } from "@/lib/utils";
import {
  Activity,
  Calendar,
  CheckCircle,
  Clock,
  FileText,
  Loader2,
  XCircle,
  MessageSquare,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

function ProcessStorePage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const { selectedStoreToApprove } = useStoreStore();
  const [comments, setComments] = useState("");
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [approveLoading, setApproveLoading] = useState(false);
  const [rejectLoading, setRejectLoading] = useState(false);

  // const [report, setReport] = useState<PreApprovalType | null>(null);
  const report = selectedStoreToApprove;

  const [approvalWorkflow, setApprovalWorkflow] =
    useState<ApprovalWorkflow | null>(null);
  const [activeTab, setActiveTab] = useState<"timeline" | "comments">("timeline");

  const getUserSpecificStatus = (): string => {
    if (!user || !approvalWorkflow?.approval_steps?.length) {
      return report?.status || "UNDER_REVIEW";
    }

    const currentUserId = user.id.toString();
    const steps = approvalWorkflow.approval_steps;

    // 1️⃣ If any step or approver has REJECTED → everyone sees REJECTED
    const anyRejected = steps.some((step) => step.status === "REJECTED");
    if (anyRejected) return "REJECTED";

    // 2️⃣ Find the step that contains the current user
    const userStep = steps.find((step) =>
      step.approvers?.some((a) => a.user_id?.toString() === currentUserId)
    );

    if (!userStep) {
      // user not part of approval chain → show global status or UNDER_REVIEW
      return report?.status || "UNDER_REVIEW";
    }

    // 4️⃣ If user’s step hasn’t started yet → UNDER_REVIEW
    const userStepOrder = userStep.step_order;
    const currentStepOrder = approvalWorkflow.current_step;

    if (userStepOrder > currentStepOrder) return "PENDING_APPROVAL";

    // 5️⃣ Otherwise, user’s step is active but pending
    if (
      userStep.status === "PENDING" ||
      userStep.status === "PENDING_APPROVAL"
    ) {
      return "PENDING";
    }

    // 6️⃣ Fallback to report’s overall status or UNDER_REVIEW
    return report?.status || "PENDING_APPROVAL";
  };

  const canApprove = () => {
    if (!user || !approvalWorkflow || !approvalWorkflow.approval_steps) {
      return false;
    }

    const currentUserId = user.id.toString();
    const userStep = approvalWorkflow.approval_steps.find((step) =>
      step.approvers.some((approver) => approver.user_id === currentUserId)
    );
    if (userStep?.status === "IN_PROGRESS") return true;

    return false;
  };

  const getStatusIcon = (status: string) => {
    switch (status.toUpperCase()) {
      case "APPROVED":
      case "FULLY_APPROVED":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "PENDING":
      case "PENDING_APPROVAL":
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case "REJECTED":
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Activity className="h-5 w-5 text-blue-600" />;
    }
  };

  const getWorkflow = async (id: string) => {
    try {
      const approvalWorkflowRes: any = await storesService.getStoreWorkflow(id);
      setApprovalWorkflow(approvalWorkflowRes.data.data);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    if (id) getWorkflow(id);
  }, [id]);

  const processStore = async (action: string, payload?: any) => {
    if (!selectedStoreToApprove?.id) return;
    if (action === "approve") {
      setApproveLoading(true);
      setRejectLoading(false);
    } else {
      setRejectLoading(true);
      setApproveLoading(false);
    }
    try {
      await storesService.processStore({
        id: selectedStoreToApprove.id,
        action,
        payload,
      });
      setTimeout(() => {
        navigate("/approvals/stores");
      }, 100);
      if (action === "approve") {
        toast.success("Store approved successfully");
      } else {
        toast.success("Store rejected successfully");
      }
    } catch (error) {
      console.log(error);
      toast.error("Failed to process store");
    } finally {
      setRejectLoading(false);
      setApproveLoading(false);
    }
  };

  const handleAction = async (action: string) => {
    const text = action === "approve" ? "Approve Store" : "Reject Store";
    trackEvent(text + " Button Clicked", {
      button_name: text,
    });
    if (action === "reject") {
      setShowActionDialog(true);
    } else {
      processStore(action, { action });
    }
  };

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold mb-6">Store Approval</h1>
      </div>
      <div className="space-y-6">
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-700">
                {report?.name}
              </h1>
              <div className="flex items-center gap-3 mt-2">
                {getStatusIcon(getUserSpecificStatus())}
                <Badge
                  className={`${getStatusColor(
                    getUserSpecificStatus()
                  )} text-sm px-3 py-1`}
                >
                  {getUserSpecificStatus().replace("_", " ")}
                </Badge>
              </div>
            </div>
            {canApprove() && (
              <div className="flex gap-2">
                <Button
                  onClick={() => handleAction("approve")}
                  className="bg-green-600 hover:bg-green-700"
                  disabled={approveLoading}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {approveLoading ? "Approving..." : "Approve"}
                </Button>
                <Button
                  onClick={() => handleAction("reject")}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </div>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Store Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      Submitted By
                    </div>
                    <p className="text-lg font-semibold">
                      {report?.created_by.email}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Activity className="h-4 w-4" />
                      Status
                    </div>
                    <Badge className={getStatusColor(getUserSpecificStatus())}>
                      {getUserSpecificStatus().replace("_", " ")}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      Created Date
                    </div>
                    <p className="text-lg font-semibold">
                      {report?.created_at && formatDate(report.created_at)}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      Submitted Date
                    </div>
                    <p className="text-lg font-semibold">
                      {report?.created_at
                        ? formatDate(report.created_at)
                        : "Not submitted"}
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    Description
                  </div>
                  <div className="bg-muted/30 rounded-lg p-4">
                    <p className="text-sm leading-relaxed">
                      {report?.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <div className="lg:col-span-2">
              <CreateStoreForm
                mode="view"
                showHeader={false}
                maxWidth="w-full"
              />
            </div>
          </div>
          <Card className="flex flex-col h-[600px]">
            <CardHeader className="flex-none border-b border-gray-200 p-3">
              <div className="flex items-center gap-3">
                {[
                  { key: "timeline", label: "Workflow Timeline", icon: Activity },
                  { key: "comments", label: "Comments", icon: MessageSquare },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key as "timeline" | "comments")}
                    className={cn(
                      "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all",
                      activeTab === tab.key
                        ? "bg-primary/10 text-primary"
                        : "text-gray-500 hover:text-gray-900"
                    )}
                  >
                    <tab.icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
              {activeTab === "timeline" ? (
                approvalWorkflow && approvalWorkflow.approval_steps ? (
                  <div className="h-full overflow-y-auto p-6">
                    <WorkflowTimeline approvalWorkflow={approvalWorkflow} />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-sm text-gray-500">No workflow timeline available</p>
                  </div>
                )
              ) : (
                <div className="h-full overflow-hidden">
                  <StoreComments storeId={id} readOnly={false} />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-600" />
                Reject Store
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
                      <span className="text-sm font-medium">{report.name}</span>
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
                      placeholder="Please provide reason for rejection..."
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
                      className="w-full sm:w-auto px-6 py-2.5 border-gray-300 hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() =>
                        processStore("reject", {
                          action: "reject",
                          approval_notes: comments,
                        })
                      }
                      disabled={rejectLoading || !comments.trim()}
                      className={`w-full sm:w-auto px-6 py-2.5 font-medium transition-all duration-20 bg-red-600 hover:bg-red-700 text-white shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {rejectLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Rejecting...
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject Store
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}

export default ProcessStorePage;
