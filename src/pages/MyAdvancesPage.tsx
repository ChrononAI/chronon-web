import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { AdvanceTable } from '@/components/advances/AdvanceTable';
import { expenseService } from '@/services/expenseService';
import { Advance } from '@/types/expense';
import { toast } from 'sonner';

export function MyAdvancesPage() {
  const navigate = useNavigate();
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdvances = async () => {
      try {
        const data = await expenseService.getMyAdvances();
        setAdvances(data);
      } catch (error) {
        console.error('Failed to fetch advances', error);
        toast.error('Failed to fetch advances');
      } finally {
        setLoading(false);
      }
    };

    fetchAdvances();
  }, []);

  const handleCreateNew = () => {
    navigate('/advances/create');
  };

  if (loading) {
    return (
      <Layout>
        <div>Loading...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <AdvanceTable advances={advances} onCreateNew={handleCreateNew} />
    </Layout>
  );
}