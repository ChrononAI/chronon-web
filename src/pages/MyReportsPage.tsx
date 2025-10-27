import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { ReportTable } from '@/components/reports/ReportTable';
import { ReportTabs } from '@/components/reports/ReportTabs';
import { FilterControls } from '@/components/reports/FilterControls';
import { expenseService } from '@/services/expenseService';
import { Button } from '@/components/ui/button';
import { CheckCircle, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useReportsStore } from '@/store/reportsStore';

export function MyReportsPage() {
  const {
    allReports,
    unsubmittedReports,
    submittedReports,
    setAllReports,
    setUnsubmittedReports,
    setSubmittedReports,
    setAllReportsPagination,
    setUnsubmittedReportsPagination,
    setSubmittedReportsPagination,
    allReportsPagination,
    unsubmittedReportsPagination,
    submittedReportsPagination
  } = useReportsStore();
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  // const perPage = 10;
  const [perPage, setPerPageRows] = useState<number | null>(null);

  useEffect(() => {
    const calculateRows = () => {
      // Get available height for table area
      const availableHeight = window.innerHeight - 300; // adjust 300px for header/footer, etc.
      const rowHeight = 42; // typical table row height in px
      const possibleRows = Math.floor(availableHeight / rowHeight);
      setPerPageRows(Math.max(3, possibleRows)); // minimum 3 rows
    };

    calculateRows();
    window.addEventListener("resize", calculateRows);

    return () => window.removeEventListener("resize", calculateRows);

  }, []);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [activeTab, setActiveTab] = useState('all');
  const reportsArr = activeTab === 'all' ? allReports : activeTab === 'unsubmitted' ? unsubmittedReports : submittedReports;
  const pagination = activeTab === 'all' ? allReportsPagination : activeTab === 'unsubmitted' ? unsubmittedReportsPagination : submittedReportsPagination;

  const fetchAllReports = async (page: number) => {
    if (!perPage) return;
    try {
      const response = await expenseService.getMyReports(page, perPage);
      setAllReports(response.reports);
      setAllReportsPagination(response.pagination);
    } catch (error) {
      console.log(error);
    }
  };

  const fetchUnsubmittedReports = async (page: number) => {
    if (!perPage) return;
    try {
      const response = await expenseService.getReportsByStatus('DRAFT', page, perPage);
      setUnsubmittedReports(response.reports);
      setUnsubmittedReportsPagination(response.pagination);
    } catch (error) {
      console.log(error);
    }
  };

  const fetchSubmittedReports = async (page: number) => {
    if (!perPage) return;
    try {
      const response = await expenseService.getReportsByStatus('UNDER_REVIEW,APPROVED,REJECTED', page, perPage);
      setSubmittedReports(response.reports);
      setSubmittedReportsPagination(response.pagination);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    if (perPage) {
      fetchAllReports(currentPage);
      fetchUnsubmittedReports(currentPage);
      fetchSubmittedReports(currentPage);
      setLoading(false);
    }
  }, [currentPage, perPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };
  const filteredReports = useMemo(() => {
    let filtered = reportsArr;
    console.log(reportsArr);

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(report =>
        report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.created_by.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      console.log(filtered, statusFilter);
      filtered = filtered.filter(report => report.status === statusFilter);
    }

    // Date filter
    if (selectedDate) {
      const filterDate = selectedDate.toISOString().split('T')[0];
      filtered = filtered.filter(report => {
        const reportDate = new Date(report.created_at).toISOString().split('T')[0];
        return reportDate === filterDate;
      });
    }
    return filtered;
  }, [reportsArr, searchTerm, statusFilter, selectedDate]);

  if (loading) {
    return (
      <Layout>
        <div>Loading...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Header Section */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Expense Reports</h1>
        <Button asChild>
          <Link to="/reports/create">
            <Plus className="mr-2 h-4 w-4" />
            Create New Report
          </Link>
        </Button>
      </div>

      {/* Tabs Section */}
      <ReportTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tabs={[
          { key: 'all', label: 'All', count: allReportsPagination.total },
          { key: 'unsubmitted', label: 'Unsubmitted', count: unsubmittedReportsPagination.total },
          { key: 'submitted', label: 'Submitted', count: submittedReportsPagination.total }
        ]}
        className="mb-8"
      />

      {/* Filter Controls Section */}
      <FilterControls
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search reports..."
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        statusOptions={[
          { value: 'all', label: 'All' },
          { value: 'DRAFT', label: 'Draft' },
          { value: 'UNDER_REVIEW', label: 'Under Review' },
          { value: 'APPROVED', label: 'Approved' },
          { value: 'REJECTED', label: 'Rejected' }
        ]}
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        className="mt-6 mb-4"
      />
      {filteredReports.length === 0 ? <Card><div className="text-center py-12">
        <CheckCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">
          No reports found
        </h3>
        <p className="text-muted-foreground">
          {searchTerm
            ? "Try adjusting your search terms"
            : "There are currently no reports."
          }
        </p>
      </div></Card> : <>
        <ReportTable reports={filteredReports} />

        {pagination && pagination.pages > 1 && perPage && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-gray-600">
              Showing {((currentPage - 1) * perPage) + 1} to {Math.min(currentPage * perPage, activeTab === 'all' ? allReportsPagination.total : activeTab === 'unsubmitted' ? unsubmittedReportsPagination.total : submittedReportsPagination.total)} of {activeTab === 'all' ? allReportsPagination.total : activeTab === 'unsubmitted' ? unsubmittedReportsPagination.total : submittedReportsPagination.total} reports
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
      </>}
    </Layout>
  );
}