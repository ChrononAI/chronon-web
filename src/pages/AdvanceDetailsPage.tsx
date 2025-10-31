import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { ApprovalWorkflow } from '@/types/expense';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Calendar, CheckCircle, Clock, FileText, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/authStore';
import { formatDate, getStatusColor } from '@/lib/utils';
import { WorkflowTimeline } from '@/components/expenses/WorkflowTimeline';
import { Separator } from '@/components/ui/separator';
import { useAdvanceStore } from '@/store/advanceStore';
import { CreateAdvanceForm } from '@/components/advances/CreateAdvanceForm';
import { AdvanceService } from '@/services/advanceService';

function AdvanceDetailsPage() {
    const { id } = useParams<{ id: string }>();
    const { user } = useAuthStore();
    const { selectedAdvance } = useAdvanceStore();

    const report = selectedAdvance;
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

    const getAdvanceById = async (id: string) => {
        try {
            if (report?.status !== 'COMPLETE' && report?.status !== "INCOMPLETE") {
                const approvalWorkflowRes: any = await AdvanceService.getAdvanceWorkflow(id);
                setApprovalWorkflow(approvalWorkflowRes.data.data);
            }
        } catch (error) {
            console.log(error);
        }
    }

    useEffect(() => {
        if (id) {
            getAdvanceById(id);
        };
    }, [id]);
    return (
        <Layout>
            {(report?.status === "COMPLETE" || report?.status === "INCOMPLETE") ? <CreateAdvanceForm mode="view" /> :
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
                    <CreateAdvanceForm mode="view" showHeader={false} /> 
                </div>}
        </Layout>
    )
}

export default AdvanceDetailsPage