import {
  Circle,
  ScanEye,
  FileCheck,
  FileOutput,
  FileClock,
  FileX,
} from "lucide-react";
import { ApprovalWorkflow } from "@/types/expense";
import { formatDate, getStatusColor } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { Badge } from "../ui/badge";
import { useAuthStore } from "@/store/authStore";

interface WorkflowTimelineProps {
  approvalWorkflow: ApprovalWorkflow;
}

export function WorkflowTimeline({ approvalWorkflow }: WorkflowTimelineProps) {
  const { user } = useAuthStore();

  const getStatusIcon = (status: string) => {
    switch (status.toUpperCase()) {
      case "APPROVED":
        return <FileCheck className="h-5 w-5 text-green-600" />;
      case "PENDING":
        return <FileClock className="h-5 w-5 text-gray-600" />;
      case "IN_PROGRESS":
        return <ScanEye className="h-5 w-5 text-purple-600" />;
      case "SENT_BACK":
        return <FileOutput className="h-5 w-5 text-orange-600" />;
      case "REJECTED":
        return <FileX className="h-5 w-5 text-red-600" />;
      default:
        return <Circle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getText = ({
    status,
    firstName,
    lastName,
  }: {
    status: string;
    firstName: string;
    lastName: string;
  }) => {
    switch (status) {
      case "PENDING":
        return `To be reviewed by ${firstName} ${lastName}`;
      case "IN_PROGRESS":
        return `Under review by ${firstName} ${lastName}`;
      case "APPROVED":
        return `Approved by ${firstName} ${lastName}`;
      case "REJECTED":
        return `Rejected by ${firstName} ${lastName}`;
      case "SENT_BACK":
        return `Sent back by ${firstName} ${lastName}`;
      default:
        return `${status.split("_").join(" ")} by ${firstName} ${lastName}`;
    }
  };

  return (
    <div className="space-y-4">
      {approvalWorkflow?.approval_steps?.length > 0 ? (
        approvalWorkflow.approval_steps.map((step, index) => {
          const approvers = step.approvers || [];
          const primaryApprover = approvers.find((u) => +u.user_id === user?.id) || approvers[0] || {};

          const approvedAt = step.approved_at || step.approved_at || null;

          const note =
            step.approver_note?.[0]?.notes ||
            step.approver_note?.[0]?.notes ||
            "";
 
          const isMulti = approvers.length > 1;
            
          let normalView = !isMulti || approvalWorkflow.workflow_status === "COMPLETED";
          let multiView = isMulti && approvalWorkflow.workflow_status === "RUNNING";

          return (
            <div key={index} className="flex items-start space-x-4">
              {/* Status Icon + Connector */}
              <div className="flex flex-col items-center">
                {getStatusIcon(step.status)}

                {index < approvalWorkflow.approval_steps.length - 1 && (
                  <div className="w-px h-8 bg-gray-300 mt-2" />
                )}
              </div>

              {/* Step Content */}
              <div className="flex-1">
                {/* ----------- SINGLE APPROVER UI (same as original) ----------- */}
                {(normalView) && (
                  <>
                    <div className="flex items-center gap-2 justify-between">
                      <div className="flex items-center justify-between text-sm">
                        {getText({
                          status: step.status,
                          firstName: primaryApprover.first_name || "",
                          lastName: primaryApprover.last_name || "",
                        })}
                      </div>
                      {approvedAt && (
                        <span className="text-[12px]">
                          {formatDate(approvedAt)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      {primaryApprover.email && (
                        <div className="text-[12px] text-muted-foreground mt-1">
                          {primaryApprover.email}
                        </div>
                      )}
                    </div>

                    {note && (
                      <TooltipProvider>
                        <Tooltip delayDuration={50}>
                          <TooltipTrigger asChild>
                            <span className="mt-1 block text-gray-600 italic text-[12px] truncate max-w-72 overflow-hidden">
                              "{note.trim()}"
                            </span>
                          </TooltipTrigger>

                          <TooltipContent
                            className="bg-gray-100 border-gray-300 text-black"
                            side="bottom"
                          >
                            <p>{note}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </>
                )}
                {/* ----------- MULTI APPROVER UI (new) ----------- */}
                {multiView && (
                  <div className="space-y-2">
                    <div className="text-sm flex items-center gap-2 justify-between">
                      <div className="text-sm flex items-center gap-2">
                        <span>PARALLEL APPROVAL</span>
                        <span>
                          <Badge className={getStatusColor(step.status)}>
                            {step.status.replace("_", " ")}
                          </Badge>
                        </span>
                      </div>
                      {approvedAt && (
                        <div className="text-[12px]">
                          {formatDate(approvedAt)}
                        </div>
                      )}
                    </div>
                    <div className="text-left text-[14px] space-y-1">
                      {approvers.map((a) => (
                        <div key={a.user_id}>
                          <span>{`${a.first_name} ${a.last_name} `}</span>
                          <span className="text-[12px] text-muted-foreground">{`(${a.email})`}</span>
                        </div>
                      ))}
                    </div>
                    {note && (
                      <TooltipProvider>
                        <Tooltip delayDuration={50}>
                          <TooltipTrigger asChild>
                            <span className="block text-gray-600 italic text-[12px] truncate max-w-72 overflow-hidden">
                              "{note.trim()}"
                            </span>
                          </TooltipTrigger>

                          <TooltipContent
                            className="bg-gray-100 border-gray-300 text-black"
                            side="bottom"
                          >
                            <p>{note}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <p>No approval workflow steps available</p>
        </div>
      )}
    </div>
  );
}
