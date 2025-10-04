import React, { useState } from 'react'
import { Layout } from '@/components/layout/Layout'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CreateExpenseForm } from '@/components/expenses/CreateExpenseForm'
import MileagePage from './MileagePage'
import PerdiemPage from './PerdiemPage'

export function UnifiedExpensesPage() {
  const [activeTab, setActiveTab] = useState('regular')

  return (
    <Layout>
      <div className="w-full px-6 py-2">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-1">Create New Expense</h1>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="regular">Regular Expense</TabsTrigger>
            <TabsTrigger value="mileage">Mileage</TabsTrigger>
            <TabsTrigger value="perdiem">Per Diem</TabsTrigger>
          </TabsList>
          
          <TabsContent value="regular" className="mt-6">
            <CreateExpenseForm />
          </TabsContent>
          
          <TabsContent value="mileage" className="mt-6">
            <MileagePage mode="create" showLayout={false} />
          </TabsContent>
          
          <TabsContent value="perdiem" className="mt-6">
            <PerdiemPage mode="create" showLayout={false} />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  )
}
