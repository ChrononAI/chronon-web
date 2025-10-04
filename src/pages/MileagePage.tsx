import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { Card, CardContent,  } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Calendar } from 'lucide-react'
import { LocationAutocomplete } from '@/components/ui/location-autocomplete'
import { placesService, PlaceSuggestion } from '@/services/placesService'
import { getOrgIdFromToken } from '@/lib/jwtUtils'
import { Expense } from '@/types/expense'
import { toast } from 'sonner'

interface MileagePageProps {
  mode?: 'create' | 'view';
  expenseData?: Expense;
  showLayout?: boolean;
}

const MileagePage = ({ mode = 'create', expenseData, showLayout = true }: MileagePageProps) => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    startLocation: '',
    startLocationId: '',
    endLocation: '',
    endLocationId: '',
    distance: '',
    amount: '',
    description: '',
    vehiclesType: '',
    expenseDate: new Date().toISOString().split('T')[0]
  })
  const [isCalculating, setIsCalculating] = useState(false)

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

      const getVehicleTypeFromApi = (vehicleType: string) => {
        switch (vehicleType?.toLowerCase()) {
          case 'four_wheelers':
            return 'car'
          case 'two_wheelers':
            return 'bike'
          case 'public_transport':
            return 'public_transport'
          default:
            return 'car'
        }
      }

      setFormData({
        startLocation: expenseData.start_location || '',
        startLocationId: '',
        endLocation: expenseData.end_location || '',
        endLocationId: '',
        distance: expenseData.distance ? `${expenseData.distance} ${expenseData.distance_unit || 'KM'}` : '',
        amount: `₹${expenseData.amount}`,
        description: expenseData.description || '',
        vehiclesType: getVehicleTypeFromApi(expenseData.vehicle_type || ''),
        expenseDate: formatDate(expenseData.expense_date)
      })
    }
  }, [mode, expenseData])

  const vehicleTypeMapping = {
    'car': 'FOUR_WHEELERS',
    'bike': 'TWO_WHEELERS',
    'public_transport': 'PUBLIC_TRANSPORT'
  }

  const vehicleTypeMappingForCost = {
    'car': 'four_wheeler',
    'bike': 'two_wheeler',
    'public_transport': 'public_transport'
  }

  const extractDistance = (distanceStr: string) => {
    const match = distanceStr.match(/(\d+\.?\d*)/)
    return match ? parseFloat(match[1]) : 0
  }

  const extractAmount = (amountStr: string) => {
    const match = amountStr.match(/₹?(\d+\.?\d*)/)
    return match ? parseFloat(match[1]) : 0
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    if (field === 'vehiclesType') {
      calculateMileageCost(formData.startLocationId, formData.endLocationId, value)
    }
  }

  const handleStartLocationSelect = (place: PlaceSuggestion) => {
    setFormData(prev => ({
      ...prev,
      startLocation: place.description,
      startLocationId: place.place_id
    }))
    calculateMileageCost(place.place_id, formData.endLocationId, formData.vehiclesType)
  }

  const handleEndLocationSelect = (place: PlaceSuggestion) => {
    setFormData(prev => ({
      ...prev,
      endLocation: place.description,
      endLocationId: place.place_id
    }))
    calculateMileageCost(formData.startLocationId, place.place_id, formData.vehiclesType)
  }

  const calculateMileageCost = async (originId: string, destinationId: string, vehicle: string) => {
    if (!originId || !destinationId || !vehicle) return

    const orgId = getOrgIdFromToken()
    if (!orgId) return

    const mappedVehicle = vehicleTypeMappingForCost[vehicle as keyof typeof vehicleTypeMappingForCost] || vehicle

    setIsCalculating(true)
    try {
      const costData = await placesService.getMileageCost(originId, destinationId, mappedVehicle, orgId)
      if (costData) {
        setFormData(prev => ({
          ...prev,
          distance: costData.distance.text,
          amount: `₹${costData.cost.toFixed(2)}`
        }))
      }
    } catch (error) {
      console.error('Error calculating mileage cost:', error)
    } finally {
      setIsCalculating(false)
    }
  }


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.startLocation || !formData.endLocation || !formData.vehiclesType || !formData.description) {
      alert('Please fill in all required fields: Start Location, End Location, Vehicle Type, and Description')
      return
    }
    
    const submitData = {
      expense_policy_id: "ep0AGCzwSOmn",
      category_id: "cat1GIY3ygLyb",
      amount: extractAmount(formData.amount),
      expense_date: formData.expenseDate,
      description: formData.description,
      start_location: formData.startLocation,
      end_location: formData.endLocation,
      distance: extractDistance(formData.distance),
      distance_unit: "KM",
      vehicle_type: vehicleTypeMapping[formData.vehiclesType as keyof typeof vehicleTypeMapping] || "four_wheeler",
      mileage_meta: {
        trip_purpose: "business_travel",
        notes: ""
      },
      vendor: "Personal Vehicle"
    }
    
    try {
      const orgId = getOrgIdFromToken()
      if (!orgId) {
        alert('Organization ID not found. Please login again.')
        return
      }
      
      await placesService.createMileageExpense(submitData, orgId)
      
      // Show success toast and navigate
      toast.success('Mileage expense created successfully!')
      setTimeout(() => {
        navigate('/expenses')
      }, 500)
      
    } catch (error: any) {
      console.error('Error creating mileage expense:', error)
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create mileage expense'
      alert(`Error: ${errorMessage}`)
    }
  }

  const content = (
    <div className="max-w-full mx-auto px-6 pt-1 pb-6">
      <div className="mb-3">
        <h1 className="text-2xl font-bold text-gray-800">
          {mode === 'view' ? 'Mileage Expense Details' : 'Create New Mileage Expense'}
        </h1>
      </div>
        
        <form onSubmit={handleSubmit}>
          <Card>
            <CardContent className="px-6 py-4 space-y-2">
              {/* Route Section */}
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-gray-700">Route</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startLocation" className="text-sm font-medium text-gray-700">
                      Start Location
                    </Label>
                    <LocationAutocomplete
                      value={formData.startLocation}
                      onChange={(value) => handleInputChange('startLocation', value)}
                      onSelect={handleStartLocationSelect}
                      placeholder="e.g., 123 Main St, Anytown"
                      disabled={mode === 'view'}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="endLocation" className="text-sm font-medium text-gray-700">
                      End Location
                    </Label>
                    <LocationAutocomplete
                      value={formData.endLocation}
                      onChange={(value) => handleInputChange('endLocation', value)}
                      onSelect={handleEndLocationSelect}
                      placeholder="e.g., 456 Oak Ave, Sometown"
                      disabled={mode === 'view'}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="vehiclesType" className="text-sm font-medium text-gray-700">
                    Vehicle Type
                  </Label>
                  <Select 
                    value={formData.vehiclesType} 
                    onValueChange={(value) => handleInputChange('vehiclesType', value)}
                    disabled={mode === 'view'}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select vehicle type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="car">Car</SelectItem>
                      <SelectItem value="bike">Bike</SelectItem>
                      <SelectItem value="public_transport">Public Transport</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Details Section */}
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-gray-700">Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="distance" className="text-sm font-medium text-gray-700">
                      Distance (km)
                    </Label>
                    <div className="relative">
                      <Input
                        id="distance"
                        type="text"
                        value={isCalculating ? "Calculating..." : (formData.distance || "Auto-calculated")}
                        onChange={(e) => handleInputChange('distance', e.target.value)}
                        className="bg-gray-50 text-gray-500"
                        disabled={isCalculating || mode === 'view'}
                      />
                      {isCalculating && (
                        <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 animate-spin" />
                      )}
                    </div>
                    {mode === 'create' && <p className="text-xs text-gray-500">Manual adjustment is possible.</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="amount" className="text-sm font-medium text-gray-700">
                      Amount
                    </Label>
                    <div className="relative">
                      <Input
                        id="amount"
                        type="text"
                        value={isCalculating ? "Calculating..." : (formData.amount || "₹ Auto-calculated")}
                        onChange={(e) => handleInputChange('amount', e.target.value)}
                        className="bg-gray-50 text-gray-500"
                        disabled={isCalculating || mode === 'view'}
                      />
                      {isCalculating && (
                        <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 animate-spin" />
                      )}
                    </div>
                    {mode === 'create' && <p className="text-xs text-gray-500">Based on policy rate.</p>}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category" className="text-sm font-medium text-gray-700">
                      Category
                    </Label>
                    <div className="flex h-10 w-full rounded-md border border-input bg-gray-50 px-3 py-2 text-sm ring-offset-background text-gray-700">
                      Travel
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="policy" className="text-sm font-medium text-gray-700">
                      Policy
                    </Label>
                    <div className="flex h-10 w-full rounded-md border border-input bg-gray-50 px-3 py-2 text-sm ring-offset-background text-gray-700">
                      Mileage
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="expenseDate" className="text-sm font-medium text-gray-700">
                    Expense Date
                  </Label>
                  <div className="relative w-fit">
                    <Calendar className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      id="expenseDate"
                      type="date"
                      value={formData.expenseDate}
                      onChange={(e) => handleInputChange('expenseDate', e.target.value)}
                      className="h-10 pl-8 w-40"
                      disabled={mode === 'view'}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Provide a brief description for this trip..."
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    className="min-h-[100px] resize-none"
                    disabled={mode === 'view'}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              {mode === 'create' && (
                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
                  >
                    Submit Expense
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
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

export default MileagePage