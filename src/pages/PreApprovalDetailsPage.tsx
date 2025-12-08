import { useEffect, useState } from "react";
import CreatePreApprovalForm from "@/components/pre-approval/CreatePreApprovalForm";
import { preApprovalService } from "@/services/preApprovalService";
import { ApprovalWorkflow } from "@/types/expense";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Activity,
  Calendar,
  CheckCircle,
  Clock,
  FileText,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store/authStore";
import { formatDate, getStatusColor } from "@/lib/utils";
import { WorkflowTimeline } from "@/components/expenses/WorkflowTimeline";
import { Separator } from "@/components/ui/separator";
import { usePreApprovalStore } from "@/store/preApprovalStore";

function PreApprovalDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const { selectedPreApproval } = usePreApprovalStore();

  // const [report, setReport] = useState<PreApprovalType | null>(null);
  const report = selectedPreApproval;
  const [approvalWorkflow, setApprovalWorkflow] =
    useState<ApprovalWorkflow | null>(null);

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

    if (!userStep && report?.status) {
      // user not part of approval chain → show global status or UNDER_REVIEW
      return report?.status;
    }

    // 4️⃣ If user’s step hasn’t started yet → UNDER_REVIEW
    // const userStepOrder = userStep?.step_order;
    // const currentStepOrder = approvalWorkflow.current_step;

    // if (userStepOrder > currentStepOrder) return 'UNDER_REVIEW';

    // 5️⃣ Otherwise, user’s step is active but pending
    // if (userStep.status === 'PENDING' || userStep.status === 'PENDING_APPROVAL') {
    //     return 'PENDING';
    // }

    // 6️⃣ Fallback to report’s overall status or UNDER_REVIEW
    return report?.status || "";
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

  const getPreApprovalById = async (id: string) => {
    try {
      if (report?.status !== "COMPLETE" && report?.status !== "INCOMPLETE") {
        const approvalWorkflowRes: any =
          await preApprovalService.getPreApprovalWorkflow(id);
        setApprovalWorkflow(approvalWorkflowRes.data.data);
      }
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    if (id) {
      getPreApprovalById(id);
    }
  }, [id]);
  return (
    <>
            <div>
          <h1 className="text-2xl font-bold mb-6">Pre Approval Details</h1>
        </div>
      {report?.status === "COMPLETE" || report?.status === "INCOMPLETE" ? (
        <CreatePreApprovalForm mode="view" showHeader={false} />
      ) : (
        <div className="space-y-6">
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-gray-700">
                  {report?.title}
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
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="col-span-1 lg:col-span-2 space-y-6">
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Report Information
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
                        <Badge
                          className={getStatusColor(getUserSpecificStatus())}
                        >
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
              </div>

              <div className="lg:col-span-2">
                <CreatePreApprovalForm mode="view" showHeader={false} maxWidth="w-full" />
              </div>
            </div>

            {approvalWorkflow && approvalWorkflow.approval_steps && (
              <div>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Approval Workflow Timeline
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <WorkflowTimeline approvalWorkflow={approvalWorkflow} />
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default PreApprovalDetailsPage;
