import { cn } from '@/lib/utils';

interface TabConfig {
  key: string;
  label: string;
  count: number;
}

interface ReportTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  tabs: TabConfig[];
  className?: string;
}

export function ReportTabs({
  activeTab,
  onTabChange,
  tabs,
  className
}: ReportTabsProps) {
  return (
    <div className={cn("flex space-x-8 border-b border-gray-200", className)}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onTabChange(tab.key)}
          className={cn(
            "relative flex items-center gap-2 font-medium transition-colors pb-4",
            activeTab === tab.key 
              ? "text-blue-600 border-b-2 border-blue-600" 
              : "text-gray-500 hover:text-gray-700"
          )}
          style={{ fontFamily: 'Inter, sans-serif' }}
        >
          <span>{tab.label}</span>
          {tab.count > 0 && (
            <span className={cn(
              "px-2 py-1 rounded-full text-xs font-medium",
              activeTab === tab.key 
                ? "bg-blue-100 text-blue-600" 
                : "bg-gray-100 text-gray-600"
            )}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
