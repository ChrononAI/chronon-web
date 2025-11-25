import { useLocation } from "react-router-dom";
import { CreateReportForm2 } from "@/components/reports/CreateReportForm2";

export function CreateReportPage() {
  const location = useLocation();
  const { editMode, reportData } = location.state || {};

  return <CreateReportForm2 editMode={editMode} reportData={reportData} />;
}
