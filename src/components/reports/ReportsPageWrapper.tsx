import { ReactNode } from 'react';
import { Layout } from '@/components/layout/Layout';
import { ReportTabs } from '@/components/reports/ReportTabs';
import { FilterControls } from '@/components/reports/FilterControls';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

interface TabConfig {
  key: string;
  label: string;
  count: number;
}

interface StatusOption {
  value: string;
  label: string;
}

interface ReportsPageWrapperProps {
  // Page configuration
  title: string;
  showCreateButton?: boolean;
  createButtonText?: string;
  createButtonLink?: string;
  
  // Tabs configuration
  tabs: TabConfig[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  
  // Filter configuration
  searchTerm: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  statusFilter?: string | null;
  onStatusChange?: (value: string) => void;
  statusOptions?: StatusOption[];
  selectedDate?: Date;
  onDateChange?: (date: Date | undefined) => void;
  showDateFilter?: boolean;
  
  // Content
  children: ReactNode;
}

export function ReportsPageWrapper({
  title,
  showCreateButton = false,
  createButtonText = "Create New Report",
  createButtonLink = "/reports/create",
  tabs,
  activeTab,
  onTabChange,
  searchTerm,
  onSearchChange,
  searchPlaceholder = "Search reports...",
  statusFilter,
  onStatusChange,
  statusOptions = [
    { value: 'all', label: 'All' },
    { value: 'draft', label: 'Draft' },
    { value: 'submitted', label: 'Submitted' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' }
  ],
  selectedDate,
  onDateChange,
  showDateFilter = true,
  children
}: ReportsPageWrapperProps) {
  return (
    <Layout>
      {/* Header Section */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
        </div>
        {showCreateButton && (
          <Button asChild>
            <Link to={createButtonLink}>
              <Plus className="mr-2 h-4 w-4" />
              {createButtonText}
            </Link>
          </Button>
        )}
      </div>

      {/* Tabs Section */}
      <ReportTabs
        activeTab={activeTab}
        onTabChange={onTabChange}
        tabs={tabs}
        className="mb-8"
      />

      {/* Filter Controls Section */}
      <FilterControls
        searchTerm={searchTerm}
        onSearchChange={onSearchChange}
        searchPlaceholder={searchPlaceholder}
        statusFilter={statusFilter}
        onStatusChange={onStatusChange}
        statusOptions={statusOptions}
        selectedDate={selectedDate}
        onDateChange={showDateFilter ? onDateChange : undefined}
        className="mt-6 mb-4"
      />

      {/* Content */}
      {children}
    </Layout>
  );
}
