import { useEffect, useState } from 'react';
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Eye, 
  FileText, 
  Calendar, 
  User, 
  Building, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  XCircle,
  IndianRupee,
  Receipt,
  Activity,
  Target
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { approvalService } from '@/services/approvalService';
import { reportService } from '@/services/reportService';
import { ReportWithExpenses, ApprovalWorkflow } from '@/types/expense';
import { formatDate, formatCurrency, getStatusColor } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';
import { WorkflowTimeline } from '@/components/expenses/WorkflowTimeline';

export function ReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isFromApprovals = searchParams.get('from') === 'approvals';
  const { user } = useAuthStore();
  
  const [report, setReport] = useState<ReportWithExpenses | null>(null);
  const [approvalWorkflow, setApprovalWorkflow] = useState<ApprovalWorkflow | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'draft_back' | null>(null);
  const [comments, setComments] = useState('');
  const [showActionDialog, setShowActionDialog] = useState(false);

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

    return userStep.status === 'APPROVED' ? 'APPROVED' :
           userStep.status === 'REJECTED' ? 'REJECTED' :
           'UNDER_REVIEW';
  };

  const fetchReport = async () => {
    if (!id) {
      console.error('Report ID is missing');
      setLoading(false);
      return;
    }
    
    
    try {
      const [reportResponse, workflowResponse] = await Promise.all([
        reportService.getReportWithExpenses(id),
        reportService.getReportApprovalWorkflow(id)
      ]);

      if (reportResponse.success && reportResponse.data) {
        setReport(reportResponse.data);
      } else {
        console.error('Failed to fetch report details:', reportResponse.message);
        toast.error(reportResponse.message || 'Failed to fetch report details');
      }

      if (workflowResponse.success && workflowResponse.data) {
        setApprovalWorkflow(workflowResponse.data);
      } else {
        console.warn('Failed to fetch approval workflow:', workflowResponse.message);
      }
    } catch (error) {
      console.error('Failed to fetch report details', error);
      toast.error('Failed to fetch report details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [id]);

  // Redirect to edit mode if report is DRAFT
  useEffect(() => {
    if (report && report.status === 'DRAFT' && !isFromApprovals) {
      navigate('/reports/create', {
        state: {
          editMode: true,
          reportData: {
            id: report.id,
            title: report.title,
            description: report.description,
            custom_attributes: report.custom_attributes,
            expenses: report.expenses
          }
        },
        replace: true
      });
    }
  }, [report, isFromApprovals, navigate]);

  const handleAction = (type: 'approve' | 'reject' | 'draft_back') => {
    setActionType(type);
    setComments('');
    setShowActionDialog(true);
  };

  const executeAction = async () => {
    if (!report || !actionType) return;

    if (!comments.trim()) {
      toast.error('Comments are required');
      return;
    }

    setActionLoading(true);
    try {
      let result;
      if (actionType === 'approve') {
        result = await approvalService.approveReport(report.id, comments);
      } else if (actionType === 'reject') {
        result = await approvalService.rejectReport(report.id, comments);
      } else if (actionType === 'draft_back') {
        result = await approvalService.draftBackReport(report.id, comments);
      }

      if (result && result.success) {
        toast.success(result.message);
        setShowActionDialog(false);
        // Refresh data
        await fetchReport();
      } else {
        toast.error(result?.message || 'Action failed');
      }
    } catch (error) {
      console.error(`Failed to ${actionType} report`, error);
      toast.error(`Failed to ${actionType} report`);
    } finally {
      setActionLoading(false);
    }
  };

  // Check if user can approve any expense in the report
  const canApproveReport = () => {
    if (!report || !user) return false;
    
    // Check if report is in a state that allows approval
    if (report.status === 'DRAFT' || report.status === 'SUBMITTED') {
      return false; // Can't approve draft or already submitted reports
    }
    
    // Check if there are pending expenses
    const pendingExpenses = report.expenses.filter(exp =>
      exp.status === 'PENDING' || exp.status === 'PENDING_APPROVAL'
    ).length;
    
    // Check if user is in the current approval step
    const isUserInCurrentStep = approvalWorkflow?.approval_steps
      .find(step => step.step_order === approvalWorkflow.current_step)
      ?.approvers.some(approver => approver.user_id === user.id.toString());
    
    return pendingExpenses > 0 && (isUserInCurrentStep || !approvalWorkflow);
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




  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Loading report details...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!report) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto" />
            <div>
              <h3 className="text-lg font-semibold">Report Not Found</h3>
              <p className="text-muted-foreground">The report you're looking for doesn't exist.</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const breadcrumbItems = [
    { label: isFromApprovals ? 'Reports for Approval' : 'My Reports', href: isFromApprovals ? '/approvals/reports' : '/reports' },
    { label: report.title },
  ];


  const totalAmount = report.expenses.reduce((sum, expense) => sum + parseFloat(expense.amount.toString()), 0);
  
  // Calculate expense statistics
  const totalExpenses = report.expenses.length;
  const approvedExpenses = report.expenses.filter(exp => exp.status === 'APPROVED' || exp.status === 'FULLY_APPROVED').length;
  const rejectedExpenses = report.expenses.filter(exp => exp.status === 'REJECTED').length;
  const pendingExpenses = report.expenses.filter(exp => exp.status === 'PENDING' || exp.status === 'PENDING_APPROVAL').length;
  

  return (
    <Layout>
      <div className="space-y-6">
        <Breadcrumb items={breadcrumbItems} />
        
        {/* Action Buttons Header */}
        {isFromApprovals && canApproveReport() && (
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-gray-700">Report: {report?.title}</h1>
                <div className="flex items-center gap-3 mt-2">
                  {getStatusIcon(getUserSpecificStatus())}
                  <Badge className={`${getStatusColor(getUserSpecificStatus())} text-sm px-3 py-1`}>
                    {getUserSpecificStatus().replace('_', ' ')}
                  </Badge>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleAction('draft_back')}
                  disabled={actionLoading}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Draft Back
                </Button>
                <Button
                  onClick={() => handleAction('approve')}
                  disabled={actionLoading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve Report
                </Button>
                <Button
                  onClick={() => handleAction('reject')}
                  disabled={actionLoading}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject Report
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Report Information */}
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
                      Report Title
                    </div>
                    <p className="text-lg font-semibold">{report.title}</p>
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
                    <p className="text-lg font-semibold">{formatDate(report.created_at)}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      Submitted Date
                    </div>
                    <p className="text-lg font-semibold">{report.submitted_at ? formatDate(report.submitted_at) : 'Not submitted'}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <IndianRupee className="h-4 w-4" />
                      Total Amount
                    </div>
                    <p className="text-lg font-semibold">{formatCurrency(totalAmount, 'INR')}</p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    Description
                  </div>
                  <div className="bg-muted/30 rounded-lg p-4">
                    <p className="text-sm leading-relaxed">{report.description}</p>
                  </div>
                </div>

                {/* Custom Attributes */}
                {report.custom_attributes && Object.keys(report.custom_attributes).length > 0 && (
                  <>
                    <Separator />
                    
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Building className="h-5 w-5" />
                        Custom Attributes
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(report.custom_attributes).map(([key, value]) => (
                          <div key={key} className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground capitalize">
                              {key.replace(/_/g, ' ')}
                            </label>
                            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-md">
                              <Target className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{value}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Expenses Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Expenses in this Report ({report.expenses.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="font-semibold">Invoice Number</TableHead>
                        <TableHead className="font-semibold">Category</TableHead>
                        <TableHead className="font-semibold">Amount</TableHead>
                        <TableHead className="font-semibold">Date</TableHead>
                        <TableHead className="font-semibold">Vendor</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                        <TableHead className="text-right font-semibold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.expenses.map((expense) => (
                        <TableRow key={expense.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="font-medium">
                            {expense.invoice_number || expense.description}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Building className="h-4 w-4 text-muted-foreground" />
                              {expense.category}
                            </div>
                          </TableCell>
                          <TableCell className="font-semibold">
                            ₹{parseFloat(expense.amount.toString()).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              {formatDate(expense.expense_date)}
                            </div>
                          </TableCell>
                          <TableCell>{expense.vendor}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(expense.status)}>
                              {expense.status.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" asChild>
                              <Link 
                                to={`/expenses/${expense.id}?from=${isFromApprovals ? 'approvals' : 'report'}&reportId=${report.id}`}
                              >
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Creator Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Report Creator
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">{report.created_by.email}</p>
                    <p className="text-sm text-muted-foreground">Organization ID: {report.org_id}</p>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Created:</span>
                    <span className="font-medium">{formatDate(report.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Updated:</span>
                    <span className="font-medium">{formatDate(report.updated_at)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Submitted:</span>
                    <span className="font-medium">{report.submitted_at ? formatDate(report.submitted_at) : 'Not submitted'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>


            {/* Progress Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Progress Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Completion</span>
                    <span className="font-medium">
                      {totalExpenses > 0 ? 
                        Math.round(((approvedExpenses + rejectedExpenses) / totalExpenses) * 100) 
                        : 0}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-primary h-3 rounded-full transition-all duration-500"
                      style={{ 
                        width: `${totalExpenses > 0 ? 
                          ((approvedExpenses + rejectedExpenses) / totalExpenses) * 100 
                          : 0}%` 
                      }}
                    />
                  </div>
                </div>

                <div className="pt-2 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span>Approved</span>
                    </div>
                    <span className="font-medium">{approvedExpenses}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span>Pending</span>
                    </div>
                    <span className="font-medium">{pendingExpenses}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span>Rejected</span>
                    </div>
                    <span className="font-medium">{rejectedExpenses}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Workflow Timeline */}
        {approvalWorkflow && approvalWorkflow.approval_steps && (
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
        )}
      </div>

      {/* Action Dialog */}
      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionType === 'approve' ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : actionType === 'reject' ? (
                <XCircle className="h-5 w-5 text-red-600" />
              ) : (
                <XCircle className="h-5 w-5 text-orange-600" />
              )}
              {actionType === 'approve' ? 'Approve' : actionType === 'reject' ? 'Reject' : 'Draft Back'} Report
            </DialogTitle>
          </DialogHeader>
          
          {report && (
            <div className="space-y-4">
              <div className="bg-muted/30 rounded-lg p-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Report:</span>
                    <span className="text-sm font-medium">{report.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Value:</span>
                    <span className="text-sm font-medium">
                      {formatCurrency(totalAmount, 'INR')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Pending Expenses:</span>
                    <span className="text-sm font-medium">{pendingExpenses}</span>
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
                    actionType === 'approve' 
                      ? 'Please provide comments for approval...' 
                      : actionType === 'reject'
                      ? 'Please provide reason for rejection...'
                      : 'Please provide reason for sending back to draft...'
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
                    actionType === 'approve'
                      ? 'bg-green-600 hover:bg-green-700 text-white shadow-sm hover:shadow-md'
                      : actionType === 'reject'
                      ? 'bg-red-600 hover:bg-red-700 text-white shadow-sm hover:shadow-md'
                      : 'bg-orange-600 hover:bg-orange-700 text-white shadow-sm hover:shadow-md'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {actionLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      {actionType === 'approve' ? 'Approving...' : actionType === 'reject' ? 'Rejecting...' : 'Sending Back...'}
                    </>
                  ) : (
                    <>
                      {actionType === 'approve' ? (
                        <CheckCircle className="h-4 w-4 mr-2" />
                      ) : (
                        <XCircle className="h-4 w-4 mr-2" />
                      )}
                      {actionType === 'approve' ? 'Approve Report' : actionType === 'reject' ? 'Reject Report' : 'Draft Back'}
                    </>
                  )}
                </Button>
                  </div>
                </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </Layout>
  );
}