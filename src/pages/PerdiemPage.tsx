import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { DateField } from "@/components/ui/date-field";
import { Search, ArrowRight, Calendar } from "lucide-react";
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

interface PerdiemPageProps {
  mode?: "create" | "view" | "edit";
  expenseData?: Expense;
}

const PerdiemPage = ({ mode = "create", expenseData }: PerdiemPageProps) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
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
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [categories, setCategories] = useState<PolicyCategory[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [loadingPolicies, setLoadingPolicies] = useState(false);
  const [days, setDays] = useState<number>(0);

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
      setPolicies(perDiemPolicies);
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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.startDate ||
      !formData.endDate ||
      !formData.location ||
      !formData.purpose
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    const submitData = {
      expense_policy_id: formData.policyId, // Hardcoded policy ID
      category_id: formData.categoryId, // Hardcoded category ID
      amount: formData.totalAmount,
      expense_date: formData.startDate,
      description: formData.purpose,
      vendor: expenseData?.vendor || "",
      per_diem_info: {
        start_date: formData.startDate,
        end_date: formData.endDate,
        location: formData.location,
      },
    };

    try {
      const orgId = getOrgIdFromToken();
      if (!orgId) {
        toast.error("Organization ID not found. Please login again.");
        return;
      }
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
    <div className="w-full px-6 py-2">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">Per Diem</h1>
        <p className="text-gray-600">
          Request a daily allowance for business travel.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="bg-white border rounded-lg p-6">
          {/* Date Section */}
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">Dates</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label
                  htmlFor="startDate"
                  className="text-sm font-medium text-gray-700"
                >
                  Start Date
                </Label>
                <DateField
                  id="startDate"
                  value={formData.startDate}
                  onChange={(value) => handleInputChange("startDate", value)}
                  disabled={mode === "view"}
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="endDate"
                  className="text-sm font-medium text-gray-700"
                >
                  End Date
                </Label>
                <DateField
                  id="endDate"
                  value={formData.endDate}
                  onChange={(value) => handleInputChange("endDate", value)}
                  disabled={mode === "view"}
                />
              </div>
            </div>
          </div>

          {/* Details Section */}
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">
              Details
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label
                  htmlFor="location"
                  className="text-sm font-medium text-gray-700"
                >
                  Location
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="location"
                    type="text"
                    placeholder="e.g., Mumbai, Delhi, Bangalore"
                    value={formData.location}
                    onChange={(e) =>
                      handleInputChange("location", e.target.value)
                    }
                    className="pl-10"
                    disabled={mode === "view"}
                  />
                </div>
              </div>

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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label
                  htmlFor="policy"
                  className="text-sm font-medium text-gray-700"
                >
                  Policy
                </Label>
                <Select
                  value={formData.policyId}
                  onValueChange={(value) =>
                    handleInputChange("policyId", value)
                  }
                  disabled={(mode === "view" && !editMode) || loadingPolicies}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        loadingPolicies
                          ? "Loading policies..."
                          : "Select policy"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {policies.map((policy) => (
                      <SelectItem key={policy.id} value={policy.id}>
                        {policy.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="category"
                  className="text-sm font-medium text-gray-700"
                >
                  Category
                </Label>
                <Select
                  value={formData.categoryId}
                  onValueChange={(value) =>
                    handleInputChange("categoryId", value)
                  }
                  disabled={
                    (mode === "view" && !editMode) ||
                    !selectedPolicy ||
                    loadingPolicies
                  }
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        !selectedPolicy
                          ? "Select policy first"
                          : "Select category"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label
                  htmlFor="purpose"
                  className="text-sm font-medium text-gray-700"
                >
                  Purpose
                </Label>
                <Input
                  id="purpose"
                  type="text"
                  placeholder="e.g. Annual Sales Conference"
                  value={formData.purpose}
                  onChange={(e) => handleInputChange("purpose", e.target.value)}
                  disabled={mode === "view"}
                />
              </div>
            </div>
          </div>

          {/* Total Amount and Action Buttons */}
          <div className="flex justify-between items-end pt-4">
            <div>
              <Label className="text-sm font-medium text-gray-700">
                Total Amount
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
                {mode === "create" ? "Create" : "Edit"} Expense
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default PerdiemPage;
