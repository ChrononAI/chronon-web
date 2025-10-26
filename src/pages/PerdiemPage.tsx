import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { DateField } from "@/components/ui/date-field";
import { Search, Calendar } from "lucide-react";
import { placesService } from "@/services/placesService";
import { getOrgIdFromToken } from "@/lib/jwtUtils";
import { Expense, Policy, PolicyCategory } from "@/types/expense";
import { toast } from "sonner";
import { expenseService } from "@/services/expenseService";
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
  if (!startDate || !endDate) return 0

  const start = new Date(startDate)
  const end = new Date(endDate)

  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0

  const diffTime = end.getTime() - start.getTime()

  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1

  return diffDays > 0 ? diffDays : 0
}

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
  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    const { startDate, endDate } = formData
    setDays(calculateDays(startDate, endDate))
  }, [formData.startDate, formData.endDate])


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

      setFormData((prev) => ({
        ...prev,
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
      }));
    }
  }, [mode, expenseData]);

  useEffect(() => {
    if (expenseData && categories.length > 0) {
      const category = categories.find((cat) => cat.name === expenseData.category);
      if (category) {
        setFormData((prev) => ({
          ...prev,
          categoryId: category.id
        }))
      }
    }
  }, [formData.categoryId, expenseData?.category, categories]);

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
        
        if (perDiemPolicies[0].categories && perDiemPolicies[0].categories.length > 0) {
          const firstCategory = perDiemPolicies[0].categories[0];
          setFormData((prev) => ({ ...prev, categoryId: firstCategory.id }));
          form.setValue("categoryId", firstCategory.id);
        }
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
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
        <div className="bg-white border rounded-lg p-6">
          <div className="mb-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date *</FormLabel>
                    <FormControl>
                      <DateField
                        id="startDate"
                        value={formData.startDate}
                        onChange={(value) => {
                          handleInputChange("startDate", value);
                          field.onChange(value);
                        }}
                        disabled={mode === "view"}
                        maxDate={today}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
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
                        maxDate={today}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="mb-4 ">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label
                  htmlFor="days"
                  className="text-sm font-medium text-gray-700"
                >
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
          </div>

          {/* Details Section */}
          <div className="mb-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
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
                          <SelectItem key={category.id} value={category.id}>
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

            <div className="mb-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location *</FormLabel>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 z-10" />
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="e.g., Mumbai, Delhi, Bangalore"
                            value={formData.location}
                            onChange={(e) => {
                              handleInputChange("location", e.target.value);
                              field.onChange(e.target.value);
                            }}
                            className="pl-10"
                            disabled={mode === "view"}
                          />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 mt-4">
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
          </div>

          {/* Total Amount and Action Buttons */}
          <div className="flex justify-between items-end pt-4">
            <div>
              <Label className="text-sm font-medium text-gray-700">
                Total Per Diem
              </Label>
              <div className="text-2xl font-bold text-blue-600 mt-1">
                ₹{(Number(formData.totalAmount) || 0).toFixed(2)}
              </div>
              <p className="text-sm text-gray-500">{days} days</p>
            </div>

            {(mode === "create" || mode === "edit") && (
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-6"
              >
                {mode === "create" ? "Create" : "Update"} Expense
              </Button>
            )}
          </div>
        </div>
        </form>
      </Form>
    </div>
  );
};

export default PerdiemPage;
