import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { DateField } from '@/components/ui/date-field'
import { Search, ArrowRight, Calendar } from 'lucide-react'
import { placesService } from '@/services/placesService'
import { getOrgIdFromToken } from '@/lib/jwtUtils'
import { Expense } from '@/types/expense'
import { toast } from 'sonner'

interface PerdiemPageProps {
  mode?: 'create' | 'view';
  expenseData?: Expense;
  showLayout?: boolean;
}

const PerdiemPage = ({ mode = 'create', expenseData, showLayout = true }: PerdiemPageProps) => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    location: '',
    purpose: '',
    totalAmount: 0
  })

  // Calculate number of days
  const calculateDays = () => {
    const start = new Date(formData.startDate)
    const end = new Date(formData.endDate)
    const timeDiff = end.getTime() - start.getTime()
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1
    
    return daysDiff
  }

  const days = calculateDays()

  // Pre-fill form data when in view mode
  useEffect(() => {
    if (mode === 'view' && expenseData) {
      const formatDate = (dateString: string) => {
        try {
          return new Date(dateString).toISOString().split('T')[0]
        } catch {
          return new Date().toISOString().split('T')[0]
        }
      }

      setFormData({
        startDate: formatDate(expenseData.start_date || expenseData.per_diem_info?.start_date || expenseData.expense_date),
        endDate: formatDate(expenseData.end_date || expenseData.per_diem_info?.end_date || expenseData.expense_date),
        location: expenseData.location || expenseData.per_diem_info?.location || '',
        purpose: expenseData.description || '',
        totalAmount: parseFloat(String(expenseData.amount)) || 0
      })
    }
  }, [mode, expenseData])

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: field === 'totalAmount' ? Number(value) : value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.startDate || !formData.endDate || !formData.location || !formData.purpose) {
      toast.error('Please fill in all required fields')
      return
    }

    const submitData = {
      expense_policy_id: "ep0AGCzwSOmn", // Hardcoded policy ID
      category_id: "cat1GIY3ygLyb", // Hardcoded category ID
      amount: formData.totalAmount,
      expense_date: formData.startDate,
      description: formData.purpose,
      expense_type: "PER_DIEM",
      per_diem_info: {
        start_date: formData.startDate,
        end_date: formData.endDate,
        location: formData.location
      }
    }
    
    try {
      const orgId = getOrgIdFromToken()
      if (!orgId) {
        toast.error('Organization ID not found. Please login again.')
        return
      }
      
      await placesService.createPerDiemExpense(submitData, orgId)
      
      toast.success('Per diem expense created successfully!')
      setTimeout(() => {
        navigate('/expenses')
      }, 500)
      
    } catch (error: any) {
      console.error('Error creating per diem expense:', error)
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create per diem expense'
      toast.error(`Error: ${errorMessage}`)
    }
  }

  const content = (
    <div className="w-full px-6 py-2">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">Per Diem</h1>
        <p className="text-gray-600">Request a daily allowance for business travel.</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="bg-white border rounded-lg p-6">
          {/* Date Section */}
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">Dates</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate" className="text-sm font-medium text-gray-700">
                  Start Date
                </Label>
                <DateField
                  id="startDate"
                  value={formData.startDate}
                  onChange={(value) => handleInputChange('startDate', value)}
                  disabled={mode === 'view'}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="endDate" className="text-sm font-medium text-gray-700">
                  End Date
                </Label>
                <DateField
                  id="endDate"
                  value={formData.endDate}
                  onChange={(value) => handleInputChange('endDate', value)}
                  disabled={mode === 'view'}
                />
              </div>
            </div>
          </div>

          {/* Details Section */}
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">Details</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location" className="text-sm font-medium text-gray-700">
                  Location
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="location"
                    type="text"
                    placeholder="e.g., Mumbai, Delhi, Bangalore"
                    value={formData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    className="pl-10"
                    disabled={mode === 'view'}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="days" className="text-sm font-medium text-gray-700">
                  Number of Days
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="days"
                    type="text"
                    value={days}
                    readOnly
                    className="pl-10 bg-gray-50"
                  />
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="category" className="text-sm font-medium text-gray-700">
                  Category
                </Label>
                <div className="flex h-10 w-full rounded-md border border-input bg-gray-50 px-3 py-2 text-sm ring-offset-background text-gray-700">
                  Per Diem
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="policy" className="text-sm font-medium text-gray-700">
                  Policy
                </Label>
                <div className="flex h-10 w-full rounded-md border border-input bg-gray-50 px-3 py-2 text-sm ring-offset-background text-gray-700">
                  Regular
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="totalAmount" className="text-sm font-medium text-gray-700">
                  Amount
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                  <Input
                    id="totalAmount"
                    type="number"
                    placeholder="0.00"
                    value={formData.totalAmount || ''}
                    onChange={(e) => handleInputChange('totalAmount', parseFloat(e.target.value) || 0)}
                    className="pl-8"
                    disabled={mode === 'view'}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="purpose" className="text-sm font-medium text-gray-700">
                  Purpose
                </Label>
                <Input
                  id="purpose"
                  type="text"
                  placeholder="e.g. Annual Sales Conference"
                  value={formData.purpose}
                  onChange={(e) => handleInputChange('purpose', e.target.value)}
                  disabled={mode === 'view'}
                />
              </div>
            </div>
          </div>

          {/* Total Amount and Action Buttons */}
          <div className="flex justify-between items-end pt-4">
            <div>
              <Label className="text-sm font-medium text-gray-700">
                Total Amount
              </Label>
              <div className="text-2xl font-bold text-blue-600 mt-1">
                ₹{(Number(formData.totalAmount) || 0).toFixed(2)}
              </div>
              <p className="text-sm text-gray-500">
                {days} days
              </p>
            </div>

            {mode === 'create' && (
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-6"
              >
                Create Expense
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );

  // In view mode, don't wrap with Layout since it's already inside ExpenseDetailPage
  if (mode === 'view') {
    return content;
  }

  // If showLayout is false, return content without Layout wrapper
  if (!showLayout) {
    return content;
  }

  // In create mode, wrap with Layout
  return <Layout>{content}</Layout>;
}

export default PerdiemPage