import { useEffect } from "react";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLayoutStore } from "@/store/layoutStore";

export function IntegrationDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const setNoPadding = useLayoutStore((s) => s.setNoPadding);
  const isFlowContext = location.pathname.startsWith("/flow");
  const basePath = isFlowContext ? "/flow/integration" : "/integration";

  useEffect(() => {
    setNoPadding(true);
    return () => {
      setNoPadding(false);
    };
  }, [setNoPadding]);
  const integration = {
    name: "Dynamics 365 Business Central",
    description: "Import data from Dynamics 365 Business Central to Chronon Exp Mgmt and export expenses from Chronon Exp Mgmt to Dynamics 365 Business Central.",
    category: "Accounting",
    icon: (
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
    ),
  };

  const features = [
    {
      title: "Auto-sync data",
      description: "Auto-sync your Dynamics 365 Business Central data (chart of accounts, vendors, global dimensions) into Chronon Exp Mgmt every 24 hours.",
      borderColor: "border-gray-300",
      bgColor: "bg-white",
    },
    {
      title: "Accurate expense coding",
      description: "Set up your mappings once, and employees get accurate drop-downs to quickly pick the right details while coding expenses.",
      borderColor: "border-gray-300",
      bgColor: "bg-white",
    },
    {
      title: "Seamless expense exports",
      description: "Export credit card and reimbursable expenses to Dynamics 365 Business Central—no manual work. Choose export types like purchase invoice or journal entry.",
      borderColor: "border-green-500",
      bgColor: "bg-white",
    },
    {
      title: "Flexible export settings",
      description: "Granular controls to decide when, how, and what expenses get exported to Dynamics 365 Business Central - choose the export state, module, date, etc.",
      borderColor: "border-green-500",
      bgColor: "bg-white",
    },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(basePath)}
            className="mr-2 h-8 w-8"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-semibold">Integrations</h1>
        </div>
      </div>

      {/* Integration Header Section */}
      <div className="px-6 pt-6">
        <Card className="mb-8">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4 flex-1">
              {integration.icon}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold">{integration.name}</h2>
                  <Badge variant="outline" className="text-xs">
                    {integration.category}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground max-w-2xl">
                  {integration.description}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 ml-4">
              <a
                href="#"
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                Read more
                <ExternalLink className="h-4 w-4" />
              </a>
              <Button 
                className="bg-green-600 hover:bg-green-700"
                onClick={() => navigate(`${basePath}/${id}/dashboard`)}
              >
                Connect
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

        {/* Guide Section */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Guide to setup your integration</h2>
          <p className="text-sm text-muted-foreground">
            A quick guide to help you set up the integration quick and easy.
          </p>
        </div>

        {/* Flowchart Diagram */}
        <div className="relative bg-white rounded-lg p-10 min-h-[550px]">
        <div className="flex items-center justify-center gap-6 relative z-10">
          {/* Left System Node - Dynamics 365 Business Central */}
          <div className="flex flex-col items-center flex-shrink-0">
            <div className="w-28 h-28 flex items-center justify-center bg-gray-100 rounded-full">
              <div className="w-20 h-20 flex items-center justify-center bg-gradient-to-br from-teal-400 to-blue-500 rounded-full">
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 32 32"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="text-white"
                >
                  {/* Diamond shape on top */}
                  <path
                    d="M16 4L8 8L16 12L24 8L16 4Z"
                    fill="currentColor"
                  />
                  {/* Three horizontal lines below */}
                  <line
                    x1="8"
                    y1="18"
                    x2="24"
                    y2="18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <line
                    x1="8"
                    y1="22"
                    x2="24"
                    y2="22"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <line
                    x1="8"
                    y1="26"
                    x2="24"
                    y2="26"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>
            <p className="mt-3 text-sm font-semibold text-center max-w-[160px]">
              Dynamics 365 Business Central
            </p>
          </div>

          {/* Left Feature Boxes Column */}
          <div className="flex flex-col gap-6 w-[300px]">
            {/* Top Left Box */}
            <Card className="border border-gray-300 bg-gray-50 rounded-lg h-[140px] flex flex-col">
              <CardContent className="p-4 flex-1 flex flex-col">
                <h3 className="font-semibold mb-2 text-sm">{features[0].title}</h3>
                <p className="text-xs text-gray-600 leading-relaxed flex-1">
                  {features[0].description}
                </p>
              </CardContent>
            </Card>

            {/* Bottom Left Box */}
            <Card className="border border-gray-300 bg-gray-50 rounded-lg h-[140px] flex flex-col">
              <CardContent className="p-4 flex-1 flex flex-col">
                <h3 className="font-semibold mb-2 text-sm">{features[1].title}</h3>
                <p className="text-xs text-gray-600 leading-relaxed flex-1">
                  {features[1].description}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Right Feature Boxes Column */}
          <div className="flex flex-col gap-6 w-[300px]">
            {/* Top Right Box */}
            <Card className="border border-green-500 bg-gray-50 rounded-lg h-[140px] flex flex-col">
              <CardContent className="p-4 flex-1 flex flex-col">
                <h3 className="font-semibold mb-2 text-sm">{features[2].title}</h3>
                <p className="text-xs text-gray-600 leading-relaxed flex-1">
                  {features[2].description}
                </p>
              </CardContent>
            </Card>

            {/* Bottom Right Box */}
            <Card className="border border-green-500 bg-gray-50 rounded-lg h-[140px] flex flex-col">
              <CardContent className="p-4 flex-1 flex flex-col">
                <h3 className="font-semibold mb-2 text-sm">{features[3].title}</h3>
                <p className="text-xs text-gray-600 leading-relaxed flex-1">
                  {features[3].description}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Right System Node - Chronon Exp Mgmt */}
          <div className="flex flex-col items-center flex-shrink-0">
            <div className="w-28 h-28 flex items-center justify-center bg-gray-100 rounded-full">
              <div className="w-20 h-20 flex items-center justify-center bg-green-500 rounded-full">
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="text-white"
                >
                  {/* Document icon with three lines */}
                  <path
                    d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="currentColor"
                  />
                  <path
                    d="M14 2V8H20"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <line
                    x1="8"
                    y1="12"
                    x2="16"
                    y2="12"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <line
                    x1="8"
                    y1="16"
                    x2="16"
                    y2="16"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <line
                    x1="8"
                    y1="20"
                    x2="12"
                    y2="20"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>
            <p className="mt-3 text-sm font-semibold text-center max-w-[160px]">
              Chronon Exp Mgmt
            </p>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
