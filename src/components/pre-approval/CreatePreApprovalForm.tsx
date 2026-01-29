import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "../ui/input";
import { Switch } from "../ui/switch";
import { Button } from "../ui/button";
import { DateField } from "../ui/date-field";
import { ChevronDown, Loader2 } from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { useEffect, useRef, useState } from "react";
import { Policy } from "@/types/expense";
import {
  preApprovalService,
  PreApprovalType,
} from "@/services/preApprovalService";
import { toast } from "sonner";
import { Currency } from "../advances/CreateAdvanceForm";
import { trackEvent } from "@/mixpanel";
import { FormFooter } from "../layout/FormFooter";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "../ui/command";
import { policyService } from "@/services/admin/policyService";
import { filterExpensePolicies } from "@/lib/utils";

// Form schema
const preApprovalSchema = z.object({
  title: z.string().min(1, "Title is required"),
  start_date: z.string().min(1, "From date is required"),
  end_date: z.string().min(1, "To date is required"),
  policy_id: z.string().optional(),
  description: z.string().min(1, "Purpose is required"),
  flightRequired: z.boolean(),
  hotelRequired: z.boolean(),
  amount: z.string().optional(),
  currency: z.string().optional(),
});

const currencies: Currency[] = [
  { code: "INR", name: "Indian Rupee", symbol: "₹" },
  { code: "USD", name: "United States Dollar", symbol: "$" },
  { code: "EUR", name: "European Euro", symbol: "€" },
];

type PreApprovalFormValues = z.infer<typeof preApprovalSchema>;

interface CreatePreApprovalFormProps {
  mode?: "create" | "view" | "edit";
  data?: PreApprovalType;
  showHeader?: boolean;
  maxWidth?: string;
}

