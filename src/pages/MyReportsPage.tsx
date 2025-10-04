import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { ReportTable } from '@/components/reports/ReportTable';
import { ReportTabs } from '@/components/reports/ReportTabs';
import { FilterControls } from '@/components/reports/FilterControls';
import { expenseService } from '@/services/expenseService';
import { Report, ReportsResponse } from '@/types/expense';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';

export function MyReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const perPage = 10;

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [activeTab, setActiveTab] = useState('unsubmitted');

  const fetchReports = async (page: number) => {
    try {
      setLoading(true);
      let response: ReportsResponse;
      
      if (activeTab === 'unsubmitted') {
        response = await expenseService.getReportsByStatus('DRAFT', page, perPage);
      } else if (activeTab === 'submitted') {
        response = await expenseService.getReportsByStatus('UNDER_REVIEW,APPROVED,REJECTED', page, perPage);
      } else {
        response = await expenseService.getMyReports(page, perPage);
      }
      
      setReports(response.reports);
    } catch (error) {
      console.error('Failed to fetch reports', error);
      toast.error('Failed to fetch reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports(currentPage);
  }, [currentPage, activeTab]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, selectedDate, activeTab]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const filteredReports = useMemo(() => {
    let filtered = reports;

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

    // Tab filter
    if (activeTab === 'unsubmitted') {
      filtered = filtered.filter(report => report.status === 'DRAFT');
    } else if (activeTab === 'submitted') {
      filtered = filtered.filter(report => 
        report.status === 'UNDER_REVIEW' || 
        report.status === 'APPROVED' || 
        report.status === 'REJECTED'
      );
    }

    return filtered;
  }, [reports, searchTerm, statusFilter, selectedDate, activeTab]);

  const totalPages = Math.ceil(filteredReports.length / perPage);
  const hasNext = currentPage < totalPages;
  const hasPrev = currentPage > 1;

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
          { key: 'unsubmitted', label: 'Unsubmitted Reports', count: 0 },
          { key: 'submitted', label: 'Submitted Reports', count: 0 }
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

      <ReportTable reports={filteredReports} />
      
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-gray-600">
            Showing {((currentPage - 1) * perPage) + 1} to {Math.min(currentPage * perPage, filteredReports.length)} of {filteredReports.length} reports
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={!hasPrev}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
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
              disabled={!hasNext}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </Layout>
  );
}