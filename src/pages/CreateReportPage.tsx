import { useLocation } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
// import { CreateReportForm } from '@/components/reports/CreateReportForm';
import { CreateReportForm2 } from '@/components/reports/CreateReportForm2';

export function CreateReportPage() {
  const location = useLocation();
  const { editMode, reportData } = location.state || {};

  return (
    <Layout>
      {/* <CreateReportForm editMode={editMode} reportData={reportData} /> */}
      <CreateReportForm2 editMode={editMode} reportData={reportData} />
    </Layout>
  );
}