import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle, ChevronLeft, ChevronRight } from "lucide-react";

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
import { formatDate, formatCurrency, getStatusColor } from "@/lib/utils";
import { ReportsPageWrapper } from "@/components/reports/ReportsPageWrapper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PaginationInfo } from "@/store/expenseStore";

export function ApprovalsReportsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"unsubmitted" | "submitted" | "all">("all");
  // const [statusFilter, setStatusFilter] = useState("all");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [allReports, setAllReports] = useState<Report[]>([]);
  const [allReportsPagination, setAllReportsPagination] = useState<PaginationInfo>();
  const [pendingReports, setPendingReports] = useState<Report[]>([]);
  const [pendingReportsPagination, setPendingReportsPagination] = useState<PaginationInfo>();
  const [processedRedports, setProcessedReports] = useState<Report[]>([]);
  const [processedReportsPagination, setProcessedReportsPagination] = useState<PaginationInfo>();
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState<number | null>();
  const pagination = activeTab === "all" ? allReportsPagination : activeTab === "unsubmitted" ? pendingReportsPagination : processedReportsPagination;

  useEffect(() => {
    const calculateRows = () => {
      // Get available height for table area
      const availableHeight = window.innerHeight - 300; // adjust 300px for header/footer, etc.
      const rowHeight = 42; // typical table row height in px
      const possibleRows = Math.floor(availableHeight / rowHeight);
      setPerPage(Math.max(3, possibleRows)); // minimum 3 rows
    };

    calculateRows();
    window.addEventListener("resize", calculateRows);

    return () => window.removeEventListener("resize", calculateRows);

  }, []);

  const fetchAllReports = async () => {
    if (!perPage) return;
    try {
      const response = await approvalService.getAllReports(currentPage, perPage);
      setAllReports(response.data);
      setAllReportsPagination(response.pagination);
    } catch (error) {
      console.log(error);
    }
  }

  const fetchUnsubmittedReports = async () => {
    if (!perPage) return;
    try {
      const response = await approvalService.getReportsByStatus(currentPage, perPage, 'IN_PROGRESS');
      setPendingReports(response.data);
      setPendingReportsPagination(response.pagination);
    } catch (error) {
      console.log(error);
    }
  }

  const fetchSubmittedReports = async () => {
    if (!perPage) return;
    try {
      const response = await approvalService.getReportsByStatus(currentPage, perPage, 'APPROVED,REJECTED');
      setProcessedReports(response.data);
      setProcessedReportsPagination(response.pagination);
    } catch (error) {
      console.log(error);
    }
  }

  useEffect(() => {
    fetchAllReports();
    fetchSubmittedReports();
    fetchUnsubmittedReports();
    setLoading(false);
  }, [perPage]);

  const handleViewDetails = (reportId: string) => {
    // Navigate to report details with approval context
    navigate(`/reports/${reportId}?from=approvals`);
  };
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Filter reports based on search term and filters
  const filteredReports = ((activeTab === "submitted" ? processedRedports : activeTab === "all" ? allReports : pendingReports) || []).filter((report) => {
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
    { key: "all", label: "All", count: allReportsPagination?.total || 0 },
    { key: "unsubmitted", label: "Pending", count: pendingReportsPagination?.total || 0 },
    { key: "submitted", label: "Processed", count: processedReportsPagination?.total || 0}
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
      <>
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
                      <TableHead className="font-medium whitespace-nowrap">REPORT NAME</TableHead>
                      <TableHead className="font-medium">SUBMITTER</TableHead>
                      <TableHead className="font-medium">AMOUNT</TableHead>
                      <TableHead className="font-medium">SUBMITTED ON</TableHead>
                      <TableHead className="font-medium">EXPENSES</TableHead>
                      <TableHead className="font-medium">STATUS</TableHead>
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
                            <p className="font-medium text-gray-900 whitespace-nowrap">{report.title}</p>
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
                          <p className="text-gray-900 whitespace-nowrap">
                            {report.submitted_at ? formatDate(report.submitted_at) : 'Not submitted'}
                          </p>
                        </TableCell>
                        <TableCell>
                          <p className="text-gray-900">
                            {report.expense_count}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(report.status)}>
                            {report.status}
                          </Badge>
                        </TableCell>
                      </TableRow>

                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
        {pagination && pagination.pages > 1 && perPage && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-gray-600">
              Showing {((currentPage - 1) * perPage) + 1} to {Math.min(currentPage * perPage, pagination.total)} of {pagination.total} expenses
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={!pagination.has_prev}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>

              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(3, pagination.pages) }, (_, i) => {
                  const pageNum = Math.max(1, Math.min(pagination.pages - 2, currentPage - 1)) + i;
                  return (
                    <Button
                      key={pageNum}
                      variant={pageNum === currentPage ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(pageNum)}
                      className="w-8 h-8 p-0"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={!pagination.has_next}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </>
    </ReportsPageWrapper>
  );
}
