import { Layout } from '@/components/layout/Layout';
import { CreateExpenseForm } from '@/components/expenses/CreateExpenseForm';

export function CreateExpensePage() {
  return (
    <Layout>
      <CreateExpenseForm />
    </Layout>
  );
}