function CreatePreApprovalForm({
  mode = "create",
  showHeader = true,
  maxWidth = "max-w-4xl",
}: CreatePreApprovalFormProps) {
  const navigate = useNavigate();

  const { id } = useParams<{ id: string }>();
  const { pathname } = useLocation();

  const [policies, setPolicies] = useState<Policy[]>([]);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedPreApproval, setSelectedPreApproval] =
    useState<PreApprovalType | null>(null);
  const [policySearchTerm, setPolicySearchTerm] = useState("");
  const [policyDropdownOpen, setPolicyDropdownOpen] = useState(false);

  const debounceRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const today = format(new Date(), "yyyy-MM-dd");

  const form = useForm<PreApprovalFormValues>({
    resolver: zodResolver(preApprovalSchema),
    defaultValues: {
      policy_id: "",
      title: "",
      start_date: "",
      end_date: "",
      description: "",
      flightRequired: false,
      hotelRequired: false,
      amount: undefined,
      currency: undefined,
    },
  });

  const [selectedCurrency, setSelectedCurrency] = useState<Currency | null>(
    null
  );

  const onSubmit = async (formData: PreApprovalFormValues) => {
    trackEvent("Create Pre Approval Button Clicked", {
      button_name: "Create Pre Approval",
    });
    setLoading(true);
    if (selectedPreApproval?.status === "COMPLETE") {
      try {
        await preApprovalService.submitPreApproval(selectedPreApproval?.id);
        toast.success("Pre approval submitted successfully");
        navigate("/requests/pre-approvals");
      } catch (error: any) {
        console.log(error);
        toast.error(error?.response?.data?.message || error.message);
      } finally {
        setLoading(false);
      }
    } else {
      const newFd = JSON.parse(JSON.stringify(formData));
      delete newFd.amount;
      delete newFd.currency;
      if (!newFd.policy_id) {
        newFd.policy_id = null;
      }
      const { hotelRequired, flightRequired, ...rest } = newFd;
      try {
        const response: any = await preApprovalService.createPreApproval(rest);
        await preApprovalService.submitPreApproval(response.data.data.id);
        toast.success("Pre approval created successfully");
        navigate("/requests/pre-approvals");
      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleBack = () => {
    if (pathname.includes("/approvals")) {
      navigate("/approvals/pre-approvals");
    } else {
      navigate("/requests/pre-approvals");
    }
  };

  const getPreApprovalById = async (id: string) => {
    try {
      const res: any = await preApprovalService.getPreApprovalById(id);
      const data = {
        ...res.data.data[0],
        amount: res.data.data[0]?.amount?.toString(),
      };
      form.reset(data);
      setSelectedPreApproval(data);
      const selectedPol = policies.find((pol) => pol.id === data.policy_id);
      if (selectedPol) setSelectedPolicy(selectedPol);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = window.setTimeout(async () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        let res;

        if (policySearchTerm.trim()) {
          const term = encodeURIComponent(policySearchTerm.trim());

          res = await policyService.getFilteredPolicies({
            query: `or=(name.ilike.%${term}%,description.ilike.%${term}%)`,
            signal: controller.signal,
          });
        } else {
          res = await policyService.getFilteredPolicies({
            query: "",
            limit: 20,
            offset: 0,
            signal: controller.signal,
          });
        }
        const expPolicies = filterExpensePolicies(res.data.data);
        setPolicies(expPolicies);
      } catch (err: any) {
        if (err.name !== "AbortError" && err.name !== "CanceledError") {
          console.error(err);
        }
      }
    }, 400);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [policySearchTerm]);

  useEffect(() => {
    if (id && policies.length > 0) {
      getPreApprovalById(id);
    }
  }, [id, policies]);

  return (
    <div className={maxWidth ? `space-y-6 ${maxWidth}` : "space-y-6 max-w-4xl"}>
      {showHeader && (
        <h1 className="text-2xl font-bold">
          {mode === "create"
            ? "Create Pre Approval"
            : mode === "edit"
            ? "Edit Pre Approval"
            : "Pre Approval Details"}
        </h1>
      )}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Title"
                      // readOnly={readOnly}
                      disabled={mode !== "create"}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="start_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>From *</FormLabel>
                  <FormControl>
                    <DateField
                      id="from"
                      value={field.value}
                      onChange={(value) => {
                        field.onChange(value);
                      }}
                      disabled={mode !== "create"}
                      minDate={today}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="end_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>To *</FormLabel>
                  <FormControl>
                    <DateField
                      id="to"
                      value={field.value}
                      onChange={(value) => {
                        // handleInputChange("expenseDate", value);
                        field.onChange(value);
                      }}
                      disabled={mode !== "create"}
                      minDate={today}
                    />
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
                      disabled={mode !== "create"}
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
          <FormField
            control={form.control}
            name="policy_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Policy</FormLabel>
                <Popover
                  open={policyDropdownOpen}
                  onOpenChange={setPolicyDropdownOpen}
                >
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={policyDropdownOpen}
                        className="h-11 w-full justify-between"
                        disabled={mode !== "create"}
                      >
                        <>
                          <span className="truncate max-w-[85%] overflow-hidden text-ellipsis text-left">
                            {selectedPolicy
                              ? selectedPolicy.name
                              : "Select a policy"}
                          </span>
                          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </>
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                      <Input
                        value={policySearchTerm}
                        className="border-0 block outline-none ring-0 focus:border-0 focus:outline-none focus:ring-0 focus-visible:ring-0 shadow-none"
                        onChange={(e) => setPolicySearchTerm(e.target.value)}
                        placeholder="Search categories..."
                      />
                      <CommandList>
                        <CommandEmpty>No policy found.</CommandEmpty>
                        <CommandGroup>
                          {policies.map((policy) => (
                            <CommandItem
                              key={policy.id}
                              value={policy.name}
                              onSelect={() => {
                                field.onChange(policy.id);
                                setSelectedPolicy(policy);
                                setPolicyDropdownOpen(false);
                              }}
                            >
                              <div>
                                <div className="font-medium">{policy.name}</div>
                                {policy.description && (
                                  <div className="text-sm text-muted-foreground">
                                    {policy.description}
                                  </div>
                                )}
                              </div>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Currency Field */}
            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Currency</FormLabel>
                  <Select
                    onValueChange={(val) => {
                      field.onChange(val);
                      const curr = currencies.find((curr) => curr.code === val);
                      if (curr) setSelectedCurrency(curr);
                    }}
                    value={field.value}
                    disabled={mode !== "create"}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <div className="flex items-center">
                          {selectedCurrency ? (
                            <span className="text-lg mr-2 min-w-[24px]">
                              {selectedCurrency.symbol}
                            </span>
                          ) : (
                            "Please select currency"
                          )}
                          {selectedCurrency && (
                            <span className="flex-1 text-left">
                              {selectedCurrency.code} - {selectedCurrency.name}
                            </span>
                          )}
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
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-lg">
                        {selectedCurrency?.symbol}
                      </span>
                      <Input
                        placeholder="0.00"
                        className="pl-12"
                        type="number"
                        step="0.01"
                        min="0"
                        {...field}
                        disabled={mode !== "create"}
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Purpose *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Purpose"
                      disabled={mode !== "create"}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="flightRequired"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Flight Required</FormLabel>
                  <FormControl>
                    <div>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={mode !== "create"}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="hotelRequired"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hotel Required</FormLabel>
                  <FormControl>
                    <div>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={mode !== "create"}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              className="px-6 py-2"
            >
              Back
            </Button>
            {(selectedPreApproval?.status === "COMPLETE" ||
              mode !== "view") && (
              <Button
                type="submit"
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {mode === "edit" ? "Submitting..." : "Creating..."}
                  </>
                ) : selectedPreApproval?.status === "COMPLETE" ? (
                  "Resubmit Pre Approval"
                ) : (
                  "Create Pre Approval"
                )}
              </Button>
            )}
          </FormFooter>
        </form>
      </Form>
    </div>
  );
}

export default CreatePreApprovalForm;
