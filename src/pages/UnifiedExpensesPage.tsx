import { useState, useEffect } from "react";
import { CreateExpenseForm } from "@/components/expenses/CreateExpenseForm";
import MileagePage from "./MileagePage";
import PerdiemPage from "./PerdiemPage";
import { ReportTabs } from "@/components/reports/ReportTabs";
import { useAuthStore } from "@/store/authStore";

export function UnifiedExpensesPage() {
  const [activeTab, setActiveTab] = useState("regular");
  const { orgSettings } = useAuthStore();
  const isPerDiemEnabled = orgSettings?.per_diem_settings?.enabled !== false;
  const tabs = [
    { key: "regular", label: "Regular Expense", count: 0 },
    { key: "mileage", label: "Mileage", count: 0 },
    ...(isPerDiemEnabled
      ? [{ key: "perdiem", label: "Per Diem", count: 0 }]
      : []),
  ];
  useEffect(() => {
    if (activeTab === "perdiem" && !isPerDiemEnabled) {
      setActiveTab("regular");
    }
  }, [activeTab, isPerDiemEnabled]);

  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">
          Create New Expense
        </h1>
      </div>

      <ReportTabs
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        tabs={tabs}
        className="mb-6"
      />

      {activeTab === "regular" && (
        <div className="mt-6">
          <CreateExpenseForm />
        </div>
      )}

      {activeTab === "mileage" && (
        <div className="mt-6">
          <MileagePage mode="create" />
        </div>
      )}

      {activeTab === "perdiem" && isPerDiemEnabled && (
        <div className="mt-6">
          <PerdiemPage mode="create" />
        </div>
      )}
    </div>
  );
}
