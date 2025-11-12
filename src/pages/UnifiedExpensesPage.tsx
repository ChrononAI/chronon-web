import { useState } from 'react'
import { Layout } from '@/components/layout/Layout'
import { CreateExpenseForm } from '@/components/expenses/CreateExpenseForm'
import MileagePage from './MileagePage'
import PerdiemPage from './PerdiemPage'
import { ReportTabs } from '@/components/reports/ReportTabs'

export function UnifiedExpensesPage() {
  const [activeTab, setActiveTab] = useState('regular')

  return (
    <Layout>
      <div className="w-full px-6 py-2">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-1">Create New Expense</h1>
        </div>

        <ReportTabs
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab)}
          tabs={[
            { key: 'regular', label: 'Regular Expense', count: 0 },
            { key: 'mileage', label: 'Mileage', count: 0 },
            { key: 'perdiem', label: 'Per Diem', count: 0 },
          ]}
          className="mb-6"
        />

        {activeTab === 'regular' && (
          <div className="mt-6">
            <CreateExpenseForm />
          </div>
        )}

        {activeTab === 'mileage' && (
          <div className="mt-6">
            <MileagePage mode="create" />
          </div>
        )}

        {activeTab === 'perdiem' && (
          <div className="mt-6">
            <PerdiemPage mode="create" />
          </div>
        )}
      </div>
    </Layout>
  )
}
