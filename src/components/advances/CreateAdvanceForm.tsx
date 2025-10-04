import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowLeft, Loader2, Info } from 'lucide-react';

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
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { expenseService, CreateAdvanceData } from '@/services/expenseService';

interface Currency {
  code: string;
  name: string;
  symbol: string;
}

const currencies: Currency[] = [
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'USD', name: 'United States Dollar', symbol: '$' },
  { code: 'EUR', name: 'European Euro', symbol: '€' },
];

// Form schema
const advanceSchema = z.object({
  description: z.string().min(1, 'Description is required').max(500, 'Description must be less than 500 characters'),
  amount: z.string().min(1, 'Amount is required').refine(
    (val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num > 0;
    },
    { message: 'Please enter a valid amount greater than 0' }
  ),
  currency: z.string().min(1, 'Please select a currency'),
});

type AdvanceFormValues = z.infer<typeof advanceSchema>;

export function CreateAdvanceForm() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const form = useForm<AdvanceFormValues>({
    resolver: zodResolver(advanceSchema),
    defaultValues: {
      description: '',
      amount: '',
      currency: 'INR', // Default to INR
    },
  });

  const selectedCurrency = currencies.find(
    (currency) => currency.code === form.watch('currency')
  ) || currencies[0];

  const handleCancel = () => {
    const hasChanges = Object.values(form.getValues()).some(value => 
      typeof value === 'string' ? value.trim() : value
    );
    
    if (hasChanges) {
      const confirmDiscard = window.confirm(
        'Are you sure you want to discard your changes?'
      );
      if (confirmDiscard) {
        navigate('/advances');
      }
    } else {
      navigate('/advances');
    }
  };

  const createAdvance = async (data: CreateAdvanceData): Promise<{ success: boolean; message: string }> => {
    return await expenseService.createAdvance(data);
  };

  const onSubmit = async (values: AdvanceFormValues) => {
    setLoading(true);
    
    try {
      const advanceData: CreateAdvanceData = {
        description: values.description.trim(),
        amount: parseFloat(values.amount),
        currency: values.currency,
      };

      const response = await createAdvance(advanceData);
      
      if (response.success) {
        toast.success('Advance request created successfully');
        navigate('/advances');
      } else {
        toast.error(response.message || 'Failed to create advance request');
      }
    } catch (error) {
      console.error('Error creating advance:', error);
      toast.error('Failed to create advance request');
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount: string) => {
    const num = parseFloat(amount);
    if (isNaN(num)) return '';
    
    return num.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCancel}
          className="mr-4"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Create Advance Request</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create Advance Request</CardTitle>
          <p className="text-sm text-muted-foreground">
            Submit a request for advance payment. All fields marked with * are required.
          </p>
        </CardHeader>
        
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Description Field */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter the purpose and details of your advance request"
                        className="min-h-[100px] resize-none"
                        maxLength={500}
                        {...field}
                        disabled={loading}
                      />
                    </FormControl>
                    <div className="flex justify-between items-center">
                      <FormMessage />
                      <span className="text-xs text-muted-foreground">
                        {field.value.length}/500 characters
                      </span>
                    </div>
                  </FormItem>
                )}
              />

              {/* Currency Field */}
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={loading}>
                      <FormControl>
                        <SelectTrigger>
                          <div className="flex items-center">
                            <span className="text-lg font-bold text-primary mr-2 min-w-[24px]">
                              {selectedCurrency.symbol}
                            </span>
                            <span className="flex-1 text-left">
                              {selectedCurrency.code} - {selectedCurrency.name}
                            </span>
                          </div>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {currencies.map((currency) => (
                          <SelectItem key={currency.code} value={currency.code}>
                            <div className="flex items-center">
                              <span className="text-lg font-bold text-primary mr-2 min-w-[24px]">
                                {currency.symbol}
                              </span>
                              <span>
                                {currency.code} - {currency.name}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Amount Field */}
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-lg font-bold text-primary">
                          {selectedCurrency.symbol}
                        </span>
                        <Input
                          placeholder="0.00"
                          className="pl-12 text-lg font-semibold"
                          type="number"
                          step="0.01"
                          min="0"
                          {...field}
                          disabled={loading}
                        />
                      </div>
                    </FormControl>
                    <div className="flex justify-between items-center">
                      <FormMessage />
                      {field.value && !isNaN(parseFloat(field.value)) && (
                        <span className="text-sm text-primary font-medium">
                          Amount: {selectedCurrency.symbol}{formatAmount(field.value)}
                        </span>
                      )}
                    </div>
                  </FormItem>
                )}
              />

              {/* Information Section */}
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-semibold">Important Information</p>
                    <ul className="text-sm space-y-1 ml-4">
                      <li>• Advance requests are subject to approval workflow</li>
                      <li>• Processing time may vary based on amount and policy</li>
                      <li>• You will be notified once your request is processed</li>
                      <li>• Approved advances will be credited to your account</li>
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={loading}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading || !form.formState.isValid}
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Submit Request'
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
