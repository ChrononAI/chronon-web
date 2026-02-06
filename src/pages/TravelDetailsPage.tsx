import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { travelService, TravelRequest } from "@/services/travelService";
import { reportService } from "@/services/reportService";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getStatusColor, formatDate, formatCurrency } from "@/lib/utils";
import { Loader2, PlusCircle, CheckSquare, Square } from "lucide-react";
import { AdminUpdateModal } from "@/components/travel/AdminUpdateModal";
import { useAuthStore } from "@/store/authStore";
import { AdminUpdateTripDetailModal } from "@/components/travel/AdminUpdateTripDetailModal";

export function TravelDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [request, setRequest] = useState<TravelRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [approvers, setApprovers] = useState<any[]>([]);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [linkedReport, setLinkedReport] = useState<any>(null);
  
  // New state for trip detail modal
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTripDetail, setSelectedTripDetail] = useState<any>(null);
  
  // State for unassigned expenses
  const [unassignedExpenses, setUnassignedExpenses] = useState<any[]>([]);
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<string[]>([]);
  const [addingExpenses, setAddingExpenses] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        const [reqData, approversData] = await Promise.all([
          travelService.getTravel(id),
          travelService.getApprovers(id).catch(() => []) 
        ]);
        
        // Fetch linked report
        let hasLinkedReport = false;
        try {
            const reportResp = await reportService.listUserReports({ trip_id: id });
            if (reportResp.success && reportResp.jobs && reportResp.jobs.length > 0) {
                setLinkedReport(reportResp.jobs[0]);
                hasLinkedReport = true;
            }
        } catch (e) {
            console.error("Failed to fetch linked report", e);
        }

        setRequest(reqData);
        setApprovers(approversData?.data || approversData || []);
        
        // Fetch unassigned expenses if there's a linked report
        if (hasLinkedReport) {
          const expenses = await reportService.getUnassignedExpenses();
          setUnassignedExpenses(expenses);
        }
      } catch (error) {
        toast.error("Failed to load travel request");
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleAction = async (action: "submit" | "approve" | "reject") => {
    if (!id) return;
    setProcessing(true);
    try {
      if (action === "submit") {
        await travelService.submitTravel(id);
        toast.success("Travel request submitted successfully");
      } else {
         // For approve/reject we might need comments, simplified for now
        await travelService.performAction(id, action, {}); 
        toast.success(`Travel request ${action}ed successfully`);
      }
      // Reload data
      const updated = await travelService.getTravel(id);
      setRequest(updated);
    } catch (error: any) {
      toast.error(error.message || `Failed to ${action} request`);
    } finally {
      setProcessing(false);
    }
  };

  const handleEditDetail = (detail: any) => {
    setSelectedTripDetail(detail);
    setShowDetailModal(true);
  };
  
  const handleAddExpensesToReport = async () => {
    if (!id || selectedExpenseIds.length === 0) return;
    
    setAddingExpenses(true);
    try {
      const result = await travelService.addExpensesToTravel(id, selectedExpenseIds);
      toast.success(`Added ${result.data.updated_count} expenses to report`);
      
      // Refresh data
      const expenses = await reportService.getUnassignedExpenses();
      setUnassignedExpenses(expenses);
      setSelectedExpenseIds([]);
    } catch (error: any) {
      toast.error(error.message || "Failed to add expenses");
    } finally {
      setAddingExpenses(false);
    }
  };
  
  const toggleExpenseSelection = (expenseId: string) => {
    setSelectedExpenseIds(prev => 
      prev.includes(expenseId) 
        ? prev.filter(id => id !== expenseId)
        : [...prev, expenseId]
    );
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
  if (!request) return <div className="p-8">Travel request not found</div>;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      <div className="flex justify-between items-center">
        <div>
           <h1 className="text-2xl font-bold">{request.trip_name}</h1>
           <p className="text-gray-500">ID: {request.id}</p>
        </div>
         <div className="flex items-center gap-4">
             <Badge className={getStatusColor(request.status)}>
                {request.status?.replace("_", " ") || "DRAFT"}
             </Badge>
             
             {request.status === "DRAFT" && (
                <>
                  <Button variant="outline" onClick={() => navigate(`/requests/travels/${id}/edit`)}>
                    Edit
                  </Button>
                  <Button onClick={() => handleAction("submit")} disabled={processing}>
                    {processing ? "Submitting..." : "Submit for Approval"}
                  </Button>
                </>
             )}
             
             {request.status === "PENDING_APPROVAL" && (() => {
               // Check if current user is an approver for any IN_PROGRESS step
               const isApprover = approvers.some((workflow: any) => 
                 workflow.approval_steps?.some((step: any) => 
                   step.status === "IN_PROGRESS" && 
                   step.approvers?.some((approver: any) => approver.user_id === user?.id?.toString())
                 )
               );
               
               return isApprover ? (
                 <>
                   <Button variant="outline" onClick={() => handleAction("reject")} disabled={processing} className="border-red-500 text-red-500 hover:bg-red-50">
                     Reject
                   </Button>
                   <Button onClick={() => handleAction("approve")} disabled={processing} className="bg-green-600 hover:bg-green-700">
                     Approve
                   </Button>
                 </>
               ) : null;
             })()}
             
             {(user?.role === "ADMIN" || user?.role === "SUPER_ADMIN") && (
              <Button variant="outline" onClick={() => setShowAdminModal(true)}>
               Amount and Attachments
             </Button>
              )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
           <CardHeader><CardTitle>Trip Overview</CardTitle></CardHeader>
           <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="font-semibold">Traveller:</span>
                <span>{request.employee_id} ({request.traveller_name_as_id_proof})</span>
              </div>
               <div className="flex justify-between">
                <span className="font-semibold">Source:</span>
                <span>{request.source}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Destination:</span>
                <span>{request.destination}</span>
              </div>
               <div className="flex justify-between">
                <span className="font-semibold">Created:</span>
                <span>{request.created_at ? formatDate(request.created_at) : "-" }</span>
              </div>
              {request.description && (
                  <div className="pt-2">
                    <span className="font-semibold block">Description:</span>
                    <p className="text-sm text-gray-600">{request.description}</p>
                  </div>
              )}
              
              {/* Admin Section */}
              <div className="pt-4 border-t mt-4">
                 <h3 className="font-semibold mb-2">Admin Details</h3>
                 <div className="space-y-2">
                    <div className="flex justify-between">
                        <span className="text-gray-600">Approved Amount:</span>
                        <span className="font-medium">{request.admin_amount ? request.admin_amount : "-"}</span>
                    </div>
                    {request.admin_notes && (
                         <div>
                            <span className="text-gray-600 block">Admin Notes:</span>
                            <p className="text-sm">{request.admin_notes}</p>
                         </div>
                    )}
                    {request.file_ids && request.file_ids.length > 0 && (
                        <div>
                             <span className="text-gray-600 block mb-1">Attachments:</span>
                             <div className="flex flex-wrap gap-2">
                                 {request.file_ids.map((fileId, idx) => (
                                     <Badge key={idx} variant="secondary" className="cursor-pointer" onClick={() => window.open(`/api/files/${fileId}`, '_blank')}>
                                         File {idx + 1}
                                     </Badge>
                                 ))}
                             </div>
                        </div>
                    )}
                 </div>
              </div>
           </CardContent>
        </Card>
        
        {/* Linked Report */}
        {linkedReport && (
            <Card>
                <CardHeader><CardTitle>Expense Report</CardTitle></CardHeader>
                <CardContent>
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <div className="font-semibold text-lg">{linkedReport.title}</div>
                            <div className="text-sm text-gray-500">{linkedReport.custom_report_id || linkedReport.id}</div>
                        </div>
                        <Badge variant="outline">{linkedReport.status}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                         <div className="text-sm">
                            Total Amount: <span className="font-medium">{linkedReport.total_amount}</span>
                         </div>
                         <Button variant="ghost" size="sm" onClick={() => navigate(`/reports/${linkedReport.id}`)}>
                             View Report
                         </Button>
                    </div>
                </CardContent>
            </Card>
        )}
        
        {/* Unassigned Expenses - Show only if there's a linked report */}
        {linkedReport && unassignedExpenses.length > 0 && (
            <Card className="col-span-2">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Add Expenses to Report</CardTitle>
                        <Button 
                            size="sm" 
                            onClick={handleAddExpensesToReport}
                            disabled={selectedExpenseIds.length === 0 || addingExpenses}
                        >
                            {addingExpenses ? "Adding..." : `Add ${selectedExpenseIds.length} to Report`}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {unassignedExpenses.map((expense) => (
                            <div 
                                key={expense.id}
                                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                                onClick={() => toggleExpenseSelection(expense.id)}
                            >
                                <div className="flex items-center gap-3">
                                    {selectedExpenseIds.includes(expense.id) ? (
                                        <CheckSquare className="h-5 w-5 text-blue-600" />
                                    ) : (
                                        <Square className="h-5 w-5 text-gray-400" />
                                    )}
                                    <div>
                                        <div className="font-medium">{expense.vendor || expense.description || "Expense"}</div>
                                        <div className="text-sm text-gray-500">
                                            {expense.category_name} • {expense.expense_date}
                                        </div>
                                    </div>
                                </div>
                                <div className="font-semibold">{formatCurrency(expense.amount)}</div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        )}
        
        {/* Approvals Timeline */}
        <Card>
            <CardHeader><CardTitle>Approval Flow</CardTitle></CardHeader>
            <CardContent>
                {approvers.length > 0 ? (
                  <div className="space-y-4">
                    {approvers.map((workflow: any, wfIdx: number) => (
                      <div key={wfIdx}>
                        <div className="text-sm font-semibold mb-2">
                          Workflow Status: <Badge className="ml-2">{workflow.workflow_status}</Badge>
                        </div>
                        {workflow.approval_steps?.map((step: any, stepIdx: number) => (
                          <div key={stepIdx} className="mb-3 pl-4 border-l-2 border-gray-200">
                            <div className="font-medium text-sm">{step.step_name || `Step ${stepIdx + 1}`}</div>
                            <div className="text-xs text-gray-500 mb-1">
                              Status: <Badge variant="outline" className="ml-1">{step.status}</Badge>
                            </div>
                            {step.approvers && step.approvers.length > 0 && (
                              <div className="text-xs text-gray-600 mt-1">
                                Approvers: {step.approvers.map((a: any) => `${a.first_name} ${a.last_name}`).join(", ")}
                              </div>
                            )}
                            {step.approved_at && (
                              <div className="text-xs text-gray-500">
                                Completed: {formatDate(step.approved_at)}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">No approval flow started yet.</p>
                )}
            </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Itinerary</CardTitle></CardHeader>
        <CardContent>
           <div className="space-y-4">
              {request.trip_details?.map((leg, idx) => (
                  <div key={leg.id || idx} className="border rounded p-4 bg-gray-50 relative">
                      <div className="flex justify-between mb-2">
                         <div className="font-semibold">{leg.mode_of_travel} - {leg.trip_type?.replace("_", " ") || "Single Trip"}</div>
                         <div className="text-sm">{leg.departure_date} {leg.return_date ? `to ${leg.return_date}` : ""}</div> 
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                         <div>From: <span className="font-medium">{leg.source}</span></div>
                         <div>To: <span className="font-medium">{leg.destination}</span></div>
                         {leg.accommodation_required && <div>Accommodation Required</div>}
                         {leg.advance_required && <div>Advance: {leg.advance_amount}</div>}
                         {leg.special_instruction && <div className="col-span-2 text-gray-600 italic">Note: {leg.special_instruction}</div>}
                         
                         {/* Admin Details for Leg */}
                         {(leg.admin_amount || leg.admin_notes || (leg.admin_file_ids && leg.admin_file_ids.length > 0)) && (
                            <div className="col-span-2 border-t pt-2 mt-2">
                                <p className="font-semibold text-xs text-gray-500 mb-1">Admin Info:</p>
                                {leg.admin_amount && <div>Amount: {leg.admin_amount}</div>}
                                {leg.admin_notes && <div className="italic text-xs">{leg.admin_notes}</div>}
                                {leg.admin_file_ids && leg.admin_file_ids.length > 0 && (
                                     <div className="flex flex-wrap gap-1 mt-1">
                                        {leg.admin_file_ids.map((fid: any, i: number) => (
                                            <Badge key={i} variant="outline" className="text-[10px] h-5 cursor-pointer" onClick={() => window.open(`/api/files/${fid}`, '_blank')}>File {i+1}</Badge>
                                        ))}
                                     </div>
                                )}
                            </div>
                         )}
                      </div>
                      
                      {(user?.role === "ADMIN" || user?.role === "SUPER_ADMIN") && (
                        <div className="mt-4 flex justify-end">
                            <Button variant="outline" size="sm" onClick={() => handleEditDetail(leg)}>
                                Amount and Attachments
                            </Button>
                        </div>
                     )}
                  </div>
              ))}
           </div>
        </CardContent>
      </Card>


      <AdminUpdateModal
        open={showAdminModal}
        onClose={() => setShowAdminModal(false)}
        travelId={id!}
        currentData={{
          admin_amount: request.admin_amount,
          admin_notes: request.admin_notes,
          file_ids: request.file_ids,
        }}
        onSuccess={async () => {
          const updated = await travelService.getTravel(id!);
          setRequest(updated);
        }}
      />
      
      <AdminUpdateTripDetailModal
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        tripDetail={selectedTripDetail}
        onSuccess={async () => {
          const updated = await travelService.getTravel(id!);
          setRequest(updated);
        }}
      />

    </div>
  );
}
