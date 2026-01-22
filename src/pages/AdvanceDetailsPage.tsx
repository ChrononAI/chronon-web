import { useEffect, useState } from "react";
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
import { formatDate, generateIdWithPrefix, getStatusColor } from "@/lib/utils";
import { WorkflowTimeline } from "@/components/expenses/WorkflowTimeline";
import { Separator } from "@/components/ui/separator";
import { useAdvanceStore } from "@/store/advanceStore";
import { CreateAdvanceForm } from "@/components/advances/CreateAdvanceForm";
import { AdvanceService } from "@/services/advanceService";
import { userService } from "@/services/admin/userService";

function AdvanceDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const { selectedAdvance } = useAdvanceStore();

  const report = selectedAdvance;
  const [approvalWorkflow, setApprovalWorkflow] =
    useState<ApprovalWorkflow | null>(null);

  const getUserSpecificStatus = (): string => {
    if (!user || !approvalWorkflow?.approval_steps?.length) {
      return report?.status || "UNDER_REVIEW";
    }

    const currentUserId = user.id.toString();
    const steps = approvalWorkflow.approval_steps;

    const anyRejected = steps.some((step) => step.status === "REJECTED");
    if (anyRejected) return "REJECTED";

    const userStep = steps.find((step) =>
      step.approvers?.some((a) => a.user_id?.toString() === currentUserId)
    );

    if (!userStep) {
      return report?.status || "UNDER_REVIEW";
    }

    const userStepOrder = userStep.step_order;
    const currentStepOrder = approvalWorkflow.current_step;

    if (userStepOrder > currentStepOrder) return "PENDING_APPROVAL";

    if (
      userStep.status === "PENDING" ||
      userStep.status === "PENDING_APPROVAL"
    ) {
      return "PENDING";
    }

    return report?.status || "PENDING_APPROVAL";
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

  const getAdvanceById = async (advId: string) => {
    try {
      if (report?.status !== "COMPLETE" && report?.status !== "INCOMPLETE") {
        const approvalWorkflowRes: any =
          await AdvanceService.getAdvanceWorkflow(advId);

        let userDetails;
        if (selectedAdvance?.user_id) {
          userDetails = await userService.getUserById(selectedAdvance?.user_id);
        }
        const { id, first_name, last_name, username, email } =
          userDetails?.data.data;
        const createdAtStep = {
          approved_at: selectedAdvance?.created_at,
          approver_note: [],
          approvers: [
            {
              approved_at: selectedAdvance?.created_at,
              approver_note: [
                {
                  approver_id: 34,
                  notes: null,
                  status: "APPROVED",
                  timestamp: "2025-12-08T08:12:54.088183",
                },
              ],
              email: email,
              first_name: first_name,
              last_name: last_name,
              user_id: id.toString(),
              username: username,
            },
          ],
          status: "CREATED",
          step_id: generateIdWithPrefix("wes"),
          step_name: "Creation",
          step_order: 0,
        };
        const newSteps = [
          createdAtStep,
          ...approvalWorkflowRes.data.data.approval_steps,
        ];
        const newApprovalWorkflow = {
          ...approvalWorkflowRes.data.data,
          approval_steps: newSteps,
        };

        setApprovalWorkflow(newApprovalWorkflow);
      }
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    if (id) {
      getAdvanceById(id);
    }
  }, [id]);
  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Advance Details</h1>
      </div>
      {report?.status === "COMPLETE" || report?.status === "INCOMPLETE" ? (
        <CreateAdvanceForm mode="view" showHeader={false} />
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
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Advance Information
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
                        {report?.created_by?.email}
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
              <div className="lg:col-span-2">
                <CreateAdvanceForm
                  mode="view"
                  showHeader={false}
                  maxWidth="w-full"
                />
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

export default AdvanceDetailsPage;
