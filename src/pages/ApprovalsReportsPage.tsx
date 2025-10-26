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
import { toast } from "sonner";
import { ReportsPageWrapper } from "@/components/reports/ReportsPageWrapper";

export function ApprovalsReportsPage() {
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"unsubmitted" | "submitted">("unsubmitted");
  // const [statusFilter, setStatusFilter] = useState("all");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();

  useEffect(() => {
    fetchReportsForApproval();
  }, [activeTab]);

  const fetchReportsForApproval = async () => {
    setLoading(true);
    try {
      let data;
      if (activeTab === "unsubmitted") {
        // Pending tab - show IN_PROGRESS reports (these are UNDER_REVIEW in the response)
        data = await approvalService.getReportsByStatus("IN_PROGRESS");
      } else {
        // Processed tab - show APPROVED and REJECTED reports
        data = await approvalService.getReportsByStatus("APPROVED,REJECTED");
      }
      setReports(data);
    } catch (error) {
      console.error("Failed to fetch reports for approval", error);
      toast.error("Failed to fetch reports for approval");
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (reportId: string) => {
    // Navigate to report details with approval context
    navigate(`/reports/${reportId}?from=approvals`);
  };


  // Filter reports based on search term and filters
  const filteredReports = (reports || []).filter((report) => {
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
    { key: "unsubmitted", label: "Pending", count: 0 },
    { key: "submitted", label: "Processed", count: 0 }
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
