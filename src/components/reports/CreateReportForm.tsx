import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  ArrowLeft,
  Loader2,
  FileText,
  Calendar,
  Building,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

import { reportService } from '@/services/reportService';
import { Expense } from '@/types/expense';
import { AdditionalFieldMeta, CustomAttribute } from '@/types/report';
import { useAuthStore } from '@/store/authStore';
import { formatDate, formatCurrency } from '@/lib/utils';
import { DynamicCustomField } from './DynamicCustomField';

// Dynamic form schema creation function
const createReportSchema = (customAttributes: CustomAttribute[]) => {
  const baseSchema = {
    reportName: z.string().min(1, 'Report name is required'),
    description: z.string().min(1, 'Description is required'),
  };

  // Add dynamic fields based on custom attributes
  const dynamicFields: Record<string, z.ZodTypeAny> = {};
  customAttributes.forEach(attr => {
    const fieldName = attr.name;
    if (attr.is_required) {
      dynamicFields[fieldName] = z.string().min(1, `${attr.display_name} is required`);
    } else {
      dynamicFields[fieldName] = z.string().optional();
    }
  });

  return z.object({ ...baseSchema, ...dynamicFields });
};

type ReportFormValues = {
  reportName: string;
  description: string;
  [key: string]: string | undefined;
};

interface CreateReportFormProps {
  editMode?: boolean;
  reportData?: {
    id: string;
    title: string;
    description: string;
    custom_attributes?: Record<string, string>;
    expenses?: Expense[];
  };
}

