import { cn } from '@/lib/utils';

interface TabConfig {
  key: string;
  label: string;
  count: number;
}

interface ReportTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  tabs?: TabConfig[];
  className?: string;
}

export function ReportTabs({
  activeTab,
  onTabChange,
  tabs,
  className
}: ReportTabsProps) {
  return (
    <div className={cn("flex gap-8 border-b border-[#EBEBEB]", className)}>
      {tabs?.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onTabChange(tab.key)}
          className={cn(
            "relative flex items-center gap-2 font-semibold text-base transition-colors pb-3",
            activeTab === tab.key 
              ? "text-[#0D9C99] border-b-2 border-[#0D9C99]" 
              : "text-[#64748B] hover:text-[#1A1A1A]"
          )}
          style={{ fontFamily: 'Inter, sans-serif' }}
        >
          <span>{tab.label}</span>
          {tab.count > 0 && (
            <span className={cn(
              "px-2.5 py-1 rounded-full text-sm font-semibold",
              activeTab === tab.key 
                ? "bg-[#0D9C99]/10 text-[#0D9C99]" 
                : "bg-[#F3F4F6] text-[#64748B]"
            )}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
