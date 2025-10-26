import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { approvalService } from "@/services/approvalService";
import { Report } from "@/types/expense";
import { formatDate, formatCurrency } from "@/lib/utils";
import { ReportsPageWrapper } from "@/components/reports/ReportsPageWrapper";

export function ApprovalsReportsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"unsubmitted" | "submitted">("unsubmitted");
  // const [statusFilter, setStatusFilter] = useState("all");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [pendingReports, setPendingReports] = useState<Report[]>([]);
  const [processedRedports, setProcessedReports] = useState<Report[]>([]);
  
  const fetchUnsubmittedReports = async () => {
    try { 
      const response = await approvalService.getReportsByStatus('IN_PROGRESS');
      setPendingReports(response);
    } catch (error) {
      console.log(error);
    }
  }

   const fetchSubmittedReports = async () => {
    try { 
      const response = await approvalService.getReportsByStatus('APPROVED,REJECTED');
      setProcessedReports(response);
    } catch (error) {
      console.log(error);
    }
  }

  useEffect(() => {
    fetchSubmittedReports();
    fetchUnsubmittedReports();
    setLoading(false);
  }, []);

  const handleViewDetails = (reportId: string) => {
    // Navigate to report details with approval context
    navigate(`/reports/${reportId}?from=approvals`);
  };


  // Filter reports based on search term and filters
  const filteredReports = (activeTab === "submitted" ? processedRedports : pendingReports).filter((report) => {
    const matchesSearch = report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.created_by.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    // const matchesStatus = statusFilter === "all" || report.status.toLowerCase() === statusFilter.toLowerCase();
    
    const matchesDate = !selectedDate || (() => {
      const reportDate = new Date(report.created_at).toISOString().split('T')[0];
      const filterDate = selectedDate.toISOString().split('T')[0];
      return reportDate === filterDate;
    })();
    
    return matchesSearch && matchesDate;
  });


  const tabs = [
    { key: "unsubmitted", label: "Pending", count: pendingReports.length },
    { key: "submitted", label: "Processed", count: processedRedports.length }
  ];

  const statusOptions = [
    { value: "all", label: "All" },
    { value: "pending", label: "Pending" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" }
  ];



  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">
            Loading reports for approval...
          </p>
        </div>
      </div>
    );
  }

  return (
    <ReportsPageWrapper
      title="Approver Dashboard"
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={(tabId) => setActiveTab(tabId as "unsubmitted" | "submitted")}
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      searchPlaceholder="Search reports..."
      statusOptions={statusOptions}
      selectedDate={selectedDate}
      onDateChange={setSelectedDate}
      showDateFilter={true}
    >
      <Card>
        <CardContent className="p-0">
          {filteredReports.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {searchTerm ? "No reports found" : 
                 activeTab === "unsubmitted" ? "No Pending Reports" : "No Processed Reports"}
              </h3>
              <p className="text-muted-foreground">
                {searchTerm 
                  ? "Try adjusting your search terms"
                  : activeTab === "unsubmitted" 
                    ? "There are currently no reports under review."
                    : "There are currently no processed reports."
                }
              </p>
            </div>
          ) : (
            <div className="overflow-hidden">
              <Table>
                <TableHeader className="text-[#64748B]">
                  <TableRow className="bg-gray-100">
                    <TableHead className="font-medium">REPORT NAME</TableHead>
                    <TableHead className="font-medium">SUBMITTER</TableHead>
                    <TableHead className="font-medium">AMOUNT</TableHead>
                    <TableHead className="font-medium">SUBMITTED</TableHead>
                    <TableHead className="font-medium">EXPENSES</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReports.map((report) => (
                    <TableRow
                      key={report.id}
                      className="hover:bg-gray-50 transition-colors"
                      onClick={() => handleViewDetails(report.id)}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium text-gray-900">{report.title}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-gray-900">
                          {report.created_by.email}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-gray-900">
                          {formatCurrency(report.total_amount, "INR")}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p className="text-gray-900">
                          {report.submitted_at ? formatDate(report.submitted_at) : 'Not submitted'}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p className="text-gray-900">
                          {report.expense_count}
                        </p>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </ReportsPageWrapper>
  );
}
