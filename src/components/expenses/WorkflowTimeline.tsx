import { CheckCircle, Clock, Circle, XCircle } from 'lucide-react';
import { ApprovalWorkflow } from '@/types/expense';
import { formatDate, getWorkflowStatusColor } from '@/lib/utils';

interface WorkflowTimelineProps {
  approvalWorkflow: ApprovalWorkflow;
}

export function WorkflowTimeline({ approvalWorkflow }: WorkflowTimelineProps) {
  const getStatusIcon = (status: string) => {
    switch (status.toUpperCase()) {
      case 'APPROVED':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'PENDING':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'IN_PROGRESS':
        return <Clock className="h-5 w-5 text-blue-600" />;
      case 'REJECTED':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Circle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'APPROVED':
        return 'border-green-300 bg-green-50';
      case 'PENDING':
        return 'border-yellow-300 bg-yellow-50';
      case 'IN_PROGRESS':
        return 'border-blue-300 bg-blue-50';
      case 'REJECTED':
        return 'border-red-300 bg-red-50';
      default:
        return 'border-gray-300 bg-gray-50';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Approval Workflow</h3>
        <div className="text-sm text-muted-foreground">
          Step {approvalWorkflow.current_step} of {approvalWorkflow.total_steps}
        </div>
      </div>
      <div className="space-y-4">
        {approvalWorkflow.approval_steps && approvalWorkflow.approval_steps.length > 0 ? (
          approvalWorkflow.approval_steps.map((step, index) => (
            <div key={step.step_id} className="flex items-start space-x-4">
              <div className="flex flex-col items-center">
                {getStatusIcon(step.status)}
                {index < (approvalWorkflow.approval_steps?.length || 0) - 1 && (
                  <div className="w-px h-8 bg-gray-300 mt-2" />
                )}
              </div>
              <div className={`flex-1 border rounded-lg p-4 ${getStatusColor(step.status)}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium">
                      {step.approvers[0] ? 
                        `${step.approvers[0].first_name || ''} ${step.approvers[0].last_name || ''}` : 
                        step.step_name
                      }
                    </h4>
                    {step.approvers[0] && (
                      <div className="text-sm text-muted-foreground mt-1">
                        {step.approvers[0].email}
                      </div>
                    )}
                    <div className="mt-2 flex items-center gap-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getWorkflowStatusColor(step.status)}`}>
                        {step.status.replace('_', ' ')}
                      </span>
                      {step.approved_at && <span className="text-sm">{formatDate(step.approved_at)}</span>}
                    </div>
                    <div className="mt-2 text-gray-600 italic text-sm">
                      {step.approver_note[0]?.notes || ''}
                    </div>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <p>Step {step.step_order}</p>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>No approval workflow steps available</p>
          </div>
        )}
      </div>
    </div>
  );
}