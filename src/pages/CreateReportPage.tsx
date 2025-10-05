import { useLocation } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { CreateReportForm } from '@/components/reports/CreateReportForm';

export function CreateReportPage() {
  const location = useLocation();
  const { editMode, reportData } = location.state || {};

  return (
    <Layout>
      <CreateReportForm editMode={editMode} reportData={reportData} />
    </Layout>
  );
}