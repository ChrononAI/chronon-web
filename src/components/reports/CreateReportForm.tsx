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
  Trash2,
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

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
  const [selectedAvailableExpenses, setSelectedAvailableExpenses] = useState<Set<string>>(new Set());
  const additionalFields: AdditionalFieldMeta[] = [];
  const [customAttributes, setCustomAttributes] = useState<CustomAttribute[]>([]);
  const [formSchema, setFormSchema] = useState(createReportSchema([]));
  const [markedExpenses, setMarkedExpenses] = useState<Expense[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

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
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  
  // Get unique categories from expenses
  const getUniqueCategories = (expenses: Expense[]): string[] => {
    const categories = expenses
      .map(exp => exp.category)
      .filter((cat): cat is string => Boolean(cat && cat.trim()))
      .filter((cat, index, self) => self.indexOf(cat) === index)
      .sort();
    return categories;
  };

  // Truncate category name for display
  const truncateCategory = (category: string, maxLength: number = 15): string => {
    if (category.length <= maxLength) return category;
    return category.substring(0, maxLength) + '...';
  };

  // Filter expenses based on selected category
  const getFilteredExpenses = (): Expense[] => {
    if (categoryFilter === 'all') {
      return allExpenses;
    }
    return allExpenses.filter(exp => exp.category === categoryFilter);
  };

  const filteredExpenses = getFilteredExpenses();

  const fetchData = async () => {
    try {
      setLoadingExpenses(true);
      setLoadingMeta(true);

      if (editMode && reportData) {
        // In edit mode, fetch the full report with expenses
        const fullReportResponse = await reportService.getReportWithExpenses(reportData.id);
        const reportExpenses = fullReportResponse.success ? (fullReportResponse.data?.expenses || []) : (reportData.expenses || []);
        setMarkedExpenses([...reportExpenses]);

        // Fetch all available expenses (unassigned)
        const unassignedExpenses = await reportService.getUnassignedExpenses();
        setAllExpenses([...reportExpenses, ...unassignedExpenses]);
      } else {
        // In create mode, fetch unassigned expenses
        const unassignedExpenses = await reportService.getUnassignedExpenses();
        setAllExpenses(unassignedExpenses);
        setMarkedExpenses([]);
      }

      const customAttrs = await reportService.getCustomAttributes(user?.organization?.id?.toString() || '5')
      setCustomAttributes(customAttrs);

      // Update form schema with custom attributes
      const newSchema = createReportSchema(customAttrs);
      setFormSchema(newSchema);

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

  const getFieldMeta = (fieldName: string) => {
    return additionalFields.find(field => field.name === fieldName);
  };

  const onSave = async () => {
    if (markedExpenses.length === 0) {
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
          expense_ids: markedExpenses.map(exp => exp.id)
        };
        markedExpenses.map(expense => expense.id)
        const updateResponse = await reportService.updateReport(reportData.id, updateData);
        // await reportService.addExpensesToReport(reportData.id, expIds);

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
          expenseIds: markedExpenses.map(expense => expense.id),
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

  const handleDeleteReport = async () => {
    if (!reportData?.id) return;

    setIsDeleting(true);
    try {
      const response = await reportService.deleteReport(reportData.id);
      if (response.success) {
        toast.success('Report deleted successfully');
        navigate('/reports');
      } else {
        toast.error(response.message || 'Failed to delete report');
        setShowDeleteDialog(false);
      }
    } catch (error) {
      console.error('Failed to delete report:', error);
      toast.error('Failed to delete report');
      setShowDeleteDialog(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const onSubmit = async (data: ReportFormValues) => {
    if (markedExpenses.length === 0) {
      toast.error('Please add at least one expense to the report');
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

      const reportData2 = {
        reportName: data.reportName,
        description: data.description,
        expenseIds: markedExpenses.map(expense => expense.id),
        additionalFields: additionalFieldsData,
        customAttributes: customAttributesData,
      };

      // 1. Create report
      if (editMode && reportData) {
        await reportService.updateReport(reportData.id, {
          title: data.reportName,
          description: data.description,
          custom_attributes: customAttributesData,
          expense_ids: markedExpenses.map(exp => exp.id)
        });
        // await reportService.addExpensesToReport(reportData.id, markedExpenses.map(expense => expense.id))
        const submitReport = await reportService.submitReport(reportData.id);
        if (submitReport.success) {
          toast.success('Report submitted successfully');
          navigate('/reports');
        } else {
          toast.error('Failed to submit report');
        }
      } else {
        const createResponse = await reportService.createReport(reportData2);
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
      }

    } catch (error) {
      console.error('Failed to create report', error);
      toast.error('Failed to create report');
    } finally {
      setLoading(false);
    }
  };

  const markExpense = (expense: Expense) => {
    if (markedExpenses.some(exp => exp.id === expense.id)) {
      setMarkedExpenses(prev => prev.filter((exp) => exp.id !== expense.id))
    } else {
      setMarkedExpenses(prev => [...prev, expense]);
    }
  }

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form Section */}
        <div className="lg:col-span-1">
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
                            className="resize-none"
                            placeholder="Enter report description"
                            rows={4}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {loadingMeta && (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mr-2" />
                      <span className="text-muted-foreground">Loading additional fields...</span>
                    </div>
                  )}

                  {/* Dynamic Custom Fields */}
                  {customAttributes.length > 0 && (
                    <>
                      <Separator />
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
                    </>
                  )}

                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Expenses ({filteredExpenses.length})
                </CardTitle>
                {allExpenses.length > 0 && (
                  <>
                    <div className="flex items-center gap-3">
                      {getUniqueCategories(allExpenses).length > 0 && (
                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                          <SelectTrigger className="w-[140px] h-auto py-1.5 text-sm [&>span]:truncate [&>span]:max-w-[120px]">
                            <SelectValue placeholder="Filter" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            {getUniqueCategories(allExpenses).map((category) => (
                              <SelectItem key={category} value={category} title={category}>
                                {truncateCategory(category, 15)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      {filteredExpenses.filter(exp => !markedExpenses.some(marked => marked.id === exp.id)).length > 0 && <button
                        onClick={() => {
                          const toAdd = filteredExpenses.filter(exp => !markedExpenses.some(marked => marked.id === exp.id));
                          setMarkedExpenses([...markedExpenses, ...toAdd]);
                        }}
                        className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        Select All
                      </button>}
                      {filteredExpenses.length > 0 && filteredExpenses.every(exp => markedExpenses.some(marked => marked.id === exp.id)) && <button
                        onClick={() => {
                          const filteredIds = new Set(filteredExpenses.map(exp => exp.id));
                          setMarkedExpenses(markedExpenses.filter(exp => !filteredIds.has(exp.id)));
                        }}
                        className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        Deselect All
                      </button>}
                    </div>
                  </>
                )}
              </div>
            </CardHeader>
            <CardContent className="max-h-[600px] overflow-y-auto">
              {loadingExpenses ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <span className="text-muted-foreground">Loading expenses...</span>
                </div>
              ) : allExpenses.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No expenses found</p>
                </div>
              ) : filteredExpenses.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No expenses found for selected category</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredExpenses.map((expense) => (
                    <div
                      key={expense.id}
                      className={`border rounded-lg p-3 cursor-pointer transition-colors ${selectedAvailableExpenses.has(expense.id)
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                        }`}
                      onClick={() => markExpense(expense)}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          // checked={selectedAvailableExpenses.has(expense.id)}
                          checked={markedExpenses.some(exp => exp.id === expense.id)}
                          onChange={() => toggleAvailableExpenseSelection(expense.id)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-medium text-sm truncate">
                              {expense.expense_type === "MILEAGE_BASED" ? "Mileage Expense" : expense.expense_type === "PER_DIEM" ? "Per Diem Expense" : expense.vendor}
                            </p>
                            <p className="font-semibold text-sm text-primary">
                              {formatCurrency(expense.amount)}
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
        </div>
      </div>

      {/* Total Amount Display */}
        <div className="flex justify-end">
          <div className="bg-gray-50 rounded-lg px-8 py-3 min-w-[680px] flex items-center justify-between">
            <span className="text-sm text-gray-600">Total Amount:</span>
            <span className="text-lg font-bold text-primary">
              {markedExpenses.length > 0 ? formatCurrency(
                markedExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount.toString()), 0),
                'INR'
              ) : formatCurrency(0)}
            </span>
          </div>
        </div>
      

      {/* Action Buttons - At the very bottom of the page */}
      <div className="sticky bottom-0 bg-white border-t pt-6 pb-4">
        <div className="flex justify-end gap-4">
          {/* Delete Button - Only show in edit mode for draft reports */}
          {editMode && reportData && (
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="px-10 py-3 border-red-500 text-red-600 hover:bg-red-50"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Report</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this report? This action cannot be undone.
                    {reportData.title && (
                      <span className="block mt-2 font-medium">
                        Report: {reportData.title}
                      </span>
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeleting}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteReport}
                    disabled={isDeleting}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      'Delete'
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
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
              'Submit'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}