export function CreateReportForm({ editMode = false, reportData }: CreateReportFormProps) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingExpenses, setLoadingExpenses] = useState(true);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [availableExpenses, setAvailableExpenses] = useState<Expense[]>([]);
  const [selectedAvailableExpenses, setSelectedAvailableExpenses] = useState<Set<string>>(new Set());
  const [additionalFields, setAdditionalFields] = useState<AdditionalFieldMeta[]>([]);
  const [customAttributes, setCustomAttributes] = useState<CustomAttribute[]>([]);
  const [formSchema, setFormSchema] = useState(createReportSchema([]));
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [apiLoading, setApiLoading] = useState(false);

  // Determine if Hospital Name and Campaign Code should be shown
  const userDept = user?.department?.toLowerCase() || '';
  const showHospitalAndCampaign = userDept === 'operations' || userDept === 'sales';

  // Create default values for dynamic form
  const createDefaultValues = (attributes: CustomAttribute[]) => {
    const defaults: ReportFormValues = {
      reportName: editMode && reportData ? reportData.title : '',
      description: editMode && reportData ? reportData.description : '',
    };
    
    // Set custom attribute values if in edit mode
    if (editMode && reportData?.custom_attributes) {
      Object.entries(reportData.custom_attributes).forEach(([key, value]) => {
        defaults[key] = value;
      });
    }
    
    // Set default empty values for other attributes
    attributes.forEach(attr => {
      if (defaults[attr.name] === undefined) {
      defaults[attr.name] = '';
      }
    });
    
    return defaults;
  };

  const form = useForm<ReportFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: createDefaultValues(customAttributes),
  });

  useEffect(() => {
    fetchData();
  }, []);

  // Re-initialize form when custom attributes change
  useEffect(() => {
    if (customAttributes.length > 0) {
      const newSchema = createReportSchema(customAttributes);
      setFormSchema(newSchema);
      
      // Reset form with new default values
      const newDefaultValues = createDefaultValues(customAttributes);
      form.reset(newDefaultValues);
    }
  }, [customAttributes, form]);

  const fetchData = async () => {
    try {
      setLoadingExpenses(true);
      setLoadingMeta(true);

      if (editMode && reportData) {
        // In edit mode, fetch the full report with expenses
        const fullReportResponse = await reportService.getReportWithExpenses(reportData.id);
        const reportExpenses = fullReportResponse.success ? (fullReportResponse.data?.expenses || []) : (reportData.expenses || []);
        setExpenses(reportExpenses);
        
        // Fetch all available expenses (unassigned)
        const unassignedExpenses = await reportService.getUnassignedExpenses();
        setAvailableExpenses(unassignedExpenses);
      } else {
        // In create mode, fetch unassigned expenses
        const unassignedExpenses = await reportService.getUnassignedExpenses();
        setAvailableExpenses(unassignedExpenses);
        setExpenses([]);
      }

      // Fetch metadata and custom attributes
      const [orgMeta, customAttrs] = await Promise.all([
        reportService.getOrganizationMeta(user?.organization?.id || 0),
        reportService.getCustomAttributes(user?.organization?.id?.toString() || '5')
      ]);

      setCustomAttributes(customAttrs);

      // Update form schema with custom attributes
      const newSchema = createReportSchema(customAttrs);
      setFormSchema(newSchema);

      // Set additional fields from metadata
      if (orgMeta && orgMeta.additionalFieldsMeta?.expense_reports_fields) {
        setAdditionalFields(orgMeta.additionalFieldsMeta.expense_reports_fields);
      }

      // Reset form with new default values if in edit mode
      if (editMode && reportData) {
        const newDefaultValues = createDefaultValues(customAttrs);
        form.reset(newDefaultValues);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch data');
    } finally {
      setLoadingExpenses(false);
      setLoadingMeta(false);
    }
  };


  const toggleAvailableExpenseSelection = (expenseId: string) => {
    const newSelected = new Set(selectedAvailableExpenses);
    if (newSelected.has(expenseId)) {
      newSelected.delete(expenseId);
    } else {
      newSelected.add(expenseId);
    }
    setSelectedAvailableExpenses(newSelected);
  };

  const selectAllAvailableExpenses = () => {
    const allExpenseIds = new Set(availableExpenses.map(expense => expense.id));
    setSelectedAvailableExpenses(allExpenseIds);
  };

  const deselectAllAvailableExpenses = () => {
    setSelectedAvailableExpenses(new Set());
  };

  const removeExpenseFromReport = (expenseId: string) => {
    const expenseToRemove = expenses.find(expense => expense.id === expenseId);
    if (expenseToRemove) {
      setExpenseToDelete(expenseToRemove);
      setShowDeleteDialog(true);
    }
  };

  const confirmDeleteExpense = async () => {
    if (!expenseToDelete || !editMode || !reportData) return;

    setApiLoading(true);
    try {
      const response = await reportService.removeExpensesFromReport(reportData.id, [expenseToDelete.id]);
      
      if (response.success) {
        // Remove from current expenses
        const newExpenses = expenses.filter(expense => expense.id !== expenseToDelete.id);
        setExpenses(newExpenses);
        
        
        // Add to available expenses
        setAvailableExpenses(prev => [...prev, expenseToDelete]);
        
        toast.success(response.message || 'Expense removed from report');
      } else {
        toast.error(response.message || 'Failed to remove expense from report');
      }
    } catch (error) {
      console.error('Error removing expense from report:', error);
      toast.error('Failed to remove expense from report');
    } finally {
      setApiLoading(false);
      setShowDeleteDialog(false);
      setExpenseToDelete(null);
    }
  };

  const addExpensesToReport = async () => {
    if (selectedAvailableExpenses.size === 0 || !editMode || !reportData) return;
    
    const expensesToAdd = availableExpenses.filter(expense => 
      selectedAvailableExpenses.has(expense.id)
    );
    
    setApiLoading(true);
    try {
      const expenseIds = Array.from(selectedAvailableExpenses);
      const response = await reportService.addExpensesToReport(reportData.id, expenseIds);
      
      if (response.success) {
        // Add to current expenses
        setExpenses(prev => [...prev, ...expensesToAdd]);
        
        // Remove from available expenses
        setAvailableExpenses(prev => 
          prev.filter(expense => !selectedAvailableExpenses.has(expense.id))
        );
        
        
        // Clear available selection
        setSelectedAvailableExpenses(new Set());
        
        toast.success(response.message || 'Expenses added to report');
      } else {
        toast.error(response.message || 'Failed to add expenses to report');
      }
    } catch (error) {
      console.error('Error adding expenses to report:', error);
      toast.error('Failed to add expenses to report');
    } finally {
      setApiLoading(false);
    }
  };

  const getFieldMeta = (fieldName: string) => {
    return additionalFields.find(field => field.name === fieldName);
  };

  const onSave = async () => {
    if (expenses.length === 0) {
      toast.error('Please add at least one expense to the report');
      return;
    }

    setSaving(true);
    try {
      const formData = form.getValues();
      
      // Check if required fields are selected
      const costCenterField = getFieldMeta('Cost Center');
      const expenseHeadField = getFieldMeta('Expense Head');

      if (costCenterField && !formData.costCenter) {
        toast.error('Please select a Cost Center');
        return;
      }

      if (expenseHeadField && !formData.expenseHead) {
        toast.error('Please select an Expense Head');
        return;
      }

      // Always send all additional fields, with empty string if not shown/selected
      const allFieldNames = ['Cost Center', 'Expense Head', 'Hospital Name', 'Campaign Code'];
      const additionalFieldsData: Record<string, string> = {};
      
      for (const name of allFieldNames) {
        const meta = getFieldMeta(name);
        if (meta) {
          // Only show value if field is visible, else empty string
          if (name === 'Hospital Name' || name === 'Campaign Code') {
            additionalFieldsData[meta.id] = showHospitalAndCampaign ? (formData.hospitalName || formData.campaignCode || '') : '';
          } else if (name === 'Cost Center') {
            additionalFieldsData[meta.id] = formData.costCenter || '';
          } else if (name === 'Expense Head') {
            additionalFieldsData[meta.id] = formData.expenseHead || '';
          }
        }
      }

      // Add dynamic custom fields
      customAttributes.forEach(attr => {
        additionalFieldsData[attr.name] = formData[attr.name] || '';
      });

      // Create custom_attributes object for the API
      const customAttributesData: Record<string, string> = {};
      customAttributes.forEach(attr => {
        const value = formData[attr.name];
        if (value) {
          customAttributesData[attr.name] = value;
        }
      });

      if (editMode && reportData) {
        // Update existing report
        const updateData = {
          title: formData.reportName,
          description: formData.description,
          custom_attributes: customAttributesData,
        };
        
        const updateResponse = await reportService.updateReport(reportData.id, updateData);
        
        if (updateResponse.success) {
          toast.success('Report updated successfully');
          navigate('/reports');
        } else {
          toast.error(updateResponse.message);
        }
      } else {
        // Create new report
        const newReportData = {
        reportName: formData.reportName,
        description: formData.description,
          expenseIds: expenses.map(expense => expense.id),
        additionalFields: additionalFieldsData,
        customAttributes: customAttributesData,
      };

        const createResponse = await reportService.createReport(newReportData);
      
      if (createResponse.success) {
        toast.success('Report saved as draft');
        navigate('/reports');
      } else {
        toast.error(createResponse.message);
        }
      }
    } catch (error) {
      console.error('Failed to save report', error);
      toast.error('Failed to save report');
    } finally {
      setSaving(false);
    }
  };

  const onSubmit = async (data: ReportFormValues) => {
    if (expenses.length === 0) {
      toast.error('Please add at least one expense to the report');
      return;
    }

    // Check if required fields are selected
    const costCenterField = getFieldMeta('Cost Center');
    const expenseHeadField = getFieldMeta('Expense Head');

    if (costCenterField && !data.costCenter) {
      toast.error('Please select a Cost Center');
      return;
    }

    if (expenseHeadField && !data.expenseHead) {
      toast.error('Please select an Expense Head');
      return;
    }

    setLoading(true);
    try {
      // Always send all additional fields, with empty string if not shown/selected
      const allFieldNames = ['Cost Center', 'Expense Head', 'Hospital Name', 'Campaign Code'];
      const additionalFieldsData: Record<string, string> = {};
      
      for (const name of allFieldNames) {
        const meta = getFieldMeta(name);
        if (meta) {
          // Only show value if field is visible, else empty string
          if (name === 'Hospital Name' || name === 'Campaign Code') {
            additionalFieldsData[meta.id] = showHospitalAndCampaign ? (data.hospitalName || data.campaignCode || '') : '';
          } else if (name === 'Cost Center') {
            additionalFieldsData[meta.id] = data.costCenter || '';
          } else if (name === 'Expense Head') {
            additionalFieldsData[meta.id] = data.expenseHead || '';
          }
        }
      }

      // Add dynamic custom fields
      customAttributes.forEach(attr => {
        additionalFieldsData[attr.name] = data[attr.name] || '';
      });

      // Create custom_attributes object for the API
      const customAttributesData: Record<string, string> = {};
      customAttributes.forEach(attr => {
        const value = data[attr.name];
        if (value) {
          customAttributesData[attr.name] = value;
        }
      });

      const reportData = {
        reportName: data.reportName,
        description: data.description,
        expenseIds: expenses.map(expense => expense.id),
        additionalFields: additionalFieldsData,
        customAttributes: customAttributesData,
      };

      // 1. Create report
      const createResponse = await reportService.createReport(reportData);
      
      if (createResponse.success && createResponse.reportId) {
        // 2. Submit report immediately
        const submitResponse = await reportService.submitReport(createResponse.reportId);
        
        if (submitResponse.success) {
          toast.success('Report created and submitted successfully!');
        } else {
          toast.success('Report created successfully!');
        }
        
        // 3. Navigate to reports page (this will refresh the table)
        navigate('/reports');
      } else {
        toast.error(createResponse.message);
      }
    } catch (error) {
      console.error('Failed to create report', error);
      toast.error('Failed to create report');
    } finally {
      setLoading(false);
    }
  };

  const renderDropdownField = (fieldName: string, formFieldName: string) => {
    const fieldMeta = getFieldMeta(fieldName);
    if (!fieldMeta) return null;

    const isRequired = fieldName === 'Cost Center' || fieldName === 'Expense Head';

    return (
      <FormField
        key={fieldMeta.id}
        control={form.control}
        name={formFieldName}
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {fieldMeta.metadata.label}{isRequired ? ' *' : ''}
            </FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder={fieldMeta.metadata.placeholder} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {fieldMeta.metadata.options.map((option) => (
                  <SelectItem key={option.key} value={option.value}>
                    {option.value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">
          {editMode ? 'Edit Report' : 'Create Report'}
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Section */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Report Details</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="reportName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Report Name *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter report name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description *</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Enter report description"
                            rows={4}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Separator />

                  {loadingMeta ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mr-2" />
                      <span className="text-muted-foreground">Loading additional fields...</span>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Additional Fields</h3>
                      {renderDropdownField('Cost Center', 'costCenter')}
                      {renderDropdownField('Expense Head', 'expenseHead')}
                      {showHospitalAndCampaign && renderDropdownField('Hospital Name', 'hospitalName')}
                      {showHospitalAndCampaign && renderDropdownField('Campaign Code', 'campaignCode')}
                    </div>
                  )}

                  {/* Dynamic Custom Fields */}
                  {customAttributes.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Custom Fields</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {customAttributes.map((attribute) => (
                          <DynamicCustomField
                            key={attribute.id}
                            control={form.control}
                            name={attribute.name as any}
                            attribute={attribute}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        {/* Expense Selection Section */}
        <div className="lg:col-span-1 space-y-6">
          {/* Current Expenses Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Current Expenses ({expenses.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="max-h-80 overflow-y-auto">
              {expenses.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No expenses in this report yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {expenses.map((expense) => (
                    <div
                      key={expense.id}
                      className="border rounded-lg p-3 transition-colors bg-white"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-medium text-sm truncate">
                              {expense.vendor}
                            </p>
                            <p className="font-semibold text-sm text-primary">
                              {formatCurrency(expense.amount, 'INR')}
                            </p>
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                            <span className="flex items-center gap-1">
                              <Building className="h-3 w-3" />
                              {expense.category}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(expense.expense_date)}
                            </span>
                          </div>
                          {expense.description && (
                            <p className="text-xs text-muted-foreground italic truncate">
                              {expense.description}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeExpenseFromReport(expense.id)}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Available Expenses Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Available Expenses ({availableExpenses.length})
                </CardTitle>
                {availableExpenses.length > 0 && (
                  <button
                    onClick={selectAllAvailableExpenses}
                    className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    Select All
                  </button>
                )}
              </div>
            </CardHeader>
            <CardContent className="max-h-80 overflow-y-auto">
              {loadingExpenses ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <span className="text-muted-foreground">Loading expenses...</span>
                </div>
              ) : availableExpenses.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No available expenses found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {availableExpenses.map((expense) => (
                    <div
                      key={expense.id}
                      className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                        selectedAvailableExpenses.has(expense.id)
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => toggleAvailableExpenseSelection(expense.id)}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedAvailableExpenses.has(expense.id)}
                          onChange={() => toggleAvailableExpenseSelection(expense.id)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-medium text-sm truncate">
                              {expense.vendor}
                            </p>
                            <p className="font-semibold text-sm text-primary">
                              {formatCurrency(expense.amount, 'INR')}
                            </p>
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                            <span className="flex items-center gap-1">
                              <Building className="h-3 w-3" />
                              {expense.category}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(expense.expense_date)}
                            </span>
                          </div>
                          {expense.description && (
                            <p className="text-xs text-muted-foreground italic truncate">
                              {expense.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Add Selected Expenses Button */}
          {selectedAvailableExpenses.size > 0 && (
            <div className="flex justify-center">
              <Button 
                onClick={addExpensesToReport}
                disabled={apiLoading}
                className="w-full"
              >
                {apiLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding Expenses...
                  </>
                ) : (
                  `Add ${selectedAvailableExpenses.size} Selected Expense${selectedAvailableExpenses.size !== 1 ? 's' : ''} to Report`
                )}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Total Amount Display */}
      {expenses.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold">Total Amount:</span>
            <span className="text-xl font-bold text-primary">
              {formatCurrency(
                expenses.reduce((sum, expense) => sum + parseFloat(expense.amount.toString()), 0),
                'INR'
              )}
            </span>
          </div>
        </div>
      )}

      {/* Action Buttons - At the very bottom of the page */}
      <div className="sticky bottom-0 bg-white border-t pt-6 pb-4">
        <div className="flex justify-end gap-4">
          <Button 
            onClick={onSave} 
            disabled={saving} 
            variant="outline"
            className="px-10 py-3 border-blue-500 text-blue-500 hover:bg-blue-50"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {editMode ? 'Updating...' : 'Saving...'}
              </>
            ) : (
              editMode ? 'Update Report' : 'Save Draft'
            )}
          </Button>
          {!editMode && (
          <Button 
            onClick={form.handleSubmit(onSubmit)} 
            disabled={loading} 
            className="px-10 py-3"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Create & Submit'
            )}
          </Button>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <X className="h-5 w-5 text-red-600" />
              Remove Expense
            </DialogTitle>
          </DialogHeader>
          
          {expenseToDelete && (
            <div className="space-y-4">
              <div className="bg-muted/30 rounded-lg p-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Vendor:</span>
                    <span className="text-sm font-medium">{expenseToDelete.vendor}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Amount:</span>
                    <span className="text-sm font-medium">
                      {formatCurrency(expenseToDelete.amount, 'INR')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Category:</span>
                    <span className="text-sm font-medium">{expenseToDelete.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Date:</span>
                    <span className="text-sm font-medium">{formatDate(expenseToDelete.expense_date)}</span>
                  </div>
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground">
                Are you sure you want to remove this expense from the report? This action cannot be undone.
              </p>
            </div>
          )}
          
          <DialogFooter className="flex flex-row gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false);
                setExpenseToDelete(null);
              }}
              disabled={apiLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDeleteExpense}
              disabled={apiLoading}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              {apiLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                'Remove Expense'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}