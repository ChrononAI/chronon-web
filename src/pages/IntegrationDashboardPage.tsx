import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RefreshCw, ChevronDown, CheckCircle2, Info } from "lucide-react";
import { useLayoutStore } from "@/store/layoutStore";

export function IntegrationDashboardPage() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [exportLogTab, setExportLogTab] = useState("completed");
  const setNoPadding = useLayoutStore((s) => s.setNoPadding);

  useEffect(() => {
    setNoPadding(true);
    return () => {
      setNoPadding(false);
    };
  }, [setNoPadding]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <h1 className="text-lg font-semibold">Integrations</h1>
      </div>

      {/* Top Navigation Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`px-0 py-2 font-medium transition-colors ${
                activeTab === "dashboard"
                  ? "text-gray-900 border-b-2 border-yellow-500"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab("export-log")}
              className={`px-0 py-2 font-medium transition-colors ${
                activeTab === "export-log"
                  ? "text-gray-900 border-b-2 border-yellow-500"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Export log
            </button>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" className="border-green-500 text-green-600 hover:bg-green-50">
              <RefreshCw className="mr-2 h-4 w-4" />
              Sync
            </Button>
            <Button variant="outline" className="border-green-500 text-green-600 hover:bg-green-50">
              More
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-gray-50 p-6">
          {/* Dashboard Tab */}
          {activeTab === "dashboard" && (
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Information Card */}
              <Card className="bg-white rounded-lg shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-6 w-6 text-green-500 mt-1" />
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-bold">Sit back and relax!</h3>
                          <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                            <Info className="h-3 w-3 text-white" />
                          </div>
                        </div>
                        <p className="text-gray-600 mb-1">No new expenses to export right now.</p>
                        <p className="text-gray-600">
                          Once expenses are approved, they'll automatically be available here for export.
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" className="text-gray-600">
                      Export →
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Illustration */}
              <div className="flex flex-col items-center justify-center py-12">
                <div className="relative mb-6">
                  <svg
                    width="200"
                    height="200"
                    viewBox="0 0 200 200"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="drop-shadow-lg"
                  >
                    {/* Document illustration */}
                    <rect
                      x="40"
                      y="30"
                      width="120"
                      height="140"
                      rx="4"
                      fill="white"
                      stroke="#E5E7EB"
                      strokeWidth="2"
                    />
                    <line x1="60" y1="60" x2="140" y2="60" stroke="#D1D5DB" strokeWidth="2" />
                    <line x1="60" y1="80" x2="140" y2="80" stroke="#D1D5DB" strokeWidth="2" />
                    <line x1="60" y1="100" x2="120" y2="100" stroke="#D1D5DB" strokeWidth="2" />
                    <line x1="60" y1="120" x2="140" y2="120" stroke="#D1D5DB" strokeWidth="2" />
                    
                    {/* Green circle with arrow */}
                    <circle cx="160" cy="50" r="20" fill="#10B981" />
                    <path
                      d="M160 40L160 60M155 45L160 40L165 45"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-gray-600 text-lg">Looks like you have</p>
                  <p className="text-gray-600 text-lg font-semibold">0 expenses to export right now</p>
                </div>
              </div>
            </div>
          )}

          {/* Export Log Tab */}
          {activeTab === "export-log" && (
            <div className="max-w-4xl mx-auto">
              {/* Sub-tabs */}
              <div className="flex gap-6 mb-6 border-b border-gray-200">
                <button
                  onClick={() => setExportLogTab("completed")}
                  className={`pb-2 px-1 font-medium transition-colors ${
                    exportLogTab === "completed"
                      ? "border-b-2 border-green-500 text-green-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Completed
                </button>
                <button
                  onClick={() => setExportLogTab("skipped")}
                  className={`pb-2 px-1 font-medium transition-colors ${
                    exportLogTab === "skipped"
                      ? "border-b-2 border-green-500 text-green-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Skipped
                </button>
              </div>

              {/* Empty State */}
              <Card className="bg-white rounded-lg shadow-sm">
                <CardContent className="p-12">
                  <div className="flex flex-col items-center justify-center">
                    <div className="relative mb-6">
                      <svg
                        width="200"
                        height="150"
                        viewBox="0 0 200 150"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        {/* Scroll/document illustration */}
                        <path
                          d="M30 20L170 20L170 130L30 130Z"
                          fill="white"
                          stroke="#E5E7EB"
                          strokeWidth="2"
                        />
                        <path
                          d="M30 20L30 40L170 40"
                          stroke="#E5E7EB"
                          strokeWidth="2"
                        />
                        <line x1="50" y1="60" x2="150" y2="60" stroke="#D1D5DB" strokeWidth="1.5" />
                        <line x1="50" y1="75" x2="150" y2="75" stroke="#D1D5DB" strokeWidth="1.5" />
                        <line x1="50" y1="90" x2="130" y2="90" stroke="#D1D5DB" strokeWidth="1.5" />
                        
                        {/* Green circle with question mark */}
                        <circle cx="40" cy="30" r="12" fill="#10B981" />
                        <text
                          x="40"
                          y="35"
                          textAnchor="middle"
                          fill="white"
                          fontSize="14"
                          fontWeight="bold"
                        >
                          ?
                        </text>
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      No records to show yet!
                    </h3>
                    <p className="text-gray-600 text-center max-w-md">
                      All your successful exports and their details will be stored here.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
      </div>
    </div>
  );
}
