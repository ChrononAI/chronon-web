import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DateField } from "@/components/ui/date-field";
import { Calendar, Copy, ExternalLink } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { placesService } from "@/services/placesService";
import { getOrgIdFromToken } from "@/lib/jwtUtils";
import { Expense, Policy, PolicyCategory } from "@/types/expense";
import { toast } from "sonner";
import { expenseService } from "@/services/expenseService";
import { ExpenseComments } from "@/components/expenses/ExpenseComments";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuthStore } from "@/store/authStore";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

interface PerdiemPageProps {
  mode?: "create" | "view" | "edit";
  expenseData?: Expense;
}

export const calculateDays = (startDate: string, endDate: string): number => {
  if (!startDate || !endDate) return 0;

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;

  const diffTime = end.getTime() - start.getTime();

  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  return diffDays > 0 ? diffDays : 0;
};

const perdiemSchema = z.object({
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  location: z.string().min(1, "Location is required"),
  purpose: z.string().min(1, "Purpose is required"),
  categoryId: z.string().min(1, "Category is required"),
});

type PerdiemFormValues = z.infer<typeof perdiemSchema>;

const PerdiemPage = ({ mode = "create", expenseData }: PerdiemPageProps) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const form = useForm<PerdiemFormValues>({
    resolver: zodResolver(perdiemSchema),
    defaultValues: {
      startDate: "",
      endDate: "",
      location: "",
      purpose: "",
      categoryId: "",
    },
  });

  const [formData, setFormData] = useState<{
    startDate: string;
    endDate: string;
    location: string;
    purpose: string;
    totalAmount: string | number;
    policy: string;
    category: string;
    policyId: string;
    categoryId: string;
  }>({
    startDate: "",
    endDate: "",
    location: "",
    purpose: "",
    totalAmount: "0",
    policy: "",
    category: "",
    policyId: "",
    categoryId: "",
  });
  const [days, setDays] = useState<number>(0);
  const [categories, setCategories] = useState<PolicyCategory[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [loadingPolicies, setLoadingPolicies] = useState(false);
  const [activePerdiemTab, setActivePerdiemTab] = useState<"info" | "comments">("info");
  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    const { startDate, endDate } = formData;
    setDays(calculateDays(startDate, endDate));
  }, [formData.startDate, formData.endDate]);

  // Pre-fill form data when in view mode
  useEffect(() => {
    if (mode === "view") {
      setEditMode(true);
    } else {
      setEditMode(true);
    }
    if (expenseData) {
      const formatDate = (dateString: string) => {
        try {
          return new Date(dateString).toISOString().split("T")[0];
        } catch {
          return new Date().toISOString().split("T")[0];
        }
      };

      const data = {
        startDate: formatDate(
          expenseData.start_date ||
            expenseData.per_diem_info?.start_date ||
            expenseData.expense_date
        ),
        endDate: formatDate(
          expenseData.end_date ||
            expenseData.per_diem_info?.end_date ||
            expenseData.expense_date
        ),
        location:
          expenseData.location || expenseData.per_diem_info?.location || "",
        purpose: expenseData.description || "",
        totalAmount: parseFloat(String(expenseData.amount)) || 0,
        categoryId: expenseData.category_id || "",
        policyId: expenseData.expense_policy_id || "",
      };

      setFormData((prev) => ({
        ...prev,
        ...data,
      }));

      // Set form values
      form.setValue("startDate", data.startDate);
      form.setValue("endDate", data.endDate);
      form.setValue("location", data.location);
      form.setValue("purpose", data.purpose);
      form.setValue("categoryId", data.categoryId);
    }
  }, [mode, expenseData, form]);

  useEffect(() => {
    if (expenseData && categories.length > 0) {
      const category = categories.find(
        (cat) => cat.id === expenseData.category_id
      );
      if (category) {
        setFormData((prev) => ({
          ...prev,
          categoryId: category.id,
        }));
        form.setValue("categoryId", category.id);
      }
    }
  }, [expenseData?.category_id, categories, form]);

  const loadPerDiemPolicies = async () => {
    setLoadingPolicies(true);
    try {
      const allPolicies = await expenseService.getAllPoliciesWithCategories();
      const perDiemPolicies = allPolicies.filter(
        (policy: Policy) => policy.name.toLowerCase() === "per diem"
      );
      setSelectedPolicy(perDiemPolicies[0]);
      if (perDiemPolicies.length > 0) {
        setCategories(perDiemPolicies[0].categories);
        setFormData((prev) => ({ ...prev, policyId: perDiemPolicies[0].id }));
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoadingPolicies(false);
    }
  };

  useEffect(() => {
    loadPerDiemPolicies();
  }, []);

  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: field === "totalAmount" ? Number(value) : value,
    }));

    if (field === "categoryId" && typeof value === "string") {
      form.setValue("categoryId", value);
    } else if (field === "location" && typeof value === "string") {
      form.setValue("location", value);
    } else if (field === "purpose" && typeof value === "string") {
      form.setValue("purpose", value);
    } else if (field === "startDate" && typeof value === "string") {
      form.setValue("startDate", value);
    } else if (field === "endDate" && typeof value === "string") {
      form.setValue("endDate", value);
    }
  };

  const handleSubmit = async (values: PerdiemFormValues) => {
    const orgId = getOrgIdFromToken();
    if (!orgId) {
      toast.error("Organization ID not found");
      return;
    }
    if (+formData.totalAmount === 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    const submitData = {
      expense_policy_id: formData.policyId,
      category_id: values.categoryId,
      amount: formData.totalAmount,
      expense_date: values.startDate,
      description: values.purpose,
      per_diem_info: {
        start_date: values.startDate,
        end_date: values.endDate,
        location: values.location,
      },
    };

    try {
      if (mode === "create") {
        await placesService.createPerDiemExpense(submitData, orgId);
      } else if (mode === "edit" && id) {
        await expenseService.updateExpense(id, submitData);
      }
      if (mode === "create") {
        toast.success("Per diem expense created successfully!");
      } else if (mode === "edit") {
        toast.success("Per diem expense edited successfully!");
      }
      setTimeout(() => {
        navigate("/expenses");
      }, 500);
    } catch (error: any) {
      console.error("Error creating per diem expense:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to create per diem expense";
      toast.error(`Error: ${errorMessage}`);
    }
  };

  const calculatePerDiemAmount = async ({
    startDate,
    endDate,
    policyId,
    categoryId,
  }: any) => {
    try {
      const response = await expenseService.calculatePerDiemAmount({
        startDate,
        endDate,
        policyId,
        categoryId,
        orgId: user?.organization.id,
      });
      setFormData((prev) => ({
        ...prev,
        totalAmount: response?.data?.amount || 0,
      }));
      setDays(response.data.days);
    } catch (error: any) {
      console.log(error);
    }
  };

  useEffect(() => {
    if (
      formData.startDate &&
      formData.endDate &&
      formData.categoryId &&
      formData.policyId &&
      user?.organization.id
    ) {
      calculatePerDiemAmount({
        startDate: formData.startDate,
        endDate: formData.endDate,
        policyId: formData.policyId,
        categoryId: formData.categoryId,
      });
    }
  }, [
    formData.startDate,
    formData.endDate,
    formData.categoryId,
    formData.policyId,
  ]);

  return (
    <div className="w-full pt-1">
      {/* Duplicate Expense Indicator */}
      {expenseData?.original_expense_id && (
        <Alert className="bg-yellow-50 border-yellow-200 mb-4">
          <Copy className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="text-yellow-800">
            Duplicate Expense Detected
          </AlertTitle>
          <AlertDescription className="text-yellow-700">
            This expense has been flagged as a duplicate.
            <Button
              variant="link"
              className="p-0 h-auto text-yellow-700 underline ml-1"
              onClick={() =>
                navigate(`/expenses/${expenseData.original_expense_id}`)
              }
            >
              View original expense <ExternalLink className="ml-1 h-3 w-3" />
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:min-h-[calc(100vh-8rem)]">
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm flex flex-col">
              <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 flex-shrink-0">
                <div className="flex items-center gap-3">
                  {[
                    { key: "info", label: "Info" },
                    { key: "comments", label: "Comments" },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActivePerdiemTab(tab.key as "info" | "comments")}
                      className={cn(
                        "rounded-full px-4 py-2 text-sm font-medium transition-all",
                        activePerdiemTab === tab.key
                          ? "bg-primary/10 text-primary"
                          : "text-gray-500 hover:text-gray-900"
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
              {activePerdiemTab === "info" ? (
                <div className="flex-1 min-h-[520px]">
                  <div className="flex flex-col items-center justify-center gap-3 rounded-b-2xl bg-gray-50 text-center h-full w-full">
                    <Calendar className="h-14 w-14 text-gray-300" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        Per Diem Information
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Expense details will appear here
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <ExpenseComments
                  expenseId={expenseData?.id}
                  readOnly={false}
                  autoFetch={activePerdiemTab === "comments"}
                />
              )}
            </div>

            <Card>
              <div className="max-h-[calc(100vh-220px)] overflow-y-auto pr-1 md:pr-2">
                <CardContent className="px-6 py-6 space-y-6 pb-40 md:pb-48">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date *</FormLabel>
                          <FormControl>
                            <DateField
                              id="startDate"
                              value={formData.startDate}
                              onChange={(value) => {
                                handleInputChange("startDate", value);
                                field.onChange(value);
                                handleInputChange("endDate", value);
                              }}
                              disabled={mode === "view"}
                              maxDate={today}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-2">
                      <Label
                        htmlFor="days"
                        className="text-sm font-medium text-gray-700"
                      >
                        Number of Days
                      </Label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
                        <Input
                          id="days"
                          type="text"
                          value={days}
                          readOnly
                          className="bg-gray-50 pl-10"
                        />
                      </div>
                    </div>

                    {/* <FormField
                      control={form.control}
                      name="endDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Date *</FormLabel>
                          <FormControl>
                            <DateField
                              id="endDate"
                              value={formData.endDate}
                              onChange={(value) => {
                                handleInputChange("endDate", value);
                                field.onChange(value);
                              }}
                              disabled={mode === "view"}
                              minDate={formData.startDate}
                              maxDate={formData.startDate}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    /> */}
                  </div>

                  {/* <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="days"
                        className="text-sm font-medium text-gray-700"
                      >
                        Number of Days
                      </Label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
                        <Input
                          id="days"
                          type="text"
                          value={days}
                          readOnly
                          className="bg-gray-50 pl-10"
                        />
                      </div>
                    </div>
                  </div> */}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="policy"
                        className="text-sm font-medium text-gray-700"
                      >
                        Policy
                      </Label>
                      <Input
                        id="policy"
                        type="text"
                        value={selectedPolicy?.name}
                        className="bg-gray-50 text-gray-500"
                        disabled
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="categoryId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category *</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={(value) => {
                              handleInputChange("categoryId", value);
                              field.onChange(value);
                            }}
                            disabled={
                              (mode === "view" && !editMode) ||
                              !selectedPolicy ||
                              loadingPolicies
                            }
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue
                                  placeholder={
                                    !selectedPolicy
                                      ? "Select policy first"
                                      : "Select category"
                                  }
                                />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {categories.map((category) => (
                                <SelectItem
                                  key={category.id}
                                  value={category.id}
                                >
                                  {category.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Location *</FormLabel>
                          <FormControl>
                            <Input
                              type="text"
                              placeholder="e.g., Mumbai, Delhi, Bangalore"
                              value={formData.location}
                              onChange={(e) => {
                                handleInputChange("location", e.target.value);
                                field.onChange(e.target.value);
                              }}
                              disabled={mode === "view"}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <FormField
                      control={form.control}
                      name="purpose"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Purpose *</FormLabel>
                          <FormControl>
                            <Textarea
                              value={formData.purpose}
                              placeholder="e.g. Annual Sales Conference"
                              onChange={(e) => {
                                handleInputChange("purpose", e.target.value);
                                field.onChange(e.target.value);
                              }}
                              disabled={mode === "view"}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </div>
            </Card>
          </div>

          {(mode === "create" || mode === "edit") && (
            <>
              <div className="fixed inset-x-4 bottom-4 z-30 flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white/95 p-4 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-white/80 md:hidden">
                <div>
                  <Label className="text-sm font-medium text-gray-600">
                    Total Per Diem
                  </Label>
                  <div className="text-2xl font-bold text-blue-600 mt-1">
                    ₹{(Number(formData.totalAmount) || 0).toFixed(2)}
                  </div>
                  <p className="text-sm text-gray-500">
                    {days} {days === 1 ? "day" : "days"}
                  </p>
                </div>
                <Button
                  type="submit"
                  className="h-11 bg-blue-600 text-white hover:bg-blue-700"
                >
                  {mode === "create" ? "Create" : "Update"} Expense
                </Button>
              </div>

              <div className="pointer-events-none fixed bottom-0 right-0 left-0 md:left-64 z-30 hidden md:block">
                <div className="pointer-events-auto flex w-full items-center justify-between gap-6 border-t border-gray-200 bg-white px-12 py-5">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-600">
                        Total Per Diem Amount
                      </span>
                      <span className="text-sm text-gray-500">
                        ({days} {days === 1 ? "day" : "days"})
                      </span>
                    </div>
                    <span className="text-2xl font-bold text-blue-600">
                      ₹{(Number(formData.totalAmount) || 0).toFixed(2)}
                    </span>
                  </div>

                  <Button type="submit" className="min-w-[200px]">
                    {mode === "create" ? "Create" : "Update"} Expense
                  </Button>
                </div>
              </div>
            </>
          )}
        </form>
      </Form>
    </div>
  );
};

export default PerdiemPage;
