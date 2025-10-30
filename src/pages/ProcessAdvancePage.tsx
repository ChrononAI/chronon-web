import { WorkflowTimeline } from "@/components/expenses/WorkflowTimeline";
import { Layout } from "@/components/layout/Layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatDate, getStatusColor } from "@/lib/utils";
import { AdvanceService } from "@/services/advanceService";
import { useAdvanceStore } from "@/store/advanceStore";
import { useAuthStore } from "@/store/authStore";
import { ApprovalWorkflow } from "@/types/expense";
import { Activity, Calendar, CheckCircle, Clock, FileText, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

function ProcessAdvancePage() {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const { user } = useAuthStore();
    const { selectedAdvanceToApprove } = useAdvanceStore();

    // const [report, setReport] = useState<PreApprovalType | null>(null);
    const report = selectedAdvanceToApprove;

    const [approvalWorkflow, setApprovalWorkflow] = useState<ApprovalWorkflow | null>(null);

    const getUserSpecificStatus = (): string => {
        if (!user || !approvalWorkflow || !approvalWorkflow.approval_steps) {
            return report?.status || 'UNDER_REVIEW';
        }
        const currentUserId = user.id.toString();
        const userStep = approvalWorkflow.approval_steps.find(step =>
            step.approvers.some(approver => approver.user_id === currentUserId)
        );
        if (!userStep) {
            return report?.status || 'UNDER_REVIEW';
        }
        return userStep.status === 'APPROVED' ? 'APPROVED' : userStep.status === 'REJECTED' ? 'REJECTED' : 'UNDER_REVIEW';
    };

    const getStatusIcon = (status: string) => {
        switch (status.toUpperCase()) {
            case 'APPROVED':
            case 'FULLY_APPROVED':
                return <CheckCircle className="h-5 w-5 text-green-600" />;
            case 'PENDING':
            case 'PENDING_APPROVAL':
                return <Clock className="h-5 w-5 text-yellow-600" />;
            case 'REJECTED':
                return <XCircle className="h-5 w-5 text-red-600" />;
            default:
                return <Activity className="h-5 w-5 text-blue-600" />;
        }
    };

    const getAdvance = async (id: string) => {
        try {
            const approvalWorkflowRes: any = await AdvanceService.getAdvanceWorkflow(id);
            setApprovalWorkflow(approvalWorkflowRes.data.data);
        } catch (error) {
            console.log(error);
        }
    }

    useEffect(() => {
        if (id) getAdvance(id);
    }, [id])

    const handleAction = async (action: string) => {
        if (!selectedAdvanceToApprove?.id) return;
        try {
            const res = await AdvanceService.processAdvance({ id: selectedAdvanceToApprove.id, action });
            console.log(res);
            setTimeout(() => {
                navigate('/approvals/advances');
            }, 100);
            if (action === 'approve') {
                toast.success('Expense approved successfully');
            } else {
                toast.success('Expense rejected successfully');
            }
        } catch (error) {
            console.log(error);
            toast.error('Failed to process expense');
        }
    }
    return (
        <Layout>
            <div className="space-y-6">
                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-semibold text-gray-700">{report?.title}</h1>
                            <div className="flex items-center gap-3 mt-2">
                                {getStatusIcon(getUserSpecificStatus())}
                                <Badge className={`${getStatusColor(getUserSpecificStatus())} text-sm px-3 py-1`}>
                                    {getUserSpecificStatus().replace('_', ' ')}
                                </Badge>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                onClick={() => handleAction('approve')}
                                //   disabled={actionLoading}
                                className="bg-green-600 hover:bg-green-700"
                            >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Approve Expense
                            </Button>
                            <Button
                                onClick={() => handleAction('reject')}
                                //   disabled={actionLoading}
                                className="bg-red-600 hover:bg-red-700"
                            >
                                <XCircle className="h-4 w-4 mr-2" />
                                Reject Expense
                            </Button>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                                        <p className="text-lg font-semibold">{report?.created_by.email}</p>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                            <Activity className="h-4 w-4" />
                                            Status
                                        </div>
                                        <Badge className={getStatusColor(getUserSpecificStatus())}>
                                            {getUserSpecificStatus().replace('_', ' ')}
                                        </Badge>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                            <Calendar className="h-4 w-4" />
                                            Created Date
                                        </div>
                                        <p className="text-lg font-semibold">{report?.created_at && formatDate(report.created_at)}</p>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                            <Calendar className="h-4 w-4" />
                                            Submitted Date
                                        </div>
                                        <p className="text-lg font-semibold">{report?.created_at ? formatDate(report.created_at) : 'Not submitted'}</p>
                                    </div>
                                </div>

                                <Separator />

                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                        <FileText className="h-4 w-4" />
                                        Description
                                    </div>
                                    <div className="bg-muted/30 rounded-lg p-4">
                                        <p className="text-sm leading-relaxed">{report?.description}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
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
        </Layout>
    )
}

export default ProcessAdvancePage