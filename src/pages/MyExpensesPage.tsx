import { useEffect, useState, useMemo } from 'react';
import { ExpenseTable } from '@/components/expenses/ExpenseTable';
import { expenseService } from '@/services/expenseService';
import { Button } from '@/components/ui/button';
import { CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { ReportsPageWrapper } from '@/components/reports/ReportsPageWrapper';
import { useExpenseStore } from '@/store/expenseStore';
import { Card } from '@/components/ui/card';

export function MyExpensesPage() {
  const {
    allExpenses,
    draftExpenses,
    reportedExpenses,
    allExpensesPagination,
    draftExpensesPagination,
    reportedExpensesPagination,
    setAllExpenses,
    setDraftExpenses,
    setReportedExpenses,
    setAllExpensesPagination,
    setDraftExpensesPagination,
    setReportedExpensesPagination } = useExpenseStore()
  const [currentPage, setCurrentPage] = useState(1);
  // const [loading, setLoading] = useState(false);
  const loading = false;
  const [perPage, setPerPage] = useState<number | null>(null);

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

  // Tab and filter states
  const [activeTab, setActiveTab] = useState<"all" | "draft" | "reported">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const expensesArr = (activeTab === "all" ? allExpenses : activeTab === "draft" ? draftExpenses : reportedExpenses) || [];
  const pagination = activeTab === "all" ? allExpensesPagination : activeTab === "draft" ? draftExpensesPagination : reportedExpensesPagination;

  const fetchAllExpenses = async (page: number) => {
    if (!perPage) return;
    try {
      const response = await expenseService.fetchAllExpenses(page, perPage);
      setAllExpenses(response.data);
      setAllExpensesPagination(response.pagination);
    } catch (error) {
      console.log(error);
    }
  }

  const fetchDraftExpenses = async (page: number) => {
    if (!perPage) return;
    try {
      const response = await expenseService.getExpensesByStatus('COMPLETE,INCOMPLETE', page, perPage);
      setDraftExpenses(response.data);
      setDraftExpensesPagination(response.pagination);
    } catch (error) {
      console.log(error);
    }
  }

  const fetchCompletedExpenses = async (page: number) => {
    if (!perPage) return;
    try {
      const response = await expenseService.getExpensesByStatus('APPROVED,REJECTED,PENDING_APPROVAL', page, perPage);
      setReportedExpenses(response.data);
      setReportedExpensesPagination(response.pagination);
    } catch (error) {
      console.log(error);
    }
  }

  useEffect(() => {
    if (perPage) {
      fetchAllExpenses(currentPage);
      fetchDraftExpenses(currentPage);
      fetchCompletedExpenses(currentPage);
    }
  }, [currentPage, perPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Filter expenses based on search and filters (API already filters by tab/status)
  const filteredExpenses = useMemo(() => {
    let filtered = expensesArr;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(expense =>
        expense.sequence_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.vendor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.category?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(expense => expense.status === statusFilter);
    }

    // Date filter
    if (selectedDate) {
      const filterDate = selectedDate.toISOString().split('T')[0];
      console.log(filterDate);
      filtered = filtered.filter(expense => {
        const expenseDate = new Date(expense.expense_date).toISOString().split('T')[0];
        console.log(expenseDate);
        return expenseDate === filterDate;
      });
    }

    return filtered;
  }, [expensesArr, searchTerm, statusFilter, selectedDate]);

  const tabs = [
    { key: 'all', label: 'All', count: allExpensesPagination.total },
    { key: "draft", label: "Drafts", count: draftExpensesPagination.total },
    { key: "reported", label: "Reported", count: reportedExpensesPagination.total }
  ];

  const statusOptions = [
    { value: "all", label: "All" },
    { value: "COMPLETE", label: "Complete" },
    { value: "INCOMPLETE", label: "Incomplete" },
    { value: "PENDING_APPROVAL", label: "Pending Approval" },
    { value: "APPROVED", label: "Approved" },
    { value: "REJECTED", label: "Rejected" }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading expenses...</p>
        </div>
      </div>
    );
  }

  return (
    <ReportsPageWrapper
      title="Expenses"
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={(tabId) => setActiveTab(tabId as "all" | "draft" | "reported")}
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      searchPlaceholder="Search expenses..."
      statusFilter={statusFilter}
      onStatusChange={setStatusFilter}
      statusOptions={statusOptions}
      selectedDate={selectedDate}
      onDateChange={setSelectedDate}
      showDateFilter={true}
      showCreateButton={true}
      createButtonText="Create New Expense"
      createButtonLink="/expenses/create"
    >
      {filteredExpenses.length === 0 ? <Card><div className="text-center py-12">
        <CheckCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">
          No expenses found
        </h3>
        <p className="text-muted-foreground">
          {(searchTerm || selectedDate)
            ? "Try adjusting your search terms"
            : "There are currently no expenses."
          }
        </p>
      </div></Card> : <>
        <ExpenseTable expenses={filteredExpenses} />

        {pagination && pagination.pages > 1 && perPage && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-gray-600">
              Showing {((currentPage - 1) * perPage) + 1} to {Math.min(currentPage * perPage, activeTab === 'all' ? allExpensesPagination.total : activeTab === 'draft' ? draftExpensesPagination.total : reportedExpensesPagination.total)} of {activeTab === 'all' ? allExpensesPagination.total : activeTab === 'draft' ? draftExpensesPagination.total : reportedExpensesPagination.total} expenses
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
    </ReportsPageWrapper>
  );
}