import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { useLayoutStore } from "@/store/layoutStore";

export function IntegrationsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const setNoPadding = useLayoutStore((s) => s.setNoPadding);
  const isFlowContext = location.pathname.startsWith("/flow");
  const basePath = isFlowContext ? "/flow/integration" : "/integration";

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

      {/* Introduction Text */}
      <div className="px-6 pt-6 mb-6 space-y-2">
        <h2 className="text-lg font-semibold">List of integrations</h2>
        <p className="text-sm text-muted-foreground">
          If your company uses any of the applications listed below, you can easily integrate them with Chronon Exp Mgmt.
        </p>
        <p className="text-sm text-muted-foreground">
          Need an integration we don't support yet? Let us know at{" "}
          <a
            className="text-primary hover:underline"
          >
            info@chronon.co.in
          </a>
        </p>
      </div>

      {/* Integration Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow ml-4"
          onClick={() => navigate(`${basePath}/dynamics-365-business-central`)}
        >
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center space-y-4">
              {/* Icon */}
              <div className="w-16 h-16 flex items-center justify-center bg-gradient-to-br from-teal-400 to-blue-500 rounded-lg">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 32 32"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="text-white"
                >
                  <path
                    d="M16 2L2 8L16 14L30 8L16 2Z"
                    fill="currentColor"
                  />
                  <path
                    d="M2 24L16 30L30 24"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M2 16L16 22L30 16"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              {/* Name */}
              <div>
                <h3 className="font-semibold text-base">Dynamics 365 Business Central</h3>
              </div>

              {/* Category */}
              <div>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                  Accounting
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
