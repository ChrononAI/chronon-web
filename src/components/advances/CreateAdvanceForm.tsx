import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowLeft, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { expenseService } from "@/services/expenseService";
import { Policy } from "@/types/expense";
import { AdvanceService, AdvanceType } from "@/services/advanceService";

export interface Currency {
  code: string;
  name: string;
  symbol: string;
}

const currencies: Currency[] = [
  { code: "INR", name: "Indian Rupee", symbol: "₹" },
  { code: "USD", name: "United States Dollar", symbol: "$" },
  { code: "EUR", name: "European Euro", symbol: "€" },
];

// Form schema
const advanceSchema = z.object({
  description: z.string().min(1, "Description is required"),
  amount: z
    .string()
    .min(1, "Amount is required")
    .refine(
      (val) => {
        const num = parseFloat(val);
        return !isNaN(num) && num > 0;
      },
      { message: "Please enter a valid amount greater than 0" }
    ),
  currency: z.string().min(1, "Please select a currency"),
  title: z.string().min(1, "Title is required"),
  policy_id: z.string().optional(),
});

type AdvanceFormValues = z.infer<typeof advanceSchema>;

export function CreateAdvanceForm({
  mode = "create",
  showHeader = true,
  maxWidth,
}: {
  mode?: "create" | "view" | "edit";
  showHeader?: boolean;
  maxWidth?: string;
}) {
  const navigate = useNavigate();
  const loading = false;

  const { id } = useParams<{ id: string }>();

  const form = useForm<AdvanceFormValues>({
    resolver: zodResolver(advanceSchema),
    defaultValues: {
      description: "",
      amount: "",
      currency: "INR", // Default to INR
    },
  });
  const [selectedAdvance, setSelectedAdvance] = useState<AdvanceType>();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);

  const loadPoliciesWithCategories = async () => {
    try {
      const policiesData = await expenseService.getAllPoliciesWithCategories();
      const expensePolicies = policiesData.filter((pol) => {
        if (pol.name !== "Mileage" && pol.name !== "Per Diem") {
          return pol;
        }
      });
      setPolicies(expensePolicies);
    } catch (error) {
      console.error("Error loading policies:", error);
    }
  };

  const selectedCurrency =
    currencies.find((currency) => currency.code === form.watch("currency")) ||
    currencies[0];

  const handleCancel = () => {
    const hasChanges = Object.values(form.getValues()).some((value) =>
      typeof value === "string" ? value.trim() : value
    );

    if (hasChanges) {
      const confirmDiscard = window.confirm(
        "Are you sure you want to discard your changes?"
      );
      if (confirmDiscard) {
        navigate("/advances");
      }
    } else {
      navigate("/advances");
    }
  };

  const onSubmit = async (values: AdvanceFormValues) => {
    if (selectedAdvance && selectedAdvance?.status === "COMPLETE") {
      try {
        await AdvanceService.submitAdvance(selectedAdvance.id);
        toast.success("Advance resubmitted successfully");
        navigate("/advances");
      } catch (error: any) {
        toast.error(
          error.response.data.message ||
            error.message ||
            "Failed to resubmit advance"
        );
      }
    } else {
      try {
        const response: any = await AdvanceService.createAdvance(values);
        await AdvanceService.submitAdvance(response.data.data.id);
        toast.success("Advance created successfully");
        setTimeout(() => {
          navigate("/advances");
        }, 200);
      } catch (error) {
        console.log(error);
      }
    }
  };

  const getAdvancebyId = async (id: string) => {
    try {
      const res: any = await AdvanceService.getAdvanceById(id);
      form.reset(res.data.data[0]);
      setSelectedAdvance(res.data.data[0]);
      const selectedPol = policies.find(
        (pol) => pol.id === res?.data?.data[0]?.policy_id
      );
      if (selectedPol) setSelectedPolicy(selectedPol);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    if (id && policies.length > 0) {
      getAdvancebyId(id);
    }
  }, [id, policies]);

  useEffect(() => {
    loadPoliciesWithCategories();
  }, []);

  return (
    <div className={maxWidth ? `space-y-6 ${maxWidth}` : "space-y-6 max-w-4xl"}>
      {/* Header */}
      {showHeader && (
        <div className="flex items-center mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Create Advance</h1>
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Title"
                    {...field}
                    disabled={mode === "view"}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Description Field */}
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Purpose *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Purpose"
                    {...field}
                    disabled={mode === "view"}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Currency Field */}
            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Currency *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={mode === "view"}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <div className="flex items-center">
                          <span className="text-lg mr-2 min-w-[24px]">
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
                            <span className="text-lg mr-2 min-w-[24px]">
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
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-lg">
                        {selectedCurrency.symbol}
                      </span>
                      <Input
                        placeholder="0.00"
                        className="pl-12"
                        type="number"
                        step="0.01"
                        min="0"
                        {...field}
                        disabled={mode === "view"}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div>
            <FormField
              control={form.control}
              name="policy_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Policy</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        const policy = policies.find((p) => p.id === value);
                        setSelectedPolicy(policy || null);
                      }}
                      disabled={mode === "view"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a policy">
                            {field.value && selectedPolicy
                              ? selectedPolicy.name
                              : "Select a policy"}
                          </SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {policies.map((policy) => (
                          <SelectItem key={policy.id} value={policy.id}>
                            <div>
                              <div className="font-medium">{policy.name}</div>
                              {policy.description && (
                                <div className="text-sm text-muted-foreground">
                                  {policy.description}
                                </div>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4">
            {mode === "edit" && (
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={loading}
                className="px-6 py-2"
              >
                Cancel
              </Button>
            )}
            {(selectedAdvance?.status === "COMPLETE" || mode !== "view") && (
              <Button
                type="submit"
                disabled={!form.formState.isValid}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : selectedAdvance?.status === "COMPLETE" ? (
                  "Resubmit"
                ) : (
                  "Create"
                )}
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
}
