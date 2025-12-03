import { Circle, ScanEye, FileCheck, FileOutput, FileClock, FileX } from "lucide-react";
import { ApprovalWorkflow } from "@/types/expense";
import { formatDate } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";

interface WorkflowTimelineProps {
  approvalWorkflow: ApprovalWorkflow;
}

export function WorkflowTimeline({ approvalWorkflow }: WorkflowTimelineProps) {
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

  // const getStatusColor = (status: string) => {
  //   switch (status.toUpperCase()) {
  //     case "APPROVED":
  //       return "border-green-300 bg-green-50";
  //     case "PENDING":
  //       return "border-yellow-300 bg-yellow-50";
  //     case "IN_PROGRESS":
  //       return "border-blue-300 bg-blue-50";
  //     case "REJECTED":
  //       return "border-red-300 bg-red-50";
  //     default:
  //       return "border-gray-300 bg-gray-50";
  //   }
  // };

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
      {approvalWorkflow.approval_steps &&
      approvalWorkflow.approval_steps.length > 0 ? (
        approvalWorkflow.approval_steps.map((step, index) => (
          <div key={index} className="flex items-start space-x-4">
            <div className="flex flex-col items-center">
              {getStatusIcon(step.status)}
              {index < (approvalWorkflow.approval_steps?.length || 0) - 1 && (
                <div className="w-px h-8 bg-gray-300 mt-2" />
              )}
            </div>
            <div className={`flex-1`}>
              {/* <div> */}
              <div className="flex items-center justify-between text-sm">
                {getText({
                  status: step.status,
                  firstName: step.approvers[0]?.first_name || "",
                  lastName: step.approvers[0]?.last_name || "",
                })}
              </div>
              <div className="flex items-center justify-between">
                {step.approvers[0] && (
                  <div className="text-[12px] text-muted-foreground mt-1 flex items-center justify-between">
                    {step.approvers[0].email}
                  </div>
                )}
                {step.approved_at ? (
                  <span className="text-[12px]">
                    {formatDate(step.approved_at)}
                  </span>
                ) : (
                  <span className="text-[12px]">Nov 18, 2025</span>
                )}
              </div>
              {step.approver_note[0]?.notes && (
                <TooltipProvider>
                  <Tooltip delayDuration={50}>
                    <TooltipTrigger asChild>
                      <span className="mt-1 block text-gray-600 italic text-[12px] truncate max-w-72 overflow-hidden">
                        "{step.approver_note[0]?.notes.trim()}"
                      </span>
                    </TooltipTrigger>

                    <TooltipContent
                      className="bg-gray-100 border-gray-300 text-black"
                      side="bottom"
                    >
                      <p>{step.approver_note[0]?.notes || ""}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {/* </div> */}
            </div>
          </div>
        ))
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <p>No approval workflow steps available</p>
        </div>
      )}
    </div>
  );
}
