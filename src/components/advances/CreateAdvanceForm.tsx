import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, ChevronDown, Calendar } from "lucide-react";

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
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { toast } from "sonner";
import { expenseService } from "@/services/expenseService";
import { Policy } from "@/types/expense";
import { AdvanceService, AdvanceType } from "@/services/advanceService";
import { getTemplates, type Template } from "@/services/admin/templates";
import { getEntities, type Entity } from "@/services/admin/entities";
import { trackEvent } from "@/mixpanel";
import { FormFooter } from "../layout/FormFooter";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
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
  from_date: z.preprocess(
    (v) => (v ? new Date(v as string) : undefined),
    z.date().optional()
  ),

  to_date: z.preprocess(
    (v) => (v ? new Date(v as string) : undefined),
    z.date().optional()
  ),
});

type AdvanceFormValues = z.infer<typeof advanceSchema> & Record<string, any>;

type TemplateEntity = NonNullable<Template["entities"]>[0];

const getEntityId = (entity: TemplateEntity): string => {
  return entity?.entity_id || entity?.id || "";
};

const getFieldName = (entity: TemplateEntity): string => {
  return entity?.display_name || entity?.field_name || getEntityId(entity);
};

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
  const { pathname } = useLocation();
  const [loading, setLoading] = useState(false);

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
  const [templateEntities, setTemplateEntities] = useState<TemplateEntity[]>(
    []
  );
  const [entityOptions, setEntityOptions] = useState<
    Record<string, Array<{ id: string; label: string }>>
  >({});
  const [entityDropdownOpen, setEntityDropdownOpen] = useState<
    Record<string, boolean>
  >({});

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
      toast.error("Failed to fetch policies");
    }
  };

  const selectedCurrency =
    currencies.find((currency) => currency.code === form.watch("currency")) ||
    currencies[0];

  const handleCancel = () => {
    if (pathname.includes("approvals")) {
      navigate("/approvals/advances");
    } else {
      navigate("/requests/advances");
    }
  };

  const onSubmit = async (values: AdvanceFormValues) => {
    setLoading(true);
    if (selectedAdvance && selectedAdvance?.status === "COMPLETE") {
      try {
        trackEvent("Submit Advance Button Clicked", {
          button_name: "Submit Advance",
        });
        await AdvanceService.submitAdvance(selectedAdvance.id);
        toast.success("Advance resubmitted successfully");
        navigate("/requests/advances");
      } catch (error: any) {
        toast.error(
          error.response?.data?.message ||
            error.message ||
            "Failed to resubmit advance"
        );
      } finally {
        setLoading(false);
      }
    } else {
      try {
        trackEvent("Create Advance Button Clicked", {
          button_name: "Create Advance",
        });
        const allFormValues = form.getValues();
        const customAttributes: Record<string, string | Date> = {};

        templateEntities.forEach((entity) => {
          const entityId = getEntityId(entity);
          if (entityId && allFormValues[entityId]) {
            const value = String(allFormValues[entityId]).trim();
            if (value) {
              customAttributes[entityId] = value;
            }
          }
        });

        const { title, description, amount, currency, policy_id, from_date, to_date } = values;
        if (from_date) {
          customAttributes["from_date"] = from_date;
        }
        if (to_date) {
          customAttributes["to_date"] = to_date;
        }
        const payload: any = {
          title,
          description,
          amount,
          currency,
          policy_id: policy_id || null,
        };

        if (Object.keys(customAttributes).length > 0) {
          payload.custom_attributes = customAttributes;
        }
        const response: any = await AdvanceService.createAdvance(payload);
        await AdvanceService.submitAdvance(response.data.data.id);
        toast.success("Advance created successfully");
        // setTimeout(() => {
          navigate("/requests/advances");
        // }, 200);
      } catch (error: any) {
        toast.error(error.response?.data?.message || error.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const getAdvancebyId = async (id: string) => {
    try {
      const res: any = await AdvanceService.getAdvanceById(id);
      const advanceData = res.data.data[0];
      form.reset(advanceData);
      setSelectedAdvance(advanceData);
      const selectedPol = policies.find(
        (pol) => pol.id === advanceData?.policy_id
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
    if (selectedAdvance?.custom_attributes && templateEntities.length > 0) {
      Object.entries(selectedAdvance.custom_attributes).forEach(
        ([entityId, attributeId]) => {
          form.setValue(entityId as any, String(attributeId));
        }
      );
    }
  }, [selectedAdvance, templateEntities]);

  useEffect(() => {
    loadPoliciesWithCategories();
  }, []);

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const [templatesRes, entitiesRes] = await Promise.all([
          getTemplates(),
          getEntities(),
        ]);

        const advanceTemplate = Array.isArray(templatesRes)
          ? templatesRes.find((t) => t.module_type === "advance")
          : null;

        if (advanceTemplate?.entities) {
          setTemplateEntities(advanceTemplate.entities);

          advanceTemplate.entities.forEach((entity) => {
            const entityId = getEntityId(entity);
            if (entityId) {
              form.setValue(entityId as any, "");
            }
          });
        }

        const entityMap: Record<
          string,
          Array<{ id: string; label: string }>
        > = {};
        entitiesRes.forEach((ent: Entity) => {
          if (ent.id && Array.isArray(ent.attributes)) {
            entityMap[ent.id] = ent.attributes.map((attr) => ({
              id: attr.id,
              label: attr.display_value ?? attr.value ?? "—",
            }));
          }
        });

        const mappedOptions: Record<
          string,
          Array<{ id: string; label: string }>
        > = {};
        advanceTemplate?.entities?.forEach((entity) => {
          const entityId = getEntityId(entity);
          if (entityId) {
            mappedOptions[entityId] = entityMap[entityId] || [];
          }
        });

        setEntityOptions(mappedOptions);
      } catch (error) {
        console.error("Failed to load templates:", error);
      }
    };

    loadTemplates();
  }, []);

  return (
    <div className={maxWidth ? `space-y-6 ${maxWidth}` : "space-y-6 max-w-4xl"}>
      {/* Header */}
      {showHeader && <h1 className="text-2xl font-bold">Create Advance</h1>}

      <Form {...form}>
        <form
          id="advance-submission-form"
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-6"
        >
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
                    className="h-11"
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
                    className="h-11"
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
                      <SelectTrigger className="h-11">
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
                        className="pl-12 h-11"
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="from_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>From</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "h-11 w-full justify-between pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                          disabled={mode === "view"}
                        >
                          {field.value ? (
                            format(new Date(field.value), "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <Calendar className="h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={field.value && new Date(field.value)}
                        onSelect={(date) => field.onChange(date)}
                        disabled={(date) =>
                          date < new Date() || date < new Date("1900-01-01")
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="to_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>To</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "h-11 w-full justify-between pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                          disabled={mode === "view"}
                        >
                          {field.value ? (
                            format(new Date(field.value), "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <Calendar className="h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={field.value && new Date(field.value)}
                        onSelect={(date) => field.onChange(date)}
                        disabled={(date) =>
                          date < new Date() || date < new Date("1900-01-01")
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
                        <SelectTrigger className="h-11">
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

          {templateEntities?.map((entity) => {
            const entityId = getEntityId(entity);
            const fieldName = getFieldName(entity);
            if (!entityId) return null;

            return (
              <FormField
                key={entityId}
                control={form.control}
                name={entityId as any}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {fieldName}
                      {entity.is_mandatory && (
                        <span className="text-destructive"> *</span>
                      )}
                    </FormLabel>
                    {entity.field_type === "SELECT" ? (
                      <Popover
                        open={entityDropdownOpen[entityId] || false}
                        onOpenChange={(open) =>
                          setEntityDropdownOpen((prev) => ({
                            ...prev,
                            [entityId]: open,
                          }))
                        }
                      >
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={entityDropdownOpen[entityId]}
                              className="h-11 w-full justify-between"
                              disabled={mode === "view"}
                            >
                              <span className="truncate max-w-[85%] overflow-hidden text-ellipsis text-left">
                                {field.value
                                  ? entityOptions[entityId]?.find(
                                      (opt) => opt.id === field.value
                                    )?.label || `Select ${fieldName}`
                                  : `Select ${fieldName}`}
                              </span>
                              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                          <Command>
                            <CommandInput
                              placeholder={`Search ${fieldName}...`}
                            />
                            <CommandList className="max-h-[180px] overflow-y-auto">
                              <CommandEmpty>
                                No {fieldName.toLowerCase()} found.
                              </CommandEmpty>
                              <CommandGroup>
                                {entityOptions[entityId]?.map((opt) => (
                                  <CommandItem
                                    key={opt.id}
                                    value={opt.label}
                                    onSelect={() => {
                                      field.onChange(opt.id);
                                      setEntityDropdownOpen((prev) => ({
                                        ...prev,
                                        [entityId]: false,
                                      }));
                                    }}
                                  >
                                    {opt.label}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    ) : (
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={`Enter ${fieldName}`}
                          disabled={mode === "view"}
                        />
                      </FormControl>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            );
          })}
          <FormFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={loading}
              className="px-6 py-2"
            >
              Back
            </Button>
            {(selectedAdvance?.status === "COMPLETE" || mode !== "view") && (
              <Button
                type="submit"
                form="advance-submission-form"
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {mode === "view" ? "Submitting..." : "Creating..."}
                  </>
                ) : selectedAdvance?.status === "COMPLETE" ? (
                  "Resubmit Advance"
                ) : (
                  "Create Advance"
                )}
              </Button>
            )}
          </FormFooter>
        </form>
      </Form>
    </div>
  );
}
