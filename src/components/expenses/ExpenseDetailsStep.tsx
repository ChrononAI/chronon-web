import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  ArrowLeft,
  MapPin,
  Navigation,
  Calendar,
  Loader2,
  FileText,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RefreshCw,
  Maximize2,
  Download,
  X,
  ChevronDown,
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
import { Card, CardContent } from '@/components/ui/card';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { expenseService } from '@/services/expenseService';
import { Policy, PolicyCategory } from '@/types/expense';
import { ParsedInvoiceData } from '@/services/fileParseService';


// Form schema
const expenseSchema = z.object({
  policyId: z.string().min(1, 'Please select a policy'),
  categoryId: z.string().min(1, 'Please select a category'),
  invoiceNumber: z.string().min(1, 'Invoice number is required'),
  merchant: z.string().min(1, 'Merchant is required'),
  amount: z.string().min(1, 'Amount is required'),
  dateOfExpense: z.date({
    required_error: 'Date is required',
  }),
  comments: z.string().optional(),
  // Conveyance specific fields
  city: z.string().optional(),
  source: z.string().optional(),
  destination: z.string().optional(),
});

type ExpenseFormValues = z.infer<typeof expenseSchema>;


const cities = [
  'Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Ahmedabad', 'Chennai',
  'Kolkata', 'Pune', 'Jaipur', 'Lucknow', 'Kanpur', 'Nagpur', 'Indore',
  'Thane', 'Bhopal', 'Visakhapatnam', 'Pimpri-Chinchwad', 'Patna',
  'Vadodara', 'Ghaziabad'
];

interface ExpenseDetailsStepProps {
  onBack: () => void;
  onSubmit: (data: ExpenseFormValues) => void;
  loading: boolean;
  parsedData: ParsedInvoiceData | null;
  uploadedFile: File | null;
  previewUrl: string | null;
  readOnly?: boolean;
  expenseData?: ExpenseFormValues;
  receiptUrls?: string[];
  isEditMode?: boolean;
  receiptLoading?: boolean;
}

