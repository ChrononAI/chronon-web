import { ReactNode } from 'react';
import { RedesignedTabs } from '@/components/reports/RedesignedTabs';
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

interface InvoicePageWrapperProps {
  title: string;
  showCreateButton?: boolean;
  createButtonText?: string;
  createButtonLink?: string;
  onCreateButtonClick?: () => void;
  createButtonClassName?: string;
  tabs?: TabConfig[];
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  marginBottom?: string;
  searchTerm?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  statusFilter?: string | null;
  onStatusChange?: (value: string) => void;
  statusOptions?: StatusOption[];
  selectedDate?: Date;
  onDateChange?: (date: Date | undefined) => void;
  showDateFilter?: boolean;
  showFilters?: boolean;
  children: ReactNode;
}

export function InvoicePageWrapper({
  title,
  showCreateButton = false,
  createButtonText = "Upload Invoice",
  createButtonLink = "/flow/invoice/bulk-upload",
  onCreateButtonClick,
  createButtonClassName,
  tabs,
  activeTab,
  onTabChange,
  searchTerm,
  onSearchChange,
  searchPlaceholder = "Search invoices...",
  statusFilter,
  marginBottom = "mb-8",
  onStatusChange,
  statusOptions = [
    { value: 'all', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'processed', label: 'Processed' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' }
  ],
  selectedDate,
  onDateChange,
  showFilters = true,
  showDateFilter = true,
  children
}: InvoicePageWrapperProps) {
  return (
    <>
      {/* Header Container */}
      <div
        style={{
          width: "100%",
          height: "56px",
          backgroundColor: "#FFFFFF",
          borderBottom: "1px solid #EBEBEB",
          display: "flex",
          alignItems: "flex-start",
          paddingLeft: "20px",
          paddingTop: "15px",
          boxSizing: "border-box",
        }}
      >
        <h1
          style={{
            width: "94px",
            height: "24px",
            fontFamily: "Inter",
            fontWeight: 600,
            fontSize: "20px",
            lineHeight: "100%",
            letterSpacing: "0%",
            color: "#1A1A1A",
            margin: 0,
          }}
        >
          {title}
        </h1>
      </div>

      {showCreateButton && (
        <div style={{ paddingLeft: "20px", marginTop: "16px", marginBottom: "16px" }}>
          {onCreateButtonClick ? (
            <Button 
              onClick={onCreateButtonClick}
              className={createButtonClassName}
            >
              <Plus className="mr-2 h-4 w-4" />
              {createButtonText}
            </Button>
          ) : createButtonLink ? (
            <Button 
              asChild
              className={createButtonClassName}
            >
              <Link to={createButtonLink}>
                <Plus className="mr-2 h-4 w-4" />
                {createButtonText}
              </Link>
            </Button>
          ) : null}
        </div>
      )}

      {tabs && activeTab && onTabChange && (
        <div className={marginBottom ? marginBottom : "mb-8"} style={{ width: "100%" }}>
          <RedesignedTabs
            activeTab={activeTab}
            onTabChange={onTabChange}
            tabs={tabs}
            className="mb-0"
            paddingX="20px"
            containerWidth="100%"
          />
        </div>
      )}

      {showFilters && onSearchChange && <FilterControls
        searchTerm={searchTerm}
        onSearchChange={onSearchChange}
        searchPlaceholder={searchPlaceholder}
        statusFilter={statusFilter}
        onStatusChange={onStatusChange}
        statusOptions={statusOptions}
        selectedDate={selectedDate}
        onDateChange={showDateFilter ? onDateChange : undefined}
        className="mt-6 mb-4"
      />}

      {children}
    </>
  );
}