export function ExpenseDetailsStep({ 
  onBack, 
  onSubmit, 
  loading, 
  parsedData,
  uploadedFile,
  previewUrl,
  readOnly = false,
  expenseData,
  receiptUrls = [],
  isEditMode = false,
  receiptLoading = false
}: ExpenseDetailsStepProps) {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<PolicyCategory | null>(null);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);


  // Receipt viewer states
  const [isReceiptFullscreen, setIsReceiptFullscreen] = useState(false);
  const [receiptZoom, setReceiptZoom] = useState(1);
  const [receiptRotation, setReceiptRotation] = useState(0);

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: expenseData ? expenseData : {
      policyId: '',
      categoryId: '',
      invoiceNumber: '',
      merchant: '',
      amount: '',
      dateOfExpense: new Date(),
      comments: '',
      city: '',
      source: '',
      destination: '',
    },
  });

  useEffect(() => {
    loadPoliciesWithCategories();
  }, []);

  // Update form values when expenseData changes
  useEffect(() => {
    if (expenseData) {
      form.reset(expenseData);
      
      // Set selected policy and category based on form data
      if (expenseData.policyId && policies.length > 0) {
        const policy = policies.find(p => p.id === expenseData.policyId);
        if (policy) {
          setSelectedPolicy(policy);
          
          if (expenseData.categoryId) {
            const category = policy.categories.find(c => c.id === expenseData.categoryId);
            if (category) {
              setSelectedCategory(category);
            }
          }
        }
      }
    }
  }, [expenseData, form, policies]);

  // Auto-fill fields from parsed data
  useEffect(() => {
    if (parsedData && parsedData.ocr_result) {
      const ocrData = parsedData.ocr_result;

      if (ocrData.amount) {
        // Clean amount by removing currency symbols and commas
        const cleanAmount = ocrData.amount.replace(/[^\d.,]/g, '').replace(/,/g, '');
        form.setValue('amount', cleanAmount);
      }
      
      if (ocrData.vendor) {
        form.setValue('merchant', ocrData.vendor);
      }
      
      if (ocrData.invoice_number) {
        form.setValue('invoiceNumber', ocrData.invoice_number);
      }
      
      if (ocrData.date) {
        // Parse the date string and convert to Date object
        const parsedDate = new Date(ocrData.date);
        if (!isNaN(parsedDate.getTime())) {
          form.setValue('dateOfExpense', parsedDate);
        }
      }
    }
  }, [parsedData, form]);

  const loadPoliciesWithCategories = async () => {
    try {
      const policiesData = await expenseService.getPoliciesWithCategories();
      setPolicies(policiesData);
    } catch (error) {
      console.error('Error loading policies:', error);
    }
  };



  // Receipt viewer functions
  const handleReceiptZoomIn = () => {
    setReceiptZoom(prev => Math.min(prev + 0.25, 3));
  };

  const handleReceiptZoomOut = () => {
    setReceiptZoom(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleReceiptRotate = () => {
    setReceiptRotation(prev => (prev + 90) % 360);
  };

  const handleReceiptReset = () => {
    setReceiptZoom(1);
    setReceiptRotation(0);
  };

  const handleReceiptFullscreen = () => {
    setIsReceiptFullscreen(true);
  };

  const handleReceiptDownload = () => {
    if (uploadedFile) {
      const url = URL.createObjectURL(uploadedFile);
      const a = document.createElement('a');
      a.href = url;
      a.download = uploadedFile.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const isConveyanceCategory = selectedCategory?.name === 'Conveyance 2W';
  const availableCategories = selectedPolicy?.categories || [];

  return (
    <div className="space-y-6">
      {/* Step Header - Only show when not in read-only mode */}
      {!readOnly && (
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Step 2: Expense Details</h2>
          <p className="text-gray-600">Fill in the expense details and submit your request</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Section - Form Fields */}
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* 2-Column Grid for Form Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Policy Selection */}
                    <FormField
                      control={form.control}
                      name="policyId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Policy *</FormLabel>
                          <Select
                            onValueChange={(value) => {
                              field.onChange(value);
                              const policy = policies.find(p => p.id === value);
                              setSelectedPolicy(policy || null);
                              setSelectedCategory(null);
                              form.setValue('categoryId', '');
                            }}
                            defaultValue={field.value}
                            disabled={readOnly}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a policy">
                                  {field.value && selectedPolicy ? selectedPolicy.name : "Select a policy"}
                                </SelectValue>
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {policies.map((policy) => (
                                <SelectItem key={policy.id} value={policy.id}>
                                  <div>
                                    <div className="font-medium">{policy.name}</div>
                                    {policy.description && (
                                      <div className="text-sm text-muted-foreground">{policy.description}</div>
                                    )}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Category Selection */}
                    <FormField
                      control={form.control}
                      name="categoryId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category *</FormLabel>
                          <Popover open={categoryDropdownOpen} onOpenChange={setCategoryDropdownOpen}>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={categoryDropdownOpen}
                                  className="w-full justify-between"
                                  disabled={!selectedPolicy || readOnly}
                                >
                                  {selectedCategory ? selectedCategory.name : (!selectedPolicy ? "Select policy first" : "Select a category")}
                                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                              <Command>
                                <CommandInput placeholder="Search categories..." />
                                <CommandList>
                                  <CommandEmpty>No category found.</CommandEmpty>
                                  <CommandGroup>
                                    {availableCategories.map((category) => (
                                      <CommandItem
                                        key={category.id}
                                        value={category.name}
                                        onSelect={() => {
                                          field.onChange(category.id);
                                          setSelectedCategory(category);
                                          setCategoryDropdownOpen(false);
                                        }}
                                      >
                                        {category.name}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Invoice Number and Vendor - only show if not Conveyance 2W */}
                    {!isConveyanceCategory && (
                      <>
                        <FormField
                          control={form.control}
                          name="invoiceNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                Invoice Number *
                                {parsedData?.ocr_result?.invoice_number && (
                                  <span className="text-green-600 text-xs ml-2">(Auto-filled)</span>
                                )}
                              </FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder="Invoice Number"
                                  className={parsedData?.ocr_result?.invoice_number ? "bg-white border-green-300 text-gray-900" : ""}
                                  readOnly={readOnly}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="merchant"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                Vendor *
                                {parsedData?.ocr_result?.vendor && (
                                  <span className="text-green-600 text-xs ml-2">(Auto-filled)</span>
                                )}
                              </FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder="Vendor"
                                  className={parsedData?.ocr_result?.vendor ? "bg-white border-green-300 text-gray-900" : ""}
                                  readOnly={readOnly}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    )}

              {/* Conveyance 2W Specific Fields */}
              {isConveyanceCategory && (
                <>
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select City *</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select city" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {cities.map((city) => (
                              <SelectItem key={city} value={city}>
                                {city}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="source"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Source *</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              {...field}
                              placeholder="Enter source location"
                              className="pl-10"
                              readOnly={readOnly}
                              onChange={field.onChange}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="destination"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Destination *</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Navigation className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              {...field}
                              placeholder="Enter destination location"
                              className="pl-10"
                              readOnly={readOnly}
                              onChange={field.onChange}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                </>
              )}

                    {/* Amount */}
                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Amount *
                            {parsedData?.ocr_result?.amount && (
                              <span className="text-green-600 text-xs ml-2">
                                (Auto-{isConveyanceCategory ? 'calculated' : 'filled'})
                              </span>
                            )}
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder={isConveyanceCategory ? 'Amount will be calculated (₹4 per km)' : 'Amount'}
                              type="number"
                              className={
                                parsedData?.ocr_result?.amount
                                  ? "bg-white border-green-300 text-gray-900"
                                  : ""
                              }
                              readOnly={readOnly}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Date */}
                    <FormField
                      control={form.control}
                      name="dateOfExpense"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Date *
                            {parsedData?.ocr_result?.date && (
                              <span className="text-green-600 text-xs ml-2">(Auto-filled)</span>
                            )}
                          </FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground",
                                    parsedData?.ocr_result?.date && "bg-white border-green-300 text-gray-900"
                                  )}
                                  disabled={readOnly}
                                >
                                  {field.value ? (
                                    format(field.value, "PPP")
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                  <Calendar className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <CalendarComponent
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) =>
                                  date > new Date() || date < new Date("1900-01-01")
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Calculation Info for Conveyance */}

                  {/* Comments - Full Width */}
                  <FormField
                    control={form.control}
                    name="comments"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Comments</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Add any additional comments..."
                            rows={4}
                            readOnly={readOnly}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Navigation Buttons */}
                  <div className="flex justify-between pt-6">
                    <Button type="button" variant="outline" onClick={onBack}>
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back
                    </Button>
                    {!readOnly && (
                      <Button type="submit" disabled={loading} className="bg-primary hover:bg-primary/90">
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {isEditMode ? 'Saving...' : 'Creating...'}
                          </>
                        ) : (
                          isEditMode ? 'Save Changes' : 'Create Expense'
                        )}
                      </Button>
                    )}
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        {/* Right Section - Receipt */}
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Receipt</h3>
                  {(uploadedFile || (readOnly && receiptUrls.length > 0)) && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">
                        {readOnly && receiptUrls.length > 0 
                          ? `Receipt ${receiptUrls.length > 1 ? '1' : ''}` 
                          : uploadedFile?.name}
                      </span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-500">
                        {readOnly && receiptUrls.length > 0 
                          ? (receiptUrls[0].toLowerCase().includes('.pdf') ? 'PDF' : 'Image')
                          : (uploadedFile?.type.includes('pdf') ? 'PDF' : 'Image')
                        }
                      </span>
                    </div>
                  )}
                </div>
                
                {(uploadedFile && previewUrl) || (readOnly && receiptUrls.length > 0) ? (
                  <div className="space-y-4">
                    {/* Interactive Receipt Viewer */}
                    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                      {/* Receipt Controls */}
                      <div className="flex items-center justify-between p-3 bg-gray-50 border-b border-gray-200">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleReceiptZoomOut}
                            disabled={receiptZoom <= 0.5}
                            className="h-8 w-8 p-0"
                          >
                            <ZoomOut className="h-4 w-4" />
                          </Button>
                          <span className="text-xs text-gray-600 min-w-[3rem] text-center">
                            {Math.round(receiptZoom * 100)}%
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleReceiptZoomIn}
                            disabled={receiptZoom >= 3}
                            className="h-8 w-8 p-0"
                          >
                            <ZoomIn className="h-4 w-4" />
                          </Button>
                          <div className="w-px h-6 bg-gray-300 mx-2" />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleReceiptRotate}
                            className="h-8 w-8 p-0"
                          >
                            <RotateCw className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleReceiptReset}
                            className="h-8 w-8 p-0"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleReceiptDownload}
                            className="h-8 px-3 text-xs"
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleReceiptFullscreen}
                            className="h-8 px-3 text-xs"
                          >
                            <Maximize2 className="h-4 w-4 mr-1" />
                            Fullscreen
                          </Button>
                        </div>
                      </div>

                      {/* Receipt Display */}
                      <div className="relative overflow-auto max-h-96 bg-gray-100">
                        <div className="flex items-center justify-center p-4">
                          {(() => {
                            // Determine the source URL and file type
                            const sourceUrl = readOnly && receiptUrls.length > 0 ? receiptUrls[0] : previewUrl;
                            const isPdf = readOnly && receiptUrls.length > 0 
                              ? receiptUrls[0].toLowerCase().includes('.pdf')
                              : uploadedFile?.type.includes('pdf');
                            
                            if (isPdf) {
                              return (
                                <div className="w-full h-80 border border-gray-200 rounded bg-white">
                                  <iframe
                                    src={`${sourceUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                                    className="w-full h-full border-0 rounded"
                                    title="PDF Preview"
                                    style={{
                                      transform: `scale(${receiptZoom}) rotate(${receiptRotation}deg)`,
                                      transformOrigin: 'center',
                                    }}
                                  />
                                </div>
                              );
                            } else {
                              return (
                                <img
                                  src={sourceUrl || ''}
                                  alt="Receipt preview"
                                  className="max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
                                  style={{
                                    transform: `scale(${receiptZoom}) rotate(${receiptRotation}deg)`,
                                    transformOrigin: 'center',
                                  }}
                                  onClick={handleReceiptFullscreen}
                                />
                              );
                            }
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* Extracted Data Summary */}
                    {parsedData && parsedData.ocr_result && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <h4 className="font-medium text-green-900 mb-3">Extracted Information:</h4>
                        <div className="space-y-2 text-sm">
                          {parsedData.ocr_result.vendor && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Vendor:</span>
                              <span className="font-medium">{parsedData.ocr_result.vendor}</span>
                            </div>
                          )}
                          {parsedData.ocr_result.amount && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Amount:</span>
                              <span className="font-medium">{parsedData.ocr_result.amount}</span>
                            </div>
                          )}
                          {parsedData.ocr_result.invoice_number && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Invoice #:</span>
                              <span className="font-medium">{parsedData.ocr_result.invoice_number}</span>
                            </div>
                          )}
                          {parsedData.ocr_result.date && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Date:</span>
                              <span className="font-medium">{parsedData.ocr_result.date}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : receiptLoading ? (
                  <div className="bg-gray-50 rounded-lg p-8 border-2 border-dashed border-gray-200">
                    <div className="text-center">
                      <Loader2 className="h-12 w-12 mx-auto text-gray-400 mb-3 animate-spin" />
                      <p className="text-sm text-gray-600 mb-2">Loading receipt...</p>
                      <p className="text-xs text-gray-500">Please wait</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-8 border-2 border-dashed border-gray-200">
                    <div className="text-center">
                      <FileText className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                      <p className="text-sm text-gray-600 mb-2">No receipt uploaded</p>
                      <p className="text-xs text-gray-500">Manual entry mode</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Fullscreen Receipt Modal */}
      {isReceiptFullscreen && uploadedFile && previewUrl && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4">
          <div className="relative w-full h-full flex flex-col">
            {/* Fullscreen Header */}
            <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
              <div className="flex items-center gap-4">
                <h3 className="text-lg font-semibold text-gray-900">Receipt Viewer</h3>
                <span className="text-sm text-gray-500">{uploadedFile.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReceiptZoomOut}
                  disabled={receiptZoom <= 0.5}
                  className="h-8 w-8 p-0"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-sm text-gray-600 min-w-[3rem] text-center">
                  {Math.round(receiptZoom * 100)}%
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReceiptZoomIn}
                  disabled={receiptZoom >= 3}
                  className="h-8 w-8 p-0"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <div className="w-px h-6 bg-gray-300 mx-2" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReceiptRotate}
                  className="h-8 w-8 p-0"
                >
                  <RotateCw className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReceiptReset}
                  className="h-8 w-8 p-0"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <div className="w-px h-6 bg-gray-300 mx-2" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReceiptDownload}
                  className="h-8 px-3 text-xs"
                >
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsReceiptFullscreen(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Fullscreen Content */}
            <div className="flex-1 overflow-auto bg-gray-100 flex items-center justify-center p-4">
              {uploadedFile.type.includes('pdf') ? (
                <div className="w-full h-full bg-white rounded">
                  <iframe
                    src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                    className="w-full h-full border-0 rounded"
                    title="PDF Fullscreen"
                    style={{
                      transform: `scale(${receiptZoom}) rotate(${receiptRotation}deg)`,
                      transformOrigin: 'center',
                    }}
                  />
                </div>
              ) : (
                <img
                  src={previewUrl}
                  alt="Receipt fullscreen"
                  className="max-w-full max-h-full object-contain"
                  style={{
                    transform: `scale(${receiptZoom}) rotate(${receiptRotation}deg)`,
                    transformOrigin: 'center',
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
